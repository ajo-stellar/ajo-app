import { BASE_FEE, Contract, TransactionBuilder, nativeToScVal, scValToNative, rpc, xdr } from '@stellar/stellar-sdk';
import type { AppConfig } from './network';
import { checkWalletNetwork, rememberedAddress, signWithWallet } from './wallet';

export class SubmissionUncertain extends Error {
  readonly hash: string;
  constructor(hash: string) {
    super('The submission response is unknown. Check this transaction in the explorer before submitting again.');
    this.hash = hash;
  }
}

async function bounded<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([request, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('The network timed out. Check any submitted transaction in the explorer before retrying.')), 15000);
    })]);
  } finally { clearTimeout(timer); }
}

export function createClient(config: AppConfig) {
  const server = new rpc.Server(config.rpcUrl);
  const contract = new Contract(config.contractId);
  async function assertNetwork() {
    const network = await bounded(server.getNetwork());
    if (network.passphrase !== config.passphrase) throw new Error('The configured RPC is not Stellar testnet. No transaction was signed or submitted.');
  }
  async function simulate(source: string, method: string, args: xdr.ScVal[]) {
    await assertNetwork();
    const account = await bounded(server.getAccount(source));
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: config.passphrase })
      .addOperation(contract.call(method, ...args)).setTimeout(60).build();
    const result = await bounded(server.simulateTransaction(tx));
    if (rpc.Api.isSimulationError(result)) throw new Error(result.error);
    if (rpc.Api.isSimulationRestore(result)) throw new Error('This circle needs storage restoration, which this app cannot perform.');
    return { tx, result };
  }
  return {
    async read(source: string, id: bigint) {
      const { result } = await simulate(source, 'get_circle', [nativeToScVal(id, { type: 'u64' })]);
      if (!result.result) throw new Error('The network returned no circle.');
      return scValToNative(result.result.retval);
    },
    async write(source: string, method: string, args: xdr.ScVal[], active: () => boolean) {
      if (!(await checkWalletNetwork()).onTestnet) throw new Error('Switch your wallet to Stellar testnet.');
      if (await rememberedAddress() !== source) throw new Error('The wallet account changed. Reconnect before continuing.');
      if (!active()) throw new Error('The wallet session changed.');
      const { tx, result } = await simulate(source, method, args);
      if (!active()) throw new Error('The wallet session changed.');
      const unsigned = rpc.assembleTransaction(tx, result).build().toXDR();
      const signed = await signWithWallet(unsigned, source, config.passphrase);
      if (!active()) throw new Error('The wallet session changed.');
      await assertNetwork();
      const walletNetwork = await checkWalletNetwork();
      const walletAddress = await rememberedAddress();
      if (!active() || !walletNetwork.onTestnet || walletAddress !== source) throw new Error('The wallet session or network changed.');
      const signedTransaction = TransactionBuilder.fromXDR(signed, config.passphrase);
      let response: rpc.Api.SendTransactionResponse;
      try { response = await bounded(server.sendTransaction(signedTransaction)); }
      catch { throw new SubmissionUncertain(Array.from(signedTransaction.hash(), (byte) => byte.toString(16).padStart(2, '0')).join('')); }
      if (response.status === 'ERROR') throw new Error('The network rejected the transaction.');
      return response.hash;
    },
    async confirm(hash: string) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const result = await bounded(server.getTransaction(hash));
        if (result.status === 'SUCCESS') return result.returnValue ? scValToNative(result.returnValue) : undefined;
        if (result.status === 'FAILED') throw new Error('The transaction failed on-chain.');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      throw new Error('Confirmation is taking longer than expected. Keep the hash and check the explorer before retrying.');
    },
  };
}
