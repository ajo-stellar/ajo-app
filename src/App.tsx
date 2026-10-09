import { useEffect, useRef, useState } from 'react';
import { nativeToScVal } from '@stellar/stellar-sdk';
import { resolveNetworkConfig } from './lib/network';
import { connectWallet, disconnectWallet } from './lib/wallet';
import { createClient, SubmissionUncertain } from './lib/client';
import { canSettle, createCircleArgs, positiveInteger, type Circle } from './lib/circle';
import { describeError } from './lib/errors';

const configuration = resolveNetworkConfig({ network: import.meta.env.VITE_STELLAR_NETWORK,
  rpcUrl: import.meta.env.VITE_SOROBAN_RPC_URL, contractId: import.meta.env.VITE_CONTRACT_ID,
  explorerBaseUrl: import.meta.env.VITE_EXPLORER_BASE_URL });
const client = configuration.ok ? createClient(configuration.config) : null;

export default function App() {
  const [wallet, setWallet] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [hash, setHash] = useState('');
  const [id, setId] = useState('');
  const [circle, setCircle] = useState<Circle | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => () => { generation.current++; }, []);

  async function run(action: (active: () => boolean) => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage('');
    const version = generation.current;
    const active = () => generation.current === version;
    try { await action(active); } catch (error) { if (active()) setMessage(describeError(error)); }
    finally { pending.current = false; if (active()) setBusy(false); }
  }
  async function write(method: string, args: Parameters<ReturnType<typeof createClient>['write']>[2], active: () => boolean) {
    if (!client || !wallet) throw new Error('Configure the app and connect a testnet wallet first.');
    setHash('');
    let txHash: string;
    try { txHash = await client.write(wallet, method, args, active); }
    catch (error) { if (error instanceof SubmissionUncertain && active()) setHash(error.hash); throw error; }
    if (!active()) return;
    setHash(txHash); setMessage('Submitted. Waiting for confirmation; do not submit again.');
    const result = await client.confirm(txHash);
    if (!active()) return;
    setMessage('Confirmed on Stellar testnet.');
    if (method === 'create_circle' && result !== undefined) { setId(String(result)); setCircle(null); }
    else { const next = await client.read(wallet, positiveInteger(id)); if (active()) setCircle(next); }
  }

  return <main>
    <div className="banner">TESTNET — no real money</div>
    <header><p className="brand-identity"><img className="brand-mark" src="/brand/mark.svg" width="36" height="36" alt="" aria-hidden="true" />Ajo</p><p className="eyebrow">AJO / ROTATING SAVINGS</p><h1>One circle. A turn for everyone.</h1>
      <p>Fixed members contribute the same token amount each round. When everyone has paid, the next member receives the pot.</p>
    </header>
    <aside className="warning"><strong>Unreviewed custody prototype.</strong> No deployment or pilot has happened. A second human review is required before any funded test. Missed payments can lock contributions indefinitely; there is no cancellation or refund flow.</aside>
    {!configuration.ok && <section><h2>Setup required</h2><p>The interface is available, but chain actions are disabled.</p><ul>{configuration.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul></section>}
    <section className="wallet"><h2>Testnet wallet</h2>{wallet ? <><p className="address">{wallet}</p><button disabled={busy} onClick={() => void run(async (active) => { await disconnectWallet(); if (!active()) return; setWallet(''); setCircle(null); setHash(''); generation.current++; setBusy(false); })}>Disconnect</button></> : <button disabled={busy || !client} onClick={() => void run(async (active) => { const address = await connectWallet(); if (active()) setWallet(address); })}>Connect wallet</button>}
      <p>Your wallet signs transactions. We never ask for secret keys.</p></section>
    <div role="status" aria-live="polite">{message}</div>
    {hash && configuration.ok && <p className="receipt">Transaction: <a href={`${configuration.config.explorerBaseUrl}/tx/${hash}`} target="_blank" rel="noreferrer">{hash}</a></p>}
    <div className="grid">
      <section><h2>Create a circle</h2><p>The entered member order is the payout order. Enter only public addresses, never names or contact information.</p>
        <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(async (active) => {
          await write('create_circle', createCircleArgs(wallet, { token: String(form.get('token')), members: String(form.get('members')), amount: String(form.get('amount')), length: String(form.get('length')) }), active);
        }); }}>
          <label>Token contract<input name="token" required placeholder="C…" disabled={busy} /></label>
          <label>Contribution in token base units<input name="amount" required inputMode="numeric" placeholder="10000000" disabled={busy} /></label>
          <p>For a token with 7 decimal places, 10000000 base units equals 1 token. Confirm the token's decimals first.</p>
          <label>Round length in seconds<input name="length" required inputMode="numeric" defaultValue="86400" disabled={busy} /></label><p>Round length guides storage retention. It does not enforce payment deadlines.</p>
          <label>Member addresses, in payout order<textarea name="members" rows={5} required placeholder="G…&#10;G…" disabled={busy} /></label>
          <button disabled={busy || !wallet || !client}>Create circle</button>
        </form>
      </section>
      <section><h2>Find a circle</h2><form onSubmit={(event) => { event.preventDefault(); void run(async (active) => { setCircle(null); if (!client) return; const found = await client.read(wallet, positiveInteger(id)); if (active()) setCircle(found); }); }}>
        <label>Circle ID<input value={id} onChange={(event) => { setId(event.target.value); setCircle(null); }} required inputMode="numeric" disabled={busy} /></label><button disabled={busy || !wallet || !client}>Load circle</button></form>
        {circle && <><h3>{circle.completed ? 'Circle completed' : `Round ${circle.round + 1} of ${circle.members.length}`}</h3>
          <dl><dt>Contribution</dt><dd>{String(circle.contribution_amount)} base units</dd><dt>Current pot</dt><dd>{String(circle.balance)} base units</dd><dt>Received / paid total</dt><dd>{String(circle.received_total)} / {String(circle.paid_total)}</dd></dl>
          {!circle.completed && <p className="address">Next recipient: {circle.members[circle.round]}</p>}
          <ol>{circle.members.map((member) => <li key={member}><span className="address">{member}</span> — {circle.completed ? 'Completed' : circle.paid_members.includes(member) ? 'Paid this round' : 'Awaiting contribution'}</li>)}</ol>
          <button disabled={busy || circle.completed || !circle.members.includes(wallet) || circle.paid_members.includes(wallet)} onClick={() => void run((active) => write('contribute', [nativeToScVal(circle.id, { type: 'u64' }), nativeToScVal(wallet, { type: 'address' })], active))}>Contribute this round</button>
          <button disabled={busy || !canSettle(circle)} onClick={() => void run((active) => write('settle_round', [nativeToScVal(circle.id, { type: 'u64' })], active))}>Settle round</button><p>Settlement needs every contribution. Any connected testnet wallet can submit it.</p>
        </>}
      </section>
    </div>
    <footer>Testnet only · No analytics · No real funds · No pilot claimed</footer>
  </main>;
}
