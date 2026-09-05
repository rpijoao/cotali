# Cotali — edição de orçamento salvo

## Identificação

- **Nome:** Edição pós-salvamento com nova revisão
- **Tipo:** feature e fluxo
- **Responsável:** Cotali
- **Data:** 2026-09-05
- **Status:** validado
- **Princípios relacionados:** caminho curto até o valor, defaults são decisões de produto, guardrails de confiança

## Usuário e contexto

- **ICP específico:** profissional autônomo que revisa uma proposta no celular antes de compartilhá-la.
- **Trabalho a realizar:** corrigir um dado do orçamento já salvo e voltar a compartilhar a versão correta.
- **Contexto de uso:** celular, possivelmente entre atendimentos, depois de encontrar um erro ou informação faltante.
- **Alternativa atual:** criar outro orçamento do zero, perdendo tempo e aumentando o risco de duplicidade.

## Problema e valor

- **Problema observado:** a tela de detalhes de um orçamento salvo era somente leitura; depois de confirmar o rascunho, não havia caminho para corrigir cliente, linhas, condições ou valores.
- **Resultado desejado:** corrigir o orçamento existente sem apagar a revisão anterior e sem perder a capacidade de gerar o PDF atualizado.
- **Mecanismo do Cotali:** o botão “Editar orçamento” reutiliza o editor; o servidor valida a entrada e cria uma nova revisão imutável como a revisão atual.
- **Promessa ao usuário:** suas alterações ficam salvas em uma nova revisão, enquanto a versão anterior permanece preservada.
- **O que não será prometido:** edição de orçamentos com pagamentos registrados; entrega garantida pelo WhatsApp.
- **Evidência disponível:** inspeção do fluxo atual, teste automatizado cobrindo a criação idempotente da revisão 2 e validação manual bem-sucedida no Android e no iPhone via Expo.

## Experiência

- **Ponto de entrada:** tela de detalhes do orçamento salvo.
- **Ação principal:** “Editar orçamento”.
- **O que acontece depois da ação:** o editor é preenchido com a revisão atual; ao confirmar, a API cria uma revisão nova, atualiza a revisão corrente e retorna aos detalhes atualizados.
- **Defaults escolhidos:** a revisão anterior continua imutável; o editor começa com os dados atuais, sem apagar rascunho local de outro fluxo.
- **Pendências e objeções:** o usuário precisa revisar os dados e confirmar novamente; orçamentos com pagamento registrado não podem ser editados.
- **Estados de erro, espera e recuperação:** salvamento mostra estado de espera; falha mantém os dados no editor para nova tentativa; a chave de mutação torna o retry idempotente.
- **Acessibilidade e uso em celular:** botão com papel semântico, textos explicando a criação de uma nova revisão e editor já usado no fluxo mobile.

## Escopo

### Incluído

- botão e entrada de edição na tela de detalhes;
- reutilização dos campos manuais e do ajuste por voz;
- endpoint `POST /v1/quotes/:id/revisions`;
- nova revisão persistida com totais recalculados no servidor;
- atualização do PDF e do compartilhamento por meio da revisão corrente;
- testes de contrato, API e cliente.

### Não incluído

- tela para navegar por todas as revisões;
- edição de pagamentos ou de recibos;
- edição de orçamento com pagamento registrado;
- colaboração simultânea ou resolução de conflitos entre dispositivos.

## Confiança e limites

- [x] Nenhuma métrica, depoimento ou urgência foi inventada.
- [x] Dados ausentes continuam ausentes; não são preenchidos pela edição.
- [x] A revisão anterior não é sobrescrita.
- [x] Totais continuam sendo calculados e validados no servidor.
- [x] O estado de compartilhamento continua sendo descrito como iniciado, não entregue.

## Validação

- **Hipótese:** permitir uma correção pós-salvamento reduz a necessidade de recriar propostas e aumenta a conclusão do compartilhamento.
- **Métrica primária:** percentual de edições salvas que retornam à tela de detalhes com a revisão atualizada.
- **Métricas de proteção:** falhas de atualização, revisões duplicadas em retry, divergência de total e abandono no editor.
- **Baseline:** o fluxo não tinha edição pós-salvamento.
- **Meta ou critério de decisão:** nenhuma revisão duplicada ou divergência de total nos testes; validar compreensão em teste manual no celular.
- **Como testar:** testes automatizados da API e teste de usabilidade com um orçamento salvo, uma correção de linha e uma correção de cliente.
- **Quando revisar:** após os primeiros usos reais ou se surgir falha de revisão, total ou preservação do histórico.

## Decisão

- **Decisão tomada:** editar um orçamento salvo cria uma nova revisão imutável e torna essa revisão a atual.
- **Por que esta opção:** preserva rastreabilidade, mantém PDFs antigos coerentes e segue o modelo de domínio já previsto para `QuoteRevision`.
- **O que faria mudar de ideia:** necessidade comprovada de auditoria visual das revisões ou conflitos reais entre dispositivos.
- **Aprendizado após lançamento:** registrar se a edição evita recriação e quais campos mais frequentemente exigem correção.
