# Cotali — pacote de auditoria de autenticação e privacidade

- **Versão:** 0.1
- **Data do snapshot:** 2026-09-06
- **Status:** pré-auditoria técnica; não é certificação nem aprovação para produção
- **Escopo:** Better Auth, OTP por email, Google, Apple, sessões, Fastify, web,
  mobile, Resend, consentimento e eventos de valor
- **Revisão de código:** `cd75cef` + correções técnicas desta reauditoria
- **Responsável técnico:** produto/engenharia Cotali — preencher responsável nominal
- **Responsável por privacidade:** preencher antes de publicação
- **Próxima revisão:** antes do primeiro ambiente de produção e a cada mudança de
  provedor, método de login, finalidade, schema ou política de retenção

## Como ler este documento

Este pacote separa quatro coisas que não podem ser confundidas em uma auditoria:

- **Fato:** comportamento observado no código, no schema ou em um comando executado.
- **Evidência:** artefato que permite reproduzir ou verificar o fato.
- **Decisão:** regra aprovada para o produto.
- **Pendência:** controle ainda não implementado, não testado ou dependente de
  decisão externa.

Um pacote de documentação pode tornar o sistema rastreável, mas não transforma uma
pendência em controle implementado. O status só pode ser elevado para “aprovado”
quando existir evidência da execução e uma pessoa responsável tiver assinado a
revisão.

### Legenda de status

| Status                              | Significado                                                              |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `IMPLEMENTADO`                      | Existe no código/schema e foi verificado localmente.                     |
| `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | Existe no código, mas falta teste, configuração ou registro operacional. |
| `PARCIAL`                           | Parte do controle existe; há uma lacuna conhecida.                       |
| `PENDENTE`                          | Ainda precisa de implementação ou decisão.                               |
| `FORA DO ESCOPO`                    | Não pertence ao MVP; deve ser reavaliado antes de ser adicionado.        |

## 1. Veredito atual

### Resultado

### Correcoes incorporadas apos a reauditoria

- A politica de cookie web agora declara `httpOnly`, `path=/`, `secure` conforme
  HTTPS e `SameSite` configuravel, com `lax` como padrao.
- Produção falha fechada sem HTTPS na `BETTER_AUTH_URL`; `SameSite=none` exige
  HTTPS explicitamente.
- O bearer `dev:*` falha em produção, o factory OIDC morto foi removido e a
  `PRIVACY_POLICY_VERSION` agora é obrigatória sem fallback silencioso.
- A CI passou a executar os três testes de integração PostgreSQL de segurança,
  além do teste de quotes existente.

O desenho do auth está documentado e o primeiro corte está implementado. A base
passa typecheck, lint, testes, build e auditoria de dependências no checkout local.
Isso ainda não equivale a prontidão de auditoria formal porque faltam evidências de
ambiente e controles de operação, privacidade e resposta a incidentes.

### Bloqueadores para declarar “aprovado para produção”

1. Repetir em homologação a aplicação das migrations já validadas na branch Neon
   `development` e guardar o resultado, incluindo rollback ou procedimento de
   recuperação.
2. Executar testes reais de OTP, Google e Apple em web, Android e iOS development
   build, com os redirects do ambiente documentados.
3. Publicar uma política de privacidade aprovada, com controlador, canal de contato,
   finalidades, bases legais, compartilhamentos, transferências, retenção e direitos.
4. Definir e implementar retenção, exclusão de conta/dados e atendimento de direitos
   do titular; hoje isso não existe como fluxo completo.
5. Concluir monitoramento, alertas, owners e retenção da trilha de auditoria de
   segurança; a trilha mínima já foi implementada e os eventos de valor continuam
   separados dos logs de segurança.
6. Definir gestão/rotação de segredos, backup/restore, incidentes, RTO/RPO e acesso
   administrativo, com evidências de execução.
7. Fazer a CI ficar verde: o `format:check` atual do repositório ainda falha em
   arquivos preexistentes, embora os arquivos novos do auth estejam formatados.
8. Executar a CI remota com os testes de integração de auditoria, timestamps e
   rate limit habilitados; a configuração local já inclui esses testes.
9. Repetir em homologação a comprovação de timestamps UTC das tabelas gerenciadas
   pelo Better Auth; a branch `development` já usa `TIMESTAMPTZ(3)` e foi validada.

## 2. Referências normativas e técnicas

Estas referências orientam o controle; não são uma declaração automática de
conformidade:

- [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/),
  como base de verificação técnica de aplicações web.
- [OWASP ASVS — sessão fundamental](https://cornucopia.owasp.org/taxonomy/asvs-5.0/07-session-management/02-fundamental-session-management-security),
  especialmente verificação no backend, tokens dinâmicos, entropia e rotação de
  sessão.
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
  para throttling e autenticação.
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
  para eventos de segurança, separação de trilhas, proteção e descarte de logs.
- [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)
  para acesso, correção, eliminação, portabilidade e revogação de consentimento.
- [Better Auth — Prisma](https://better-auth.com/docs/adapters/prisma),
  [Email OTP](https://better-auth.com/docs/plugins/email-otp) e
  [Expo](https://better-auth.com/docs/integrations/expo) para o comportamento do
  componente adotado.
- [Google OAuth para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server)
  e [configuração do Sign in with Apple](https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple)
  para a configuração dos provedores.
- [Resend — eventos de email](https://resend.com/docs/webhooks/event-types) e
  [webhooks](https://resend.com/docs/api-reference/webhooks/create-webhook) para
  entrega, bounce, complaint, assinatura e idempotência.

## 3. Escopo, arquitetura e fronteiras de confiança

```text
web browser / Expo mobile
        │  OTP ou OAuth; cookie de sessão
        ▼
