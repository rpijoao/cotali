# Auditoria de desenvolvimento do Cotali

**Data:** 2026-09-03  
**Escopo:** arquitetura, stack, implementação atual, banco, segurança, mobile, voz, testes e operação  
**Referência excluída:** OrcaEletrica e a skill global antiga `cotali-orchestrator` não foram usados como base.

## 1. Veredito executivo

O Cotali está seguindo uma direção arquitetural boa e profissional, mas ainda não está sendo desenvolvido com todas as proteções necessárias para produção. A stack não é o problema. React Native com Expo, Next.js, Fastify, PostgreSQL/Neon, Prisma e um monólito modular TypeScript são escolhas coerentes para um solo founder e suportam crescimento relevante sem reescrita.

O risco atual é confundir uma arquitetura bem documentada com uma arquitetura já implementada. O código existente é uma fundação inicial: criação manual de orçamento, persistência transacional, autenticação por adapter e captura local de voz. Recursos descritos no ADR — armazenamento local durável, upload, object storage, processamento assíncrono, observabilidade, CI, E2E, PDFs e recibos — ainda não existem.

**Avaliação da direção técnica:** 8/10  
**Maturidade da implementação atual:** 4/10  
**Prontidão para produção:** 2/10  
**Recomendação:** manter a stack e executar uma etapa curta de endurecimento antes de ampliar o fluxo de voz.

## 2. O que foi bem escolhido

### Stack e topologia

- TypeScript ponta a ponta reduz troca de contexto e é adequado ao perfil solo founder.
- Expo/React Native é coerente com Android-first e preserva um caminho futuro para iOS.
- Next.js único para landing page e futuro app web evita manter Vite e Next em paralelo sem necessidade real.
- Fastify com HTTP versionado é mais apropriado que tRPC para clientes mobile que podem ficar desatualizados.
- PostgreSQL como fonte autoritativa é adequado para revisões, pagamentos, recibos e idempotência.
- Neon em São Paulo reduz distância do banco para o público brasileiro e o uso de branch `development` separa evolução de dados da branch principal.
- Prisma oferece boa produtividade e migrations legíveis; a migration inicial adiciona constraints que vão além do schema ORM.
- Monólito modular é a escolha correta neste estágio. Microserviços seriam custo sem benefício.

### Domínio e persistência

- Dinheiro é representado em centavos inteiros.
- Quantidade decimal usa uma representação canônica de até três casas e o cálculo intermediário usa `BigInt`.
- Serviços e materiais estão separados no contrato e no banco.
- Totais são recalculados no servidor.
- A criação do agregado é transacional, serializável e possui idempotência persistida por conta.
- Revisões de orçamento já foram modeladas, evitando sobrescrever silenciosamente o documento de origem.
- Conexão pooled para a aplicação e direta para migrations está alinhada ao Neon.

### Segurança de desenho

- A identidade vem do token, não do payload do cliente.
- O modo de autenticação de desenvolvimento falha fechado em `NODE_ENV=production`.
- O domínio não depende de Expo, Fastify ou Prisma.
- Os arquivos de ambiente são ignorados pelo Git.
- Gravação em background foi desabilitada, reduzindo permissões e risco de captura involuntária.

## 3. Achados priorizados

### COT-001 — Dependências com vulnerabilidades conhecidas

**Severidade:** alta  
**Situação:** `pnpm audit` encontrou duas vulnerabilidades altas e duas moderadas.

- `@fastify/swagger-ui@5.2.6` instala `@fastify/static@9.3.0`, afetado por bypass de proteção/path traversal. A interface Swagger está registrada publicamente em `/docs`.
- Prisma 6.19.3 traz `deepmerge-ts@7.1.5`, afetado por exaustão de pilha. A superfície observada é principalmente configuração/build, menor que uma rota HTTP, mas o alerta deve ser eliminado.
- A árvore do Expo contém uma versão transitiva vulnerável de `uuid`; o risco aparente está no toolchain, não no runtime do app, mas precisa ser acompanhado pelo ciclo de atualização do SDK.

