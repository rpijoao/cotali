# Cotali — Blueprint de Produto e Tecnologia

**Versão:** 0.1 — rascunho fundacional  
**Data:** 2026-09-03  
**Status:** proposta para validação

## 1. Identidade do produto

**Cotali** é um app profissional de criação de orçamentos para trabalhadores autônomos.

O produto será **voice-first**: a voz é o principal meio de entrada de dados, enquanto a interface visual confirma, corrige e apresenta o orçamento final.

### Promessa principal

> Fale o serviço e crie um orçamento profissional em até 2 minutos.

Os dois minutos representam o intervalo entre o início da entrada do orçamento e o momento em que ele está revisado, validado e pronto para ser compartilhado.

O sistema não deve sacrificar exatidão para cumprir a meta de velocidade. Um orçamento rápido, mas incorreto, é uma falha do produto.

### Decisões confirmadas da versão 0.1

- o público é composto por autônomos de qualquer área;
- a entrada principal será uma gravação única por orçamento;
- a proposta será gerada em PDF e enviada como anexo pelo WhatsApp;
- o pagamento será confirmado manualmente pelo profissional;
- o recibo será gerado em PDF após a confirmação manual de um pagamento;
- o orçamento comum terá um cliente, até 5 serviços, até 10 materiais/itens, preços informados e condições simples, como forma de pagamento e prazo de execução;
- o MVP terá pagamento integral, pagamento parcial e pagamento parcelado;
- cada pagamento confirmado, incluindo pagamento parcial ou parcela, gerará seu próprio recibo em PDF;
- cada conta terá um único usuário no MVP;
- o produto terá três superfícies: site público, app web autenticado e aplicativo mobile para iOS/Android;
- o primeiro lançamento será composto pela landing page pública e pelo aplicativo Android;
- o segundo lançamento será o app web autenticado com o mesmo fluxo funcional do Android;
- o aplicativo iOS permanece como evolução futura, sem fazer parte do lançamento inicial.

## 2. Problema que o Cotali resolve

Autônomos frequentemente precisam responder clientes pelo celular, em intervalos curtos e fora de um ambiente administrativo. Criar um orçamento profissional costuma exigir alternância entre mensagens, anotações, calculadora, editor de texto e geração de arquivo.

O Cotali concentra esse trabalho em uma experiência curta:

```text
falar o que será feito
→ revisar as informações estruturadas
→ validar os valores
→ gerar a proposta em PDF
→ anexar e enviar pelo WhatsApp
```

## 3. Público inicial

### Persona primária — profissional autônomo de serviços

- trabalha sozinho ou com uma operação pequena;
- recebe pedidos por WhatsApp, telefone ou indicação;
- usa principalmente o celular;
- precisa responder vários clientes sem interromper o trabalho;
- não quer aprender um sistema administrativo complexo;
- valoriza aparência profissional e rapidez;
- pode estar em ambiente com ruído, conexão instável ou pouca disponibilidade para digitar.

O MVP atenderá autônomos de qualquer área. O núcleo do produto será genérico; vocabulário, sugestões e extensões específicas por profissão serão escolhidos com base em entrevistas e dados do piloto, não em suposições técnicas.

## 4. Objetivo e métricas

### Métrica principal

**Tempo até orçamento pronto para compartilhar** em um orçamento comum.

Para a versão 0.1, um “orçamento comum” significa: um cliente, até 5 linhas de serviço, até 10 materiais/itens usados, preços informados e condições simples, incluindo forma de pagamento e prazo de execução. Um serviço pode utilizar vários materiais; por exemplo, “troca de tomada” pode utilizar quatro tomadas, caixas e metros de fio.

### Métricas de sucesso

- percentual de orçamentos comuns prontos para compartilhar em até 2 minutos;
- mediana e p75 do tempo de criação;
- taxa de conclusão do fluxo iniciado por voz;
- taxa de correção de informações críticas após a interpretação;
- taxa de orçamentos compartilhados;
- quantidade de novos orçamentos por usuário recorrente;
- latência e taxa de falha dos jobs de áudio e IA;
- custo médio de IA por orçamento concluído.

### Guardrails

