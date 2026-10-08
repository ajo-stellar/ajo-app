import { describe, expect, it } from 'vitest';
import { Keypair, StrKey, scValToNative } from '@stellar/stellar-sdk';
import { canSettle, createCircleArgs, memberList, positiveInteger, type Circle } from './circle';
import { describeError } from './errors';

describe('circle inputs and settlement', () => {
  it('accepts exact integers without rounding', () => { expect(positiveInteger('18446744073709551615')).toBe((1n << 64n) - 1n); });
  it.each(['0', '-1', '1.2', '1e3', '', '18446744073709551616'])('rejects invalid number %s', (value) => { expect(() => positiveInteger(value)).toThrow(); });
  it('preserves payout order', () => { const addresses = [Keypair.random().publicKey(), Keypair.random().publicKey()]; expect(memberList(addresses.join('\n'))).toEqual(addresses); });
  it('rejects duplicate members', () => { const member = Keypair.random().publicKey(); expect(() => memberList(`${member},${member}`)).toThrow('only once'); });
  it.each(['', 'not-an-address', 'GFAKE,GFAKE'])('rejects invalid members %s', (value) => { expect(() => memberList(value)).toThrow(); });
  it('requires each listed member rather than just equal counts', () => { const circle = { members: ['A', 'B'], paid_members: ['A', 'C'], completed: false } as Circle; expect(canSettle(circle)).toBe(false); circle.paid_members = ['A','B']; expect(canSettle(circle)).toBe(true); circle.completed = true; expect(canSettle(circle)).toBe(false); });
  it('maps canonical errors and handles unknown codes', () => { expect(describeError(new Error('Error(Contract, #13)'))).toBe('Every member must contribute before settlement.'); expect(describeError(new Error('Error(Contract, #999)'))).toContain('TODO(verify)'); });
  it('encodes the ABI argument order and member vector exactly', () => {
    const source = Keypair.random().publicKey(); const members = [Keypair.random().publicKey(), Keypair.random().publicKey()];
    const input = { token: StrKey.encodeContract(new Uint8Array(32)), members: members.join(','), amount: '10', length: '86400' };
    expect(createCircleArgs(source, input).map((value) => scValToNative(value))).toEqual([source, input.token, 10n, members, 86400n]);
    expect(() => createCircleArgs(source, { ...input, length: String((1n << 64n) - 1n) })).toThrow('duration');
  });
});
