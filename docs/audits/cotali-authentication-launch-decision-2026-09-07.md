# Cotali — adendo de decisão de lançamento do auth

- **Data:** 2026-09-07
- **Base técnica:** ADR-003 e pacote de auditoria de 2026-09-06
- **Decisão:** lançar inicialmente com Email OTP e Google OAuth
- **Apple OAuth:** adiado; não ativo no lançamento inicial

## Escopo do lançamento inicial

O primeiro ambiente de produção poderá autenticar usuários por:

- código de uso único enviado por email via Resend;
- Google OAuth.

Não haverá senha, SMS/telefone, Microsoft/SSO corporativo ou Apple OAuth neste
corte. Apple permanece planejado para uma fase posterior.

## Implementação

- Em produção, Google continua obrigatório (`GOOGLE_CLIENT_ID` e
  `GOOGLE_CLIENT_SECRET`).
- Apple é opcional. Se apenas uma das variáveis `APPLE_CLIENT_ID` e
  `APPLE_CLIENT_SECRET` for configurada, a API falha fechada por configuração
  incompleta. Com as duas ausentes, a API inicia sem o provedor Apple.
- Web e mobile não exibem o botão Apple enquanto suas flags públicas estiverem
  desligadas (`NEXT_PUBLIC_AUTH_APPLE_ENABLED=false` e
  `EXPO_PUBLIC_AUTH_APPLE_ENABLED=false`).
- A ausência de Apple não altera o modelo de identidade, sessão, OTP,
  autorização multi-tenant, consentimento ou auditoria.

## Impactos e limites

Esta decisão permite validar e operar o produto web e Android com OTP e Google.
Ela não representa aprovação para distribuição do app iOS com Google Login.
Antes de enviar um app iOS à App Store, revisar a Guideline 4.8 e habilitar
Sign in with Apple ou confirmar formalmente uma exceção aplicável. A regra da
Apple exige uma opção de login equivalente quando o app usa login social de
terceiros para a conta principal.

O lançamento continua dependente dos demais gates do pacote de auditoria:
HTTPS/CORS e domínio real, testes de OTP e Google em homologação, isolamento
entre contas, política de privacidade aprovada, direitos do titular,
retenção, secret manager, backups, monitoramento e runbooks.

## Critério para reabrir Apple

Reabrir esta decisão quando houver orçamento e conta Apple Developer Program
aprovada. A ativação deverá incluir Services ID, App ID, chave privada, relay de
email, domínio próprio, redirects por ambiente, flags públicas e testes web,
Android e iOS.
