import type {
  ProfessionalProfile,
  QuoteDetails,
  QuoteLineInput,
} from '@cotali/contracts';
import { calculateLineTotalInCents } from '@cotali/domain';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT_MARGIN = 48;
const TOP_MARGIN = 794;
const BOTTOM_MARGIN = 48;

type PdfLine = Readonly<{
  bold?: boolean;
  gapAfter?: number;
  size?: number;
  text: string;
}>;

/**
 * Creates the first server-owned proposal representation.
 *
 * The input is QuoteDetails, which is read from the current persisted
 * revision. This keeps totals and line values authoritative on the backend;
 * the mobile client only downloads the resulting document.
 */
export function renderQuotePdf(
  quote: QuoteDetails,
  profile?: ProfessionalProfile,
): Buffer {
  const lines = buildProposalLines(quote, profile);
  const pages = paginate(lines);
  return encodePdf(pages);
}

function buildProposalLines(
  quote: QuoteDetails,
  profile?: ProfessionalProfile,
): PdfLine[] {
  const title = profile?.businessName || profile?.name || 'Cotali';
  const lines: PdfLine[] = [
    { bold: true, size: 20, text: title },
    { size: 11, text: 'Proposta de orçamento', gapAfter: 12 },
  ];

  if (profile?.name && profile.name !== title) {
    lines.push({ text: `Profissional: ${profile.name}` });
  }
  if (profile?.document) lines.push({ text: `Documento: ${profile.document}` });
  if (profile?.phone) lines.push({ text: `Telefone: ${profile.phone}` });
  if (profile?.address) lines.push({ text: `Endereço: ${profile.address}` });

  lines.push(
    { text: '' },
    { bold: true, size: 13, text: 'Dados do orçamento' },
    { text: `Cliente: ${quote.client.name}` },
    { text: `Data: ${formatDate(quote.createdAt)}` },
    { text: `Revisão: ${quote.revisionNumber}` },
    { text: '' },
    { bold: true, size: 13, text: 'Serviços' },
  );
  appendQuoteLines(lines, quote.services);

  if (quote.materials.length > 0) {
    lines.push({ text: '' }, { bold: true, size: 13, text: 'Materiais' });
    appendQuoteLines(lines, quote.materials);
  }

  lines.push(
    { text: '' },
    { bold: true, size: 13, text: 'Condições' },
    {
      text: `Pagamento: ${quote.conditions.paymentMethod || 'A combinar'}`,
    },
    {
      text: `Plano: ${formatPaymentPlan(quote.conditions.paymentPlanType, quote.conditions.installmentCount)}`,
    },
  );
  if (quote.conditions.executionDeadline) {
    lines.push({ text: `Prazo: ${quote.conditions.executionDeadline}` });
  }
  if (quote.conditions.validUntil) {
    lines.push({
      text: `Validade: ${formatDate(quote.conditions.validUntil)}`,
    });
  }
  if (quote.conditions.notes)
    lines.push({ text: `Observações: ${quote.conditions.notes}` });

  lines.push(
    { text: '' },
    { bold: true, size: 13, text: 'Resumo financeiro' },
    { text: `Serviços: ${formatMoney(quote.totals.servicesInCents)}` },
    { text: `Materiais: ${formatMoney(quote.totals.materialsInCents)}` },
    { text: `Subtotal: ${formatMoney(quote.totals.subtotalInCents)}` },
    { text: `Desconto: ${formatMoney(quote.totals.discountInCents)}` },
    {
      bold: true,
      size: 14,
      text: `Total: ${formatMoney(quote.totals.totalInCents)}`,
      gapAfter: 8,
    },
    { text: 'Documento gerado pelo Cotali.' },
  );

  return lines;
}

function appendQuoteLines(
  target: PdfLine[],
  quoteLines: readonly QuoteLineInput[],
): void {
  quoteLines.forEach((line, index) => {
    const unit = line.unit ? ` ${line.unit}` : '';
    const lineTotal = calculateLineTotalInCents(line);
    target.push({ bold: true, text: `${index + 1}. ${line.description}` });
    target.push({
      size: 9,
      text: `Quantidade: ${line.quantity}${unit} | Unitário: ${formatMoney(line.unitPriceInCents)} | Total: ${formatMoney(lineTotal)}`,
      gapAfter: 4,
    });
  });
}

