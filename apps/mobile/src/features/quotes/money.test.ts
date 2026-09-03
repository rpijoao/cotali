import { describe, expect, it } from 'vitest';
import { formatBrl, parseBrlInput } from './money';

describe('BRL input', () => {
  it('parses formatted input as integer cents', () => {
    expect(parseBrlInput('R$ 1.234,56')).toBe(123456);
  });

  it('formats integer cents for review', () => {
    expect(formatBrl(123456)).toContain('1.234,56');
  });
});