- nenhum preço ou desconto inventado pela IA;
- nenhum total final calculado apenas no cliente;
- nenhum orçamento compartilhável com pendência financeira crítica;
- nenhuma perda silenciosa de edição local;
- nenhuma exposição de áudio, transcrição ou PII em logs comuns;
- ações externas devem ser descritas corretamente: “PDF gerado”, “compartilhamento iniciado” ou “enviado” somente quando houver confirmação real.

## 5. Experiência voice-first

### Fluxo principal

1. O usuário toca no botão de voz.
2. Faz uma única gravação, falando naturalmente sobre o cliente, serviço, itens, quantidades, preços e condições.
3. O Cotali grava e envia o áudio com indicação clara de progresso.
4. Um job transcreve o áudio.
5. Um job interpreta a transcrição em uma proposta estruturada.
6. O usuário revisa uma tela única, editável e objetiva.
7. O sistema destaca somente campos ambíguos, ausentes ou inválidos.
8. A validação server-side confirma os valores e totais.
9. O orçamento é salvo e convertido em uma proposta comercial em PDF.
10. O usuário compartilha a proposta em PDF como anexo pelo WhatsApp, direcionando o fluxo para o telefone cadastrado do cliente quando a plataforma permitir.

A gravação única é o caminho principal do MVP. O usuário ainda poderá corrigir a transcrição e o orçamento sem precisar gravar novamente.

### Princípios da interpretação

- a interpretação da IA é uma **proposta**, nunca a verdade final;
- cada valor relevante deve ter origem rastreável na transcrição ou ser informado manualmente;
- preço não mencionado permanece `null`, nunca zero;
- ambiguidade deve ser apresentada ao usuário de forma compreensível;
- a IA deve perguntar somente o que impede a conclusão ou compromete a correção;
- o usuário sempre pode editar o resultado sem regravar o áudio;
- uma resposta antiga nunca pode substituir uma edição ou interpretação mais recente.

### Estados que precisam existir

```text
idle
→ recording
→ uploading
→ transcribing
→ interpreting
→ needs_review
→ ready_to_share
→ shared
```

Também devem existir estados de erro recuperável, cancelamento, retomada e fallback manual. O usuário precisa saber o que aconteceu e qual ação pode executar em seguida.

### Fallbacks obrigatórios

- entrada manual completa;
- edição da transcrição antes da interpretação;
- retry explícito de job com idempotência;
- recuperação após perda de conexão;
- aviso para áudio sem fala, interrompido, muito longo ou inaudível;
- revisão e geração da proposta em PDF sem depender da confirmação de entrega do WhatsApp;
- fallback para baixar ou compartilhar manualmente o PDF quando o WhatsApp não estiver disponível;
- tentativa de compartilhamento do PDF como arquivo anexado, sem afirmar entrega quando o dispositivo não fornecer essa confirmação.

## 6. Escopo do MVP

### Incluído

- criação de conta e perfil profissional;
- cadastro básico de clientes;
- criação de orçamento por voz;
- criação e edição manual como fallback;
- transcrição editável;
- interpretação estruturada com origem e pendências;
- itens com descrição, unidade, quantidade e preço unitário;
- subtotal, desconto e total com representação monetária exata;
- condições de pagamento, prazo e validade em contrato definido;
- modalidades de pagamento integral, parcial e parcelado, com saldo e parcelas calculados de forma exata;
- revisão visual antes da entrega;
- validação financeira no servidor;
- salvamento de rascunho e histórico;
- geração de proposta comercial em PDF profissional;
- envio da proposta em PDF como anexo pelo WhatsApp, com fallback manual do arquivo;
- confirmação manual de cada pagamento pelo profissional;
- registro de pagamentos integrais, parciais e parcelas;
- geração de recibo comercial em PDF para pagamentos confirmados;
- recibo em PDF baseado em snapshot imutável do orçamento e dos dados profissionais;
- processamento assíncrono de áudio, IA, proposta PDF e recibo PDF;
- telemetria redigida, métricas operacionais e auditoria mínima.

### Fora do MVP inicial

- emissão fiscal;
- cobrança ou pagamento integrado;
- CRM completo;
- marketplace;
- colaboração simultânea avançada;
- catálogo complexo por profissão;
- automações de marketing;
- relatórios financeiros completos;

