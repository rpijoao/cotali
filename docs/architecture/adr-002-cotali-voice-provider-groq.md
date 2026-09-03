# ADR-002 — Provedor inicial de voz: Groq

**Status:** aceito para o primeiro vertical slice  
**Data:** 2026-09-03

## Contexto

O Cotali precisa transformar uma gravação única, de até dois minutos, em uma
transcrição revisável e em uma sugestão estruturada de orçamento em português
brasileiro. O produto não pode expor credenciais de IA no aplicativo nem tratar
uma resposta de modelo como estado financeiro confirmado.

## Decisão

O primeiro adaptador de voz usará Groq:

- `whisper-large-v3-turbo` para transcrição, com idioma `pt` e segmentos;
- `openai/gpt-oss-20b` para extração estruturada;
- Structured Outputs com JSON Schema estrito;
- validação adicional no contrato TypeBox e no domínio Cotali;
- chave `GROQ_API_KEY` somente no backend;
- áudio recebido somente pelo backend, persistido temporariamente no `VoiceJob`
  e removido quando o processamento termina; não há upload direto do mobile
  para o fornecedor;
- `mutationId` como chave técnica da operação no primeiro slice.

O servidor deverá manter o áudio fora de logs e não poderá aplicar a sugestão
automaticamente ao orçamento sem revisão explícita do usuário.

## Motivos

Groq já foi usado no protótipo anterior, possui endpoint compatível com a API
OpenAI, suporte multilíngue para Whisper, limite suficiente para o áudio do MVP
e custo baixo por minuto. A separação entre transcrição e extração mantém a
interface de fornecedor substituível.

## Limitações aceitas neste slice

- O job armazena temporariamente o áudio em PostgreSQL; object storage,
  criptografia específica de arquivos e políticas de retenção configuráveis
  continuam sendo etapas antes do piloto com usuários reais.
- O worker usa polling e lease no banco. Uma fila gerenciada e métricas
  dedicadas podem ser adicionadas quando o volume justificar.
- A retenção operacional e o consentimento de áudio precisam ser formalizados
  antes do piloto com usuários reais.

## Consequências

O adapter pode ser trocado por Deepgram, OpenAI ou um serviço self-hosted sem
alterar o contrato do mobile ou do domínio. O POC deve medir taxa de erro em
português, campos extraídos corretamente, latência p95 e custo por orçamento
antes de promover os modelos a produção.
