# Cotali

A paleta oficial do Cotali é azul `#1846e1` e branco `#ffffff`. Consulte a [identidade visual](./docs/product/cotali-visual-identity.md) antes de criar ou alterar componentes de interface.

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

Para habilitar o processamento por voz no backend, configure `GROQ_API_KEY` em `apps/api/.env`. A chave nunca deve ser colocada em `apps/mobile/.env` ou enviada ao aplicativo. Os modelos padrão são `whisper-large-v3-turbo` para transcrição e `openai/gpt-oss-20b` para extração estruturada e comandos. `GROQ_COMMAND_MODEL` pode apontar os comandos para outro modelo sem alterar a extração inicial.

```powershell
pnpm dev:mobile
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

A API responde em `http://localhost:3333/v1/health` e publica a documentação em `http://localhost:3333/docs`.

No emulador Android, o app usa `http://10.0.2.2:3333` como API. Para um aparelho físico, copie `apps/mobile/.env.example` para `apps/mobile/.env` e troque o endereço pelo IP local do computador.

## Corte vertical atual

Ao abrir o app, a tela inicial mostra o rascunho local e os orçamentos recentes
da conta. O botão **Novo orçamento** abre o fluxo de criação; o microfone só é
ativado depois que o usuário toca em **Começar a falar**. **Continuar rascunho**
retoma o preenchimento salvo no aparelho.

No fluxo de criação, o app Android já permite preencher e revisar manualmente:

- cliente e WhatsApp;
- até 5 serviços e 10 materiais;
- quantidades, unidades e preços;
- pagamento integral, parcial ou parcelado;
- prazo, desconto e observações;
- totais recalculados pelas regras compartilhadas.

`POST /v1/quotes` valida o mesmo contrato, autentica a identidade, recalcula os totais no servidor e persiste todo o agregado no PostgreSQL em uma transação serializável. A mesma `mutationId` devolve o resultado anterior sem duplicar cliente, orçamento ou revisão.

`GET /v1/quotes` retorna até 20 orçamentos recentes da conta autenticada para
alimentar a tela inicial, sem expor o áudio ou outros dados de processamento.
`GET /v1/quotes/:id` retorna a revisão atual completa de um orçamento da mesma
conta para a tela de detalhes.

Em desenvolvimento, use `Authorization: Bearer dev:local-user`. Esse modo é recusado quando `NODE_ENV=production`. Em produção, a API exige `OIDC_ISSUER`, `OIDC_AUDIENCE` e `OIDC_JWKS_URL` para validar JWTs assinados pelo provedor escolhido.

O teste do adaptador PostgreSQL real é habilitado explicitamente com `RUN_DATABASE_INTEGRATION=true`. Ele usa `TEST_DATABASE_URL` quando definida e, caso contrário, a `DATABASE_URL` de `apps/api/.env`.

## Verificação

O fluxo de voz usa `POST /v1/voice/interpretations` com multipart contendo `mutationId` (UUID) e `audio` (até 25 MB). A API autentica, grava um `VoiceJob` na branch Neon e responde `202` com o status `pending`. O worker (`pnpm dev:worker`) reclama jobs com lease, transcreve/interpreta no Groq, persiste o resultado e remove o áudio binário ao concluir. O app consulta `GET /v1/voice/interpretations/:mutationId` até receber `completed` ou `failed`. Retries usam a mesma chave e não duplicam o job.

Na segunda etapa, a tela de dados oferece **Ajuste por voz**. O app envia o áudio,
`mutationId` e o contexto atual das linhas para `POST /v1/voice/commands`. A rota
usa os mesmos modelos configurados no Groq, retorna uma única operação normalizada
(por exemplo, `services[0].quantity = "3"`) ou `no_op` quando o pedido é ambíguo.
O app mostra a transcrição e a alteração proposta; somente o botão **Aplicar
alteração** chama a regra de domínio, que valida índice, quantidade, preço e limites
antes de atualizar o rascunho. Essa rota é síncrona e não persiste áudio ou comando
no MVP; a fila durável continua sendo usada para a interpretação inicial. Após
aplicar, o app oferece **Desfazer última alteração** até que uma edição manual ou
um novo áudio substitua esse histórico curto.

### Benchmark local de voz

Para comparar combinações do Whisper e do GPT-OSS com áudios fictícios, configure o worker somente em desenvolvimento:

```powershell
$env:VOICE_BENCHMARK_AUDIO_DIR = "../../tmp/voice-benchmark/audio"
$env:VOICE_BENCHMARK_RUN = "true"
$env:VOICE_BENCHMARK_COMBINATIONS = "whisper-large-v3-turbo|openai/gpt-oss-20b,whisper-large-v3|openai/gpt-oss-20b,whisper-large-v3-turbo|openai/gpt-oss-120b"
pnpm --filter @cotali/worker benchmark:voice
```

O manifesto `cases.json` deve ficar nessa pasta. Cada caso informa `id` e `audio`;
para medir qualidade, preencha também `expectedTranscript` e `expectedFields`
com o gabarito. Sem esses campos, o comando serve apenas como teste de fumaça.
O relatório JSON separa as transcrições das extrações: cada áudio é transcrito uma
vez por modelo Whisper e o mesmo texto é enviado aos modelos GPT-OSS configurados.
Ele traz pontuação de palavras, pontuação dos campos, latência, tokens e custos
estimados de transcrição e extração. O benchmark exige
`VOICE_BENCHMARK_RUN=true`, recusa `NODE_ENV=production` e não é incluído nos
testes automáticos. Se os preços públicos mudarem, atualize a tabela de preços
no script antes de usar o custo como critério.

Quando `VOICE_BENCHMARK_AUDIO_DIR` estiver definido junto com
`VOICE_BENCHMARK_RUN=true`, o worker também arquiva uma cópia do áudio recebido e
um arquivo de metadados na pasta indicada. A pasta `tmp/` é ignorada pelo Git e
essa cópia nunca é feita em produção.

Para uma decisão confiável, use vários casos fictícios (por exemplo: nomes,
quantidades, unidades, valores, sotaques/ruído e frases ambíguas) e mantenha a
mesma referência esperada para todas as combinações. Compare primeiro a
pontuação dos campos e a taxa de erro; use latência e custo como desempate.

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
