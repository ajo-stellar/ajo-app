// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrKey } from '@stellar/stellar-sdk';
const wallet = vi.hoisted(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
vi.mock('./lib/wallet', () => ({ connectWallet: wallet.connect, disconnectWallet: wallet.disconnect }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

it('locks actions during a delayed disconnect and safely settles it after unmount', async () => {
  vi.resetModules();
  vi.stubEnv('VITE_STELLAR_NETWORK', 'testnet');
  vi.stubEnv('VITE_SOROBAN_RPC_URL', 'https://example.org');
  vi.stubEnv('VITE_CONTRACT_ID', StrKey.encodeContract(new Uint8Array(32)));
  vi.stubEnv('VITE_EXPLORER_BASE_URL', 'https://example.org');
  wallet.connect.mockResolvedValue('GCONNECTED');
  let resolveDisconnect: (() => void) | undefined;
  wallet.disconnect.mockImplementation(() => new Promise<void>((resolve) => { resolveDisconnect = resolve; }));
  const App = (await import('./App')).default;
  const view = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Connect wallet' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Disconnect' })).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
  expect((screen.getByLabelText('Token contract') as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: 'Create circle' }) as HTMLButtonElement).disabled).toBe(true);
  view.unmount(); resolveDisconnect?.();
  render(<App />);
  expect((screen.getByRole('button', { name: 'Connect wallet' }) as HTMLButtonElement).disabled).toBe(false);
});
