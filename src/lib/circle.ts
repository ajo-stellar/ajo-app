import { StrKey, nativeToScVal, xdr } from '@stellar/stellar-sdk';

export interface Circle {
  id: bigint; members: string[]; contribution_amount: bigint; round: number;
  paid_members: string[]; received_total: bigint; paid_total: bigint; balance: bigint; completed: boolean;
}
export function positiveInteger(value: string, max = (1n << 64n) - 1n): bigint {
  if (!/^[0-9]+$/.test(value.trim())) throw new Error('Enter a whole positive number.');
  const parsed = BigInt(value.trim());
  if (parsed <= 0n || parsed > max) throw new Error('The number is outside the supported range.');
  return parsed;
}
export function memberList(value: string): string[] {
  const members = value.split(/[\s,]+/).filter(Boolean);
  if (members.length < 2 || members.length > 20) throw new Error('A circle requires between 2 and 20 members.');
  if (members.some((member) => !StrKey.isValidEd25519PublicKey(member))) throw new Error('Enter valid Stellar account addresses.');
  if (new Set(members).size !== members.length) throw new Error('Each member address must appear only once.');
  return members;
}
export function canSettle(circle: Circle): boolean {
  return !circle.completed && circle.members.every((member) => circle.paid_members.includes(member));
}
export function createCircleArgs(source: string, input: { token: string; members: string; amount: string; length: string }): xdr.ScVal[] {
  const token = input.token.trim();
  if (!StrKey.isValidContract(token)) throw new Error('Enter a valid token contract address.');
  const members = memberList(input.members);
  const amount = positiveInteger(input.amount, (1n << 127n) - 1n);
  const duration = positiveInteger(input.length);
  if (amount * BigInt(members.length) * BigInt(members.length) > (1n << 127n) - 1n) throw new Error('The amount is too large for this circle.');
  if (duration * BigInt(members.length) > (1n << 64n) - 1n) throw new Error('The duration is too large for this circle.');
  return [nativeToScVal(source, { type: 'address' }), nativeToScVal(token, { type: 'address' }), nativeToScVal(amount, { type: 'i128' }), xdr.ScVal.scvVec(members.map((member) => nativeToScVal(member, { type: 'address' }))), nativeToScVal(duration, { type: 'u64' })];
}