Fastify API /v1/auth/* ── Better Auth
        │                    │
        │                    ├── Google / Apple OAuth
        │                    ├── Resend: OTP transacional
        │                    └── PostgreSQL: users, accounts, sessions,
        │                                      verifications, rate limits
        ▼
Authenticator ── authSubject ── Account ── domínio de orçamentos
                                      ├── perfil e clientes
                                      ├── quotes e revisões
                                      ├── consent_records
                                      └── value_events
```

### Fronteiras obrigatórias

- Better Auth é autoridade de identidade e sessão; o domínio só recebe a identidade
  abstrata `authSubject`.
- A API nunca aceita `accountId` ou `authSubject` fornecido pelo cliente para decidir
  autorização.
- `Account.auth_subject` associa um usuário Better Auth a uma conta Cotali do MVP.
- Credenciais do Resend, Google e Apple existem somente no backend.
- A base PostgreSQL é a fonte autoritativa; SecureStore é armazenamento de sessão
  no dispositivo, não fonte de autorização.
- Dados de cliente, telefone, documento, orçamento, áudio e transcrição não entram
  nos eventos de marketing.

## 4. Inventário de ativos e dados

O inventário abaixo é técnico. A classificação jurídica, a base legal final e os
prazos de retenção precisam ser validados pelo responsável de privacidade.

| Ativo/tabela                              | Dados principais                                                                         | Classificação técnica                         | Finalidade                                              | Armazenamento/compartilhamento                                                   | Retenção atual                                                | Status                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------- |
| `auth_users` / `AuthUser`                 | id, nome, email, email verificado, imagem                                                | pessoal cadastral                             | identidade e sessão                                     | PostgreSQL; Better Auth                                                          | não definida além do uso da conta                             | `PARCIAL`                                   |
| `auth_accounts` / `AuthAccount`           | provedor, `account_id`, `provider_id`, tokens OAuth, escopos                             | credencial/segredo de integração              | vincular Google/Apple e renovar OAuth quando necessário | PostgreSQL; tokens configurados para criptografia pelo Better Auth               | não definida; revogação/exclusão pendente                     | `IMPLEMENTADO — EVIDÊNCIA PENDENTE`         |
| `auth_sessions` / `AuthSession`           | token opaco, expiração, timestamps, IP, user-agent, user id                              | segurança e potencialmente pessoal            | autenticar chamadas e revogar sessões                   | PostgreSQL; não vai para logs comuns                                             | expira em 30 dias de inatividade; limpeza física não definida | `PARCIAL`                                   |
| `auth_verifications` / `AuthVerification` | identificador, valor do OTP, expiração, timestamps                                       | autenticação temporária                       | validar email OTP                                       | PostgreSQL; identificador e OTP configurados para hash                           | até expiração/uso; job de limpeza não definido                | `PARCIAL`                                   |
| `auth_rate_limits` / `AuthRateLimit`      | chave HMAC, contador, último request                                                     | antifraude/segurança                          | limitar abuso                                           | PostgreSQL; email/IP não são armazenados em claro                                | não definida                                                  | `IMPLEMENTADO — EVIDÊNCIA PENDENTE`         |
| `accounts` / `Account`                    | id, identidade auth, nome profissional, negócio, telefone, documento, endereço           | pessoal e potencialmente identificável        | conta e documentos comerciais                           | PostgreSQL; acesso por autorização de conta                                      | não definida                                                  | `PARCIAL`                                   |
| `clients` / `Client`                      | nome e telefone de cliente                                                               | pessoal de terceiro                           | criar orçamento e compartilhar proposta                 | PostgreSQL; pode aparecer em PDF/WhatsApp quando o profissional solicitar        | não definida; tombstone existente no schema                   | `PARCIAL`                                   |
| `quotes` e revisões                       | cliente, serviços, materiais, preços, pagamentos, prazos, observações                    | comercial/financeiro e potencialmente pessoal | criar, revisar e compartilhar orçamento                 | PostgreSQL; PDF sob demanda                                                      | não definida                                                  | `FORA DO ESCOPO DO AUTH; RETENÇÃO PENDENTE` |
| `consent_records`                         | decisão, finalidade, versão da política, canal, data, conta                              | evidência de consentimento                    | comprovar preferência de marketing                      | PostgreSQL; acesso restrito                                                      | prazo jurídico não definido                                   | `IMPLEMENTADO — EVIDÊNCIA PENDENTE`         |
| `value_events`                            | conta, chave idempotente, nome do evento, `quoteId`, origem, data                        | telemetria mínima                             | medir valor entregue e reengajamento autorizado         | PostgreSQL; não contém nome, telefone, áudio ou valores                          | prazo de produto não definido                                 | `IMPLEMENTADO — EVIDÊNCIA PENDENTE`         |
| `security_audit_events`                   | categoria, resultado, status, método, rota, request id, auth subject opcional, timestamp | segurança operacional/potencialmente pessoal  | investigar autenticação e abuso; não usar em marketing  | PostgreSQL; trigger append-only; sem email, OTP, cookie, token, IP ou user-agent | retenção e acesso não aprovados                               | `PARCIAL`                                   |
| logs da API                               | requests, erros e metadados operacionais                                                 | operacional/potencialmente pessoal            | diagnóstico e segurança                                 | destino de logs ainda não formalizado                                            | não definida                                                  | `PENDENTE`                                  |
| Resend                                    | destinatário, remetente, assunto, corpo do OTP e eventos de entrega                      | operador externo de email                     | entregar comunicação operacional                        | Resend; DPA, região e retenção precisam ser registrados                          | conforme configuração/contrato do fornecedor                  | `PENDENTE`                                  |

### Dados proibidos em marketing

O produtor de eventos deve rejeitar ou nunca receber:

- áudio e arquivo binário;
- transcrição ou interpretação;
- nome e telefone do cliente;
- CPF/CNPJ e endereço;
- preço, desconto, total, condição de pagamento ou saldo;
- conteúdo livre de observações;
- token, OTP, cookie, IP ou user-agent.

Os únicos eventos de valor aceitos hoje são `QUOTE_CREATED`, `QUOTE_UPDATED` e
`QUOTE_SHARED`; seus metadados permitidos são `quoteId` e `source`.

## 5. Registro do comportamento de autenticação

| Cenário                   | Comportamento decidido/implementado                                                                            | Evidência                                                                | Status                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------- |
| Email OTP                 | 6 dígitos, 10 minutos, 5 tentativas, rotação no reenvio, hash do valor                                         | `apps/api/src/auth/better-auth.ts`; `AuthVerification`                   | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` |
| Limite OTP email+IP       | 3 solicitações/60s por combinação; HMAC, lock transacional e resposta 429 genérica                             | `otp-rate-limit-service.ts`; teste unitário, rota e concorrência no Neon | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` |
| Enumeração de emails      | respostas idênticas para emails válidos existentes/novos; entrada inválida e limite não expõem estado da conta | ADR-003; `auth-enumeration.test.ts`                                      | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` |
| Google                    | OAuth Better Auth; conta de provedor separada                                                                  | config `socialProviders.google`; teste real pendente                     | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` |
| Apple                     | OAuth Better Auth; `sub`/identidade de provedor, inclusive relay email                                         | config `socialProviders.apple`; relay e teste real pendentes             | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` |
| Senha                     | não existe no MVP; `emailAndPassword` não é habilitado                                                         | ausência de configuração/rota de senha                                   | `IMPLEMENTADO`                      |
| SMS/telefone              | fora do MVP                                                                                                    | feature brief                                                            | `FORA DO ESCOPO`                    |
| Microsoft/SSO corporativo | fora do MVP                                                                                                    | feature brief                                                            | `FORA DO ESCOPO`                    |
| Identidade de negócio     | `AuthUser.id` é salvo em `Account.auth_subject`                                                                | hook de criação em `better-auth.ts`                                      | `IMPLEMENTADO`                      |
| Auto-link por email       | desabilitado; linking futuro exige sessão autenticada                                                          | `disableImplicitLinking: true` e ADR-003                                 | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` |
| Sessão web                | cookie Better Auth com credenciais incluídas                                                                   | `apps/web/lib/auth-client.ts`                                            | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` |
| Sessão mobile             | cookie Better Auth persistido com Expo/SecureStore; enviado à API de negócio                                   | `apps/mobile/src/auth/auth-client.ts` e `api-client.ts`                  | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` |
| Expiração                 | 30 dias de inatividade e atualização diária                                                                    | `session.expiresIn` e `updateAge`                                        | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` |
| Logout                    | logout atual no mobile; logout global/UI de gerenciamento ainda pendente                                       | `App.tsx`; Better Auth                                                   | `PARCIAL`                           |
| Falha de OAuth            | sessão existente não depende de renovar OAuth em cada request                                                  | arquitetura de sessão persistida; teste de indisponibilidade pendente    | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` |
| Autorização de negócio    | identidade vem da sessão; rotas filtram por conta                                                              | `Authenticator` e serviços de domínio                                    | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` |

## 6. Matriz de controles de segurança

| ID         | Controle                                         | Implementação/evidência esperada                                                                                                                                      | Status                              | Ação de fechamento                                                                             |
| ---------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `AUTH-001` | Verificar toda sessão no backend                 | `BetterAuthAuthenticator` chama `auth.api.getSession`; nunca confiar em identidade do corpo                                                                           | `IMPLEMENTADO`                      | teste de rota com cookie válido, expirado e ausente                                            |
| `AUTH-002` | Tokens de sessão dinâmicos e opacos              | Better Auth usa `AuthSession` persistida; nenhum JWT artesanal no cliente                                                                                             | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | guardar teste/inspeção de token e revisão de versão do Better Auth                             |
| `AUTH-003` | Sessão nova e invalidação em autenticação/logout | endpoints Better Auth e tabela persistida                                                                                                                             | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | testar reautenticação, logout atual e logout global                                            |
| `AUTH-004` | Cookie, CORS e HTTPS restritos                   | CORS explícito em produção; cookies Better Auth com `httpOnly`, `path=/`, `SameSite` explícito e `secure` conforme HTTPS; logger redige `cookie` e `set-cookie`       | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | configurar domínios reais, executar HTTPS e teste de preflight/cookie em homologação           |
| `AUTH-005` | OTP com segredo não recuperável                  | `storeOTP: hashed`, `storeIdentifier: hashed`, sem log do código                                                                                                      | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | testar banco/logs após envio, tentativa, expiração e uso                                       |
| `AUTH-006` | Throttling contra brute force e abuso de email   | limite OTP 3/60s, bucket HMAC email+IP em `auth_rate_limits` com lock transacional PostgreSQL, limite Better Auth em PostgreSQL e limite HTTP Fastify                 | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | repetir teste de abuso em homologação, configurar proxy confiável e alertas                    |
| `AUTH-007` | Respostas anti-enumeração                        | Better Auth mantém `success: true` para email válido existente/novo; entrada inválida e limite têm resposta sem estado de conta; teste automatizado cobre os cenários | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | executar a matriz em homologação com logs redigidos e anexar resultado                         |
| `AUTH-008` | OAuth redirect allowlist                         | `AUTH_TRUSTED_ORIGINS` explícito, validação Cotali antes do Better Auth para callbacks OAuth, `trustedOrigins` e secrets por ambiente                                 | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | anexar configuração Google/Apple por ambiente e executar teste real dos provedores             |
| `AUTH-009` | Identidade de provedor estável                   | Better Auth persiste conta por identidade do provedor; email não é chave de vínculo                                                                                   | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | teste com Apple relay e email coincidente em provedores diferentes                             |
| `AUTH-010` | Tokens OAuth protegidos em repouso               | `encryptOAuthTokens: true`                                                                                                                                            | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | documentar chave, rotação, acesso e teste de restauração                                       |
| `AUTH-011` | Segredos fora do cliente e do Git                | `.env` ignorado; secrets só em backend                                                                                                                                | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | usar secret manager, registrar owners e rotação                                                |
| `AUTH-012` | Redaction de credenciais                         | Fastify redige Authorization, Cookie e Set-Cookie                                                                                                                     | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | teste de captura de logs e destino com acesso restrito                                         |
| `AUTH-013` | Auditoria de autenticação                        | `security_audit_events` registra requisições Better Auth, resultado, status, rota, método e request id; trigger bloqueia update/delete                                | `PARCIAL`                           | anexar evidência de deploy/consulta, definir retenção/alertas e cobrir eventos fora do handler |
| `AUTH-014` | Atualização e resposta a vulnerabilidades        | CI executa `pnpm audit`; snapshot atual não reportou vulnerabilidades conhecidas                                                                                      | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | guardar artefato da CI remota e processo de patch emergencial                                  |
| `AUTH-015` | Limpeza de dados temporários                     | expiração lógica de OTP/sessão configurada; limpeza física não documentada                                                                                            | `PARCIAL`                           | criar job, métrica, retenção e teste de descarte                                               |

### Controle adicional de tempo

| ID         | Controle                    | Situação atual                                                                                                                                                                                | Status                              | Ação de fechamento                                                |
| ---------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `AUTH-016` | Instantes auditáveis em UTC | schema usa `@db.Timestamptz(3)` nas 12 colunas temporais do Better Auth; migration converte valores legados interpretando-os como UTC; teste consulta `information_schema` no PostgreSQL real | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | repetir em homologação e anexar evidência de dados legados/backup |

## 7. Matriz de privacidade e marketing

| ID         | Controle                       | Situação atual                                                                                                                     | Status                              | Ação de fechamento                                                                             |
| ---------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `PRIV-001` | Finalidade específica          | auth, segurança operacional, conta, orçamento e marketing estão separados no desenho                                               | `IMPLEMENTADO`                      | revisar com responsável de privacidade                                                         |
| `PRIV-002` | Consentimento livre e separado | checkbox de marketing desmarcado; login não depende dele                                                                           | `IMPLEMENTADO`                      | publicar aviso e registrar cópia aprovada da versão                                            |
| `PRIV-003` | Prova de consentimento         | `consent_records` guarda finalidade, decisão, versão, canal, conta e data                                                          | `IMPLEMENTADO — EVIDÊNCIA PENDENTE` | definir acesso, exportação, retenção e teste de revogação                                      |
| `PRIV-004` | Revogação facilitada           | schema aceita `granted: false`; UI/canal para revogar depois do login ainda não existe                                             | `PARCIAL`                           | criar tela/endpoint de preferências e teste de efeito                                          |
| `PRIV-005` | Minimização de telemetria      | whitelist de eventos e metadados                                                                                                   | `IMPLEMENTADO`                      | testar rejeição de payload indevido e revisão periódica                                        |
| `PRIV-006` | Política versionada            | código exige `PRIVACY_POLICY_VERSION` e falha fechado quando ausente; ainda não há política aprovada correspondente no repositório | `PARCIAL`                           | aprovar/publicar a política e comprovar que a versão configurada corresponde ao texto aprovado |
| `PRIV-007` | Retenção por finalidade        | não há tabela de prazos aprovada para auth, logs, eventos, quotes e backups                                                        | `PENDENTE`                          | aprovar matriz de retenção e automatizar descarte                                              |
| `PRIV-008` | Direitos do titular            | não há fluxo documentado/implementado para acesso, correção, eliminação, portabilidade e confirmação                               | `PENDENTE`                          | definir canal, identidade, SLA, escopo e evidências de atendimento                             |
| `PRIV-009` | Compartilhamento e operadores  | Better Auth, PostgreSQL/Neon, Google, Apple e Resend precisam constar no inventário jurídico                                       | `PENDENTE`                          | registrar contratos/DPA, finalidade, país/região e suboperadores                               |
| `PRIV-010` | Dados de terceiros             | cliente do profissional pode ser titular dos dados em nome/telefone/orçamento                                                      | `PENDENTE`                          | incluir no aviso, avaliar base legal e fluxo de solicitação                                    |
| `PRIV-011` | Decisão automatizada           | auth não usa IA para aprovar acesso; eventos de valor não são perfil de crédito                                                    | `IMPLEMENTADO`                      | manter revisão antes de usar scoring ou automação de reengajamento                             |

## 8. Modelo de ameaça e risco residual

| Ativo                   | Ameaça                                     | Controle atual                                                                             | Risco residual                                                   | Próxima evidência                                   |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------- |
| Conta do profissional   | ataque de força bruta ao OTP               | hash, expiração, tentativas e rate limit distribuído por email+IP                          | confiança de proxy, carga/abuso e alertas ainda não evidenciados | teste de carga/abuso e alerta                       |
| Email do profissional   | takeover do email ou encaminhamento do OTP | OTP temporário e mensagens genéricas                                                       | OTP é autenticação de fator único                                | decisão sobre segundo fator/WebAuthn conforme risco |
| Identidade Google/Apple | callback forjado ou redirect indevido      | state no banco, allowlist explícita, validação antes do Better Auth e provedor Better Auth | configuração externa e teste real ainda não anexados             | matriz de redirects por ambiente                    |
| Sessão                  | roubo de cookie/token                      | sessão opaca, SecureStore mobile, redaction                                                | HTTPS/produção e rotação não evidenciados                        | teste de armazenamento, transporte e logout         |
| Base auth               | vazamento de tokens OAuth/OTP              | criptografia de tokens OAuth e hash de OTP                                                 | chave/backup/acesso e limpeza pendentes                          | evidência de secret manager e restore               |
| Conta de negócio        | IDOR entre contas                          | `authSubject` vindo da sessão e filtros de conta                                           | cobertura de integração ainda incompleta                         | teste com duas contas e queries negativas           |
| Marketing               | uso de dados comerciais sem consentimento  | checkbox off, consent record e whitelist                                                   | política, revogação e worker ainda pendentes                     | teste de consentimento e consulta da última decisão |
| Logs                    | exposição de cookie, auth header ou OTP    | redaction parcial no Fastify                                                               | Better Auth/infra podem ter destinos próprios                    | inspeção de logs reais e acesso restrito            |
| Disponibilidade         | Resend/OAuth fora do ar                    | sessão existente não depende do provedor                                                   | primeiro login fica indisponível; sem SLO/runbook                | teste de outage e procedimento operacional          |
| Dados do cliente        | uso de nome/telefone para marketing        | eventos não recebem esses campos                                                           | logs, Resend e exports ainda sem política completa               | DLP/revisão de payloads e retenção                  |

## 9. Retenção, exclusão e backup

Esta seção é deliberadamente um registro de decisão pendente. Não inventar prazos
para preencher uma auditoria.

| Conjunto              | Pergunta que precisa de decisão                                      | Implementação necessária                                    | Owner                 | Status     |
| --------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------- | ---------- |
| OTP/verifications     | quando eliminar registros expirados e usados?                        | job idempotente, métrica e teste                            | engenharia            | `PENDENTE` |
| Sessions              | quando apagar sessões expiradas e quais dados manter para segurança? | limpeza, logout global e evidência                          | engenharia            | `PENDENTE` |
| Auth accounts         | o que acontece ao desvincular/deletar Google/Apple?                  | revogação, unlink seguro e prevenção de conta órfã          | produto/engenharia    | `PENDENTE` |
| Account               | o que é exclusão, anonimização ou suspensão?                         | fluxo autenticado, confirmação e tombstone                  | produto/privacidade   | `PENDENTE` |
| Quotes/clients        | prazos comerciais e dados de terceiros                               | política de retenção por finalidade                         | produto/privacidade   | `PENDENTE` |
| Consent records       | prazo de prova de consentimento e revogação                          | acesso restrito, export e descarte controlado               | privacidade           | `PENDENTE` |
| Value events          | quando deixam de ser necessários para métricas/reengajamento?        | job de retenção                                             | produto               | `PENDENTE` |
| Security audit events | retenção de evidência de segurança e minimização                     | job/política de retenção, acesso restrito e alerta de falha | engenharia/operações  | `PENDENTE` |
| Logs                  | retenção de segurança versus diagnóstico                             | centralização, redaction, acesso e descarte                 | operações             | `PENDENTE` |
| Backups               | retenção, criptografia, região e exclusão propagada                  | política e teste de restore                                 | operações             | `PENDENTE` |
| Resend                | retenção no dashboard e eventos/webhooks                             | contrato, configuração e minimização                        | operações/privacidade | `PENDENTE` |

## 10. Gestão de segredos e acesso administrativo

### Segredos conhecidos

| Segredo/configuração       | Local de uso                                    | Não pode aparecer em   | Rotação definida? | Status                                     |
| -------------------------- | ----------------------------------------------- | ---------------------- | ----------------- | ------------------------------------------ |
| `BETTER_AUTH_SECRET`       | cookies, tokens internos e proteção Better Auth | web, mobile, Git, logs | não               | `PENDENTE`                                 |
| `GOOGLE_CLIENT_SECRET`     | OAuth backend                                   | clientes, Git, logs    | não               | `PENDENTE`                                 |
| `APPLE_CLIENT_SECRET`      | OAuth backend                                   | clientes, Git, logs    | não               | `PENDENTE`                                 |
| `RESEND_API_KEY`           | envio OTP backend                               | clientes, Git, logs    | não               | `PENDENTE`                                 |
| `RESEND_WEBHOOK_SECRET`    | futuro webhook Resend                           | clientes, Git, logs    | não               | `FORA DO CORTE; PENDENTE ANTES DO WEBHOOK` |
| `DATABASE_URL`/credenciais | Prisma/API e migrations                         | clientes, Git, logs    | não               | `PENDENTE`                                 |

### Requisitos operacionais

- secrets de produção devem ser entregues por secret manager, não por arquivo local;
- cada segredo deve ter owner, data de criação, data de última rotação e procedimento
  de revogação;
- acessos administrativos ao banco, Resend, Google, Apple, CI e deploy devem usar
  contas individuais, MFA e menor privilégio;
- operações de suporte não podem pedir OTP ao usuário nem acessar tokens de sessão;
- qualquer rotação deve registrar impacto em sessões existentes, OAuth e rollback;
- acessos e mudanças administrativas devem gerar trilha de auditoria separada dos
  eventos de produto.

## 11. Observabilidade, incidentes e continuidade

### Trilha mínima implementada no backend

A API grava uma linha em `security_audit_events` para cada requisição do wildcard
Better Auth. O registro contém categoria, resultado (`SUCCESS`/`FAILURE`), status
HTTP, método, rota sem query string, request id, timestamp `Timestamptz(3)` e o
identificador interno da sessão quando ele já está disponível. As categorias atuais
são `AUTH_REQUEST`, `OTP_REQUEST`, `OTP_VERIFY`, `SOCIAL_SIGN_IN`, `OAUTH_CALLBACK`,
`SESSION_READ`, `SESSION_SIGN_OUT`, `IDENTITY_LINK` e `RATE_LIMITED`.

O serviço expõe somente `record`; não há operação de alteração ou remoção. A
migration adiciona um trigger PostgreSQL que rejeita `UPDATE` e `DELETE` na tabela.
O trigger não substitui controle de acesso administrativo: superusuários do banco
continuam fora dessa garantia e a retenção ainda precisa de decisão aprovada.

Por minimização, essa trilha não armazena email, OTP, cookie, token, IP ou
user-agent. Se a persistência do evento falhar, a autenticação continua disponível
e o erro operacional é enviado ao logger sem credenciais; portanto alertas e
monitoramento de falha de auditoria ainda são necessários.

### Eventos mínimos de segurança ainda a definir

Além do corte atual, os eventos abaixo ainda precisam de cobertura explícita ou de
decisão de escopo. Eles são diferentes de `value_events` e não devem ser usados para
marketing:

- motivo normalizado de falha além do status HTTP, sem expor dados sensíveis;
- início e renovação de sessão como categorias próprias;
- detalhe controlado de erro do provedor, sem tokens OAuth;
- alteração de email, perfil de acesso, segredo ou preferência de comunicação;
- solicitação e conclusão de exportação/exclusão de dados;
- acesso administrativo e alteração de configuração.

Cada evento precisa definir timestamp UTC, `traceId`, resultado, componente,
identificador interno minimizado, origem, retenção, acesso e regra de redaction.
IP e user-agent só devem ser guardados quando necessários e com prazo aprovado.

### Runbooks que precisam existir antes de produção

1. OTP abusado ou Resend indisponível.
2. Suspeita de takeover de conta ou sessão roubada.
3. Vazamento/rotação de `BETTER_AUTH_SECRET`, OAuth secret ou Resend key.
4. Falha de migration, divergência de schema ou restore de banco.
5. Indisponibilidade do Google, Apple, Resend, PostgreSQL ou API.
6. Solicitação de titular, exclusão e revogação de consentimento.
7. Incidente de segurança envolvendo dados pessoais, incluindo avaliação de
   comunicação ao controlador, titulares e ANPD conforme orientação jurídica.

Cada runbook deve ter owner, severidade, canal de escalonamento, passos de contenção,
preservação de evidências, comunicação, recuperação, pós-incidente e teste anual.

### Continuidade

Definir e testar:

- RTO e RPO por ambiente;
- backup criptografado e restauração em ambiente isolado;
- procedimento de migration forward/recovery;
- comportamento com Resend/OAuth indisponíveis;
- revogação de todas as sessões após incidente;
- monitoramento de erro, latência, rate limit, bounce e complaint;
- alertas acionáveis e plantão/responsável.

## 12. Evidências executadas neste snapshot

| Evidência                                                 | Resultado observado                                                                                                            | Reprodutibilidade                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `corepack pnpm audit --audit-level moderate`              | aprovado; nenhum alerta conhecido no snapshot                                                                                  | executar na raiz do checkout                                                              |
| `corepack pnpm check`                                     | aprovado nos 8 pacotes                                                                                                         | executar na raiz                                                                          |
| `corepack pnpm lint`                                      | aprovado                                                                                                                       | executar na raiz                                                                          |
| `corepack pnpm test`                                      | aprovado; 12 tarefas, 42 testes mobile, 43 testes API; integrações PostgreSQL opt-in ignoradas sem habilitação                 | executar na raiz; habilitar integração separadamente                                      |
| `corepack pnpm build`                                     | aprovado; API, web, mobile Android e worker                                                                                    | executar na raiz                                                                          |
| Prettier nos arquivos novos/alterados do auth             | aprovado                                                                                                                       | comando específico documentado no handoff                                                 |
| `corepack pnpm format:check`                              | reprovado no estado global; 105 arquivos preexistentes fora do padrão                                                          | corrigir baseline antes de usar CI como gate verde                                        |
| configuração dos testes PostgreSQL de segurança na CI     | workflow executa auditoria append-only, timestamps e rate limit com `RUN_DATABASE_INTEGRATION=true`; URL remota ainda pendente | executar push/PR e anexar artefato redigido                                               |
| política de cookie web                                    | 9 testes locais cobrem `Secure`, `HttpOnly`, `Path`, `SameSite`, HTTPS obrigatório e rejeição de `none` sem HTTPS              | repetir em homologação com domínio real e HTTPS                                           |
| `git diff --check`                                        | sem erro de whitespace; Git emitiu avisos de LF/CRLF                                                                           | executar na raiz                                                                          |
| Prisma `generate` e `validate`                            | aprovados                                                                                                                      | executar com `DATABASE_URL` de validação                                                  |
| migrations Better Auth/consentimento/auditoria/timestamps | oito migrations aplicadas na branch Neon `cotali/development`; `prisma migrate status` confirmou schema atualizado             | repetir em homologação e anexar saída                                                     |
| teste da trilha de auditoria                              | logout, rate limit e falha de persistência cobertos; trigger testado no PostgreSQL real                                        | anexar execução na CI e manter teste com PostgreSQL                                       |
| teste anti-enumeração de email OTP                        | email existente/novo, inválido e bloqueado cobertos com Better Auth; nenhum corpo expõe email ou estado da conta               | executar também em homologação                                                            |
| teste concorrente do limite OTP email+IP                  | 10 requisições simultâneas no Neon development: 3 aceitas, 7 bloqueadas; uma única linha HMAC com contador 3                   | `RUN_DATABASE_INTEGRATION=true` e teste de integração                                     |
| teste de allowlist OAuth                                  | callback relativo e web configurado aceitos; callback externo rejeitado com 403 sem `Location` antes do Better Auth            | `corepack pnpm --filter @cotali/api exec vitest run src/auth/auth-oauth-redirect.test.ts` |
| teste de timestamps Better Auth                           | 12 colunas verificadas como `timestamp with time zone`/`timestamptz` no PostgreSQL real                                        | executar também em homologação                                                            |
| PostgreSQL/Neon development                               | branch `development` pronta; migrations e integração executadas com sucesso                                                    | repetir em homologação/branch efêmera                                                     |

### Comandos de evidência de ambiente

```powershell
corepack pnpm --filter @cotali/database db:migrate:deploy
corepack pnpm --filter @cotali/database db:generate
corepack pnpm --filter @cotali/api exec cross-env RUN_DATABASE_INTEGRATION=true vitest run src/quotes/prisma-quote-repository.integration.test.ts
corepack pnpm --filter @cotali/api exec cross-env RUN_DATABASE_INTEGRATION=true vitest run src/security/security-audit-service.integration.test.ts
corepack pnpm --filter @cotali/api exec cross-env RUN_DATABASE_INTEGRATION=true vitest run src/auth/auth-timestamps.integration.test.ts
corepack pnpm --filter @cotali/api exec cross-env RUN_DATABASE_INTEGRATION=true vitest run src/security/otp-rate-limit-service.integration.test.ts
corepack pnpm --filter @cotali/api exec vitest run src/auth/auth-enumeration.test.ts
```

Não anexar valores de secrets, OTPs, cookies, tokens, dados de clientes ou conteúdo
de emails aos artefatos de auditoria. Guardar somente saída redigida, IDs de build,
hash de commit e evidência mínima necessária.

## 13. Catálogo de evidências a anexar

| Evidência              | Artefato esperado                                            | Dono                  | Status                                             |
| ---------------------- | ------------------------------------------------------------ | --------------------- | -------------------------------------------------- |
| versão exata do código | commit/tag e lockfile                                        | engenharia            | `PARCIAL` — atualizar para o commit desta correção |
| schema/migrations      | SQL revisado, saída de deploy e validação                    | engenharia/DBA        | `PARCIAL`                                          |
| CI                     | URL de execução verde e artefatos                            | engenharia            | `PENDENTE`                                         |
| dependências           | `pnpm audit`, lockfile e política de atualização             | engenharia            | `PARCIAL`                                          |
| OAuth Google           | client, redirect URIs, projeto e owner; sem secret           | engenharia            | `PENDENTE`                                         |
| OAuth Apple            | Services ID, bundle IDs, key owner, redirects e relay        | engenharia            | `PENDENTE`                                         |
| Resend                 | domínio autenticado, remetente, eventos e DPA                | operações/privacidade | `PENDENTE`                                         |
| testes auth            | matriz OTP/social/sessão/linking/logout                      | QA/engenharia         | `PENDENTE`                                         |
| logs                   | amostras redigidas e política de acesso/retencão             | operações             | `PENDENTE`                                         |
| backup/restore         | relatório de restauração bem-sucedida                        | operações/DBA         | `PENDENTE`                                         |
| privacidade            | política aprovada, registro de tratamento e canal do titular | privacidade/jurídico  | `PENDENTE`                                         |
| incidente              | runbook, contatos e simulado                                 | operações             | `PENDENTE`                                         |

## 14. Gate de liberação para produção

Marcar somente com evidência anexada:

- [ ] commit/tag imutável da versão auditada;
- [ ] `pnpm audit`, format, lint, check, testes e build verdes na CI remota;
- [ ] migrations aplicadas em homologação e restore testado;
- [ ] `BETTER_AUTH_URL`, HTTPS, CORS e redirects por ambiente revisados;
- [ ] Google e Apple configurados, inclusive relay da Apple e email SPF/DKIM;
- [ ] Resend com domínio/remetente autenticado, limites, bounces e complaints monitorados;
- [ ] OTP testado para expiração, uso único, tentativas, rotação, enumeração e abuso;
- [ ] sessão testada em web/Android/iOS, logout atual/global e indisponibilidade de provedor;
- [ ] linking/unlinking e email relay testados com duas contas/provedores;
- [ ] logs redigidos, eventos de segurança, alertas e retenção aprovados;
- [ ] exclusão, revogação, acesso/correção e solicitações do titular têm canal e teste;
- [ ] política de privacidade aprovada corresponde à versão gravada em consentimento;
- [ ] secret manager, MFA, menor privilégio e rotação documentados;
- [ ] backup/restore, RTO/RPO e runbooks testados;
- [ ] responsável técnico, responsável de privacidade e aprovador registraram data e assinatura.

## 15. Registro de decisões e mudanças

| Data       | Alteração                                                    | Motivo/evidência                                                        | Aprovador |
| ---------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- | --------- |
| 2026-09-06 | Better Auth + Resend + Google/Apple/OTP implementados        | ADR-003, código e gates locais                                          | preencher |
| 2026-09-06 | Consentimento e eventos de valor separados do auth           | ADR-003, schema e rotas                                                 | preencher |
| 2026-09-06 | Timestamps do Better Auth normalizados para `TIMESTAMPTZ(3)` | migration 004, Prisma validate e teste de catálogo em Neon development  | preencher |
| 2026-09-06 | Anti-enumeração de email OTP explicitada e testada           | `disableSignUp: false` e cenários de email válido, inválido e bloqueado | preencher |
| 2026-09-06 | Trilha mínima de segurança adicionada                        | schema, trigger, serviço, handler e testes                              | preencher |
| 2026-09-06 | Migrations aplicadas na branch Neon development              | `migrate deploy`, status up to date e integração                        | preencher |
| 2026-09-06 | Pacote de auditoria criado                                   | lacunas de evidência e operação identificadas                           | preencher |

Mudanças futuras em métodos de login, schema, fornecedor, finalidade, evento,
retenção, base legal, transferência internacional ou fluxo de recuperação exigem
revisão deste pacote e do ADR-003 antes do deploy.

## 16. Conclusão

O Cotali agora tem uma documentação adequada para conduzir auditorias futuras:
decisões, ativos, fluxos, controles, riscos, evidências, owners e gates estão
separados e rastreáveis. A documentação não deve ser marcada como “100% aprovada”
enquanto os itens `PENDENTE` acima não tiverem implementação, evidência e aprovação.
Esse é o estado correto para auditoria: lacunas visíveis, responsáveis definidos e
nenhuma promessa de conformidade sem prova.
