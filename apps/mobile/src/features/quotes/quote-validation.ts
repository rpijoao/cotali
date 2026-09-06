export type QuoteLineForValidation = Readonly<{
  description: string;
  quantity: string;
}>;

export function missingQuantityMessage(
  section: 'materials' | 'services',
  lines: readonly QuoteLineForValidation[],
): string | null {
  const index = lines.findIndex((line) => line.quantity.trim() === '');
  if (index === -1) return null;

  const label = section === 'services' ? 'serviço' : 'material';
  const line = lines[index];
  const description = line?.description.trim();
  return description
    ? `Informe a quantidade do ${label} “${description}”.`
    : `Informe a quantidade do ${label} ${index + 1}.`;
}
