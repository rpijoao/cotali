# Cotali — Avaliação da Stack Elixir/Phoenix v0.1

**Versão:** 0.1  
**Data:** 2026-09-03  
**Status:** análise técnica; nenhuma escolha final  
**Stack avaliada:** Elixir, Phoenix, LiveView, Supabase Database, Fly.io, AppSignal e Framer

## 1. Resumo executivo

Essa stack é tecnicamente séria e tem excelente aderência a sistemas com:

- alta concorrência;
- conexões persistentes;
- atualizações em tempo real;
- tolerância a falhas;
- backend com jobs e processos longos;
- aplicação web interativa com pouco JavaScript;
- operação distribuída.

Ela é particularmente forte para o **backend** e para o **app web** do Cotali. Porém, LiveView não substitui o aplicativo Android voice-first. O Android ainda precisaria de uma camada mobile própria, como React Native/Expo ou desenvolvimento nativo, consumindo uma API Phoenix.

### Veredito preliminar

```text
Elixir              forte para concorrência, tolerância a falhas e jobs
Phoenix             forte para API, web e realtime
LiveView             forte para o app web autenticado
Supabase Database    forte como PostgreSQL gerenciado
Fly.io               adequado para executar Phoenix/Elixir
AppSignal            forte para observabilidade de Elixir/Phoenix
Framer               adequado para landing page e marketing
```

O principal ponto não é a capacidade de escalar. É a aderência ao lançamento Android-first e ao fluxo voice-first, que exige um cliente mobile separado e uma estratégia clara para áudio, PDF, sincronização e compartilhamento pelo WhatsApp.

## 2. Avaliação por componente

### 2.1 Elixir

**Adequação: alta para o backend.**

Elixir oferece um modelo muito bom para serviços concorrentes, processos isolados, supervisão e recuperação de falhas. Isso combina com:

- múltiplas sessões de usuários;
- processamento simultâneo de áudio e IA;
- jobs de PDF e recibo;
- notificações;
- conexões persistentes do app web;
- sincronização e eventos;
- isolamento de falhas entre jobs.

**Riscos a controlar:**

- curva de aprendizado para uma equipe acostumada a TypeScript;
- disponibilidade de profissionais com experiência real em produção;
- integração com SDKs de IA, storage, WhatsApp e geração de PDF;
- padrão de compartilhamento de contratos com o app Android;
- custo e disciplina operacional do cluster.

**Conclusão:** excelente candidato para o backend, desde que exista capacidade técnica em Elixir.

### 2.2 Phoenix

**Adequação: alta.**

Phoenix pode atender tanto a API do app Android quanto o app web LiveView. Ele oferece uma base coerente para:

- autenticação e autorização;
- API versionada;
- endpoints de áudio e documentos;
- canais e eventos em tempo real;
- módulos de domínio;
- jobs e integrações;
- páginas web dinâmicas.

A divisão recomendada seria:

```text
Phoenix API
  Android e integrações externas

Phoenix LiveView
  app web autenticado

Phoenix controllers/pages
  endpoints públicos específicos, quando necessário
```

Phoenix não deve concentrar domínio, persistência, HTML e integrações em módulos sem fronteira. A separação por contexto continua necessária.

**Conclusão:** forte candidato para o backend e para o app web.

### 2.3 Phoenix LiveView

**Adequação: alta para o app web; baixa como substituto do app mobile.**

