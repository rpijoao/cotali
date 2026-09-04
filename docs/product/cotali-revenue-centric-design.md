# Cotali — princípios de produto orientados a valor

**Status:** adotado como framework de decisão  
**Versão:** 0.1  
**Data:** 2026-09-04

## Propósito

Este documento adapta ao Cotali os princípios de produto e conversão do [Revenue-Centric Design](https://github.com/heliocosta-dev/revenue-centric-design), de Richard, com atribuição ao repositório de referência.

O framework não é uma biblioteca visual, uma dependência de runtime ou uma fórmula de conversão. Ele é uma forma de organizar decisões para que o Cotali entregue valor real ao profissional autônomo e também construa um negócio sustentável.

As ideias abaixo são uma adaptação para o contexto do Cotali, não uma reprodução do material original. O repositório de referência é uma coleção curada e versionada; novas ideias só entram aqui depois de avaliadas para o produto.

## Contexto que não pode ser perdido

O Cotali ajuda profissionais autônomos que recebem pedidos de serviço a transformar uma descrição falada em um orçamento revisável, profissional e pronto para compartilhar. A promessa do MVP é reduzir digitação e levar do atendimento à proposta em até dois minutos, sem inventar informações ausentes e sem retirar a revisão do profissional.

## Princípios do Cotali

### 1. Especificidade antes de abrangência

Toda comunicação e feature precisa dizer para qual profissional, situação e trabalho foi desenhada. “Para qualquer negócio” é um sinal de que ainda não escolhemos o usuário principal.

**Pergunta:** qual profissional se reconhece nesta mensagem e em qual momento de trabalho?

### 2. Problema antes da feature

Começamos pelo custo do comportamento atual — digitar, esquecer itens, perder tempo e enviar propostas pouco profissionais — e só depois mostramos voz, IA, PDF ou WhatsApp como mecanismo de solução.

**Pergunta:** se removermos o nome da tecnologia, o problema e o resultado continuam claros?

### 3. O mecanismo precisa ser demonstrável

O Cotali não deve apenas afirmar que “cria orçamentos por voz”. Deve mostrar o caminho: uma fala natural, uma proposta estruturada, uma revisão clara e um documento compartilhável.

**Pergunta:** o visitante consegue imaginar o que acontece depois que começa?

### 4. A prova precisa acompanhar a promessa

Quanto mais concreta a promessa, mais concreta precisa ser a evidência. Exemplos de orçamento, demonstração do fluxo, tempo medido e relatos verificáveis são melhores que adjetivos como “revolucionário”.

**Regra:** onde ainda não houver evidência, escrever como hipótese ou convite para teste — nunca como fato.

### 5. Uma ação principal por momento

Cada tela deve ter uma próxima ação dominante e uma explicação curta do que acontece depois. Links secundários existem para reduzir objeções, não para competir com o objetivo principal.

**Exemplo:** na LP, a ação deve levar a uma demonstração, lista de interesse ou primeiro orçamento — conforme o estágio real do produto.

### 6. Caminho curto até o primeiro valor

O primeiro orçamento útil é o momento de valor do Cotali. Cadastro, configuração e explicações devem aparecer na ordem necessária para permitir que o profissional veja esse valor cedo, sem esconder informações importantes.

**Métrica primária:** tempo desde o início até um orçamento revisável.

### 7. Defaults são decisões de produto

Estados iniciais, exemplos, campos sugeridos, pendências e ordem das ações moldam o comportamento. O default deve ajudar a concluir um orçamento, mas não pode preencher preço, quantidade ou condição que o profissional não informou.

### 8. Atenção é orçamento limitado

Não transformar cada capacidade do produto em uma chamada. A interface deve destacar o que desbloqueia o próximo passo e deixar detalhes secundários disponíveis sem roubar o foco.

### 9. Monetização deve filtrar e acompanhar valor

Preço e limites precisam deixar claro para quem o produto é adequado. Expansão deve acontecer quando o uso demonstrar necessidade, não interromper a primeira experiência antes de o valor ser percebido.

### 10. Retenção nasce do trabalho recorrente

O motivo para voltar deve ser o trabalho que o profissional consegue concluir melhor: novos orçamentos, clientes reutilizáveis, histórico, propostas e recibos. Notificações e pedidos de retorno não substituem valor recorrente.

## Aplicação por superfície

| Superfície         | Decisão orientada por valor                                         | Sinal de sucesso                                        |
| ------------------ | ------------------------------------------------------------------- | ------------------------------------------------------- |
| Landing page       | Problema específico, mecanismo visível, prova honesta e CTA claro   | início da jornada de interesse ou do primeiro orçamento |
| Entrada no produto | Chegar rapidamente à primeira descrição de serviço                  | tempo até primeiro orçamento revisável                  |
| Captura por voz    | Uma ação evidente, estado sempre visível e recuperação em falhas    | gravação concluída e processamento sem perda            |
| Revisão            | Destacar apenas pendências que exigem decisão                       | orçamento validado sem nova gravação                    |
| PDF e WhatsApp     | Tornar o resultado compartilhável e explicar o estado real do envio | proposta gerada e compartilhamento iniciado             |
| Histórico          | Preservar o trabalho que reduz esforço futuro                       | segundo orçamento e reutilização de clientes            |
| Pagamento e recibo | Mostrar valor, saldo e natureza comercial sem ambiguidade           | pagamento confirmado e recibo correto                   |

## Guardrails de confiança

- Não usar depoimentos, logos, métricas, escassez ou urgência sem base verificável.
- Não usar dark patterns para forçar cadastro, pagamento, compartilhamento ou retenção.
- Não inventar dados ausentes em orçamento, proposta, pagamento ou recibo.
- Não esconder preço, saldo, pendência, estado assíncrono ou consequência de uma ação.
- Não sacrificar acessibilidade, privacidade, segurança, idempotência ou autoridade server-side por conversão.
- Não declarar que o WhatsApp entregou uma mensagem quando apenas iniciamos o compartilhamento.

## Como uma decisão deve ser registrada

Para cada feature, fluxo ou página nova, preencher o [template de briefing](./feature-brief-template.md). O documento deve distinguir:

- **fato:** algo já observado ou garantido pelo produto;
- **evidência:** dado que sustenta a decisão;
- **hipótese:** crença que ainda será testada;
- **promessa:** resultado comunicado ao usuário;
- **métrica:** comportamento que mostra se o resultado aconteceu.

Uma decisão pode ser esteticamente boa e ainda assim falhar se não for compreendida, não entregar o resultado prometido ou não gerar aprendizado mensurável.

## Fonte e atribuição

Referência principal: [Revenue-Centric Design](https://github.com/heliocosta-dev/revenue-centric-design), de heliocosta-dev, baseado no trabalho de Richard (`@richardrx`). Consultado em 2026-09-04. O conteúdo original possui termos de uso próprios; este documento mantém a atribuição e resume apenas a aplicação necessária ao Cotali.
