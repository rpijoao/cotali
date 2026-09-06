# ADR-003 — Autenticação e comunicações do Cotali

- Status: aceito e implementado no backend/clientes; não aprovado para produção
- Data: 2026-09-06
- Decisão: Better Auth dentro do monólito modular, com Resend para emails

## Contexto

O Cotali precisa permitir que um profissional autônomo entre pelo celular e
continue o trabalho no web quando essa superfície estiver disponível. O MVP
deve ter um usuário por conta, suportar Google, Apple e código enviado por
email, manter sessões persistentes e não transformar dados do orçamento em uma
base de marketing sem consentimento.

O backend atual é Fastify + Prisma + PostgreSQL. A API já recebe uma identidade
abstrata, mas o modo de desenvolvimento usava `Bearer dev:local-user` e a
produção estava preparada para um OIDC ainda não escolhido. Esse mecanismo não
deve ser usado como autenticação de produção.

## Decisão

### Engine e fronteiras

- Better Auth é a engine de autenticação, sessões, OAuth e OTP.
- A implementação fica em `apps/api/src/auth`, no mesmo processo da API e na
  mesma base PostgreSQL. Não há microserviço de auth no MVP.
- A API expõe o Better Auth em `/v1/auth/*` e os módulos de negócio recebem
  apenas `userId` como `authSubject` através de `Authenticator`.
- `apps/api/src/auth/authenticator.ts` converte a sessão Better Auth em uma
  identidade interna. O domínio não importa Better Auth.
- `Account.auth_subject` guarda o `AuthUser.id` e mantém a associação lógica
  de um usuário Cotali para uma conta de negócio.

Os modelos de Better Auth usam nomes Prisma próprios (`AuthUser`,
`AuthSession`, `AuthAccount`, `AuthVerification` e `AuthRateLimit`) e tabelas
`auth_*`. Isso evita colisão com o modelo de negócio `Account`, sem exigir que
os agregados do Cotali conheçam o schema interno do provedor.

### Métodos do MVP

- Google OAuth.
- Apple OAuth, incluindo email relay privado; a identidade do provedor é o
  `sub`, nunca o email.
- Email OTP.

Não entram no MVP: senha, SMS/telefone, códigos de recuperação ou login
Microsoft/SSO corporativo. Eles podem ser adicionados como novos métodos sem
alterar o contrato de domínio.

### OTP

- seis dígitos;
- validade de dez minutos;
- cinco tentativas por código;
- o novo envio gira o código anterior;
- armazenamento hash (`storeOTP: hashed`);
- `disableSignUp: false` é explícito: solicitar OTP para login também pode iniciar
  o cadastro, sem alterar a resposta conforme a existência do email;
- no máximo três solicitações por janela de 60 segundos no plugin, além do
  rate limit geral da autenticação;
- cada envio também consome um bucket distribuído por email normalizado + IP
  resolvido pelo Fastify, com a chave formada por HMAC e sem persistir os
  identificadores em claro;
- o bucket distribuído usa a tabela `auth_rate_limits` e lock transacional do
  PostgreSQL, portanto as instâncias da API compartilham o mesmo limite;
- `TRUSTED_PROXY_HOPS` controla quantos saltos de proxy são confiáveis; o IP
  resolvido é repassado ao Better Auth por header interno sobrescrito pela API;
- respostas de login não devem confirmar se um email está cadastrado;
- o código nunca é escrito em logs, analytics ou banco em texto puro.

O rate limit de auth usa tabela própria no PostgreSQL; o limite HTTP geral
continua no Fastify. O limite por email + IP foi validado com requisições
concorrentes no PostgreSQL Neon de desenvolvimento.

### Sessões e clientes

- Web usa cookie seguro emitido pelo Better Auth e requisições com
  `credentials: include`.
  A API declara `httpOnly`, `path=/`, `secure` conforme o protocolo da API e
  `SameSite=lax` por padrão. `AUTH_COOKIE_SAME_SITE=none` só pode ser usado
  explicitamente com HTTPS; cookies de produção exigem `BETTER_AUTH_URL` HTTPS.
- Android usa `@better-auth/expo` e `expo-secure-store`; chamadas à API de
  negócio recuperam o cookie armazenado e o enviam no header `Cookie`.
- A sessão expira após 30 dias de inatividade e é renovada diariamente quando
  usada.
