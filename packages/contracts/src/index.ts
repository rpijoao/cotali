import { Type, type Static } from '@sinclair/typebox';

export const PaymentPlanTypeSchema = Type.Union([
  Type.Literal('integral'),
  Type.Literal('partial'),
  Type.Literal('installments'),
]);

export const QuoteLineInputSchema = Type.Object(
  {
    description: Type.String({ minLength: 1, maxLength: 160 }),
    quantity: Type.String({
      pattern:
        '^(?:0\\.(?:00[1-9]|0[1-9]\\d|[1-9]\\d{0,2})|[1-9]\\d*(?:\\.\\d{1,3})?)$',
    }),
    unit: Type.Union([
      Type.String({ minLength: 1, maxLength: 20 }),
      Type.Null(),
    ]),
    unitPriceInCents: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  },
  { additionalProperties: false },
);

export const CreateQuoteDraftSchema = Type.Object(
  {
    mutationId: Type.String({ format: 'uuid' }),
    client: Type.Object(
      {
        name: Type.String({ minLength: 1, maxLength: 120 }),
        phone: Type.Union([
          Type.String({
            minLength: 11,
            maxLength: 20,
            pattern: '^\\+[1-9]\\d{9,19}$',
          }),
          Type.Null(),
        ]),
      },
      { additionalProperties: false },
    ),
    services: Type.Array(QuoteLineInputSchema, { minItems: 1, maxItems: 5 }),
    materials: Type.Array(QuoteLineInputSchema, { maxItems: 10 }),
    conditions: Type.Object(
      {
        paymentMethod: Type.Union([
          Type.String({ minLength: 1, maxLength: 80 }),
          Type.Null(),
        ]),
        paymentPlanType: PaymentPlanTypeSchema,
        installmentCount: Type.Union([
          Type.Integer({ minimum: 2, maximum: 24 }),
          Type.Null(),
        ]),
        executionDeadline: Type.Union([
          Type.String({ minLength: 1, maxLength: 120 }),
          Type.Null(),
        ]),
        validUntil: Type.Union([Type.String({ format: 'date' }), Type.Null()]),
        notes: Type.Union([Type.String({ maxLength: 1000 }), Type.Null()]),
      },
      { additionalProperties: false },
    ),
    discountInCents: Type.Integer({ minimum: 0 }),
    source: Type.Union([
      Type.Literal('manual'),
      Type.Literal('interpretation'),
      Type.Literal('mixed'),
    ]),
  },
  { additionalProperties: false },
);

export const QuoteTotalsSchema = Type.Object({
  discountInCents: Type.Integer({ minimum: 0 }),
  materialsInCents: Type.Integer({ minimum: 0 }),
  servicesInCents: Type.Integer({ minimum: 0 }),
  subtotalInCents: Type.Integer({ minimum: 0 }),
  totalInCents: Type.Integer({ minimum: 0 }),
});

export const QuoteDraftSchema = Type.Intersect([
  CreateQuoteDraftSchema,
  Type.Object({
    id: Type.String({ format: 'uuid' }),
    revisionNumber: Type.Integer({ minimum: 1 }),
    status: Type.Literal('draft'),
    totals: QuoteTotalsSchema,
    createdAt: Type.String({ format: 'date-time' }),
  }),
]);

export const QuoteStatusSchema = Type.Union([
  Type.Literal('draft'),
  Type.Literal('ready_to_share'),
  Type.Literal('shared'),
]);

export const PaymentStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('partially_paid'),
  Type.Literal('paid'),
]);

export const QuoteSummarySchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    client: Type.Object(
      {
        name: Type.String({ minLength: 1, maxLength: 120 }),
        phone: Type.Union([
          Type.String({ minLength: 11, maxLength: 20 }),
          Type.Null(),
        ]),
      },
      { additionalProperties: false },
    ),
    totalInCents: Type.Integer({ minimum: 0 }),
    status: QuoteStatusSchema,
    paymentStatus: PaymentStatusSchema,
    revisionNumber: Type.Integer({ minimum: 1 }),
    createdAt: Type.String({ format: 'date-time' }),
  },
  { additionalProperties: false },
);

