# Tabbit

Tabbit is a small demo for **splitting a receipt among people**: upload a receipt photo, let an LLM extract line items and totals, then post natural-language claims (“I had the burger and half the fries”) that get mapped to those lines. The stack is a **Node + Express + SQLite** API and a **React + Vite** UI.

This repo is also set up to show **LaunchDarkly AI Configs** driving two LangChain agents on the server: model, prompts, tools, and telemetry are controlled from LaunchDarkly instead of being hardcoded only in the repo.

---

## LaunchDarkly and the agents

The server wires LaunchDarkly’s Node SDK together with the **AI add-on** (`@launchdarkly/server-sdk-ai`) so each agent run is backed by an **AI Config** in your LaunchDarkly project.

### Initialization

In `server/src/ld.js`, the app creates:

- **`ldClient`** — standard `@launchdarkly/node-server-sdk` client (SDK key from `LAUNCHDARKLY_SDK_KEY`).
- **`aiClient`** — `initAi(ldClient)` from `@launchdarkly/server-sdk-ai`, used to resolve AI Configs at runtime.

Both agents import `aiClient` (and receipt vision also calls `ldClient.flush()` after a run so metrics events are sent promptly).

### How an agent is built

For each AI-powered path, the code follows the same pattern:

1. **`aiClient.agentConfig(configKey, context, defaults, inputs?)`**  
   Fetches the live AI Config from LaunchDarkly for the given key, merged with in-code defaults and optional variation inputs.

2. **Guard rails**  
   If the config is disabled or there is no `tracker`, the handler throws (the feature is treated as off or misconfigured).

3. **LangChain model**  
   Model name and temperature come from the resolved config (with local fallbacks).

4. **`createAgent`**  
   The agent’s system prompt is **`agentConfig.instructions`** (i.e. the instructions from the AI Config in LD). Tools are not hardcoded as a fixed list for the agent; they are derived from the config (see below).

5. **`tracker.trackMetricsOf(...)`**  
   The actual `agent.invoke` runs inside `tracker.trackMetricsOf(LangChainProvider.getAIMetricsFromResponse, () => …)` so token usage and related metrics are attributed to LaunchDarkly for observability and experiments.

### AI Config keys used in this repo

| Config key (LaunchDarkly) | Purpose | Code |
|----------------------------|---------|------|
| **`receipt-itemizer`** | Vision: image → structured JSON (merchant, lines, totals). | `server/src/ai/receiptVision.js` |
| **`claim-parser`** | Text → JSON allocations over known `line_items` ids. | `server/src/ai/claimItems.js` |

Each uses a simple **evaluation context** (e.g. `{ kind: "user", key: "receipt_itemization" }` or `{ kind: "user", key: "claim-parser" }`). You can replace these with real user or tenant keys when you wire auth.

The claim parser passes **`line_items`** as serialized JSON into `agentConfig` so you can use that value in LaunchDarkly targeting or prompt templates if you configure variations that way.

### Tools: LaunchDarkly is the allowlist

`server/src/ai/toolsHelper.js` implements **`mapAiConfigTools(agentConfig)`**:

- It reads **`agentConfig.model.parameters.tools`** from the AI Config (tool names as LaunchDarkly defines them).
- It intersects that list with locally implemented tools in `server/src/ai/receiptMathTools.js` (`add`, `subtract`, `multiply`, `divide`).
- Only tools **named in the LD config** are attached to the LangChain agent.

So **which tools the agent can call** is controlled from the LaunchDarkly dashboard (and can differ per variation or rollout), not only from code.

### What to create in LaunchDarkly

1. **AI Configs** (or equivalent product surface) with keys **`receipt-itemizer`** and **`claim-parser`**, enabled for your environment.
2. Variations that set at least:
   - **Instructions** (system prompt),
   - **Model** (e.g. `gpt-4o`) and **parameters** (e.g. temperature),
   - **Tools** (subset of `add`, `subtract`, `multiply`, `divide` if you want tool use),
   - Metrics tracking enabled so `tracker` is present.

3. **Server-side SDK key** with access to those configs, set as `LAUNCHDARKLY_SDK_KEY` on the API process.

Optional: use targeting rules or multi-variation experiments on the same keys; the server always resolves config at request time via `agentConfig`.

---

## Repository layout

| Path | Role |
|------|------|
| `server/` | Express API, SQLite (`better-sqlite3`), multer uploads, LangChain agents + LD |
| `ui/` | React app; in dev, Vite proxies `/api` → `http://localhost:3000` |

Root `package.json` exists for shared tooling dependencies; run the app from `server/` and `ui/` as below.

---

## Configuration

**API (`server/`)**

| Variable | Required | Description |
|----------|----------|-------------|
| `LAUNCHDARKLY_SDK_KEY` | Yes (for AI paths) | LaunchDarkly server SDK key |
| `OPENAI_API_KEY` | Yes | OpenAI API key (claim parser uses `@langchain/openai` directly) |
| `PORT` | No | Default `3000` |
| `DATABASE_PATH` | No | SQLite file path (defaults in code / Docker volume) |
| `RECEIPT_VISION_CSV_PATH` | No | Optional CSV append path for receipt vision training exports |

**UI (`ui/`)**

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE` | API origin in production (empty string if same origin) |

---

## Local development

**Terminal 1 — API**

```bash
cd server
npm install
# set LAUNCHDARKLY_SDK_KEY and OPENAI_API_KEY in server/.env or the environment
npm run dev
```

**Terminal 2 — UI**

```bash
cd ui
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`). The dev server proxies `/api/*` to the API on port 3000.

**Health check:** `GET http://localhost:3000/health`

---

## Docker

`docker-compose.yml` builds `server` and `ui` images and persists SQLite in a volume. For AI features you still need to inject **`LAUNCHDARKLY_SDK_KEY`** and **`OPENAI_API_KEY`** into the `api` service (for example via an env file or compose `environment`); they are not committed to the repo.

---

## API sketch

- **`POST /upload`** — multipart field `image`; runs the **receipt-itemizer** agent, then stores the receipt and line items.
- **`GET /receipts`**, **`GET /receipts/:id`** — list and detail (including line items and claims).
- **`POST /receipts/:id/claims`** — body `message` (and optional name); runs the **claim-parser** agent when line items exist.

Static files for uploaded images are served under **`/files/...`**.

---

## Related packages (server)

- `@launchdarkly/node-server-sdk` — feature and config delivery  
- `@launchdarkly/server-sdk-ai` — `aiClient.agentConfig`, trackers  
- `@launchdarkly/server-sdk-ai-langchain` — `LangChainProvider.getAIMetricsFromResponse`  
- `langchain` / `@langchain/openai` — agents and OpenAI chat  

The mental model: **LaunchDarkly owns the operational definition of each agent** (prompt, model params, tool list, enablement); **the repo owns** HTTP behavior, persistence, local tool implementations, and the glue that maps LD’s config onto LangChain.
