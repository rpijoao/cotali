# Cotali

A paleta oficial do Cotali é azul `#1846e1` e branco `#ffffff`. Consulte a [identidade visual](./docs/product/cotali-visual-identity.md) antes de criar ou alterar componentes de interface.

Aplicativo mobile-first para profissionais autônomos criarem orçamentos por voz e compartilharem propostas e recibos em PDF.

## Decisões de produto

As decisões de produto, UX, copy, aquisição, ativação, monetização e retenção seguem o [framework de valor do Cotali](./docs/product/cotali-revenue-centric-design.md), adaptado do [Revenue-Centric Design](https://github.com/heliocosta-dev/revenue-centric-design). Mudanças de feature e fluxo devem partir do [template de briefing](./docs/product/feature-brief-template.md).

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

Para testar um aparelho físico fora da rede de casa usando Tailscale, conecte o
PC e o iPhone à mesma tailnet, descubra o IP do PC e anuncie esse host ao Expo:

```powershell
tailscale ip -4
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "<ip-tailscale-do-pc>"
corepack pnpm --filter @cotali/mobile exec expo start --lan
```

Em `apps/mobile/.env`, use o mesmo IP para a API:
`EXPO_PUBLIC_API_URL=http://<ip-tailscale-do-pc>:3333`. No Expo Go, abra a URL
`exp://<ip-tailscale-do-pc>:8081` (ou escaneie o QR exibido pelo Expo). O PC
precisa permanecer com a API e o Metro em execução, e o Firewall do Windows
deve permitir as portas TCP 3333 e 8081 no adaptador Tailscale.

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
`GET /v1/quotes/:id/proposal.pdf` gera a proposta em PDF no backend a partir
da revisão corrente validada, incluindo o perfil profissional sincronizado
quando disponível. O endpoint responde `404` se a cotação não pertencer à conta
autenticada.
Na tela de detalhes, **Enviar pelo WhatsApp** baixa esse arquivo para o
diretório de documentos do app e inicia o compartilhamento nativo. No Android,
o WhatsApp é direcionado para o número normalizado do cliente e recebe o PDF
com uma mensagem pré-preenchida. No iPhone, a folha nativa mostra o PDF e a
mensagem para o usuário escolher o WhatsApp; o app não afirma que a mensagem
foi entregue. **Exportar PDF** continua disponível para escolher outro app ou
salvar o arquivo.

O fluxo de WhatsApp usa `react-native-share`, um módulo nativo. Depois de
adicioná-lo, o Expo Go não contém esse módulo: é necessário gerar um novo
development build para testar no Android ou iPhone. A exportação genérica
continua usando `expo-sharing`.

`GET /v1/profile` e `PATCH /v1/profile` mantêm os dados profissionais da conta
(nome profissional, nome comercial, telefone, documento e endereço). O Android
mantém uma cópia local para leitura quando estiver sem conexão, mas a versão
sincronizada na API/PostgreSQL é a fonte oficial para documentos futuros.

### Autenticação

O Cotali usa Better Auth dentro da API Fastify, com sessões persistidas no
PostgreSQL. O MVP oferece login por Google, Apple e código de seis dígitos por
email. Não há senha, SMS ou token artesanal no cliente.

Copie `apps/api/.env.example` para `apps/api/.env` e preencha
`BETTER_AUTH_SECRET`, as credenciais Google/Apple e o remetente/segredo do
Resend. A chave do Resend fica somente no backend. Para o web, copie
`apps/web/.env.example`; no mobile, copie `apps/mobile/.env.example`.

Depois de conectar o PostgreSQL, aplique as migrations e gere o client Prisma:

```powershell
corepack pnpm --filter @cotali/database db:migrate:deploy
corepack pnpm --filter @cotali/database db:generate
```

Os detalhes de identidade, sessões, redirects OAuth, OTP, consentimento e
eventos de valor estão no [ADR-003](./docs/architecture/adr-003-cotali-authentication.md)
e no [briefing da feature](./docs/product/feature-brief-authentication.md). Para
auditoria, use o [pacote de controles e evidências](./docs/audits/cotali-authentication-audit-pack-2026-09-06.md)
e a [minuta técnica de privacidade](./docs/privacy/cotali-privacy-notice-draft-2026-09-06.md).

Para desenvolvimento sem credenciais sociais, use o OTP com um domínio de
envio válido no Resend. A API continua usando a mesma sessão Better Auth.
Para testes locais de módulos legados, o bearer `dev:*` de teste só é aceito quando `AUTH_MODE=development` e
`NODE_ENV` não é `production`; esse caminho é rejeitado pelo servidor em
produção.

O teste do adaptador PostgreSQL real é habilitado explicitamente com `RUN_DATABASE_INTEGRATION=true`. Ele usa `TEST_DATABASE_URL` quando definida e, caso contrário, a `DATABASE_URL` de `apps/api/.env`.

## Verificação

O fluxo de voz usa `POST /v1/voice/interpretations` com multipart contendo `mutationId` (UUID) e `audio` (até 25 MB). A API autentica, grava um `VoiceJob` na branch Neon e responde `202` com o status `pending`. O worker (`pnpm dev:worker`) reclama jobs com lease, transcreve/interpreta no Groq, persiste o resultado e remove o áudio binário ao concluir. O app consulta `GET /v1/voice/interpretations/:mutationId` até receber `completed` ou `failed`. Retries usam a mesma chave e não duplicam o job.

Na segunda etapa, a tela de dados oferece **Ajuste por voz**. O app envia o áudio,
`mutationId` e o contexto atual do cliente e das linhas para
`POST /v1/voice/commands`. A rota usa os mesmos modelos configurados no Groq e
retorna uma única operação normalizada, como `services[0].quantity = "3"` ou
`client.name = "Roberto Pedro Pereira"`, e usa `no_op` quando o pedido é ambíguo
ou ainda não é suportado. O app mostra a transcrição e a alteração proposta;
somente o botão **Aplicar alteração** chama a regra de domínio, que valida o
alvo e os valores antes de atualizar o rascunho. Essa rota é síncrona e não
persiste áudio ou comando no MVP; a fila durável continua sendo usada para a
interpretação inicial. Após aplicar, o app oferece **Desfazer última alteração**
até que uma edição manual ou um novo áudio substitua esse histórico curto.

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
