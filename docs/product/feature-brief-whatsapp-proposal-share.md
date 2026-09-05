# Cotali — briefing: envio de proposta pelo WhatsApp

## Identificação

- **Nome:** Envio de proposta pelo WhatsApp
- **Tipo:** feature e fluxo
- **Responsável:** Produto e engenharia Cotali
- **Data:** 2026-09-05
- **Status:** em validação
- **Princípios relacionados:** problema antes da feature; mecanismo demonstrável; uma ação principal por momento; PDF e WhatsApp devem comunicar o estado real do envio

## Usuário e contexto

- **ICP específico:** profissional autônomo de serviços, trabalhando sozinho e respondendo clientes pelo celular.
- **Trabalho a realizar:** transformar um orçamento revisado em uma proposta PDF pronta para iniciar o contato com o cliente.
- **Contexto de uso:** depois da revisão do orçamento, geralmente sob pressão de tempo, no Android ou iPhone, com o WhatsApp instalado ou disponível na folha de compartilhamento.
- **Nível de consciência:** já convencido do problema e usando o fluxo de criação do Cotali.
- **Alternativa atual:** abrir a folha genérica de compartilhamento, escolher o WhatsApp, localizar a conversa e escrever a mensagem manualmente.

## Problema e valor

- **Problema observado:** a exportação genérica cria etapas extras justamente no momento em que o profissional precisa enviar uma proposta.
- **Resultado desejado:** uma ação principal deve gerar o PDF e preparar uma mensagem contextualizada no WhatsApp; uma exportação genérica continua disponível para outros apps e para recuperação.
- **Mecanismo do Cotali:** o app baixa o PDF autenticado do backend e usa o compartilhamento nativo. No Android, o adaptador direciona para o WhatsApp quando há telefone normalizado; sem telefone válido, abre a folha de compartilhamento para o usuário escolher a conversa manualmente. No iOS, o PDF e a mensagem são entregues à folha nativa para o usuário escolher o WhatsApp.
- **Promessa ao usuário:** “Prepare a proposta para enviar pelo WhatsApp.”
- **O que não será prometido:** confirmação de entrega, leitura ou envio efetivo da mensagem; no iPhone, não será prometido direcionamento automático da conversa com PDF anexado.
- **Evidência disponível:** o compartilhamento genérico de PDF foi testado no Pixel 6 e no iPhone 13. O envio direcionado com a biblioteca nativa ainda depende de teste em development build Android.

## Experiência

- **Ponto de entrada:** tela de detalhes de um orçamento salvo.
- **Ação principal:** **Enviar pelo WhatsApp**.
- **O que acontece depois da ação:** o Cotali gera/baixa o PDF, prepara a mensagem e inicia o compartilhamento. Android abre o WhatsApp para o número válido ou a folha de compartilhamento quando não há número utilizável; iOS abre a folha nativa com PDF e mensagem; o usuário ainda confirma o destinatário e o envio.
- **Defaults escolhidos:** a mensagem começa com o nome do cliente e informa que a proposta comercial do Cotali está anexada. O telefone já salvo no cliente é usado apenas para facilitar o fluxo.
- **Pendências e objeções:** telefone ausente ou inválido, WhatsApp não instalado e cancelamento pelo usuário.
- **Estados de erro, espera e recuperação:** botão mostra carregamento; erros informam a causa sem afirmar que houve entrega; sem telefone utilizável ou sem módulo nativo, a ação principal abre o compartilhamento manual do PDF; o botão **Exportar PDF** continua disponível para compartilhar ou salvar o arquivo.
- **Acessibilidade e uso em celular:** duas ações com hierarquia clara, áreas de toque amplas, textos explicando o resultado e mensagens de erro legíveis.

## Escopo

### Incluído

- ação principal para compartilhar a proposta no WhatsApp;
- normalização e validação do telefone do cliente;
- mensagem pré-preenchida com nome do cliente;
- exportação genérica do PDF como fallback separado;
- configuração nativa do módulo no development build;
- testes unitários para Android, iOS e telefone ausente.

### Não incluído

- envio automático via WhatsApp Business API;
- confirmação de entrega ou leitura;
- escolha programática de uma conversa no iOS com PDF anexado;
- histórico persistido de tentativa de compartilhamento.

## Confiança e limites

- [x] Não há prova, depoimento, métrica, logo ou urgência inventada.
- [x] Dados ausentes continuam ausentes; telefone ausente remove apenas o direcionamento e mantém o compartilhamento manual.
- [x] Preço, saldo, pendência e consequência das ações não são alterados.
- [x] A mudança respeita domínio, privacidade, segurança e acessibilidade.
- [x] O estado comunicado ao usuário corresponde ao compartilhamento iniciado, não à entrega.

## Validação

- **Hipótese:** reduzir as etapas entre a proposta pronta e o início do envio aumenta a taxa de compartilhamento sem aumentar cancelamentos ou confusão sobre entrega.
- **Métrica primária:** percentual de propostas cujo compartilhamento foi iniciado pelo botão principal.
- **Métricas de proteção:** falhas por telefone inválido, falhas por aplicativo ausente, cancelamentos, uso do fallback e relatos de PDF não anexado.
- **Baseline:** compartilhamento genérico já validado manualmente; não há métrica quantitativa de uso.
- **Meta ou critério de decisão:** o Android deve abrir o WhatsApp com PDF e mensagem no número de teste; sem telefone, deve abrir o compartilhamento manual sem bloquear o PDF; o iOS deve mostrar PDF e mensagem na folha nativa; falhas devem levar ao fallback sem perda do arquivo.
- **Como testar:** development build no Pixel 6 e no iPhone 13, com número fictício, WhatsApp instalado e casos sem telefone.
- **Quando revisar:** após o primeiro teste real em cada plataforma.

## Decisão

- **Decisão tomada:** usar `react-native-share` para a ação principal quando disponível, com direcionamento no Android e fallback nativo no iOS; usar `expo-sharing` para compartilhar manualmente quando não houver telefone utilizável ou módulo nativo; manter a exportação genérica do PDF.
- **Por que esta opção:** atende o caminho principal do MVP no Android sem remover controle do usuário e preserva uma alternativa quando o destino não estiver disponível.
- **O que faria mudar de ideia:** impossibilidade de anexar o PDF de forma consistente no Android, incompatibilidade com a distribuição nativa ou evidência de que a hierarquia gera mais erros que o compartilhamento genérico.
- **Aprendizado após lançamento:** registrar apenas compartilhamento iniciado e erros técnicos; nunca tratar isso como confirmação de entrega.
