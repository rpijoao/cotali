# Cotali — Comparação de Stacks v0.1

**Versão:** 0.1  
**Data:** 2026-09-03  
**Status:** encerrada; decisão consolidada no [ADR-001](./adr-001-cotali-technology-stack.md)
**Objetivo:** escolher a base técnica mais adequada ao Cotali

## 1. Stacks em análise

### Stack A — TypeScript/Bun

```text
App: React Native + Expo
Web: React + Vite
LP/SSR: Next.js
Backend: Bun + Elysia
Banco: PostgreSQL + Prisma
Jobs: BullMQ
```

### Stack B — Elixir/Phoenix

```text
App mobile: cliente Android separado, a definir
Web: Phoenix LiveView
Backend: Elixir + Phoenix
Banco: Supabase PostgreSQL
Deploy: Fly.io
Observabilidade: AppSignal
LP: Framer
Jobs: solução durável ainda não definida
```

A Stack B não elimina a necessidade de uma tecnologia mobile para o Android. Para a comparação ser justa, o POC deverá usar o mesmo cliente Android nas duas alternativas ou definir explicitamente uma tecnologia mobile para a Stack B.

## 2. Critérios do Cotali

Os critérios devem refletir o produto, não preferência por linguagem:

1. experiência Android voice-first;
2. geração e compartilhamento de proposta PDF;
3. app web com o mesmo fluxo;
4. domínio financeiro, pagamentos e recibos;
5. jobs de áudio, IA, PDF e recibos;
6. sincronização local-first e conexão instável;
7. segurança e privacidade;
8. observabilidade e operação;
9. velocidade de desenvolvimento;
10. capacidade de evolução para iOS e escala futura;
11. disponibilidade de conhecimento e custo de manutenção;
12. portabilidade e risco de dependência de fornecedor.

## 3. Comparação por capacidade

| Capacidade                      | Stack A — TypeScript/Bun                                     | Stack B — Elixir/Phoenix                                                            |
| ------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Android voice-first             | React Native + Expo já cobre a superfície mobile proposta    | Precisa adicionar um cliente mobile; Phoenix não substitui a camada Android         |
| Gravação, arquivos e PDF        | Integração mobile direta e compartilhamento por APIs nativas | Também depende do cliente mobile escolhido; backend não resolve a experiência local |
| App web                         | React + Vite dá controle completo do editor e do sync        | LiveView é muito forte para editor stateful e realtime                              |
| Compartilhar domínio entre apps | TypeScript pode compartilhar tipos e pacotes diretamente     | Exige contratos versionados entre Elixir e o cliente mobile                         |
| Backend concorrente             | Bom, condicionado à operação do Bun e das bibliotecas        | Muito forte por modelo de processos, supervisão e concorrência do BEAM              |
| Jobs assíncronos                | BullMQ já cobre filas, retries e workers com Redis           | Precisa adicionar Oban ou solução equivalente; não está presente na stack listada   |
| PostgreSQL                      | Prisma oferece acesso tipado e migrations                    | Ecto/Supabase oferece PostgreSQL gerenciado e transações                            |
| Offline/sync                    | Ainda precisa ser projetado; TypeScript não resolve sozinho  | Ainda precisa ser projetado; LiveView não é outbox offline do Android               |
| WebSocket/realtime              | Precisa escolher e operar a camada                           | Phoenix/LiveView tem vantagem natural nesse modelo                                  |
| SEO/LP                          | Next.js atende SSR/SEO                                       | Framer atende LP/SEO com menor código no repositório                                |
| Observabilidade                 | Ferramenta ainda precisa ser escolhida e instrumentada       | AppSignal integra diretamente com Elixir/Phoenix                                    |
| Portabilidade                   | Menor dependência se usar APIs Node/Web portáveis            | Supabase, Fly e AppSignal precisam ser isolados por adapters/configuração           |
| Curva de aprendizado            | Geralmente menor se o time já domina TypeScript/React        | Maior se o time não tiver experiência de produção em Elixir                         |

## 4. Análise pelos fluxos críticos

### 4.1 Voz → proposta PDF

As duas stacks conseguem suportar o fluxo, mas de formas diferentes:

```text
Android grava
→ API recebe AudioJob
→ job transcreve
→ job interpreta
→ usuário revisa
→ servidor valida
→ PDF é gerado
```

Na Stack A, o caminho entre Android, contratos TypeScript e API tende a ter menos fronteiras de linguagem. Na Stack B, Phoenix pode ser um backend excelente, mas os contratos entre Elixir e Android precisam ser tratados como artefatos de primeira classe.

O POC deve medir não apenas latência, mas também cancelamento, retry, resposta obsoleta, upload incompleto e retomada.

### 4.2 Proposta e recibo

Ambas suportam transações e snapshots imutáveis. A decisão não deve depender do ORM ou framework, e sim da implementação dos invariantes:

- centavos exatos;
- saldo nunca negativo;
- pagamento parcial e parcelado;
- um recibo por pagamento confirmado;
- retry sem duplicidade;
- PDF gerado a partir de revisão validada;
- anulação sem apagar histórico.

O teste deve executar os mesmos casos nas duas stacks e comparar os resultados do domínio, não apenas os endpoints.

### 4.3 App web com o mesmo fluxo