- Logout atual e logout de todos os dispositivos são operações do Better Auth;
  a UI completa desses controles entra na tela de conta.
- A API de negócio aceita cookie de sessão, não JWT artesanal e não confia em
  identidade enviada pelo cliente no corpo.

### Conta, identidade e vinculação

O primeiro login válido cria o `AuthUser`, a identidade do provedor, a conta
Better Auth e a sessão. O hook de criação garante também a conta de negócio.

Um email igual não vincula automaticamente dois provedores. A vinculação
futura deve ser iniciada por uma sessão autenticada, exigir confirmação do
método que já está vinculado e manter `allowDifferentEmails: false`. A remoção
de todas as identidades não é permitida automaticamente.

### Email e Resend

`AuthEmailService` é a fronteira interna. A implementação atual usa Resend e
renderiza um email transacional de OTP com HTML e texto alternativo em
`apps/api/src/email/email-service.ts`. O backend fornece o remetente e a chave;
nenhuma chave de Resend vai para mobile ou web.

Emails de autenticação são categorizados separadamente de futuros emails de
marketing. Antes de escalar, o serviço deve ganhar idempotência, retry com
backoff e tratamento de webhooks/bounces, sem reprocessar um mesmo disparo.

### Privacidade, consentimento e sinais de valor

O checkbox de marketing começa desmarcado e não bloqueia o login. Após o login,
`POST /v1/privacy/consents/marketing-email` grava uma linha imutável em
`consent_records` com:

- finalidade (`MARKETING_EMAIL`);
- decisão concedida ou recusada;
- versão da política;
- canal (`WEB` ou `MOBILE`);
- data e conta.

Os eventos permitidos em `value_events` são `QUOTE_CREATED`, `QUOTE_UPDATED` e
`QUOTE_SHARED`. A chave do evento é idempotente por conta. Os metadados são
restritos a `quoteId` e origem do fluxo; nunca incluir áudio, transcrição, nome
do cliente, telefone ou valores monetários.

Comunicação operacional (por exemplo, segurança e entrega de OTP) não depende
do opt-in de marketing. Reengajamento, dicas e novidades dependem de opt-in
vigente. Um worker futuro poderá consultar a última atividade significativa e
enviar um email somente depois de verificar esse consentimento; não há envio
automático de inatividade implementado neste corte.

### Planos e limites

Os três planos ainda não têm preço, limites ou critérios fechados. Portanto,
Better Auth não conhece plano nem uso. Esses dados devem ficar ligados à
`Account`, em módulo de billing/entitlements, com configuração versionada e
sem números inventados no auth.

## Configuração obrigatória

O arquivo `apps/api/.env.example` contém os nomes. Em produção são obrigatórios:

- `BETTER_AUTH_URL` e `BETTER_AUTH_SECRET`;
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`;
- `APPLE_CLIENT_ID` e `APPLE_CLIENT_SECRET`;
- `RESEND_API_KEY` e `RESEND_FROM_EMAIL`;
- `PRIVACY_POLICY_VERSION` igual à versão da política aprovada;
- `DATABASE_URL` e `DATABASE_URL_UNPOOLED`;
- `WEB_APP_URL`/`CORS_ORIGINS` com origens explícitas.
- `AUTH_TRUSTED_ORIGINS` com a lista exata de origens web e mobile permitidas
  para OAuth; curingas não são aceitos em produção.
- `TRUSTED_PROXY_HOPS` deve refletir a topologia real quando a API estiver atrás
  de proxy; o valor `0` é o padrão seguro para conexão direta.
- `AUTH_COOKIE_SAME_SITE` aceita `lax`, `strict` ou `none`; o padrão é `lax`.
  O valor `none` exige HTTPS e deve ser usado somente após revisão de CSRF.

Os redirects OAuth de Google e Apple devem apontar para o endpoint Better Auth
do ambiente correspondente (`/v1/auth/callback/google` ou
`/v1/auth/callback/apple`). A API valida `callbackURL`, `errorCallbackURL` e
`newUserCallbackURL` antes de delegar ao Better Auth. O app Expo usa o scheme
`cotali://`; schemes `exp://` só entram nos defaults fora de produção.

## Migração

As tabelas são versionadas em:

- `20260906000100_add_better_auth`;
- `20260906000200_add_consent_and_value_events`;
- `20260906000300_add_security_audit_events`;
- `20260906000400_normalize_auth_timestamps`;
- `20260906000500_normalize_consent_value_timestamps`.
- `20260906000600_align_auth_account_index_name`.