**Ação:** bloquear avanço para deploy público até atualizar/remediar `@fastify/static`; executar auditoria no CI; atualizar dependências de forma compatível e repetir builds/testes. Não fazer upgrades major automáticos apenas para perseguir “latest”.

### COT-002 — Integridade relacional incompleta no banco

**Severidade:** alta  
**Situação:** o banco permite estados que o domínio considera impossíveis.

- `quotes.account_id` e `quotes.client_id` têm FKs independentes; nada garante no banco que o cliente pertença à mesma conta do orçamento.
- `quotes.current_revision_id` pode apontar para uma revisão pertencente a outro orçamento.
- limites de 5 serviços e 10 materiais existem na aplicação, mas não no banco; isso é aceitável enquanto toda escrita passa pelo serviço, porém deve ser tratado em testes e nas futuras rotas de edição.

**Ação:** adicionar constraints/FKs compostas ou outra garantia transacional explícita para tenant e revisão corrente; cobrir violações com testes de integração.

### COT-003 — Datas divergem do ADR

**Severidade:** alta  
**Situação:** o ADR exige `timestamptz` em UTC, mas os campos Prisma `DateTime` sem tipo nativo geraram `TIMESTAMP(3)` sem fuso.

**Ação:** alterar instantes para `@db.Timestamptz(3)` em uma migration corretiva antes de acumular dados. Manter apenas datas civis, como validade da proposta, em `DATE`.

### COT-004 — Projeto inteiro ainda não possui baseline versionada

**Severidade:** alta de processo  
**Situação:** existe apenas o commit inicial e todos os arquivos do produto aparecem como não rastreados. Não há checkpoint recuperável da fundação atual.

**Ação:** revisar secrets/artefatos, confirmar `.gitignore` e criar commits pequenos e temáticos. A branch `development` do banco não substitui versionamento do código.

### COT-005 — Ausência de CI e gates reais

**Severidade:** alta de processo  
**Situação:** não foi encontrado pipeline de CI. Localmente, lint, typecheck, testes e build passam, mas `prettier --check` falha em `VoiceCaptureCard.tsx`. Sem CI, regressões e migrations incompatíveis podem entrar sem bloqueio.

**Ação:** criar pipeline com instalação congelada, auditoria de dependências, format check, lint, typecheck, testes sem cache, build, Prisma validate e teste de migration em banco efêmero/branch Neon descartável.

### COT-006 — Segurança HTTP ainda é de scaffold

**Severidade:** média-alta  
**Situação:** não há rate limiting, security headers, política de CORS, limites globais de payload, redaction explícita de logs, request correlation ou proteção/remoção do Swagger em produção.

**Ação:** criar baseline de hardening Fastify antes de expor a API. A configuração deve ser testada e diferenciada por ambiente sem defaults permissivos em produção.

### COT-007 — Testes passam, mas a cobertura funcional é pequena

**Severidade:** média-alta  
**Situação:** contratos, database, worker e web aceitam não possuir testes. O teste Neon real é opt-in e fica ignorado na suíte comum. Não há cobertura, teste de componente mobile, E2E Android, teste de autenticação OIDC, concorrência real de idempotência ou teste de migration limpa.

**Ação:** priorizar testes por risco, não por porcentagem: integridade multi-tenant, concorrência/idempotência, cálculo financeiro, estados de pagamento, ciclo de revisão, captura/interrupção de áudio e contrato API.

### COT-008 — Captura de voz é um protótipo local, não o fluxo de voz

**Severidade:** média  
**Situação:** a captura usa a API recomendada do Expo, solicita permissão, limita a dois minutos e gera bundle Android. Entretanto:

