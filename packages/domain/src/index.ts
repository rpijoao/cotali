export type Money = Readonly<{
  amountInCents: number;
  currency: 'BRL';
}>;

export type QuoteLineInput = Readonly<{
  description: string;
  quantity: string;
  unit: string | null;
  unitPriceInCents: number | null;
}>;

export type QuoteTotals = Readonly<{
  discountInCents: number;
  materialsInCents: number;
  servicesInCents: number;
  subtotalInCents: number;
  totalInCents: number;
}>;

export type QuoteDomainErrorCode =
  | 'INVALID_MONEY_VALUE'
  | 'INVALID_QUANTITY'
  | 'QUOTE_LIMIT_MATERIALS_EXCEEDED'
  | 'QUOTE_LIMIT_SERVICES_EXCEEDED';

export class QuoteDomainError extends Error {
  constructor(
    readonly code: QuoteDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'QuoteDomainError';
  }
}

export function money(amountInCents: number): Money {
  assertMoney(amountInCents);
  return Object.freeze({ amountInCents, currency: 'BRL' });
}

export function calculateQuoteTotals(input: {
  discountInCents: number;
  materials: readonly QuoteLineInput[];
  services: readonly QuoteLineInput[];
}): QuoteTotals {
  if (input.services.length > 5) {
    throw new QuoteDomainError(
      'QUOTE_LIMIT_SERVICES_EXCEEDED',
      'A quote can contain at most five service lines.',
    );
  }

  if (input.materials.length > 10) {
    throw new QuoteDomainError(
      'QUOTE_LIMIT_MATERIALS_EXCEEDED',
      'A quote can contain at most ten material lines.',
    );
  }

  assertMoney(input.discountInCents);

  const servicesInCents = sumLines(input.services);
  const materialsInCents = sumLines(input.materials);
  const subtotalInCents = servicesInCents + materialsInCents;
  const totalInCents = Math.max(0, subtotalInCents - input.discountInCents);

  return Object.freeze({
    discountInCents: input.discountInCents,
    materialsInCents,
    servicesInCents,
    subtotalInCents,
    totalInCents,
  });
}

export function calculateLineTotalInCents(line: QuoteLineInput): number | null {
  const quantityInThousandths = parseQuantity(line.quantity);

  if (line.unitPriceInCents === null) {
    return null;
  }

  assertMoney(line.unitPriceInCents);
  const product = BigInt(line.unitPriceInCents) * BigInt(quantityInThousandths);
  const rounded = (product + 500n) / 1000n;

  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new QuoteDomainError(
      'INVALID_MONEY_VALUE',
      'Line total exceeds the safe range.',
    );
  }

  return Number(rounded);
}

function sumLines(lines: readonly QuoteLineInput[]): number {
  return lines.reduce(
    (sum, line) => sum + (calculateLineTotalInCents(line) ?? 0),
    0,
  );
}

function parseQuantity(value: string): number {
  if (
    !/^(?:0\.(?:00[1-9]|0[1-9]\d|[1-9]\d{0,2})|[1-9]\d*(?:\.\d{1,3})?)$/.test(
      value,
    )
  ) {
    throw new QuoteDomainError(
      'INVALID_QUANTITY',
      'Quantity must be positive and have at most three decimal places.',
    );
  }

  const [whole = '0', fraction = ''] = value.split('.');
  const quantity = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new QuoteDomainError(
      'INVALID_QUANTITY',
      'Quantity exceeds the safe range.',
    );
  }

  return quantity;
}

function assertMoney(amountInCents: number): void {
  if (!Number.isSafeInteger(amountInCents) || amountInCents < 0) {
    throw new QuoteDomainError(
      'INVALID_MONEY_VALUE',
      'Money must be a non-negative safe integer.',
    );
  }
}
