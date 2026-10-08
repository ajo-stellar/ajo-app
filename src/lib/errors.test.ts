import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { describeError } from './errors';

it('uses every vendored canonical contract error message verbatim', () => {
  const table = readFileSync('docs/ERRORS.md', 'utf8');
  const rows = table.split('\n').map((line) => /^\| (\d+) \| \w+ \| (.*?) \|$/.exec(line)).filter((row) => row !== null);
  expect(rows).toHaveLength(11);
  for (const row of rows) expect(describeError(new Error(`Error(Contract, #${row[1]})`))).toBe(row[2]);
});
