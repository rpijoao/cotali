# Cotali

Aplicativo mobile-first para profissionais autônomos criarem orçamentos por voz e compartilharem propostas e recibos em PDF.

## Requisitos

- Node.js 24 LTS
- Corepack
- Android Studio ou um dispositivo Android com Expo Go, quando compatível
- Conta Neon autenticada pela CLI para executar a API com persistência

## Preparação

```powershell
corepack enable
pnpm install
```

O projeto usa Neon PostgreSQL. Vincule o workspace à branch desejada, baixe apenas as variáveis do Postgres e aplique as migrations:

```powershell
pnpm dlx neon@latest link --project-id <project-id> --branch development --no-env-pull
pnpm dlx neon@latest env pull --service postgres --file packages/database/.env
pnpm dlx neon@latest env pull --service postgres --file apps/api/.env
pnpm --filter @cotali/database db:migrate:deploy
```

`DATABASE_URL` usa a conexão pooled para a aplicação e `DATABASE_URL_UNPOOLED` usa a conexão direta para migrations. Os arquivos `.env` são ignorados pelo Git. O `compose.yaml` permanece apenas como alternativa local.

## Desenvolvimento

Para habilitar o processamento por voz no backend, configure `GROQ_API_KEY` em `apps/api/.env`. A chave nunca deve ser colocada em `apps/mobile/.env` ou enviada ao aplicativo. Os modelos padrão são `whisper-large-v3-turbo` para transcrição e `openai/gpt-oss-20b` para extração estruturada.

```powershell
pnpm dev:mobile
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

A API responde em `http://localhost:3333/v1/health` e publica a documentação em `http://localhost:3333/docs`.

No emulador Android, o app usa `http://10.0.2.2:3333` como API. Para um aparelho físico, copie `apps/mobile/.env.example` para `apps/mobile/.env` e troque o endereço pelo IP local do computador.

## Corte vertical atual

O app Android já permite preencher e revisar manualmente:

- cliente e WhatsApp;
- até 5 serviços e 10 materiais;
- quantidades, unidades e preços;
- pagamento integral, parcial ou parcelado;
- prazo, desconto e observações;
- totais recalculados pelas regras compartilhadas.

`POST /v1/quotes` valida o mesmo contrato, autentica a identidade, recalcula os totais no servidor e persiste todo o agregado no PostgreSQL em uma transação serializável. A mesma `mutationId` devolve o resultado anterior sem duplicar cliente, orçamento ou revisão.

Em desenvolvimento, use `Authorization: Bearer dev:local-user`. Esse modo é recusado quando `NODE_ENV=production`. Em produção, a API exige `OIDC_ISSUER`, `OIDC_AUDIENCE` e `OIDC_JWKS_URL` para validar JWTs assinados pelo provedor escolhido.

O teste do adaptador PostgreSQL real é habilitado explicitamente com `RUN_DATABASE_INTEGRATION=true`. Ele usa `TEST_DATABASE_URL` quando definida e, caso contrário, a `DATABASE_URL` de `apps/api/.env`.

## Verificação

O fluxo de voz usa `POST /v1/voice/interpretations` com multipart contendo `mutationId` (UUID) e `audio` (até 25 MB). A API autentica, grava um `VoiceJob` na branch Neon e responde `202` com o status `pending`. O worker (`pnpm dev:worker`) reclama jobs com lease, transcreve/interpreta no Groq, persiste o resultado e remove o áudio binário ao concluir. O app consulta `GET /v1/voice/interpretations/:mutationId` até receber `completed` ou `failed`. Retries usam a mesma chave e não duplicam o job.

```powershell
pnpm lint
pnpm check
pnpm test
pnpm build
```

## Organização

- `apps/mobile`: aplicativo Expo/React Native, Android primeiro.
- `apps/web`: landing page e futuro app autenticado em Next.js.
- `apps/api`: API HTTP versionada em Fastify.
- `apps/worker`: processamento assíncrono.
- `packages/domain`: regras puras do negócio.
- `packages/contracts`: contratos de rede e validação em runtime.
- `packages/database`: schema e cliente Prisma.
- `docs`: produto, domínio, arquitetura e decisões.
