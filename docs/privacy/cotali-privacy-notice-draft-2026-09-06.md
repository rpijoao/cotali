# Cotali — minuta de aviso de privacidade do auth e comunicações

- **Versão técnica:** `2026-09-06`
- **Status:** minuta para revisão jurídica e de privacidade; não publicar como política final
- **Controlador:** preencher razão social, CNPJ e endereço
- **Canal de privacidade:** preencher email/canal oficial
- **Encarregado/DPO, se aplicável:** preencher nome e contato

Este documento é um registro técnico para alinhar o produto, o código e a futura
política de privacidade. Ele não substitui a revisão jurídica nem define sozinho a
base legal, prazos ou obrigações do controlador.

## 1. O que o Cotali trata

| Categoria               | Exemplos                                                                | Origem                        | Uso previsto                                                    |
| ----------------------- | ----------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------- |
| Conta/auth              | nome, email, imagem, identidade Google/Apple                            | usuário/provedor social       | criar conta, autenticar e manter sessão                         |
| Segurança               | expiração de sessão, IP e user-agent quando coletados pela autenticação | navegador, app e backend      | prevenção de abuso, segurança e diagnóstico                     |
| Perfil profissional     | nome comercial, telefone, documento e endereço                          | usuário                       | personalizar documentos comerciais                              |
| Cliente do profissional | nome e telefone                                                         | usuário                       | criar orçamento e compartilhar proposta quando solicitado       |
| Orçamento               | serviços, materiais, preços, condições, prazos e observações            | usuário e fluxo de voz/manual | gerar e revisar proposta                                        |
| Consentimento           | finalidade, decisão, versão, canal e data                               | usuário                       | comprovar preferência de marketing                              |
| Evento de valor         | criação/edição/compartilhamento, chave idempotente e origem             | backend                       | medir valor entregue e operar eventual reengajamento autorizado |

Áudio, transcrição, documentos comerciais, nome de cliente, telefone, valores,
tokens, OTPs, cookies, IP e user-agent não devem ser enviados para eventos de
marketing. O inventário completo está no [pacote de auditoria](../audits/cotali-authentication-audit-pack-2026-09-06.md).

## 2. Finalidades e base legal a validar

| Finalidade                             | Dados necessários                                        | Base legal — hipótese técnica                         | Decisão jurídica |
| -------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------- | ---------------- |
| autenticar por OTP, Google ou Apple    | email, identidade do provedor, dados de sessão           | execução do serviço/contrato ou outra base aplicável  | preencher        |
| proteger a conta e limitar abuso       | eventos de autenticação, rate limit e metadados técnicos | segurança/prevenção de fraude ou outra base aplicável | preencher        |
| executar o orçamento solicitado        | perfil, cliente e dados comerciais                       | execução do serviço/contrato ou outra base aplicável  | preencher        |
| enviar OTP e comunicações operacionais | email e status de entrega                                | execução do serviço/segurança ou outra base aplicável | preencher        |
| enviar dicas e novidades               | email e decisão de marketing                             | consentimento separado e revogável                    | preencher        |
| medir criação/edição/compartilhamento  | eventos mínimos de valor                                 | base legal e teste de necessidade a validar           | preencher        |

O consentimento de marketing é opcional, começa desmarcado e não pode ser condição
para login ou uso essencial do Cotali. Comunicações de segurança e de autenticação
não são marketing.

## 3. Provedores e compartilhamentos

| Provedor        | Papel                           | Dados que podem ser compartilhados                           | País/região, contrato e suboperadores    |
| --------------- | ------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| Google          | identidade social               | identificador do provedor e claims necessários               | preencher                                |
| Apple           | identidade social e relay email | identificador, claims necessários e relay quando escolhido   | preencher                                |
| Resend          | entrega de emails               | email, remetente, assunto, corpo do OTP e eventos de entrega | preencher DPA, região e retenção         |
| PostgreSQL/Neon | infraestrutura de dados         | dados armazenados nas tabelas do Cotali                      | preencher região, backup e suboperadores |

Não adicionar provedor, SDK, ferramenta de analytics, contato de marketing ou
webhook sem atualizar este inventário, o pacote de auditoria e a avaliação de
necessidade/minimização.

## 4. Direitos, canal e verificação

O controlador deve publicar um canal gratuito e acessível para solicitações de
confirmação, acesso, correção, anonimização, bloqueio, eliminação, portabilidade,
informação sobre compartilhamento, oposição quando aplicável e revogação de
consentimento.

Antes da publicação, definir:

- como verificar a identidade do solicitante sem pedir senha ou OTP por canal inseguro;
- prazo e responsável por cada tipo de pedido;
- formato de exportação e escopo de dados de terceiros;
- exceções legais de retenção e como serão explicadas;
- propagação de correção/exclusão a operadores e backups;
- registro de recebimento, decisão, execução e comunicação ao titular.

O endpoint atual de consentimento registra uma nova decisão, mas não substitui o
fluxo completo de direitos do titular.

## 5. Retenção e descarte a aprovar

Nenhum prazo final deve ser inventado neste documento. A política final precisa
definir, por finalidade, o início do prazo, o evento que encerra a necessidade, o
descarte lógico/físico, os backups e a evidência de execução para:

- verificações OTP;
- sessões e metadados de segurança;
- identidades e tokens de provedores;
- perfil, clientes, orçamentos e documentos;
- consentimentos e revogações;
- eventos de valor;
- logs e alertas;
- cópias de backup e dados em Resend.

## 6. Decisões automatizadas e marketing

No corte atual, a autenticação não decide acesso com base em perfil comercial e os
eventos de valor não são usados para crédito, preço ou elegibilidade. A interpretação
por voz, quando usada, é uma sugestão revisável e não deve inventar informação.

Qualquer futura automação de reengajamento deve:

1. consultar a última decisão de consentimento válida;
2. respeitar revogação e supressão de email;
3. usar somente dados necessários para a finalidade;
4. permitir descadastro fácil;
5. registrar a versão da finalidade e o provedor de envio;
6. passar por revisão de privacidade antes de ativar.

## 7. Aprovação da minuta

| Papel                | Nome      | Data      | Aprovação |
| -------------------- | --------- | --------- | --------- |
| Produto              | preencher | preencher | pendente  |
| Engenharia           | preencher | preencher | pendente  |
| Privacidade/jurídico | preencher | preencher | pendente  |

Somente depois da aprovação deve a versão ser publicada na interface e usada como
versão oficial em `PRIVACY_POLICY_VERSION`.
