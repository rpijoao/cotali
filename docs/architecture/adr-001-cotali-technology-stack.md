# ADR-001 — Stack tecnológica do Cotali

- Status: aceito
- Data: 2026-09-03
- Decisão: fundação técnica do MVP e caminho de evolução

## Contexto

O Cotali é um produto mobile-first para profissionais autônomos criarem, por voz, um orçamento revisável em até dois minutos, gerarem proposta e recibos em PDF e compartilharem pelo WhatsApp.

O lançamento será feito com landing page e Android. O app web autenticado será a segunda superfície e o iOS virá posteriormente. A equipe inicial é pequena; portanto, a stack precisa equilibrar produtividade, previsibilidade operacional, contratos estáveis para versões móveis antigas e capacidade de escalar sem reescrita prematura.

## Decisão

### Linguagem e repositório

- TypeScript em aplicações e backend.
- Monorepo com `pnpm workspaces` e Turborepo.
- Node.js LTS como runtime de produção e desenvolvimento do backend.
- Código organizado por aplicações e pacotes, sem compartilhamento direto de modelos de banco com os clientes.

Estrutura inicial:

```text
apps/
  mobile/       # Expo / React Native
  web/          # Next.js: LP agora, app autenticado depois
  api/          # Fastify
  worker/       # consumidores BullMQ
packages/
  domain/       # regras puras do negócio
  contracts/    # schemas públicos e contratos versionados
  application/  # casos de uso
  ui/           # tokens e componentes compartilháveis quando viável
  config/       # configurações de lint, TypeScript e testes
```

### Mobile

- React Native com Expo.
- Primeiro alvo: Android.
- `expo-audio` para captura de voz.
- Development builds durante o desenvolvimento; EAS Build para artefatos Android e EAS Update apenas para mudanças compatíveis com a versão nativa instalada.
- SQLite no dispositivo para rascunhos, cache e outbox local-first.
- Compartilhamento nativo para PDF e integração progressiva com WhatsApp.

### Web e landing page

- Next.js com App Router.
- A landing page será implementada primeiro com geração estática/SSR conforme a necessidade de SEO.
- O app web autenticado será adicionado posteriormente no mesmo projeto, com rotas e limites de segurança próprios.
- A lógica de negócio não ficará em componentes React nem dependerá de Server Actions.
- O web e o mobile consumirão a mesma API pública versionada.

### Backend e contratos

- Fastify executado em Node.js LTS.
- Monólito modular, com worker separado apenas por necessidade operacional.
- API HTTP/JSON em `/v1`.
- TypeBox/JSON Schema para validação em runtime e tipos dos contratos.
- OpenAPI gerado a partir dos schemas e clientes gerados para mobile e web.
- Compatibilidade retroativa obrigatória dentro de uma versão da API.
- tRPC não será usado no core do MVP.
- Bun e Elysia não serão usados na fundação inicial.

### Domínio e persistência

- PostgreSQL como fonte autoritativa.
- Prisma como adaptador de persistência e ferramenta de migrations.
- Entidades e regras de domínio independentes de Prisma, Fastify, React e Expo.
- Valores monetários armazenados como inteiros na menor unidade monetária.
- Revisões de proposta e recibos emitidos serão imutáveis.
- Toda confirmação financeira será validada no backend e protegida por idempotência.

### Assíncrono e confiabilidade

- BullMQ para jobs e Redis gerenciado compatível com seus requisitos operacionais.
- Transactional outbox no PostgreSQL para não perder eventos entre transação e enfileiramento.
- Processadores idempotentes, retries limitados, backoff, dead-letter handling e correlação ponta a ponta.
- PostgreSQL permanecerá como fonte do estado dos jobs de negócio; Redis não será a única evidência de emissão ou envio.

### Voz, PDFs e arquivos

- Áudio enviado diretamente para object storage por URL assinada.
- Transcrição e interpretação atrás de interfaces de provedor, permitindo troca de fornecedor.
- A voz produz um rascunho; o usuário sempre revisa e confirma antes da proposta.
- Propostas e recibos serão gerados no backend por workers a partir de snapshots imutáveis.
- PDFs e áudios ficarão em object storage compatível com S3, com metadados e checksums no PostgreSQL.
- O mecanismo concreto de renderização de PDF será validado no spike vertical antes de ser congelado.