export const QuoteSummaryListSchema = Type.Array(QuoteSummarySchema, {
  maxItems: 50,
});

export const QuoteDetailsSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    client: Type.Object(
      {
        name: Type.String({ minLength: 1, maxLength: 120 }),
        phone: Type.Union([
          Type.String({ minLength: 11, maxLength: 20 }),
          Type.Null(),
        ]),
      },
      { additionalProperties: false },
    ),
    services: Type.Array(QuoteLineInputSchema, { minItems: 1, maxItems: 5 }),
    materials: Type.Array(QuoteLineInputSchema, { maxItems: 10 }),
    conditions: Type.Object(
      {
        paymentMethod: Type.Union([
          Type.String({ minLength: 1, maxLength: 80 }),
          Type.Null(),
        ]),
        paymentPlanType: PaymentPlanTypeSchema,
        installmentCount: Type.Union([
          Type.Integer({ minimum: 2, maximum: 24 }),
          Type.Null(),
        ]),
        executionDeadline: Type.Union([
          Type.String({ minLength: 1, maxLength: 120 }),
          Type.Null(),
        ]),
        validUntil: Type.Union([Type.String({ format: 'date' }), Type.Null()]),
        notes: Type.Union([Type.String({ maxLength: 1000 }), Type.Null()]),
      },
      { additionalProperties: false },
    ),
    discountInCents: Type.Integer({ minimum: 0 }),
    source: Type.Union([
      Type.Literal('manual'),
      Type.Literal('interpretation'),
      Type.Literal('mixed'),
    ]),
    revisionNumber: Type.Integer({ minimum: 1 }),
    status: QuoteStatusSchema,
    paymentStatus: PaymentStatusSchema,
    totals: QuoteTotalsSchema,
    createdAt: Type.String({ format: 'date-time' }),
  },
  { additionalProperties: false },
);

const NullableString = Type.Union([Type.String(), Type.Null()]);

export const VoiceLineProposalSchema = Type.Object(
  {
    description: Type.String({ minLength: 1, maxLength: 160 }),
    quantity: NullableString,
    unit: Type.Union([
      Type.String({ minLength: 1, maxLength: 20 }),
      Type.Null(),
    ]),
    unitPriceInCents: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  },
  { additionalProperties: false },
);

export const VoiceInterpretationSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    transcript: Type.String({ minLength: 1, maxLength: 50_000 }),
    transcriptSegments: Type.Array(
      Type.Object(
        {
          text: Type.String({ minLength: 1, maxLength: 2_000 }),
          startMs: Type.Integer({ minimum: 0 }),
          endMs: Type.Integer({ minimum: 0 }),
        },
        { additionalProperties: false },
      ),
      { maxItems: 2_000 },
    ),
    client: Type.Object(
      { name: NullableString, phone: NullableString },
      { additionalProperties: false },
    ),
    services: Type.Array(VoiceLineProposalSchema, { maxItems: 5 }),
    materials: Type.Array(VoiceLineProposalSchema, { maxItems: 10 }),
    conditions: Type.Object(
      {
        paymentMethod: NullableString,
        paymentPlanType: Type.Union([PaymentPlanTypeSchema, Type.Null()]),
        installmentCount: Type.Union([
          Type.Integer({ minimum: 2, maximum: 24 }),
          Type.Null(),
        ]),
        executionDeadline: NullableString,
        validUntil: Type.Union([Type.String({ format: 'date' }), Type.Null()]),
        notes: NullableString,
      },
      { additionalProperties: false },
    ),
    discountInCents: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    ambiguities: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
      maxItems: 32,
    }),
    source: Type.Literal('interpretation'),
    createdAt: Type.String({ format: 'date-time' }),
  },
  { additionalProperties: false },
);

export const VoiceJobStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('processing'),
  Type.Literal('completed'),
  Type.Literal('failed'),
]);