- o arquivo fica no cache e “remover” apenas descarta a referência em memória;
- não há persistência local durável, recuperação após encerramento, checksum, upload ou idempotência;
- não há teste em dispositivo físico para interrupção, ligação, app em background, falta de espaço e perda de rede;
- o componente não está ligado ao draft nem à API;
- ainda não existem transcrição, interpretação, proveniência ou pendências.

**Ação:** tratar a entrega atual como POC de captura. Antes de upload, decidir object storage e política de retenção; usar upload direto por URL assinada, persistir job no PostgreSQL e nunca logar áudio/transcrição.

### COT-009 — Contrato e domínio ainda não sustentam o editor final

**Severidade:** média  
**Situação:** linhas não possuem IDs estáveis no contrato de criação; clientes são sempre recriados; o resultado JSON de idempotência é convertido para `QuoteDraft` sem validação runtime; não existem comandos de edição/revisão/finalização.

**Ação:** criar IDs client-side estáveis para linhas e quote draft, separar criar/reutilizar cliente, versionar/validar snapshots persistidos e desenhar comandos explícitos de revisão.

### COT-010 — Worker e BullMQ foram declarados antes do uso

**Severidade:** baixa  
**Situação:** o worker só imprime estado, embora BullMQ já esteja instalado. Redis, outbox transacional, retry e DLQ ainda não existem.

**Ação:** não operar Redis até existir o primeiro job real. Ao introduzi-lo, implementar outbox e observabilidade no mesmo corte; não usar Redis como fonte única de estado.

### COT-011 — Configuração de tooling não está totalmente centralizada

**Severidade:** baixa  
**Situação:** o mobile usa TypeScript 6.0.3 enquanto os demais pacotes usam 5.9.3; ESLint não inclui regras específicas de React Hooks/React Native; versões React diferem entre web e mobile por exigências dos respectivos frameworks.

**Ação:** documentar divergências obrigatórias, adicionar lint de hooks e evitar forçar uma versão única quando Expo/Next exigirem matrizes diferentes.

## 4. Conformidade entre ADR e implementação

| Área                     |              Decidida |      Implementada | Avaliação                                     |
| ------------------------ | --------------------: | ----------------: | --------------------------------------------- |
| Monorepo TypeScript      |                   sim |               sim | sólida                                        |
| Expo Android             |                   sim |           parcial | captura local pronta; jornada incompleta      |
| Next.js para LP/web      |                   sim |           parcial | LP mínima                                     |
| Fastify + API `/v1`      |                   sim |           parcial | rota inicial funcional                        |
| PostgreSQL/Neon + Prisma |                   sim | sim, parcialmente | base real; constraints precisam correção      |
| Idempotência             |                   sim |           parcial | criação coberta; demais comandos inexistentes |
| OIDC gerenciado          |               desenho |    adapter apenas | provedor e fluxo do app pendentes             |
| SQLite/outbox local      |                   sim |               não | bloqueio para offline confiável               |
| Object storage           |               desenho |               não | necessário antes do upload de áudio/PDF       |
| BullMQ/Redis/outbox      |               desenho |               não | não deve ser antecipado sem job real          |
| PDF/WhatsApp             |               desenho |               não | POC obrigatória                               |
| Pagamentos/recibos       | produto/schema futuro |               não | ainda fora do corte implementado              |
| Observabilidade          |                   sim |               não | necessária antes do piloto                    |
| CI/E2E                   |                   sim |               não | gate prioritário                              |

## 5. Ordem recomendada de correção e evolução

### Gate A — Higiene e segurança da fundação

1. corrigir vulnerabilidades altas;
2. corrigir formatação e criar CI;
3. versionar a baseline atual;
4. corrigir `timestamptz` e integridade relacional;
5. remover defaults perigosos de produção e endurecer HTTP/logs.

### Gate B — Draft durável

1. IDs estáveis para quote e linhas;
2. SQLite no Android;
3. persistência local versionada e outbox;
4. comandos de criar/editar/revisar com concorrência e idempotência;
5. testes de encerramento, offline e retry.

