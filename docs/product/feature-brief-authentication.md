# Cotali — briefing de autenticação e comunicação

## Identificação

- **Nome:** Entrada sem senha para criar e continuar orçamentos
- **Tipo:** fluxo e feature
- **Responsável:** produto/engenharia Cotali
- **Data:** 2026-09-06
- **Status:** implementado no checkout; evidências de produção pendentes
- **Princípios relacionados:** reduzir o caminho até o primeiro orçamento útil; mostrar o mecanismo de valor; preservar controle e transparência; medir valor entregue

## Usuário e contexto

- **ICP específico:** profissional autônomo que recebe pedidos e precisa responder
  com uma proposta clara, começando pelo celular
- **Trabalho a realizar:** entrar rapidamente e voltar ao fluxo de criar, revisar
  e compartilhar um orçamento
- **Contexto de uso:** Android primeiro, entre visitas e tarefas, com atenção
  limitada; web será uma superfície posterior
- **Nível de consciência:** já conhece o problema de organizar propostas, mas não
  precisa conhecer a tecnologia de autenticação
- **Alternativa atual:** senha, contas sociais isoladas ou trabalho manual em
  mensagens/documentos; cada alternativa adiciona fricção ou perda de contexto

## Problema e valor

- **Problema observado:** um cadastro pesado ou uma senha esquecida interrompe o
  primeiro orçamento útil
- **Resultado desejado:** autenticar em poucos passos, manter a conta protegida
  e voltar ao orçamento sem perder dados
- **Mecanismo do Cotali:** Google/Apple e OTP de email criam uma identidade única;
  Better Auth mantém a sessão; a API associa todos os dados ao usuário
  autenticado
- **Promessa ao usuário:** entre com Google, Apple ou um código por email e
  continue seu trabalho
- **O que não será prometido:** entrega de email instantânea, compartilhamento
  automático, recuperação por telefone ou ausência total de indisponibilidade
- **Evidência disponível:** decisão de produto registrada; não há ainda métrica
  de produção nem depoimento a apresentar

## Experiência

- **Ponto de entrada:** botão `entrar` na landing page ou abertura do app
- **Ação principal:** informar email e receber código; Google e Apple ficam como
  alternativas equivalentes e visíveis
- **O que acontece depois da ação:** o código chega pelo Resend, é validado uma
  única vez, a sessão é criada e o usuário retorna ao Cotali
- **Defaults escolhidos:** checkbox de marketing desmarcado; nenhuma senha;
  mensagens genéricas que não revelam se o email existe
- **Pendências e objeções:** spam/bounce, cancelamento OAuth, Apple relay,
  troca/perda do email e gerenciamento de sessões em mais de um dispositivo
- **Estados de erro, espera e recuperação:** loading, código expirado, código
  inválido, limite atingido, reenvio rotativo e falha de provedor; sessão já
  criada continua válida durante indisponibilidade social
- **Acessibilidade e uso em celular:** input de email e OTP com autocomplete,
  teclado numérico, foco visível, botão desabilitado enquanto processa e
  checkbox com estado acessível

## Escopo

### Incluído

- Google OAuth;
- Apple OAuth;
- email OTP de seis dígitos;
- sessão web por cookie e sessão mobile com armazenamento seguro;
- associação um usuário Cotali → uma conta de negócio;
- vinculação explícita futura, sem auto-link por email;
- Resend para email transacional;
- checkbox separado e registro versionado de consentimento de marketing;
- eventos mínimos de criação e edição de orçamento.

### Não incluído

- senha;
- SMS/telefone;
- Microsoft SSO corporativo;
- códigos de recuperação;
- times, convites e multi-tenant avançado;
- plano, cobrança e limites numéricos;
- automação de reengajamento por inatividade;
- envio de marketing sem opt-in.

## Confiança e limites

- [x] Não há prova, depoimento, métrica, logo ou urgência inventada.
- [x] Dados ausentes continuam ausentes; não são tratados como fatos.
- [x] A ação de marketing é opcional e começa desmarcada.
- [x] O login não captura áudio, transcrição, nome de cliente ou valor de orçamento para marketing.
- [x] A mudança respeita domínio, privacidade, segurança e acessibilidade.
- [x] O estado comunicado ao usuário corresponde ao estado real da sessão.

## Validação

- **Hipótese:** entrada por OTP/social reduz abandono sem diminuir a confiança
  para o profissional que está começando um orçamento
- **Métrica primária:** taxa de login concluído → primeiro `quote_created`
- **Métricas de proteção:** falha de envio OTP, abuso/limite, abandono no OAuth,
  tickets de recuperação, revogação de consentimento, ausência de dados
  sensíveis em eventos/logs
- **Baseline:** ainda não disponível
- **Meta ou critério de decisão:** comparar com o baseline do fluxo de produção
  após instrumentação; não definir número antes de observar uso real
- **Como testar:** teste manual dos provedores, development build Android/iOS,
  teste web e revisão de logs/migration em ambiente de desenvolvimento
- **Quando revisar:** após os primeiros usuários ativos e antes de adicionar
  SMS, senha, times ou automações de marketing

## Decisão

- **Decisão tomada:** Better Auth no backend Fastify, PostgreSQL compartilhado,
  Resend para OTP, cliente Expo/Web e registros separados de consentimento e
  eventos
- **Por que esta opção:** reduz superfície de criptografia própria, preserva a
  mesma autoridade de sessão nas plataformas e mantém os limites de marketing
  explícitos
- **O que faria mudar de ideia:** falha de segurança, incompatibilidade
  operacional comprovada, custo de email insustentável ou evidência de que o
  fluxo não conclui o orçamento
- **Aprendizado após lançamento:** preencher com dados observados; não inventar
  conversão, retenção ou preferências do usuário

## Auditoria

Este briefing descreve problema, escopo, experiência e hipótese de valor. A
matriz de controles, inventário de dados, ameaças, evidências e gate de produção
está no [pacote de auditoria do auth](../audits/cotali-authentication-audit-pack-2026-09-06.md).