export const VoiceInterpretationJobSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    mutationId: Type.String({ format: 'uuid' }),
    status: VoiceJobStatusSchema,
    attempts: Type.Integer({ minimum: 0 }),
    interpretation: Type.Union([VoiceInterpretationSchema, Type.Null()]),
    error: NullableString,
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  },
  { additionalProperties: false },
);

const VoiceQuoteEditChangesSchema = Type.Object(
  {
    description: Type.Union([
      Type.String({ minLength: 1, maxLength: 160 }),
      Type.Null(),
    ]),
    quantity: Type.Union([
      Type.String({
        pattern:
          '^(?:0\\.(?:00[1-9]|0[1-9]\\d|[1-9]\\d{0,2})|[1-9]\\d*(?:\\.\\d{1,3})?)$',
      }),
      Type.Null(),
    ]),
    unit: Type.Union([
      Type.String({ minLength: 1, maxLength: 20 }),
      Type.Null(),
    ]),
    unitPriceInCents: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  },
  { additionalProperties: false },
);

export const VoiceQuoteEditContextSchema = Type.Object(
  {
    services: Type.Array(
      Type.Object(
        {
          description: Type.String({ maxLength: 160 }),
          quantity: Type.String({ maxLength: 32 }),
          unit: Type.String({ maxLength: 20 }),
          unitPriceInCents: Type.Union([
            Type.Integer({ minimum: 0 }),
            Type.Null(),
          ]),
        },
        { additionalProperties: false },
      ),
      { maxItems: 5 },
    ),
    materials: Type.Array(
      Type.Object(
        {
          description: Type.String({ maxLength: 160 }),
          quantity: Type.String({ maxLength: 32 }),
          unit: Type.String({ maxLength: 20 }),
          unitPriceInCents: Type.Union([
            Type.Integer({ minimum: 0 }),
            Type.Null(),
          ]),
        },
        { additionalProperties: false },
      ),
      { maxItems: 10 },
    ),
  },
  { additionalProperties: false },
);

/**
 * A normalized, zero-based edit against one existing quote line. When the
 * request is ambiguous, intent is no_op and target fields are null. Null
 * fields inside changes mean "keep the current value".
 */
export const VoiceQuoteEditCommandSchema = Type.Object(
  {
    intent: Type.Union([Type.Literal('update_line'), Type.Literal('no_op')]),
    section: Type.Union([
      Type.Literal('services'),
      Type.Literal('materials'),
      Type.Null(),
    ]),
    index: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    changes: VoiceQuoteEditChangesSchema,
    ambiguities: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
      maxItems: 32,
    }),
  },
  { additionalProperties: false },
);

export const VoiceQuoteEditInterpretationSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    transcript: Type.String({ minLength: 1, maxLength: 50_000 }),
    command: VoiceQuoteEditCommandSchema,
    source: Type.Literal('command'),
    createdAt: Type.String({ format: 'date-time' }),
  },
  { additionalProperties: false },
);

export const ApiErrorSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
  }),
});

export type CreateQuoteDraft = Static<typeof CreateQuoteDraftSchema>;
export type PaymentPlanType = Static<typeof PaymentPlanTypeSchema>;
export type QuoteDraft = Static<typeof QuoteDraftSchema>;
export type QuoteLineInput = Static<typeof QuoteLineInputSchema>;
export type QuoteStatus = Static<typeof QuoteStatusSchema>;
export type PaymentStatus = Static<typeof PaymentStatusSchema>;
export type QuoteSummary = Static<typeof QuoteSummarySchema>;
export type QuoteDetails = Static<typeof QuoteDetailsSchema>;
export type VoiceInterpretation = Static<typeof VoiceInterpretationSchema>;
export type VoiceInterpretationJob = Static<
  typeof VoiceInterpretationJobSchema
>;
export type VoiceJobStatus = Static<typeof VoiceJobStatusSchema>;
export type VoiceQuoteEditCommand = Static<typeof VoiceQuoteEditCommandSchema>;
export type VoiceQuoteEditContext = Static<typeof VoiceQuoteEditContextSchema>;
export type VoiceQuoteEditInterpretation = Static<
  typeof VoiceQuoteEditInterpretationSchema
>;