O recibo do MVP será um documento comercial, não um documento fiscal. O profissional confirmará manualmente o pagamento integral e informará, no mínimo, valor, data e método de pagamento. A emissão também exigirá dados profissionais válidos conforme o contrato do produto. Recursos fora do MVP não devem contaminar o modelo central nem impedir uma futura expansão.

## 7. Domínio inicial

As entidades abaixo são uma proposta inicial e serão refinadas antes da implementação:

```text
Account
ProfessionalProfile
Client
Quote
QuoteItem
QuoteRevision
PaymentPlan
Payment
Receipt
AudioJob
Transcription
InterpretationProposal
DeliveryAttempt
```

### Regras essenciais

- toda entidade pertence a uma conta autorizada;
- a identidade da conta vem da sessão autenticada, não de um identificador confiado enviado pelo cliente;
- itens têm IDs estáveis e operações explícitas de criar, editar, mover e excluir;
- dinheiro usa inteiros em centavos ou outro tipo exato equivalente;
- quantidade usa representação decimal canônica, com limites de magnitude;
- `null` significa informação ausente e não pode ser convertido silenciosamente em zero;
- uma revisão pronta para compartilhar é validada no servidor;
- finalização e efeitos externos usam comandos idempotentes;
- revisões finalizadas são imutáveis;
- recibos são snapshots imutáveis e não alteram o orçamento de origem;
- recibos só podem ser emitidos após confirmação manual de um pagamento;
- a confirmação de pagamento do MVP é manual e não representa uma integração de cobrança;
- o recibo registra valor pago, data e método de pagamento informados pelo profissional;
- um pagamento parcial ou uma parcela deve deixar explícitos o valor pago e o saldo restante;
- o estado financeiro do orçamento diferencia pendente, parcialmente pago e integralmente pago;
- a emissão exige CPF ou CNPJ profissional válido, conforme o tipo de documento informado;
- recibo e orçamento parcial são fluxos distintos e não compartilham regras de conclusão;
- exclusão usa tombstone e não pode ressuscitar dados apagados;
- dados sensíveis têm política explícita de retenção, criptografia e redaction.

### Estados propostos

No MVP, a máquina de estados deve começar pequena:

```text
draft → ready_to_share → shared
```

`accepted`, `rejected`, `expired` e `cancelled` só devem ser adicionados quando suas transições, autoridade e efeitos estiverem especificados.

O recibo terá um ciclo próprio, inicialmente separado do orçamento:

```text
payment_confirmed → receipt_issued → voided
```

A emissão deve guardar a versão de origem, os itens, os totais, o valor pago, o saldo restante, o profissional, o cliente, a data de pagamento e a chave de idempotência usados no momento da criação. A anulação deve preservar o recibo original e registrar motivo e data.

No parcelamento, cada parcela confirmada será um evento de pagamento independente e gerará automaticamente seu próprio recibo, sem perder o histórico individual. Pagamentos parciais seguirão a mesma regra e apresentarão o saldo restante.

## 8. Arquitetura inicial

O Cotali será construído como um sistema novo, sem reutilização estrutural do OrcaEletrica.

### Superfícies do produto

O Cotali terá três superfícies com responsabilidades diferentes:

```text
site público
  landing page, aquisição, conteúdo, preços e cadastro

app web autenticado
  mesmo fluxo funcional do mobile, adaptado ao navegador

app mobile iOS/Android
  experiência principal voice-first, áudio e compartilhamento de PDFs
  Android no primeiro lançamento; iOS em fase futura
```

As três superfícies usarão o mesmo backend, domínio, contratos, regras financeiras e identidade de conta. Elas não precisam ser três sistemas independentes nem ser lançadas simultaneamente.

### Organização proposta

```text
apps/
  web/                 aplicação autenticada mobile-first
  site/                conteúdo público e SEO, quando necessário
  mobile/              aplicativo nativo, quando validado

services/
  api/                 autenticação, comandos e consultas
  jobs/                áudio, IA, PDF e notificações

packages/
  domain/              entidades, comandos e invariantes
  contracts/           schemas versionados de API, jobs e sync
  validation/          validações compartilhadas e financeiras
  sync/                armazenamento local, outbox e replay
  ui/                  componentes e tokens visuais
```

### Princípios técnicos