### Gate C — Corte vertical de voz

1. política de retenção e object storage privado;
2. job persistido no PostgreSQL;
3. upload direto por URL assinada com tamanho, MIME e checksum;
4. transcrição e interpretação atrás de adapters;
5. proveniência e pendências por campo;
6. revisão manual obrigatória;
7. métricas de duração, erro e custo sem PII.

### Gate D — Valor completo do MVP

1. geração de proposta PDF a partir de snapshot validado;
2. POC real de compartilhamento pelo WhatsApp;
3. pagamentos integrais, parciais e parcelados;
4. recibos idempotentes e imutáveis;
5. piloto Android fechado e observável.

## 6. Decisão sobre a stack

**Manter:** Expo/React Native, Next.js, Fastify, Node.js, TypeScript, PostgreSQL/Neon, Prisma, pnpm e Turborepo.

**Não introduzir ainda:** microserviços, Kubernetes, Elixir, Bun/Elysia, Vite separado, múltiplos bancos ou Redis operando sem job real.

**Decidir por POC curta:** autenticação gerenciada, object storage, transcrição/interpretação, geração de PDF e limites/custos de áudio.

## 7. Evidências de validação

- `pnpm turbo run test --force`: aprovado; quatro pacotes sem testes e uma integração Neon ignorada por padrão.
- lint e typecheck: aprovados na validação anterior.
- build Android e monorepo: aprovados na validação anterior.
- Expo Doctor: 21/21 aprovado.
- `pnpm format:check`: falhou em um arquivo.
- `pnpm audit --audit-level moderate`: falhou com duas vulnerabilidades altas e duas moderadas.
- Neon: migration inicial aplicada e integração real executada anteriormente na branch `development`.

## 8. Fontes técnicas externas

- GitHub Advisory para `@fastify/static`: https://github.com/advisories/GHSA-83w8-p2f5-377r
- Prisma/PostgreSQL e tipos nativos de data: https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- Expo Audio: https://docs.expo.dev/versions/latest/sdk/audio/

## 9. Conclusão

O Cotali não precisa recomeçar. As escolhas principais são coerentes e melhores para o contexto do produto do que as alternativas avaliadas. O desenvolvimento será realmente profissional se a próxima etapa corrigir os achados de fundação antes de adicionar mais funcionalidades. A prioridade não é trocar tecnologia; é transformar decisões documentadas em garantias executáveis no banco, no CI, na segurança e nos testes.

## 10. Remediação executada após a auditoria

Ainda em 2026-09-03, o primeiro gate de endurecimento foi aplicado:

- **COT-001 resolvido:** dependências vulneráveis atualizadas ou substituídas por overrides controlados; `pnpm audit --audit-level moderate` passou sem vulnerabilidades conhecidas.
- **COT-002 resolvido para o schema atual:** FKs compostas agora garantem que cliente e revisão corrente pertençam à conta/orçamento corretos.
- **COT-003 resolvido:** instantes migrados para `TIMESTAMPTZ(3)`; validade civil permanece em `DATE`.
- **COT-004 resolvido:** baseline completa versionada no Git após a execução local dos gates de qualidade e segurança.
- **COT-005 parcialmente resolvido:** CI criado com auditoria, formatação, lint, tipos, PostgreSQL 18, migrations, integração, testes e builds. A execução remota ocorrerá depois que a baseline for enviada a um repositório remoto.
- **COT-006 parcialmente resolvido:** adicionados limite de payload, headers de segurança, rate limit, redaction de credenciais e opção para desabilitar Swagger em produção.
- A migration corretiva foi aplicada e o teste de integração passou no Neon `development`.

O próximo passo de produto é avançar para o draft local durável e o corte vertical de voz. Para concluir o **COT-005**, a baseline ainda precisa ser enviada a um repositório remoto e ter o workflow executado com sucesso.
