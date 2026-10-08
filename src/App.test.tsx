// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import App from './App';

afterEach(cleanup);
it('shows honest custody warning and disables unconfigured actions', () => {
  render(<App />);
  expect(screen.getByText('TESTNET — no real money')).toBeTruthy();
  expect(screen.getByText(/second human review/)).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Connect wallet' }) as HTMLButtonElement).disabled).toBe(true);
});
it('has no automated accessibility violations in the initial screen', async () => {
  const { container } = render(<App />);
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations).toEqual([]);
});
