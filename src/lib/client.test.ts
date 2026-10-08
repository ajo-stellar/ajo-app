import { beforeEach, expect, it, vi } from 'vitest';
import { Account, Keypair, Networks, StrKey, nativeToScVal } from '@stellar/stellar-sdk';
import { createClient, SubmissionUncertain } from './client';
const mocks = vi.hoisted(() => ({ network: vi.fn(), address: vi.fn(), rpcNetwork: vi.fn(), sign: vi.fn(), account: vi.fn(), simulate: vi.fn(), send: vi.fn(), get: vi.fn() }));
vi.mock('./wallet', () => ({ checkWalletNetwork: mocks.network, rememberedAddress: mocks.address, signWithWallet: mocks.sign }));
vi.mock('@stellar/stellar-sdk', async (original) => {
  const actual = await original<typeof import('@stellar/stellar-sdk')>();
  return { ...actual, rpc: { ...actual.rpc, assembleTransaction: (tx: unknown) => ({ build: () => tx }), Server: class { getNetwork = mocks.rpcNetwork; getAccount = mocks.account; simulateTransaction = mocks.simulate; sendTransaction = mocks.send; getTransaction = mocks.get; } } };
});
const config = { network: 'testnet' as const, passphrase: Networks.TESTNET, rpcUrl: 'https://example.org', contractId: StrKey.encodeContract(new Uint8Array(32)), explorerBaseUrl: 'https://example.org' };
beforeEach(() => { vi.clearAllMocks(); mocks.address.mockResolvedValue('source'); });
it('refuses a mainnet wallet before building or signing', async () => {
  mocks.network.mockResolvedValue({ onTestnet: false });
  await expect(createClient(config).write('source', 'contribute', [], () => true)).rejects.toThrow('testnet');
  expect(mocks.account).not.toHaveBeenCalled(); expect(mocks.sign).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
});
it('refuses a stale session before RPC calls', async () => {
  mocks.network.mockResolvedValue({ onTestnet: true });
  await expect(createClient(config).write('source', 'contribute', [], () => false)).rejects.toThrow('session changed');
  expect(mocks.account).not.toHaveBeenCalled(); expect(mocks.sign).not.toHaveBeenCalled();
});
it('returns confirmed contract result and rejects on-chain failure', async () => {
  mocks.get.mockResolvedValue({ status: 'SUCCESS' }); expect(await createClient(config).confirm('hash')).toBeUndefined();
  mocks.get.mockResolvedValue({ status: 'FAILED' }); await expect(createClient(config).confirm('hash')).rejects.toThrow('failed on-chain');
});
it('refuses a mainnet RPC before preparing a transaction', async () => {
  mocks.network.mockResolvedValue({ onTestnet: true }); mocks.rpcNetwork.mockResolvedValue({ passphrase: Networks.PUBLIC });
  await expect(createClient(config).write('source', 'contribute', [], () => true)).rejects.toThrow('RPC is not Stellar testnet');
  expect(mocks.account).not.toHaveBeenCalled(); expect(mocks.sign).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
});
it('preserves a deterministic transaction hash on ambiguous submission and never retries it', async () => {
  const source = Keypair.random().publicKey();
  mocks.address.mockResolvedValue(source); mocks.network.mockResolvedValue({ onTestnet: true });
  mocks.rpcNetwork.mockResolvedValue({ passphrase: Networks.TESTNET });
  mocks.account.mockResolvedValue(new Account(source, '0'));
  mocks.simulate.mockResolvedValue({ result: { retval: nativeToScVal(null) } });
  mocks.sign.mockImplementation(async (unsigned: string) => unsigned);
  mocks.send.mockRejectedValue(new Error('connection lost'));
  const error = await createClient(config).write(source, 'settle_round', [], () => true).catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(SubmissionUncertain);
  expect((error as SubmissionUncertain).hash).toMatch(/^[0-9a-f]{64}$/);
  expect(mocks.send).toHaveBeenCalledTimes(1);
});
it('rejects stale state after signing before submission', async () => {
  const source = Keypair.random().publicKey(); let active = true;
  mocks.address.mockResolvedValue(source); mocks.network.mockResolvedValue({ onTestnet: true });
  mocks.rpcNetwork.mockResolvedValue({ passphrase: Networks.TESTNET });
  mocks.account.mockResolvedValue(new Account(source, '0')); mocks.simulate.mockResolvedValue({ result: { retval: nativeToScVal(null) } });
  mocks.sign.mockImplementation(async (unsigned: string) => { active = false; return unsigned; });
  await expect(createClient(config).write(source, 'settle_round', [], () => active)).rejects.toThrow('session changed');
  expect(mocks.send).not.toHaveBeenCalled();
});