function paginate(lines: readonly PdfLine[]): PdfLine[][] {
  const pages: PdfLine[][] = [[]];
  let y = TOP_MARGIN;

  for (const line of lines) {
    const size = line.size ?? 10;
    const wrapped = line.text ? wrapText(line.text, 90) : [''];
    for (const text of wrapped) {
      const height = text ? size + 6 : 8;
      if (y - height < BOTTOM_MARGIN && pages.at(-1)?.length) {
        pages.push([]);
        y = TOP_MARGIN;
      }
      pages.at(-1)?.push({ ...line, text });
      y -= height;
    }
    y -= line.gapAfter ?? 0;
  }

  return pages;
}

function encodePdf(pages: readonly (readonly PdfLine[])[]): Buffer {
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  const pageNumbers: number[] = [];

  pages.forEach((page, index) => {
    const pageNumber = objects.length + 1;
    const contentNumber = pageNumber + 1;
    pageNumbers.push(pageNumber);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >>`,
    );
    const stream = pageStream(page, index + 1, pages.length);
    objects.push(
      `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
    );
  });

  objects[1] = `<< /Type /Pages /Kids [${pageNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${pages.length} >>`;

  let output = Buffer.from('%PDF-1.4\n', 'ascii');
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(output.length);
    output = Buffer.concat([
      output,
      Buffer.from(`${index + 1} 0 obj\n${object}\nendobj\n`, 'latin1'),
    ]);
  });

  const xrefOffset = output.length;
  const xref = [
    `xref\n0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    '%%EOF',
  ].join('\n');
  return Buffer.concat([output, Buffer.from(`${xref}\n`, 'latin1')]);
}

function pageStream(
  page: readonly PdfLine[],
  pageNumber: number,
  pageCount: number,
): string {
  let y = TOP_MARGIN;
  const commands = ['BT'];
  for (const line of page) {
    const size = line.size ?? 10;
    const height = line.text ? size + 6 : 8;
    if (line.text) {
      commands.push(`/${line.bold ? 'F2' : 'F1'} ${size} Tf`);
      commands.push(`1 0 0 1 ${LEFT_MARGIN} ${y} Tm`);
      commands.push(`(${escapePdfText(line.text)}) Tj`);
    }
    y -= height;
    y -= line.gapAfter ?? 0;
  }
  commands.push('ET');
  commands.push('BT');
  commands.push('/F1 8 Tf');
  commands.push(`1 0 0 1 ${LEFT_MARGIN} 28 Tm`);
  commands.push(`(Cotali | Página ${pageNumber} de ${pageCount}) Tj`);
  commands.push('ET');
  return commands.join('\n');
}

function wrapText(value: string, maxCharacters: number): string[] {
  const normalized = toPdfSafeText(value);
  const words = normalized.split(/\s+/u).filter(Boolean);
  if (words.length === 0) return [''];
  const result: string[] = [];
  let current = '';
  for (const word of words) {
    if (word.length > maxCharacters) {
      if (current) result.push(current);
      for (let offset = 0; offset < word.length; offset += maxCharacters) {
        result.push(word.slice(offset, offset + maxCharacters));
      }
      current = '';
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharacters) {
      result.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) result.push(current);
  return result;
}

function escapePdfText(value: string): string {
  return toPdfSafeText(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function toPdfSafeText(value: string): string {
  return value.normalize('NFKC').replace(/[^\x20-\x7E\u00A0-\u00FF]/gu, '?');
}

function formatMoney(cents: number | null): string {
  if (cents === null) return 'sem preço';
  const reais = Math.floor(cents / 100).toLocaleString('pt-BR');
  return `R$ ${reais},${String(cents % 100).padStart(2, '0')}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatPaymentPlan(
  type: QuoteDetails['conditions']['paymentPlanType'],
  installments: number | null,
): string {
  if (type === 'installments') return `${installments ?? '?'} parcelas`;
  if (type === 'partial') return 'Parcial';
  return 'Integral';
}
