# Cotali — revisão crítica da análise de stack do Claude Code v0.1

Data: 2026-09-03

## Veredito

A análise é coerente e reforça uma direção tecnicamente adequada para um time pequeno, mas simplifica riscos importantes. Ela deve ser usada como parecer, não como decisão arquitetural.

A direção recomendada para o Cotali continua sendo TypeScript no cliente e no backend, Expo no Android, PostgreSQL, uma API versionada e jobs duráveis. As decisões sobre frontend web, provedor de autenticação, infraestrutura e observabilidade continuam abertas.

## Onde a análise está correta

- TypeScript ponta a ponta reduz troca de contexto e melhora a produtividade de uma equipe pequena.
- Expo é uma escolha forte para o primeiro lançamento Android.
- PostgreSQL é adequado ao domínio financeiro e documental do Cotali.
- Prisma pode oferecer boa produtividade como adaptador de persistência.
- BullMQ é uma opção madura para geração de PDFs, transcrição e outros trabalhos assíncronos.
- Redis gerenciado tende a ser mais apropriado que uma instância operada pela própria equipe.
- Autenticação, hospedagem e observabilidade precisam ser decisões arquiteturais explícitas.

## Correções e ressalvas

### TypeScript compartilhado

O benefício não autoriza compartilhar diretamente modelos do Prisma ou entidades internas com os clientes. Devem ser compartilhados contratos de transporte explícitos, versionados e validados em tempo de execução. Tipagem estática não valida dados recebidos pela rede.

### Expo e atualizações

EAS Update não substitui builds nativos nem a publicação nas lojas. Mudanças de código nativo ou de configuração nativa exigem um novo build compatível com a `runtimeVersion`. Muitas necessidades nativas podem ser atendidas com development builds e configuração do Expo sem uma migração prematura para um projeto bare.

### Prisma e migrations

Prisma com PostgreSQL é uma escolha produtiva, mas migrations de produção não são automaticamente tranquilas. O Cotali deverá adotar revisão do SQL gerado, ambientes de homologação, estratégia expand-contract, backup e restauração testados, monitoramento e procedimento para migrations falhas ou divergentes.

Prisma deve permanecer atrás da camada de persistência; ele não deve definir o domínio.

### BullMQ e Redis

BullMQ não elimina a necessidade de idempotência. Jobs podem ser reprocessados em situações de falha. Geração de proposta, emissão de recibo e envio devem usar chaves idempotentes e estado autoritativo no PostgreSQL.

O Redis gerenciado precisa ser validado quanto a conexões persistentes e bloqueantes, comandos/Lua exigidos pelo BullMQ, persistência, limites, região e comportamento durante failover. A escolha não deve ser feita apenas pela marca ou pelo plano gratuito.

### Next.js versus Vite

Claude está correto ao dizer que Next.js consegue atender landing page e aplicação autenticada. Isso não significa que unir os dois seja automaticamente mais simples operacionalmente: landing page e produto podem ter ciclos de publicação, segurança, cache e objetivos diferentes.

Como o Cotali lançará landing page e Android antes do app web, essa decisão pode ser adiada. A landing page pode usar Next.js ou Framer de forma independente. Quando a fase web começar, uma validação curta deverá comparar:

- Next.js para landing page e app autenticado;
- landing page separada e app autenticado em Vite;
- custo de deploy, autenticação, cache, observabilidade e compartilhamento de UI.

Mesmo que Next.js seja escolhido para tudo, Server Actions não devem se tornar o contrato principal do produto. O Android continuará exigindo uma API estável.

### Fastify versus tRPC

Essa comparação é uma falsa dicotomia: tRPC pode operar sobre Fastify.

Para o Cotali, o problema mais importante é o versionamento entre um servidor atualizado continuamente e versões antigas do Android que podem permanecer instaladas por meses. Inferência de tipos não resolve compatibilidade entre versões, validação em runtime nem integração futura com terceiros.

Recomendação: Fastify com HTTP/JSON versionado, schemas de runtime e OpenAPI como contrato principal. Clientes TypeScript podem ser gerados a partir do contrato. tRPC pode ser reconsiderado para usos internos, mas não há benefício suficiente para introduzir dois estilos de API no MVP.

## Stack candidata refinada

- Mobile Android: React Native + Expo.
- App web: decisão adiada até sua fase; Next.js e Vite permanecem candidatos.
- Landing page: Next.js ou Framer, decisão independente do core.
- Backend: Node.js LTS + TypeScript + Fastify.
- Contratos: HTTP/JSON versionado + schemas em runtime + OpenAPI + clientes gerados.
- Banco: PostgreSQL + Prisma atrás de interfaces de persistência.
- Jobs: BullMQ + Redis gerenciado compatível, com idempotência e estado autoritativo no PostgreSQL.
- Arquivos: storage compatível com S3 para PDFs e anexos.
- Segurança: autenticação atrás de um adaptador e autorização no backend.
- Observabilidade: logs estruturados, rastreamento, métricas, alertas e redação de dados sensíveis.
- Confiabilidade: outbox durável, retries controlados, idempotência e fluxo de sincronização local-first.

## Decisão sobre POC

Não é necessário construir dois aplicativos ou duas stacks completas para decidir. Depois de selecionar esta direção, deve ser feito apenas um spike de risco de 2 a 4 dias cobrindo o caminho crítico:

1. gravar áudio no Android;
2. enviar e transcrever;
3. transformar a fala em um orçamento estruturado;
4. revisar e confirmar manualmente;
5. gerar o PDF;
6. abrir o compartilhamento/WhatsApp com o PDF;
7. comprovar retry, idempotência e recuperação de falha.

Esse spike valida riscos reais do Cotali; não serve para comparar tecnologias de forma genérica.
