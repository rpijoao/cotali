# Cotali — PRD do MVP

**Versão:** 0.1  
**Data:** 2026-09-03  
**Status:** rascunho para validação  
**Documento relacionado:** [Blueprint de Produto e Tecnologia](./cotali-product-technical-blueprint.md)

## 1. Resumo do produto

O Cotali é um app de criação de orçamentos para autônomos de qualquer área. A experiência principal é voice-first: o profissional faz uma gravação única descrevendo o trabalho e o sistema transforma essa fala em uma proposta comercial revisável.

O MVP será lançado inicialmente como landing page pública e aplicativo Android. Em seguida, será disponibilizado o app web autenticado com o mesmo fluxo funcional. O aplicativo iOS fica para uma fase futura.

### Promessa do MVP

> Fale o serviço e crie uma proposta profissional em PDF em até 2 minutos.

O PDF da proposta será enviado como anexo pelo WhatsApp. Após um pagamento confirmado manualmente, o profissional poderá gerar um recibo comercial em PDF.

## 2. Objetivos

### Objetivo principal

Permitir que um autônomo transforme uma solicitação de serviço em uma proposta comercial correta, revisada e pronta para envio, com o mínimo de digitação.

### Objetivos mensuráveis

- permitir que um orçamento comum fique pronto para compartilhar em até 2 minutos;
- reduzir a necessidade de digitação no celular;
- preservar a correção de serviços, materiais, quantidades e preços;
- gerar uma proposta PDF com aparência profissional;
- permitir envio do PDF como anexo pelo WhatsApp;
- registrar pagamentos manuais e gerar recibos individuais em PDF;
- manter o histórico dos orçamentos e pagamentos da conta.

## 3. Público e cenário de uso

### Usuário do MVP

Um profissional autônomo que:

- trabalha sozinho;
- atende clientes de qualquer área de serviços;
- recebe solicitações pelo WhatsApp, telefone ou indicação;
- usa principalmente um celular Android;
- precisa responder rapidamente entre atendimentos;
- pode estar em ambiente com ruído ou conexão instável;
- deseja enviar um documento mais profissional do que uma mensagem de texto.

### Modelo de conta

- uma conta representa um único autônomo;
- cada conta possui um único usuário no MVP;
- não haverá equipes, convites, papéis ou permissões multiusuário;
- clientes do autônomo são registros comerciais, não usuários do Cotali.

## 4. Definição de orçamento comum

Para a meta de dois minutos, o orçamento comum terá:

- um cliente;
- até 5 linhas de serviço;
- até 10 linhas de materiais/itens usados;
- preços informados;
- condições simples, incluindo forma de pagamento e prazo de execução.

Uma linha de serviço representa o trabalho prestado, como “troca de lâmpada”, “troca de tomada” ou “troca de filtro”. Uma linha de material representa um recurso utilizado, como lâmpada, tomada, caixa de som, fio ou eletroduto. A quantidade de uma linha não cria novas linhas.

## 5. Escopo funcional do MVP

### 5.1 Conta e perfil profissional

O usuário deverá:

- criar e acessar sua conta;
- informar nome profissional ou nome comercial;
- informar telefone, endereço e dados necessários para os documentos;
- informar CPF ou CNPJ e o tipo do documento;
- configurar dados básicos exibidos na proposta e no recibo.

O sistema deverá bloquear a emissão de recibo quando os dados profissionais obrigatórios forem inválidos ou insuficientes.

### 5.2 Clientes

O usuário deverá:

- criar um cliente durante o orçamento ou antes dele;
- informar nome do cliente;
- informar telefone com código internacional normalizado;
- editar os dados do cliente;
- reutilizar clientes anteriores.

O telefone será usado para facilitar o envio da proposta pelo WhatsApp. O usuário deverá revisar o número antes do envio.

### 5.3 Criação por voz

O usuário deverá conseguir:

- iniciar uma gravação única com uma ação evidente;
- falar sobre cliente, serviços, materiais, quantidades, preços e condições;
- interromper e cancelar a gravação;
- visualizar duração e estado da gravação;
- enviar o áudio para processamento;
- acompanhar transcrição e interpretação assíncronas;
- retomar o orçamento se sair da tela ou perder conexão, quando houver dados locais recuperáveis.

