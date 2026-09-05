# Cotali — retomada de rascunho por voz

## Identificação

- **Nome:** Retomada de rascunho por voz
- **Tipo:** fluxo
- **Responsável:** Produto e engenharia
- **Data:** 2026-09-05
- **Status:** em validação
- **Princípios relacionados:** caminho curto até o primeiro valor; uma ação principal por momento; mecanismo demonstrável; estados de recuperação claros

## Usuário e contexto

- **ICP específico:** profissional autônomo que cria orçamentos no celular e pode sair do app antes de concluir a revisão.
- **Trabalho a realizar:** retomar um rascunho e continuar a descrição completa ou corrigir um dado específico.
- **Contexto de uso:** celular, entre atendimentos, com possível interrupção ou conexão instável.
- **Alternativa atual:** voltar à tela anterior sem saber qual modo de voz usar ou repetir a descrição como se fosse uma alteração.

## Problema e valor

- **Problema observado:** ao retomar um rascunho, a tela mostrava apenas “Ajuste por voz”. Uma nova descrição completa era interpretada como comando de edição e podia terminar em `no_op`.
- **Resultado desejado:** o profissional entende imediatamente como gravar uma nova descrição completa e como usar ajustes pontuais.
- **Mecanismo do Cotali:** a retomada apresenta uma ação explícita para nova descrição e mantém o interpretador de comandos restrito a ajustes.
- **Promessa ao usuário:** você pode continuar o rascunho sem confundir uma nova descrição com uma alteração.
- **O que não será prometido:** a nova gravação não substitui dados sem que a transcrição possa ser conferida.
- **Evidência disponível:** reprodução manual no emulador; o estado retomado exibia “Ajuste por voz” para uma descrição completa.

## Experiência

- **Ponto de entrada:** cartão de rascunho na tela inicial ou retorno à etapa de dados.
- **Ação principal:** tocar em “Gravar nova descrição completa” quando a intenção for substituir a descrição falada.
- **O que acontece depois da ação:** o app volta à captura inicial, processa a fala e mostra a transcrição antes da continuação para os dados.
- **Defaults escolhidos:** “Ajuste por voz” continua separado para comandos específicos; resultado `no_op` não é apresentado como comando identificado.
- **Pendências e objeções:** a pessoa pode ainda precisar completar preços e condições manualmente.
- **Estados de erro, espera e recuperação:** `no_op` mostra que nenhuma alteração aplicável foi encontrada e orienta gravar um ajuste específico ou uma nova descrição.
- **Acessibilidade e uso em celular:** ações com rótulos explícitos e área de toque de botão; mensagens descrevem o próximo passo.

## Escopo

### Incluído

- ação explícita para iniciar uma nova descrição completa ao retomar um rascunho;
- copy separando nova descrição de ajuste pontual;
- estado visual e alerta coerentes para `no_op`.

### Não incluído

- persistência do arquivo de áudio ou da transcrição entre reinicializações;
- alteração do contrato de interpretação ou do modelo Groq;
- substituição silenciosa dos dados atuais sem revisão.

## Confiança e limites

- [x] Não há prova, depoimento, métrica, logo ou urgência inventada.
- [x] Dados ausentes continuam ausentes; não são tratados como fatos.
- [x] O estado comunicado ao usuário corresponde ao estado real do resultado `no_op`.
- [x] A mudança respeita domínio, privacidade, segurança e acessibilidade.

## Validação

- **Hipótese:** uma ação explícita para nova descrição reduz tentativas de usar o modo de ajuste para repetir o orçamento completo.
- **Métrica primária:** conclusão do processamento de uma nova descrição após retomar um rascunho.
- **Métricas de proteção:** taxa de `no_op`, abandono após retomada e alterações aplicadas incorretamente.
- **Baseline:** não medido; a inconsistência foi reproduzida manualmente.
- **Meta ou critério de decisão:** nenhum áudio de descrição completa deve ser apresentado como alteração aplicável; revisar após teste manual em Android e iOS.
- **Como testar:** retomar um rascunho sem transcrição, usar a ação de nova descrição, conferir a transcrição e testar um comando de alteração separado.
- **Quando revisar:** após a próxima rodada de testes no emulador Android e no Expo Go/iOS.

## Decisão

- **Decisão tomada:** separar visualmente nova descrição completa e ajuste por voz, com estado `no_op` explícito.
- **Por que esta opção:** corrige a ambiguidade observada sem remover o recurso de ajustes nem alterar o contrato do backend.
- **O que faria mudar de ideia:** testes mostrarem que usuários ainda não distinguem os dois modos ou que a retomada exige recuperar o áudio original.
- **Aprendizado após lançamento:** ainda não disponível.
