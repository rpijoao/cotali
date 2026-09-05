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
  | 'QUOTE_EDIT_INVALID_VALUE'
  | 'QUOTE_EDIT_NO_CHANGES'
  | 'QUOTE_EDIT_TARGET_NOT_FOUND'
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

export type QuoteLineEditCommand = Readonly<{
  section: 'materials' | 'services';
  index: number;
  changes: Readonly<{
    description?: string;
    quantity?: string;
    unit?: string | null;
    unitPriceInCents?: number | null;
  }>;
}>;

export type QuoteLineEditResult = Readonly<{
  materials: readonly QuoteLineInput[];
  services: readonly QuoteLineInput[];
}>;

export type QuoteClientNameEditCommand = Readonly<{
  name: string;
}>;

/**
 * Applies the supported voice edit for the client name. The LLM proposes the
 * value, but the domain owns the final validation and normalization.
 */
export function applyQuoteClientNameEdit(
  command: QuoteClientNameEditCommand,
): string {
  const name = command.name.trim();
  if (name === '' || name.length > 160) {
    throw new QuoteDomainError(
      'QUOTE_EDIT_INVALID_VALUE',
      'O nome do cliente deve ter entre 1 e 160 caracteres.',
    );
  }
  return name;
}

/**
 * Applies one normalized voice edit immutably. The LLM only proposes the
 * command; this function is the authority that checks its target and values.
 */
export function applyQuoteLineEdit(input: {
  materials: readonly QuoteLineInput[];
  services: readonly QuoteLineInput[];
  command: QuoteLineEditCommand;
}): QuoteLineEditResult {
  const { command } = input;
  if (command.section !== 'services' && command.section !== 'materials') {
    throw new QuoteDomainError(
      'QUOTE_EDIT_INVALID_VALUE',
      'A seção indicada pelo comando é inválida.',
    );
  }
  if (!Number.isSafeInteger(command.index) || command.index < 0) {
    throw new QuoteDomainError(
      'QUOTE_EDIT_TARGET_NOT_FOUND',
      'A linha indicada pelo comando não existe.',
    );
  }

  const allowedChangeKeys = new Set([
    'description',
    'quantity',
    'unit',
    'unitPriceInCents',
  ]);
  const changeKeys = Object.keys(command.changes);
  if (changeKeys.some((key) => !allowedChangeKeys.has(key))) {
    throw new QuoteDomainError(
      'QUOTE_EDIT_INVALID_VALUE',
      'O comando contém um campo de alteração inválido.',
    );
  }
  if (
    !changeKeys.some(
      (key) =>
        command.changes[key as keyof typeof command.changes] !== undefined,
    )
  ) {
    throw new QuoteDomainError(
      'QUOTE_EDIT_NO_CHANGES',
      'O comando não informou nenhuma alteração.',
    );
  }

  const lines =
    command.section === 'services' ? input.services : input.materials;
  const current = lines[command.index];
  if (!current) {
    throw new QuoteDomainError(
      'QUOTE_EDIT_TARGET_NOT_FOUND',
      'A linha indicada pelo comando não existe.',
    );
  }

  const changes = command.changes;
  const next: QuoteLineInput = {
    description:
      changes.description !== undefined
        ? changes.description
        : current.description,
    quantity:
      changes.quantity !== undefined ? changes.quantity : current.quantity,
    unit: changes.unit !== undefined ? changes.unit : current.unit,
    unitPriceInCents:
      changes.unitPriceInCents !== undefined
        ? changes.unitPriceInCents
        : current.unitPriceInCents,
  };

  assertEditableLine(next);
  const updatedLines = lines.map((line, index) =>
    index === command.index ? next : line,
  );
  const result =
    command.section === 'services'
      ? { services: updatedLines, materials: input.materials }
      : { services: input.services, materials: updatedLines };

  // Reuse the quote aggregate validation so a command cannot create a draft
  // that later fails only when the user presses "Revisar".
  calculateQuoteTotals({
    discountInCents: 0,
    materials: result.materials,
    services: result.services,
  });

  return result;
}

function assertEditableLine(line: QuoteLineInput): void {
  if (
    typeof line.description !== 'string' ||
    typeof line.quantity !== 'string' ||
    (line.unit !== null && typeof line.unit !== 'string') ||
    line.description.trim() === '' ||
    line.description.length > 160 ||
    (line.unit !== null && (line.unit.trim() === '' || line.unit.length > 20))
  ) {
    throw new QuoteDomainError(
      'QUOTE_EDIT_INVALID_VALUE',
      'A alteração contém uma descrição ou unidade inválida.',
    );
  }

  // This validates quantity and unit price using the same exact arithmetic as
  // quote totals, including the three-decimal quantity limit.
  calculateLineTotalInCents(line);
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