O MVP não exigirá que o usuário use uma frase ou roteiro rígido. O Cotali deverá aceitar linguagem natural, dentro dos limites definidos para o áudio.

### 5.4 Transcrição e interpretação

O sistema deverá:

- produzir uma transcrição editável;
- interpretar a transcrição em uma proposta estruturada;
- separar serviços de materiais;
- extrair quantidades, unidades, preços e condições quando forem explicitamente informados;
- marcar informações ausentes, ambíguas ou inválidas;
- preservar a origem de cada valor extraído;
- permitir que o usuário corrija a transcrição ou o orçamento sem gravar novamente.

A interpretação será apresentada como sugestão. A IA não poderá inventar preço, desconto, quantidade, material, prazo ou condição.

### 5.5 Editor e revisão

O editor deverá permitir:

- editar dados do cliente;
- adicionar, editar, mover e excluir serviços por ID estável;
- adicionar, editar, mover e excluir materiais por ID estável;
- informar unidade, quantidade e preço unitário;
- informar preço de serviço;
- aplicar desconto somente quando explicitamente informado ou manualmente inserido;
- configurar forma de pagamento e prazo de execução;
- configurar validade da proposta;
- visualizar subtotal, desconto, total e pendências;
- revisar antes de gerar o PDF.

O editor deverá destacar somente o que exige ação, evitando transformar a revisão em um formulário burocrático.

### 5.6 Pagamentos e condições

O orçamento deverá suportar:

- pagamento integral;
- pagamento parcial;
- pagamento parcelado.

O plano de pagamento deverá permitir, conforme o caso:

- forma de pagamento;
- valor total previsto;
- valor de entrada ou pagamento parcial;
- saldo restante;
- quantidade de parcelas;
- valor de cada parcela;
- vencimento de cada parcela;
- observações de pagamento.

Os valores deverão ser calculados com representação monetária exata. O estado financeiro do orçamento deverá distinguir, no mínimo:

```text
pending → partially_paid → paid
```

O pagamento não será integrado a um gateway no MVP. Cada pagamento será confirmado manualmente pelo profissional.

### 5.7 Proposta comercial em PDF

O Cotali deverá:

- validar a revisão no servidor antes da geração;
- gerar uma proposta comercial em PDF;
- incluir profissional, cliente, serviços, materiais, quantidades, preços, totais e condições;
- incluir identificador, data de emissão e validade da proposta;
- usar os dados do profissional configurados na conta;
- guardar a revisão de origem do documento;
- permitir baixar, abrir ou compartilhar o PDF;
- permitir regenerar o artefato sem alterar a revisão original.

O PDF deverá ser gerado a partir de uma revisão validada, nunca diretamente de um estado visual não persistido.

### 5.8 Envio pelo WhatsApp

O fluxo principal será:

```text
proposta validada
→ PDF gerado
→ cliente selecionado
→ conversa do número do cliente aberta
→ mensagem pré-preenchida
→ PDF compartilhado como anexo
```

O produto deverá:

- normalizar e validar o telefone do cliente;
- abrir a conversa direta quando o WhatsApp estiver disponível;
- preparar uma mensagem contextualizada;
- tentar compartilhar o PDF como arquivo anexado;
- registrar que o compartilhamento foi iniciado;
- oferecer download ou compartilhamento manual como fallback.

O Cotali não deverá afirmar que a mensagem foi entregue sem confirmação real do canal. A compatibilidade entre conversa direcionada, mensagem pré-preenchida e anexo PDF será validada no POC de Android e no app web.

### 5.9 Pagamento confirmado e recibo em PDF

O usuário deverá conseguir:

- registrar manualmente um pagamento;
- escolher se é integral, parcial ou parcela;
- informar valor pago, data e método;
- visualizar saldo restante;
- confirmar o pagamento;
- gerar um recibo comercial em PDF para aquele pagamento;
- acessar o histórico de recibos.

Cada pagamento confirmado gerará seu próprio recibo. Em caso de pagamento parcial ou parcelado, o recibo deverá mostrar o valor recebido e o saldo restante.

O recibo deverá:

