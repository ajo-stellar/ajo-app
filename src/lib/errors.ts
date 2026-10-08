const messages: Record<number, string> = {
  "1": "This circle was not found. Check the circle ID.",
  "10": "This circle has completed every round.",
  "11": "This wallet is not a member of this circle.",
  "12": "This member has already contributed this round.",
  "13": "Every member must contribute before settlement.",
  "30": "Enter a positive contribution amount.",
  "31": "A circle requires between 2 and 20 members.",
  "32": "Each member address must appear only once.",
  "33": "Enter a positive round length.",
  "34": "The amount or duration is too large.",
  "35": "The circle contract cannot be its own token or member."
};
export function describeError(error: unknown): string {
 const text = error instanceof Error ? error.message : String(error);
 const code = /Error\(Contract,\s*#?(\d+)\)/.exec(text);
 return code ? messages[Number(code[1])] ?? 'The contract rejected this action. TODO(verify): unknown contract error.' : text;
}