LiveView pode reduzir a quantidade de JavaScript próprio e oferece um modelo forte para estados conectados e atualizações em tempo real. Phoenix LiveView mantém uma view stateful no servidor e envia atualizações para o navegador. [Phoenix LiveView](https://phoenix-live-view.hexdocs.pm/Phoenix.LiveView.html)

React + Vite oferece controle explícito do cliente, o que pode facilitar o compartilhamento do modelo de edição com o Android e a construção de um outbox local. Em ambos os casos, o domínio e os contratos devem ser independentes da tela.

### 4.4 WhatsApp

O número do cliente pode abrir uma conversa direta e preparar uma mensagem. A anexação do PDF ainda depende do mecanismo do dispositivo e da superfície utilizada. O POC deve validar:

- Android nativo;
- navegador mobile;
- app web em desktop;
- WhatsApp instalado;
- WhatsApp Web;
- fallback manual.

Esse cenário pode favorecer o cliente mobile nativo, mas não deve ser decidido por suposição.

## 5. Riscos principais

### Stack A — TypeScript/Bun

- compatibilidade real de Bun com Prisma, BullMQ, PDF, uploads e observabilidade;
- pool e transações PostgreSQL em API e workers;
- dependência excessiva de pacotes TypeScript sem fronteiras de domínio;
- complexidade de construir sync local-first corretamente;
- necessidade de selecionar observabilidade e operação.

### Stack B — Elixir/Phoenix

- necessidade de cliente Android separado;
- necessidade de solução explícita de jobs duráveis;
- contratos cross-language entre Phoenix e mobile;
- LiveView não substitui armazenamento offline nem outbox local;
- dependência operacional de Supabase + Fly;
- curva de aprendizado e disponibilidade de manutenção em Elixir;
- integração com bibliotecas de IA, PDF e WhatsApp.

## 6. Peso recomendado para a decisão

Os pesos abaixo são uma proposta para o POC:

| Critério                                 | Peso |
| ---------------------------------------- | ---: |
| Android voice-first                      |  20% |
| PDF, WhatsApp e fluxo de entrega         |  15% |
| Domínio financeiro, pagamentos e recibos |  15% |
| Jobs de áudio, IA e documentos           |  10% |
| App web com o mesmo fluxo                |  10% |
| Offline, sync e conflitos                |  10% |
| Segurança e privacidade                  |   8% |
| Observabilidade e operação               |   5% |
| Velocidade de desenvolvimento            |   4% |
| Portabilidade e custo de manutenção      |   3% |

O resultado numérico não substitui um bloqueador de segurança, dados ou operação. Um único bloqueador crítico pode reprovar uma alternativa mesmo com pontuação alta.

## 7. POC equivalente

Construir o mesmo vertical slice nas duas alternativas:

```text
conta individual
→ cliente
→ gravação única
→ AudioJob
→ transcrição simulada ou real
→ interpretação estruturada
→ 5 serviços + 10 materiais
→ revisão
→ proposta PDF
→ tentativa de WhatsApp
→ plano integral/parcial/parcelado
→ pagamento manual
→ recibo PDF
```

### Cenários obrigatórios

- rede interrompida durante upload;
- retry após o servidor ter aplicado a mutation;
- interpretação antiga chegando depois de uma edição nova;
- dois dispositivos editando itens diferentes;
- dois dispositivos editando o mesmo preço;
- pagamento parcial repetido por timeout;
- parcela confirmada duas vezes;
- geração duplicada de recibo;
- PDF com revisão imutável;
- conta tentando acessar outra conta;
- dados sensíveis aparecendo em logs;
- worker reiniciado durante transcrição ou geração de PDF;
- banco indisponível;
- Redis ou solução de jobs indisponível;
- compartilhamento com WhatsApp instalado e ausente.

## 8. Decisão preliminar

Com as informações atuais, nenhuma stack está reprovada.

### Stack A tende a levar vantagem se

- o foco principal for compartilhar tipos e contratos entre Android, web e backend;
- a equipe já dominar TypeScript/React;
- a velocidade de construção do cliente for prioridade;
- Bun passar a matriz de compatibilidade;
- BullMQ e Redis forem aceitos como parte da operação.

### Stack B tende a levar vantagem se

- houver experiência real em Elixir/Phoenix;
- o app web conectado e realtime forem prioridade alta;
- a equipe valorizar fortemente tolerância a falhas e concorrência no backend;
- Supabase/Fly forem operados com região, pool e restore bem definidos;
- uma solução de jobs duráveis e um cliente Android forem adicionados ao desenho.

## 9. Próximo passo da decisão

Antes de iniciar o scaffold definitivo:

1. confirmar a equipe que manterá cada stack;
2. escolher o mesmo cliente Android para o POC, quando possível;
3. implementar o vertical slice equivalente;
4. executar a matriz de cenários;
5. registrar resultados quantitativos e falhas;
6. escolher a stack por evidência;
7. criar um ADR de decisão com os motivos e os riscos aceitos.

## 10. Conclusão

A pergunta correta não é qual stack é mais moderna ou qual já foi usada por um SaaS de sucesso. A pergunta é qual delas entrega o fluxo do Cotali com menor risco total:

```text
voz
→ revisão financeira
→ proposta PDF
→ WhatsApp
→ pagamento
→ recibo PDF
```

As duas stacks podem sustentar esse fluxo. A decisão deve ser tomada pelo POC equivalente e pela capacidade real da equipe de operar a escolha durante anos.