- ser um snapshot imutável do momento da confirmação;
- manter referência ao orçamento e à revisão de origem;
- conter cliente, profissional, data, método, valor pago e saldo;
- ter identificador próprio;
- ser gerado de forma idempotente;
- poder ser anulado com motivo e data, preservando o documento original;
- deixar claro que é recibo comercial e não documento fiscal.

### 5.10 Histórico e rascunhos

O usuário deverá:

- visualizar orçamentos recentes;
- abrir e continuar rascunhos;
- duplicar um orçamento quando isso reduzir trabalho repetitivo;
- visualizar o estado da proposta e do pagamento;
- abrir propostas e recibos gerados;
- excluir dados com confirmação explícita.

O armazenamento local deverá ser durável, versionado e capaz de manter um outbox de alterações. `localStorage` não será usado como banco principal do editor.

## 6. Fluxos principais

### 6.1 Orçamento por voz

```text
novo orçamento
→ escolher/criar cliente
→ gravar uma única vez
→ enviar áudio
→ transcrever
→ interpretar
→ revisar proposta
→ corrigir pendências
→ validar valores
→ gerar proposta PDF
→ enviar anexo pelo WhatsApp
```

### 6.2 Fallback manual

```text
novo orçamento
→ escolher/criar cliente
→ inserir serviços e materiais manualmente
→ configurar condições
→ revisar
→ validar
→ gerar proposta PDF
→ enviar pelo WhatsApp
```

### 6.3 Pagamento e recibo

```text
proposta enviada
→ pagamento recebido
→ registrar pagamento manual
→ validar valor e saldo
→ confirmar pagamento
→ gerar recibo PDF
```

## 7. Estados e comportamento assíncrono

### 7.1 Estado do orçamento

```text
draft
→ ready_to_share
→ shared
```

Estados posteriores como aceito, rejeitado, expirado ou cancelado só serão adicionados com regras de transição e autoridade definidas.

### 7.2 Estado do processamento de voz

```text
idle
→ recording
→ uploading
→ transcribing
→ interpreting
→ needs_review
→ ready_to_share
→ failed / cancelled / retryable
```

Cada job deverá possuir identificador, estado, tentativa, erro estruturado, vínculo com a revisão e chave de idempotência. Respostas antigas não poderão substituir uma revisão mais nova.

### 7.3 Estado do recibo

```text
payment_confirmed
→ receipt_issued
→ voided
```

## 8. Regras de negócio e invariantes

- preço ausente é `null`, nunca zero;
- dinheiro usa centavos inteiros ou tipo exato equivalente;
- quantidade possui representação decimal canônica e limites de magnitude;
- serviços e materiais possuem IDs estáveis;
- serviço e material são categorias distintas no orçamento;
- todo total é recalculado e validado no servidor;
- proposta PDF só é gerada a partir de revisão validada;
- recibo só é gerado após confirmação manual de pagamento;
- cada pagamento confirmado gera um único recibo idempotente;
- pagamento parcial e parcela exibem saldo restante;
- recibo não altera a revisão original do orçamento;
- alterações finalizadas são imutáveis;
- dados da conta vêm da sessão autenticada;
- nenhuma informação não falada pode ser preenchida como fato pela IA;
- áudio, transcrição e PII não aparecem em logs comuns;
- falhas de rede não podem causar perda silenciosa ou ressuscitação de dados apagados.

## 9. Critérios de aceite do MVP

### Jornada de voz

- o usuário consegue iniciar, cancelar e concluir uma gravação única;
- uma gravação válida chega ao processamento sem duplicar job em retry;
- a transcrição pode ser corrigida antes da interpretação;
- a interpretação identifica serviços e materiais separadamente;
- preço, quantidade e condição não informados ficam pendentes ou nulos;
- o usuário consegue concluir o orçamento sem gravar novamente.

### Correção financeira

- o servidor rejeita payload inválido ou incompleto para a operação solicitada;
- totais, descontos, pagamentos e saldos são recalculados no servidor;
- proposta com pendência financeira crítica não pode ser marcada como pronta;
- pagamentos parciais e parcelas não ultrapassam o total devido;
- retry de confirmação não cria pagamentos ou recibos duplicados.