- domínio sem dependência de React, navegador, framework HTTP ou fornecedor de autenticação;
- API versionada e independente da implementação do frontend;
- comandos de domínio no lugar de PATCH arbitrário de documentos inteiros;
- PostgreSQL como fonte central de verdade;
- migrations reversíveis ou com plano explícito de recuperação;
- jobs assíncronos com `job_id`, `mutation_id`, tentativas, custo e idempotência;
- object storage privado para artefatos, com lifecycle e recuperação definidos;
- observabilidade desde o primeiro ambiente;
- monólito modular no início, com fronteiras que permitam extração posterior baseada em métricas;
- nenhuma decisão de engine de sincronização sem POC com offline, retry e conflito.

### Sincronização

O cliente deve persistir localmente a edição e o outbox antes de depender da rede:

```text
edição local
→ mutation idempotente no outbox durável
→ envio quando houver conexão
→ validação e aplicação no servidor
→ confirmação/revisão server-side
→ aplicação de deltas locais
```

O orçamento inteiro não será a unidade universal de conflito. Itens, campos e comandos terão IDs e regras próprias de merge. Finalização, compartilhamento e qualquer efeito financeiro serão tratados como operações transacionais.

## 9. Ordem de implementação

### Fase 1 — Blueprint e descoberta

- validar público e promessa;
- entrevistar autônomos;
- definir orçamento comum e os 2 minutos;
- desenhar fluxos principal e de exceção;
- fechar escopo e critérios de aceite.

### Fase 2 — Protótipo voice-first

- protótipo clicável mobile-first;
- testes de compreensão e velocidade;
- simulação de transcrição, pendências e revisão;
- validação em ambientes com ruído e conexão instável.

### Fase 3 — POCs técnicos

- testar armazenamento local e outbox;
- testar sincronização e conflitos em dois dispositivos;
- comparar engines candidatas com critérios definidos;
- validar áudio, jobs, PDF e recuperação após retry.

### Fase 4 — Fundação do sistema

- monorepo e convenções;
- contratos e domínio;
- PostgreSQL e migrations;
- autenticação e autorização;
- API versionada;
- jobs e filas;
- observabilidade, CI/CD, backup e restore.

### Fase 5 — Primeiro vertical slice

Implementar o fluxo completo:

```text
autenticação
→ gravação de voz
→ transcrição
→ interpretação
→ revisão
→ validação
→ proposta em PDF
→ envio da proposta em PDF como anexo pelo WhatsApp
→ confirmação manual de pagamento integral, parcial ou parcelado
→ recibo em PDF do pagamento confirmado
```

### Fase 6 — Piloto fechado

- usuários autônomos reais;
- feature flags e dados sintéticos nos ambientes de teste;
- métricas de velocidade e correção;
- testes em celulares e navegadores reais;
- correção dos maiores pontos de fricção antes de ampliar o escopo.

## 10. Decisões ainda abertas

Estas decisões serão tomadas com evidência e registradas em ADRs:

- estratégia de lançamento do iOS e requisitos de distribuição futura;
- estratégia de implementação do app web: PWA ou aplicação web tradicional;
- critérios de plataforma: qualidade da gravação, compartilhamento de anexo no WhatsApp, operação offline, velocidade de iteração e custo de distribuição;
- se o envio direto deve abrir o WhatsApp pelo número do cliente com mensagem pré-preenchida, usar o compartilhamento nativo do PDF ou combinar os dois mecanismos;
- perfil profissional inicial e eventual especialização;
- provedor de autenticação;
- provedor e modelos de IA;
- engine de sincronização;
- estratégia de geração de PDF;
- modelo de preços e limites de uso;
- política de retenção de áudio, transcrição e documentos;
- contrato de confirmação de pagamento e emissão de recibos;
- integração de compartilhamento do PDF pelo WhatsApp e seus fallbacks.

## 11. Próximo entregável

O próximo passo é transformar este blueprint em três artefatos executáveis:

1. **PRD do MVP**, com requisitos funcionais e critérios de aceite;
2. **mapa de fluxos voice-first**, incluindo estados de erro e fallback;
3. **contrato de domínio v0.1**, com entidades, comandos, estados e invariantes.

Nenhuma implementação de feature deve começar antes de esses três artefatos estarem coerentes entre si.