LiveView mantém estado de uma view no servidor e envia atualizações incrementais ao navegador. Isso pode produzir um app web sofisticado com menos JavaScript próprio. A documentação descreve o LiveView como uma view stateful que começa com uma resposta HTML regular e atualiza a interface por diffs. [Phoenix LiveView](https://phoenix-live-view.hexdocs.pm/Phoenix.LiveView.html)

Para o app web do Cotali, LiveView pode funcionar muito bem para:

- histórico de orçamentos;
- editor;
- revisão de transcrição;
- acompanhamento de jobs;
- pagamentos e recibos;
- atualização de status em tempo real.

Entretanto, o núcleo mobile continua exigindo outro cliente para:

- gravação nativa;
- permissões de microfone;
- armazenamento local;
- upload retomável;
- compartilhamento de PDF;
- comportamento após fechar ou suspender o app.

O LiveView também requer atenção para conexão instável: uma view stateful não pode ser confundida com um outbox offline durável. O armazenamento local e a sincronização do Android ainda precisam ser projetados.

**Riscos a controlar:**

- upload de áudio usando hooks JavaScript;
- perda de conexão durante edição;
- volume de estado mantido por socket;
- escalabilidade de conexões persistentes;
- SEO e páginas públicas separadas da área autenticada;
- compartilhamento de contratos com o cliente mobile.

**Conclusão:** excelente candidato para o app web, mas não substitui React Native/Expo ou nativo no Android.

### 2.4 Supabase Database

**Adequação: alta como PostgreSQL gerenciado.**

Supabase fornece PostgreSQL completo, além de produtos opcionais de Auth, Storage, Realtime e Edge Functions. Se o uso for somente banco, o acoplamento à plataforma fica menor e Phoenix continua sendo o dono do domínio e da API.

O banco atende ao Cotali para:

- contas e perfis;
- clientes;
- orçamentos e revisões;
- serviços e materiais;
- planos, parcelas e pagamentos;
- recibos imutáveis;
- jobs, mutations e auditoria.

O backend Elixir precisa usar o modo de conexão correto e manter pool controlado. A documentação do Supabase diferencia conexão direta, pooler em modo sessão e pooler em modo transação; para um backend persistente, a escolha deve considerar a região, IPv4/IPv6, pool e comportamento do driver. [Supabase — Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) [Supabase — Connection Management](https://supabase.com/docs/guides/database/connection-management)

**Riscos a controlar:**

- região do Supabase diferente da região do Fly.io;
- latência entre aplicação e banco;
- pool de conexões de Phoenix/Ecto;
- migrations fora do fluxo de deploy;
- confusão entre domínio Phoenix e recursos opcionais Supabase;
- backup e restore comprovados;
- políticas de RLS se partes do Supabase forem acessadas diretamente.

**Conclusão:** forte escolha para PostgreSQL gerenciado, desde que a conexão seja planejada e o domínio continue no Phoenix.

### 2.5 Fly.io

**Adequação: média-alta para Phoenix/Elixir.**

Fly.io possui documentação específica para executar Elixir e Phoenix e descreve implantação de clusters em múltiplas regiões. Isso é alinhado ao modelo de processos persistentes e conexões LiveView. [Fly.io — Elixir](https://fly.io/docs/elixir/)

Para o Cotali, Fly.io poderia executar:

- API Phoenix;
- servidores LiveView;
- workers de jobs;
- tarefas de manutenção;
- eventualmente processos de sincronização.

O fato de Fly permitir múltiplas regiões não significa que o Cotali deva começar distribuído globalmente. Com Supabase como banco central, a região primária do app deve ficar próxima do banco para evitar latência e custos de rede.

**Riscos a controlar:**

- operação de volumes e estado local;
- health checks e deploys;
- região do banco;
- observabilidade de máquinas e rede;
- backup/restore do banco fora da responsabilidade do compute;
- failover real;
- custos de múltiplas regiões;
- runbooks para processo, máquina e banco indisponíveis.

**Conclusão:** plataforma adequada, mas exige disciplina de operação e escolha regional coerente.

### 2.6 AppSignal

**Adequação: alta para observabilidade Elixir/Phoenix.**

AppSignal possui integração direta com Elixir e Phoenix para error tracking, performance monitoring, métricas, uptime e dashboards. Também documenta integrações com Ecto, Plug, Finch e Oban, entre outras. [AppSignal para Elixir](https://docs.appsignal.com/elixir)

Isso é uma vantagem importante para um backend Phoenix, mas observabilidade não deve depender de uma única ferramenta. O Cotali ainda precisa definir:

- métricas de produto;
- redaction de PII;
- traces entre API, job, IA, PDF e storage;
- correlação por `request_id`, `job_id` e `mutation_id`;
- alertas de custo e latência;
- retenção de dados;
- exportação ou plano de contingência.

**Riscos a controlar:**

- transcrição ou CPF aparecendo em exceções;
- payload de job registrado automaticamente;
- ausência de métricas específicas de sincronização;
- dependência excessiva de dashboards proprietários;
- custo conforme volume de eventos.

**Conclusão:** forte complemento para operação, desde que redaction e métricas sejam projetados pelo Cotali.

### 2.7 Framer para landing page

**Adequação: alta para a landing page.**

Framer é adequado para criar e operar uma LP de marketing sem colocar o site público dentro do monorepo do produto. A documentação oficial oferece ferramentas de SEO, metadata, redirects, sitemap e CMS. [Framer SEO](https://www.framer.com/help/seo/) [Framer CMS](https://www.framer.com/help/cms/)

A LP deverá ser tratada como uma superfície de aquisição:

- explicar a promessa dos dois minutos;
- mostrar o fluxo de voz;
- direcionar para o Android;
- coletar pré-cadastro ou leads;
- publicar termos, privacidade e suporte;
- medir campanhas.

Ela não deve conter lógica de orçamento, autenticação do app ou dados sensíveis. O CTA para o app pode usar links para a loja e o CTA do WhatsApp pode usar click-to-chat quando necessário.

**Riscos a controlar:**

- dependência do editor e publicação proprietários;
- versionamento da copy e do design;
- integração de formulários e analytics;
- canonical, domínio e redirects;
- governança de conteúdo e acesso da equipe.

**Conclusão:** forte candidata para a LP, sem impacto negativo na arquitetura do app.

## 3. Jobs assíncronos: lacuna da stack listada

A stack informada não inclui explicitamente uma solução de jobs. Phoenix e OTP fornecem primitivas excelentes de processos e supervisão, mas o Cotali ainda precisa de um mecanismo durável para:

- transcrição;
- interpretação;
- geração de proposta PDF;
- geração de recibo PDF;
- retry;
- backoff;
- dead-letter;
- jobs agendados;
- expiração de artefatos;
- rastreabilidade.

Uma opção natural no ecossistema Elixir é avaliar Oban com PostgreSQL, mas isso seria um componente adicional e precisa ser analisado separadamente. O requisito essencial é que o job seja durável, idempotente, observável e registrado no banco. Um processo supervisionado em memória, sozinho, não atende ao contrato do Cotali.

## 4. Coerência da combinação

### Pontos fortes

- backend muito adequado para concorrência e falhas;
- Phoenix atende API e web em uma plataforma coerente;
- LiveView pode acelerar o app web autenticado;
- Supabase entrega PostgreSQL gerenciado;
- Fly.io é alinhado a Phoenix/Elixir;
- AppSignal cobre observabilidade específica do ecossistema;
- Framer isola aquisição e marketing;
- menor dependência de JavaScript no app web;
- possibilidade de atualizações em tempo real sem construir tudo manualmente no cliente.

### Pontos de atenção

- o Android precisa de cliente separado;
- LiveView não resolve offline-first nativo;
- áudio, PDF e WhatsApp exigem adapters mobile e web;
- a stack listada precisa de um sistema explícito de jobs duráveis;
- Supabase + Fly exige planejamento de região e conexões;
- Elixir exige capacidade técnica específica;
- o contrato entre Phoenix e Android precisa ser versionado;
- não usar diretamente Supabase Auth/Storage/Realtime sem decidir o impacto no domínio;
- o app web LiveView não deve possuir regras diferentes do Android.

## 5. Arquitetura compatível com essa stack

```text
Framer
  landing page e conteúdo de aquisição

Android
  cliente mobile voice-first

Phoenix API
  autenticação, comandos, consultas, validação e documentos

Phoenix LiveView
  app web autenticado com o mesmo fluxo funcional

Elixir workers / Oban ou alternativa equivalente
  transcrição, interpretação, PDF, recibos e manutenção

Ecto
  persistência e transações

Supabase PostgreSQL
  fonte de verdade

Supabase Storage ou object storage separado
  PDFs, logos e artefatos

Fly.io
  API, LiveView e workers

AppSignal
  erros, performance, métricas e alertas
```

O domínio deve ficar em contextos Phoenix/Elixir bem definidos, por exemplo:

```text
Cotali.Accounts
Cotali.Clients
Cotali.Quotes
Cotali.Payments
Cotali.Receipts
Cotali.Audio
Cotali.Interpretation
Cotali.Documents
Cotali.Delivery
```

O Android e o LiveView devem consumir os mesmos comandos e regras. O HTML do LiveView não pode virar a fonte alternativa de verdade.

## 6. Matriz de validação obrigatória

Antes de aprovar a stack, validar:

| Área            | Cenário mínimo                              | Critério de aprovação                      |
| --------------- | ------------------------------------------- | ------------------------------------------ |
| Phoenix API     | autenticação, commands e erros estruturados | contrato versionado e isolamento por conta |
| LiveView        | editor completo e estados assíncronos       | reconexão sem perder edição                |
| Android/Phoenix | gravação e upload real                      | timeout, cancelamento e retry corretos     |
| Ecto/Supabase   | migration, transaction e pool               | sem vazamento ou bloqueio de conexão       |
| Jobs            | transcrição, IA, PDF e recibo               | retry idempotente e estado durável         |
| Fly.io          | deploy, healthcheck e rollback              | operação reproduzível                      |
| AppSignal       | erro, métrica e trace de ponta a ponta      | PII redigida                               |
| Framer          | LP, domínio, SEO e CTA Android              | leads e analytics funcionando              |
| WhatsApp        | telefone, mensagem e PDF                    | fallback manual confiável                  |
| Sync            | offline e dois dispositivos                 | nenhuma mutation perdida ou ressuscitada   |
| Pagamentos      | parcial, parcela e integral                 | um pagamento e um recibo por evento        |

## 7. Comparação interna da stack

Esta seção não compara com outra stack; ela avalia a própria coerência interna:

### Muito bem alinhado

- Phoenix + Elixir;
- Phoenix + LiveView;
- Phoenix + Ecto + PostgreSQL;
- Phoenix + AppSignal;
- Framer + landing page.

### Exige desenho explícito

- Android + Phoenix API;
- LiveView + offline local;
- Fly.io + Supabase em regiões coordenadas;
- jobs duráveis no ecossistema Elixir;
- áudio e PDF nos dois clientes.

### Lacuna que não pode ficar implícita

O sistema de jobs. A stack pode usar OTP para supervisão e processos, mas a execução do Cotali exige persistência, retries, idempotência e recuperação após reinício.

## 8. Decisão preliminar

Essa stack deve permanecer como **candidata forte**, principalmente se o time tiver experiência real em Elixir/Phoenix.

Ela é mais naturalmente otimizada para:

- backend concorrente;
- app web conectado;
- realtime;
- tolerância a falhas;
- operações de longa duração.

Ela exige uma decisão adicional para o Android e uma solução explícita de jobs duráveis. O uso de Supabase e Fly.io também precisa ser validado por região, pool, backup e restore.

### Pode ser aprovada se

- o time dominar Elixir/Phoenix;
- o Android consumir contratos Phoenix sem duplicar regras;
- LiveView mantiver o mesmo fluxo funcional do Android;
- jobs forem duráveis e idempotentes;
- áudio, PDF, WhatsApp e recibos passarem nos testes reais;
- Supabase e Fly forem posicionados na mesma região lógica;
- observabilidade redigir dados sensíveis;
- backup e restore forem demonstrados.

### Deve ser revisada se

- o app Android exigir uma segunda API com regras próprias;
- LiveView perder edições em reconexões;
- não houver solução de jobs persistentes;
- o time depender de uma única pessoa para operar Elixir;
- o acoplamento a serviços Supabase impedir migração futura;
- a latência Fly/Supabase prejudicar a meta de dois minutos.

## 9. Conclusão

A stack Elixir/Phoenix + LiveView + Supabase + Fly + AppSignal + Framer é profissional e pode sustentar o Cotali. Ela não é “melhor” automaticamente; oferece um perfil diferente da stack TypeScript/Bun.

O fato de existir um SaaS financeiro com essa stack é uma evidência prática de maturidade operacional. Para o Cotali, a pergunta decisiva será se a equipe quer assumir Elixir/Phoenix como centro do backend e LiveView como centro do app web, mantendo um cliente Android separado.

A posição técnica atual é:

> **stack aprovada como candidata forte para backend e web; Android e jobs duráveis são os principais gates de validação antes de qualquer decisão final.**