O ambiente local deste checkout não possui PostgreSQL ouvindo em `localhost:5432`.
As cinco migrations relacionadas ao auth e aos dados de consentimento/eventos foram
aplicadas e verificadas na branch Neon `cotali/development`; as migrations 004 e 005
convertem as colunas temporais legadas sem fuso interpretando seus valores como UTC.
Aplicar em homologação com:

```powershell
corepack pnpm --filter @cotali/database db:migrate:deploy
corepack pnpm --filter @cotali/database db:generate
corepack pnpm --filter @cotali/database exec prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url $env:PRISMA_MIGRATE_SHADOW_DATABASE_URL --exit-code
```

`PRISMA_MIGRATE_SHADOW_DATABASE_URL` deve apontar para um banco vazio e isolado;
o comando aplica as migrations nesse banco temporário para comparar o resultado
com o schema Prisma.

## Consequências

### Positivas

- OAuth, cookies, hashing, rotação e sessões ficam em uma biblioteca mantida,
  sem criptografia ou protocolo reimplementado pelo Cotali.
- Mobile e web compartilham a mesma autoridade de sessão.
- O domínio permanece isolado de Better Auth.
- Consentimento, sinais de valor e segurança do login têm trilhas separadas, sem
  usar eventos de autenticação para marketing.

### Custos e riscos assumidos

- Better Auth precisa acompanhar atualizações de segurança e mudanças de
  schema.
- A entrega de email passa a depender da configuração, reputação e limites do
  Resend.
- OAuth exige redirects separados por ambiente e configuração correta dos
  apps Google/Apple.
- A sessão por cookie entre origens exige CORS restrito e HTTPS em produção.
- A confiança de proxy, os alertas e os testes de abuso em homologação ainda
  precisam ser fechados antes da produção.

## Validação antes de produção

1. Repetir as migrations do domínio e do auth em uma branch de homologação, executar
   `prisma migrate diff` e verificar as colunas temporais do Better Auth e do produto
   como `TIMESTAMPTZ(3)`.
2. Testar OTP expirado, código usado, cinco tentativas, rotação, enumeração para
   email existente/novo, entrada inválida, limite atingido e concorrência,
   sempre com respostas e logs genéricos.
3. Testar Google e Apple em web, Android e iOS development build, incluindo
   Apple relay privado.
4. Confirmar que uma sessão existente continua funcionando durante uma falha
   temporária do provedor OAuth.
5. Confirmar cookie seguro, CORS explícito, redaction de cookies/tokens e
   ausência de OTP em logs.
6. Testar login, logout atual, logout global e recuperação via outro método
   vinculado.
7. Validar checkbox, revogação e versionamento de consentimento com a política
   de privacidade aprovada.
8. Confirmar a gravação, proteção append-only, consulta restrita, alerta de falha
   e retenção aprovada da trilha `security_audit_events`.

Evidência técnica adicionada no commit `5ac36a5`: a integração PostgreSQL cobre o
ciclo de vida do email OTP (hash, expiração, tentativas, rotação e uso único) e o
isolamento entre dois `authSubject`s nas consultas de quotes. Essa evidência não
substitui a homologação com Google, Apple e Resend reais nem os testes web/mobile.
A migration `20260906000600_align_auth_account_index_name` corrige o drift do nome
do índice de `auth_accounts`; a CI remota `34067260618` aprovou o `migrate diff` e
a migration foi aplicada na branch Neon `development`.

## Referências

- [Better Auth — Expo](https://better-auth.com/docs/integrations/expo)
- [Better Auth — Prisma](https://better-auth.com/docs/adapters/prisma)
- [Better Auth — Email OTP](https://better-auth.com/docs/plugins/email-otp)
- [Resend — templates](https://resend.com/docs/dashboard/templates/introduction)
- [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

## Auditoria e privacidade

Este ADR registra a decisão arquitetural, não a aprovação de segurança, privacidade
ou operação. O inventário de dados, matriz de controles, ameaças, evidências e gate
de produção ficam no [pacote de auditoria do auth](../audits/cotali-authentication-audit-pack-2026-09-06.md).
O alinhamento técnico para a futura política está na [minuta de aviso de privacidade](../privacy/cotali-privacy-notice-draft-2026-09-06.md).
