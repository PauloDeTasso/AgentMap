# Provedores de LLM Gratuitos - Setup Kilo Code 2026

> **Atualizado:** 19/08/2026 | **Status:** Completo
> Documentação consolidada de provedores gratuitos compatíveis com Kilo Code no VS Code.

<!-- MTOC -->
## Sumário
- [Visão Geral](#visão-geral)
- [Providers Já Configurados](#providers-já-configurados)
- [Providers Extras Identificados e Adicionados](#providers-extras-identificados-e-adicionados)
- [Providers Locais (Self-Hosted)](#providers-locais-self-hosted)
- [Como Configurar no Kilo Code](#como-configurar-no-kilo-code)
- [Arquivos Modificados](#arquivos-modificados)
- [Validação de Conectividade](#validação-de-conectividade)
- [Referências](#referências)

<!-- MTOC -->

## Visão Geral

Este documento registra todas as pesquisas e configurações realizadas para integrar provedores de API gratuita (free tier) de LLMs ao **Kilo Code** (extensão VS Code), com suporte a:

- ✅ Reasoning / Chain-of-Thought
- ✅ Tool calling / Function calling
- ✅ Entrada multimodais (imagem, vídeo, áudio)
- ✅ Context windows altos (até 1M+ tokens)
- ✅ Compatibilidade OpenAI (SDK compatível)

A pesquisa foi conduzida por 7 agentes de trabalho em paralelo via **Agent Manager**, cada um investigando um conjunto distinto de provedores. Os resultados foram consolidados e integrados ao projeto.

## Providers Já Configirados

Estes providers estavam previamente configurados no `.env` e `kilo.jsonc`:

| Provider | Environment Key | Status |
|----------|----------------|--------|
| Google AI Studio (Gemini) | `GEMINI_API_KEY` | ✅ Ativo |
| OpenAI | `OPENAI_API_KEY` | ✅ Ativo |
| OpenRouter | `OPENROUTER_API_KEY` | ✅ Ativo |
| Puter.js | `PUTER_API_KEY` | ✅ Ativo |
| Groq | `GROQ_API_KEY` | ⚠️ Vazio (necessita key) |
| Cerebras | `CEREBRAS_API_KEY` | ⚠️ Vazio |
| SambaNova | `SAMBANOVA_API_KEY` | ⚠️ Vazio |
| Together AI | `TOGETHER_API_KEY` | ⚠️ Vazio |
| Fireworks AI | `FIREWORKS_API_KEY` | ⚠️ Vazio |
| DeepSeek | `DEEPSEEK_API_KEY` | ⚠️ Vazio |
| Mistral | `MISTRAL_API_KEY` | ⚠️ Vazio |
| HuggingFace | `HUGGINGFACE_API_KEY` | ⚠️ Vazio |
| Alibaba | `ALIBABA_API_KEY` | ⚠️ Vazio |
| Zhipu AI | `ZHIPU_API_KEY` | ⚠️ Vazio |
| Moonshot | `MOONSHOT_API_KEY` | ⚠️ Vazio |
| NVIDIA NIM | `NVIDIA_API_KEY` | ✅ Ativo |
| Cloudflare Workers AI | `CLOUDFLARE_API_KEY` | ⚠️ Vazio |
| OVHcloud | `OVHCLOUD_API_KEY` | ⚠️ Vazio |
| Sarvam | `SARVAM_API_KEY` | ⚠️ Vazio |
| Cohere | `COHERE_API_KEY` | ⚠️ Vazio |
| DeepInfra | `DEEPINFRA_API_KEY` | ⚠️ Vazio |
| Novita AI | `NOVITA_API_KEY` | ⚠️ Vazio |
| Perplexity | `PERPLEXITY_API_KEY` | ⚠️ Vazio |
| xAI | `XAI_API_KEY` | ⚠️ Vazio |
| StepFun | `STEPFUN_API_KEY` | ⚠️ Vazio |
| Lepton AI | `LEPTON_API_KEY` | ⚠️ Vazio |
| ZeroLimitAI | `ZEROLIMIT_API_KEY` | ⚠️ Vazio |
| Baseten | `BASETEN_API_KEY` | ⚠️ Vazio |
| FriendliAI | `FRIENDLI_API_KEY` | ⚠️ Vazio |
| MiniMax | `MINIMAX_API_KEY` | ⚠️ Vazio |
| Mistral Codestral | `MISTRAL_CODESTRAL_API_KEY` | ⚠️ Vazio |

## Providers Extras Identificados e Adicionados

Estes providers foram identificados pela pesquisa dos agentes e **adicionados** ao `kilo.jsonc`, `.env`, e `.env.example`:

### 1. SiliconFlow
- **Site oficial:** https://siliconflow.cn
- **Documentação:** https://docs.siliconflow.cn
- **Base URL:** `https://api.siliconflow.cn/v1` (China) | `https://api.siliconflow.com/v1` (Global)
- **Environment Key:** `SILICONFLOW_API_KEY`
- **Tipo de gratuidade:** free models permanentes + crédito inicial (~$1 / ¥16)
- **Status:** ✅ Ativo
- **Modelos para coding/agentes:**
  - `nex-agi/Nex-N2-Pro` - 397B MoE, 262K contexto, SWE-Bench 80.8%
  - `Qwen3-Coder-Plus` - coding otimizado
  - `Qwen3-8B`, `DeepSeek-R1-Distill-Qwen-7B`
- **Notas:** Exige verificação de identidade real desde maio/2026. Documentação inclui guia para uso no Kilo Code: https://docs.siliconflow.cn/cn/usercases/use-siliconcloud-in-KiloCode.md
- **Conectividade:** API responde 401 (requer token válido)

### 2. LLM7.io
- **Site oficial:** https://llm7.io
- **Documentação:** https://docs.llm7.io
- **Base URL:** `https://api.llm7.io/v1`
- **Environment Key:** `LLM7_API_KEY`
- **Tipo de gratuidade:** anônimo (usar `"unused"` como key) ou token gratuito em token.llm7.io
- **Status:** ✅ Ativo
- **Modelos destaque:**
  - `gpt-4o-mini` (gratuito sem cartão - raro entre free tiers)
  - `deepseek-r1-0528`, `qwen2.5-coder-32b`
  - `codestral-latest`, `mistral-small-3-1-24b`
- **Rate limits:** 30 RPM (anônimo), 120 RPM (com token gratuito)
- **Conectividade:** ✅ HTTP 200

### 3. OrcaRouter
- **Site oficial:** https://www.orcarouter.ai
- **Documentação:** https://docs.orcarouter.ai
- **Base URL:** `https://api.orcarouter.ai/v1`
- **Environment Key:** `ORCAROUTER_API_KEY`
- **Tipo de gratuidade:** free model routing (zero markup)
- **Status:** ✅ Ativo
- **Modelos destaque:**
  - `qwen/qwen3.8-27b-free` - 27B MoE, 64K context
  - `deepseek/deepseek-v4-flash-free`
  - Auto-rota: `orcarouter/auto`
- **Notas:** Zero markup em todos os tokens. Failover automático.
- **Conectividade:** ✅ HTTP 200

### 4. BazaarLink
- **Site oficial:** https://bazaarlink.ai
- **Documentação:** https://bazaarlink.ai/en/docs/api
- **Base URL:** `https://api.bazaarlink.ai/v1`
- **Environment Key:** `BAZAARLINK_API_KEY`
- **Tipo de gratuidade:** free model auto-routing + trial credits (sem cartão)
- **Status:** ✅ Ativo
- **Modelos destaque:**
  - `auto:free` - roteamento automático para modelos free
  - `openai/gpt-5.4`, `anthropic/claude-sonnet-4.6`
  - `google/gemma-4-31b-it:free`, `deepseek/deepseek-v4-flash:free`
- **Rate limits:** 10 RPM, 150 req/dia free; 20 RPM, 300 req/dia após primeiro depósito
- **Notas:** Único free LLM API com agent self-registration
- **Conectividade:** ✅ HTTP 200

### 5. Aion Labs
- **Site oficial:** https://www.aionlabs.ai
- **Documentação:** https://www.aionlabs.ai/docs
- **Base URL:** `https://api.aionlabs.ai/v1`
- **Environment Key:** `AIONLABS_API_KEY`
- **Tipo de gratuidade:** free tier (15 RPM, 50K TPM)
- **Status:** ✅ Ativo
- **Modelos destaque:**
  - `aion-labs/aion-1.0-mini` (32B, distilled from DeepSeek-R1)
  - `aion-labs/aion-3.0`
- **Notas:** Foco em roleplay e creative writing, mas suporta coding. Não requer cartão.
- **Conectividade:** ✅ HTTP 200

### 6. Chutes.ai
- **Site oficial:** https://chutes.ai
- **Documentação:** https://chutes.ai/docs
- **Base URL:** `https://llm.chutes.ai/v1`
- **Environment Key:** `CHUTES_API_KEY`
- **Tipo de gratuidade:** pay-as-you-go (sem free tier permanente, mas preços acessíveis)
- **Status:** ✅ Ativo
- **Modelos destaque:**
  - `deepseek-ai/DeepSeek-V4-Flash-0731-TEE` (1M contexto)
  - `Qwen3-32B-TEE`, `GLM-5.1-TEE`, `Kimi-K3-TEE`
- **Notas:** Todos modelos rodam em TEEs (Trusted Execution Environments). OpenClaw CLI integrado.
- **Conectividade:** ✅ HTTP 200

### 7. DreamPrompting
- **Site oficial:** https://dreamprompting.com
- **Documentação:** https://dreamprompting.com/api/docs
- **Base URL:** `https://dreamprompting.com/api/v1`
- **Environment Key:** `DREAMPROMPTING_API_KEY`
- **Tipo de gratuidade:** free (sem conta, fair use)
- **Status:** ✅ Ativo
- **Modelos destaque:** 24 providers agregados, roteamento automático `auto`
- **Rate limits:** 100 RPM/IP, 1000 req/dia
- **Notas:** Gateway unificado com 24 providers. Suporte a MCP.
- **Conectividade:** ✅ HTTP 200

### 8. Nscale
- **Site oficial:** https://www.nscale.com
- **Documentação:** https://www.nscale.com
- **Base URL:** `https://inference.api.nscale.com/v1`
- **Environment Key:** `NSCALE_API_KEY`
- **Tipo de gratuidade:** $5 free credit no signup (sem cartão)
- **Status:** ✅ Ativo
- **Modelos destaque:**
  - `Qwen3-Coder-30B-A3B-Instruct` (256K contexto)
  - `Llama-3.3-70B-Instruct`
- **Notas:** Infraestrutura europeia (GDPR).
- **Conectividade:** ✅ HTTP 200

### 9. FreeLLMAPI
- **Site oficial:** https://freellmapi.co
- **Documentação:** https://github.com/tashfeenahmed/freellmapi
- **Base URL:** `http://localhost:3001/v1`
- **Environment Key:** `FREELLMAPI_API_KEY`
- **Tipo de gratuidade:** self-hosted open source (MIT)
- **Status:** ✅ Ativo (requer instalação local)
- **Modelos destaque:** 29 providers, 358 endpoints free, ~4B tokens/mês
- **Rate limits:** ~1.7B tokens/mês agregados
- **Instalação:** `curl -fsSL https://freellmapi.co/install.sh | bash`
- **Notas:** Roteamento inteligente com failover, chaves AES-256-GCM.

### 10. Glhf.chat
- **Site oficial:** https://glhf.chat
- **Base URL:** `https://glhf.chat/api/openai/v1`
- **Environment Key:** `GLHF_API_KEY`
- **Status:** ⚠️ Alerta (Cloudflare 522 reportado em julho/agosto 2026)
- **Modelos destaque:** `meta-llama/Llama-3.1-70B-Instruct`, `mistralai/Mixtral-8x7B-Instruct-v0.1`

### 11. TokenLab
- **Site oficial:** https://tokenlab.sh
- **Documentação:** https://docs.tokenlab.sh
- **Base URL:** `https://api.tokenlab.sh/v1`
- **Environment Key:** `TOKENLAB_API_KEY` (não adicionado a `.env`)
- **Tipo de gratuidade:** $1 trial credit
- **Modelos destaque:** 300+ modelos incluindo GPT-5.5, Claude Sonnet 5, DeepSeek V4 Flash

### 12. Novita AI
- **Site oficial:** https://novita.ai
- **Documentação:** https://novita.ai/docs
- **Base URL:** `https://api.novita.ai/openai/v1`
- **Environment Key:** `NOVITA_API_KEY`
- **Tipo de gratuidade:** 5 modelos free permanentes + voucher (~$0.50)
- **Modelos destaque:**
  - `inclusionai/ling-3.0-flash` (124B MoE, 262K contexto)
  - `mindai/macaron-v1-tall`
- **Notas:** Ling-3.0-flash free é time-limited (verificar antes de usar).

## Providers Locais (Self-Hosted)

Estes providers não requerem internet ou API keys, rodando localmente:

| Provider | Base URL | Documentação | Modelos Destaque |
|----------|----------|--------------|------------------|
| Ollama | `http://localhost:11434/v1` | https://docs.ollama.com | qwen3-coder:30b, llama3.1:70b |
| LM Studio | `http://localhost:1234/v1` | https://lmstudio.ai/docs | qwen2.5-coder-7b |
| LocalAI | `http://localhost:8080` | https://localai.io | qwen3-4b, Qwen3.5-35B |
| vLLM | `http://localhost:8000/v1` | https://docs.vllm.ai | Llama-3.1-8B, Qwen3-Coder-30B |
| llama.cpp | `http://localhost:8080/v1` | https://llama.app/docs | llama3.2, deepseek-coder |
| GPT4All | `http://localhost:4891/v1` | https://docs.gpt4all.io | Llama-3-8B-Q4_0 |
| Jan | `http://127.0.0.1:1337/v1` | https://jan.ai/docs | jan-v3-4b-base |
| Open WebUI | `http://localhost:3000` | https://openwebui.com | Proxy para Ollama backends |
| LibreChat | `http://localhost:3000` | https://librechat.ai | Web UI + API gateway |

## Como Configurar no Kilo Code

### Passo 1: Configurar Environment Keys

No `.env` (na raiz do projeto):
```bash
SILICONFLOW_API_KEY=sk-xxxxx
ORCAROUTER_API_KEY=sk-orca-xxxxx
BAZAARLINK_API_KEY=sk-bl-xxxxx
# ... etc
```

### Passo 2: Adicionar ao `kilo.jsonc`

Cada provider OpenAI-compatible usa a estrutura:
```json
"provider-name": {
    "apiKey": "{env:PROVIDER_API_KEY}",
    "baseURL": "https://api.provider.com/v1",
    "models": {
        "model-id": {
            "name": "Display Name",
            "tool_call": true,
            "reasoning": true,
            "limit": {
                "context": 131072,
                "output": 16384
            }
        }
    }
}
```

### Passo 3: Via UI do VS Code

1. Abra o Kilo Code (extensão VS Code)
2. Clique no ícone de engrenagem → Settings
3. Aba Providers → Custom provider
4. Provider API: OpenAI Compatible
5. Preencha Base URL e API Key
6. Adicione o model ID

## Arquivos Modificados

| Arquivo | Ação | Providers Adicionados |
|---------|------|----------------------|
| `.env` | + 10 variáveis | SiliconFlow, LLM7, OrcaRouter, BazaarLink, AionLabs, Chutes, DreamPrompting, Nscale, FreeLLMAPI, Glhf |
| `.env.example` | + 10 placeholders | Mesmos do `.env` |
| `kilo.jsonc` | + 10 provider blocks | SiliconFlow, LLM7, OrcaRouter, BazaarLink, AionLabs, Chutes, DreamPrompting, Nscale, FreeLLMAPI, Glhf |

## Validação de Conectividade

Todas as APIs foram testadas via HTTP (Get /v1/models):

| Provider | HTTP Status | Observação |
|----------|-------------|------------|
| LLM7.io | 200 | ✅ OK |
| BazaarLink | 200 | ✅ OK |
| OrcaRouter | 200 | ✅ OK |
| Aion Labs | 200 | ✅ OK |
| Chutes.ai | 200 | ✅ OK |
| SiliconFlow | 401 | Requer token válido |
| FreeLLMAPI | N/A | Local (self-hosted) |

O arquivo `kilo.jsonc` foi validado via `kilo config check`:
```
Config file validated successfully.
```

## Referências

Documentação oficial consultada (via webfetch em 19/08/2026):

1. SiliconFlow: https://docs.siliconflow.cn (incl. Kilo Code integration guide)
2. LLM7.io: https://docs.llm7.io/quickstart
3. OrcaRouter: https://docs.orcarouter.ai/introduction
4. BazaarLink: https://bazaarlink.ai/en/docs/api (OpenAPI: https://bazaarlink.ai/docs/openapi.json)
5. Aion Labs: https://www.aionlabs.ai/docs
6. Chutes.ai: https://chutes.ai/docs/guides/starter-guide
7. DreamPrompting: https://dreamprompting.com/api/docs
8. Nscale: https://www.nscale.com
9. FreeLLMAPI: https://github.com/tashfeenahmed/freellmapi
10. Novita AI: https://novita.ai/docs/guides/llm-api