### Documentos e WhatsApp

- a proposta PDF contém os dados da revisão validada;
- o recibo PDF contém os dados do pagamento confirmado;
- cada parcela gera um recibo independente;
- proposta e recibo não podem ser confundidos no histórico;
- o botão de WhatsApp abre o cliente correto quando possível;
- o PDF pode ser compartilhado como anexo ou baixado como fallback;
- o sistema informa corretamente quando apenas iniciou o compartilhamento.

### Dados e segurança

- um usuário não acessa dados de outra conta;
- CPF/CNPJ e telefone são validados antes de documentos;
- dados sensíveis não aparecem em logs de aplicação;
- exclusão e limpeza local não recuperam snapshots anteriores;
- o app continua permitindo fallback manual quando voz ou IA falhar.

## 10. Requisitos não funcionais

### Desempenho

- medir o tempo desde o início da gravação até a proposta pronta;
- objetivo inicial: p75 de até 2 minutos para orçamento comum;
- feedback visual em cada etapa assíncrona;
- evitar bloquear a interface durante upload, transcrição, interpretação ou PDF.

### Confiabilidade

- jobs e comandos externos são idempotentes;
- retry possui limite, backoff e erro recuperável;
- o cliente mantém alterações locais em armazenamento durável;
- o servidor é a autoridade para estado final, valores e documentos.

### Privacidade e segurança

- autenticação e autorização em todas as operações protegidas;
- criptografia e gestão de chaves sem fallback silencioso para texto puro;
- retenção explícita de áudio e transcrição;
- redaction de PII em logs, métricas e traces;
- exclusão de conta desenhada como operação retomável.

### Compatibilidade inicial

- Android será a plataforma mobile do primeiro lançamento;
- o app web deverá reproduzir o mesmo fluxo funcional na segunda etapa;
- a experiência deverá ser avaliada em dispositivos Android de entrada e intermediários;
- a estratégia iOS será definida posteriormente.

## 11. Métricas e instrumentação

Eventos mínimos, sem conteúdo sensível:

- `quote_started`;
- `voice_recording_started`;
- `voice_recording_completed`;
- `transcription_completed`;
- `interpretation_completed`;
- `quote_review_completed`;
- `proposal_pdf_generated`;
- `whatsapp_share_started`;
- `payment_recorded`;
- `receipt_pdf_generated`;
- `quote_completed`.

Cada evento poderá conter IDs técnicos, duração, resultado, plataforma e versão do app, mas nunca áudio, transcrição integral, prompt ou PII.

## 12. Fora do MVP

- iOS;
- equipes e permissões multiusuário;
- integração de cobrança ou gateway de pagamento;
- emissão fiscal;
- CRM completo;
- marketplace;
- colaboração simultânea avançada;
- automações de marketing;
- relatórios financeiros avançados;
- catálogo complexo específico por profissão.

## 13. POCs obrigatórios antes da implementação final

1. **WhatsApp no Android:** validar conversa direcionada pelo telefone, mensagem pré-preenchida e anexo PDF.
2. **App web:** validar gravação única, geração de PDF e compartilhamento em navegadores-alvo.
3. **Armazenamento local:** validar perda de conexão, fechamento do app, retry e limpeza de dados.
4. **Pagamentos:** validar saldo, parcelas, pagamentos parciais e geração idempotente de recibos.
5. **IA:** validar extração de serviços/materiais, proveniência e comportamento diante de preço ausente ou fala ambígua.

## 14. Definição de pronto do MVP

O MVP estará pronto para piloto quando:

- a jornada completa funcionar no Android com dados reais de teste;
- o fallback manual estiver disponível;
- proposta e recibo forem gerados como PDFs válidos e visualmente revisados;
- pagamentos integrais, parciais e parcelados estiverem cobertos por testes;
- o fluxo de WhatsApp tiver fallback confiável;
- não houver perda ou ressuscitação de dados em cenários testados;
- autorização, redaction, idempotência e validação server-side estiverem cobertas;
- métricas de tempo, conclusão, erros e custo de IA estiverem disponíveis;
- o piloto fechado tiver usuários autônomos e critérios de decisão definidos.