### Autenticação e segurança

- OpenID Connect/OAuth 2.1 por meio de um provedor gerenciado.
- Integração encapsulada por um adaptador; o domínio não dependerá do fornecedor.
- O backend será a autoridade para identidade, autorização e acesso aos arquivos.
- Um usuário por conta no MVP, sem implementar equipes prematuramente.
- Secrets fora do repositório, URLs assinadas de curta duração e redação de dados pessoais nos logs.
- O fornecedor de autenticação será escolhido por uma avaliação operacional curta, sem alterar a arquitetura aceita.

### Observabilidade

- OpenTelemetry para instrumentação independente de fornecedor.
- Sentry inicialmente para erros e desempenho de mobile, web, API e workers.
- Logs JSON estruturados com `request_id`, `user_id` pseudonimizado, `quote_id` e `job_id` quando aplicável.
- Métricas dos fluxos voz → orçamento → PDF → compartilhamento e pagamento → recibo.

### Qualidade e entrega

- ESLint e Prettier centralizados.
- Vitest para unidades e integrações rápidas.
- Testcontainers com PostgreSQL e Redis para integrações críticas.
- React Native Testing Library para componentes mobile.
- Playwright para fluxos web.
- Maestro para os poucos fluxos E2E críticos do Android.
- CI com typecheck, lint, testes, migrations verificadas e builds reproduzíveis.
- Promoção do mesmo artefato entre ambientes; não reconstruir produção a partir de código diferente.

## Decisões explicitamente adiadas

Estas escolhas não bloqueiam o scaffold e não alteram a arquitetura:

- provedor de cloud/compute;
- provedor de PostgreSQL, Redis e object storage;
- provedor de autenticação;
- provedor de transcrição/extração estruturada;
- biblioteca ou engine final de renderização de PDF;
- método avançado de envio direto de anexo para conversa específica no WhatsApp;
- iOS e requisitos específicos da App Store.

## Alternativas rejeitadas para o MVP

### Bun + Elysia

Boa experiência de desenvolvimento, mas adiciona risco de compatibilidade sem entregar uma vantagem decisiva ao fluxo principal. Pode ser reavaliado no futuro sem mudar o domínio.

### Elixir + Phoenix/LiveView

Tecnologia robusta para concorrência e sistemas distribuídos, porém exigiria duas linguagens/ecossistemas e não substituiria o cliente mobile nativo. O ganho não compensa o custo para a equipe inicial.

### tRPC como API principal

Excelente inferência de tipos, mas acopla mais fortemente os ciclos de cliente e servidor. O Cotali precisa suportar versões Android antigas e possíveis integrações futuras; contratos HTTP versionados e OpenAPI são mais apropriados.

### Vite separado para o app web

É uma alternativa válida, mas adicionaria outro frontend e pipeline. Next.js atenderá inicialmente a landing page e, posteriormente, o app autenticado. A decisão poderá ser revertida se requisitos reais de offline, bundle ou deploy justificarem a separação.

## Consequências

### Positivas

- uma linguagem predominante e menor troca de contexto;
- caminho direto para Android, web e iOS;
- API explícita e compatível com clientes móveis desatualizados;
- domínio protegido de frameworks e fornecedores;
- infraestrutura escalável por componentes sem microserviços prematuros;
- jobs e documentos financeiros com rastreabilidade e idempotência.

### Custos assumidos

- Redis e workers aumentam a superfície operacional;
- local-first e sincronização exigem regras explícitas de conflito;
- OpenAPI e clientes gerados exigem disciplina de compatibilidade;
- Next.js reunirá superfícies com necessidades diferentes e precisará de limites internos claros;
- Prisma exige política cuidadosa de migrations em produção.

## Validação obrigatória

A decisão não depende de duas POCs. Será realizado um único spike vertical de 2 a 4 dias para validar:

1. gravação de voz no Android;
2. upload resiliente e transcrição;
3. extração do rascunho estruturado;
4. revisão e confirmação manual;
5. geração de PDF no worker;
6. compartilhamento do anexo por WhatsApp;
7. idempotência e recuperação após falhas.

O spike pode ajustar bibliotecas e fornecedores, mas qualquer mudança na arquitetura definida neste ADR exige um novo ADR.
