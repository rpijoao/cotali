export type BenchmarkFieldScore = Readonly<{
  matched: number;
  total: number;
  score: number | null;
}>;

export function transcriptScore(expected: string, actual: string): number {
  const expectedTokens = tokenize(expected);
  const actualTokens = tokenize(actual);
  if (expectedTokens.length === 0) return actualTokens.length === 0 ? 1 : 0;

  // Keep only the previous row of the Levenshtein matrix. The `??` guards
  // are intentional because the worker enables `noUncheckedIndexedAccess`.
  let previous = Array.from(
    { length: actualTokens.length + 1 },
    (_, index) => index,
  );
  for (let row = 1; row <= expectedTokens.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= actualTokens.length; column += 1) {
      const substitution =
        (previous[column - 1] ?? row - 1) +
        (expectedTokens[row - 1] === actualTokens[column - 1] ? 0 : 1);
      current[column] = Math.min(
        substitution,
        (previous[column] ?? row) + 1,
        (current[column - 1] ?? column) + 1,
      );
    }
    previous = current;
  }

  const distance = previous[actualTokens.length] ?? expectedTokens.length;
  return Math.max(0, 1 - distance / expectedTokens.length);
}

export function scoreExpectedFields(
  actual: unknown,
  expected: unknown,
): BenchmarkFieldScore {
  const expectedLeaves: Array<readonly [string, unknown]> = [];
  collectLeaves(expected, '$', expectedLeaves);
  if (expectedLeaves.length === 0) return { matched: 0, total: 0, score: null };

  let matched = 0;
  for (const [path, expectedValue] of expectedLeaves) {
    if (deepEqual(readPath(actual, path), expectedValue)) matched += 1;
  }
  return {
    matched,
    total: expectedLeaves.length,
    score: matched / expectedLeaves.length,
  };
}

function tokenize(value: string): string[] {
  const normalized = value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return normalized === '' ? [] : normalized.split(/\s+/);
}

function collectLeaves(
  value: unknown,
  path: string,
  leaves: Array<readonly [string, unknown]>,
): void {
  if (Array.isArray(value)) {
    if (value.length === 0) leaves.push([path, value]);
    value.forEach((item, index) =>
      collectLeaves(item, `${path}[${index}]`, leaves),
    );
    return;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) leaves.push([path, value]);
    entries.forEach(([key, child]) =>
      collectLeaves(child, `${path}.${key}`, leaves),
    );
    return;
  }
  leaves.push([path, value]);
}

function readPath(value: unknown, path: string): unknown {
  const tokens = path
    .slice(1)
    .split(/(?:\.([^.[\]]+)|\[(\d+)\])/u)
    .filter(Boolean);
  let current = value;
  for (const token of tokens) {
    if (isRecord(current)) current = current[token];
    else if (Array.isArray(current)) current = current[Number(token)];
    else return undefined;
  }
  return current;
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (typeof left === 'string' && typeof right === 'string') {
    return tokenize(left).join(' ') === tokenize(right).join(' ');
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => deepEqual(item, right[index]))
    );
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) =>
          key === rightKeys[index] && deepEqual(left[key], right[key]),
      )
    );
  }
  return Object.is(left, right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
