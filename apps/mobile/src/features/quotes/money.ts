export function parseBrlInput(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function formatBrl(amountInCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    style: 'currency',
  }).format(amountInCents / 100);
}

export function formatBrlInput(value: string): string {
  return formatBrl(parseBrlInput(value) ?? 0);
}
