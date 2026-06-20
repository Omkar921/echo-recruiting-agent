# Écho — Architecture

Autonomous AI recruiting agent (PSVIEW technical test). Next.js 16 · React 19 · Claude · Zustand.

## Directory map

```
app/                          Routes & API
├── page.tsx                  Landing
├── login/                    User profile capture
├── onboarding/               Company context → build agent persona
├── dashboard/                Pipeline overview
│   └── agent/                Role → source → call preview flow
└── api/
    ├── company/lookup        Scrape company URL → onboarding fields
    ├── role/parse            Parse job posting → role intent
    ├── persona/              Build persona + company intelligence
    ├── sequence/             Plan contingency outreach steps
    ├── conversation/start    Generate live-call greeting
    └── respond/              Agent turn (analyze → decide → write)

lib/                          Domain logic (no React UI)
├── types.ts                  Shared TypeScript interfaces
├── fonts.ts                  Google font exports
├── session/
│   ├── keys.ts               Session validation & company/agent fingerprint
│   └── store.ts              Zustand persisted client state
├── agent/
│   ├── orchestrator.ts       Agent class — LLM calls per turn
│   ├── display-name.ts       Company-branded agent name ({Company}'s Écho)
│   ├── engine.ts             Deterministic reply analysis & decisions (no LLM)
│   ├── call-purpose.ts       Intro / assessment / technical call policies
│   ├── prompts.ts            System prompts & message-writing briefs
│   └── engagement-context.ts Per-turn prompt context assembly
├── ai/
│   └── claude-client.ts      Anthropic structured-output wrapper
├── company/
│   ├── intelligence.ts       Hiring profile distillation & candidate scoring
│   └── url-fetcher.ts        Fetch public URLs → plain text
├── candidates/
│   └── mock-pool.ts          Static candidate pool & sourcing heuristics
├── voice/
│   └── profile.ts            TTS rate/pitch/voice inference from tone
└── api/
    └── route-errors.ts       Shared API error helper

hooks/                        Client React hooks
├── use-speech.ts             Web Speech STT + TTS
├── use-store-hydrated.ts     Wait for Zustand localStorage rehydration
└── use-stale-session-purge.ts Clear engagement when company/agent changes

components/
├── layout/                   Page shell, header, phase centering
├── landing/                  Logo, globe, taglines, hero styles
├── engagement/               Agent flow UI (sourcing, picker, call, camera)
└── shared/                   Globe math, match labels
```

## Agent pipeline (per candidate reply)

```
Candidate reply
    ↓
agent/engine.ts     classify + update memory + decide next beat   (0 LLM)
    ↓
agent/orchestrator.ts   single Claude call to write reply       (1 LLM)
    ↓
Spoken via hooks/use-speech.ts (browser TTS)
```

Call type (`intro` | `assessment` | `technical` | `other`) is set on the role form and drives `call-purpose.ts` policies in the engine and prompts.

## Session model

| Concept | Stored in | Cleared when |
|---------|-----------|--------------|
| User profile | `session/store` | Log out |
| Company + persona | `session/store` | New company / re-onboard |
| Engagement draft | `session/store` | Live call starts / new engagement |
| Live conversation | `session/store` | New engagement / company change |

**Persona** is created once at onboarding. **Engagements** (roles, calls) are many per persona.

Each company gets one branded agent: **`{Company}'s Écho`** (e.g. Google's Écho). Claude generates voice, traits, and speech patterns; the display name is always derived from the company name via `lib/agent/display-name.ts`.

## API routes → lib

| Route | Primary lib module |
|-------|-------------------|
| `POST /api/persona` | `agent/orchestrator` |
| `POST /api/sequence` | `agent/orchestrator` |
| `POST /api/conversation/start` | `agent/orchestrator` |
| `POST /api/respond` | `agent/orchestrator` → `agent/engine` |
| `POST /api/company/lookup` | `ai/claude-client`, `company/url-fetcher` |
| `POST /api/role/parse` | `ai/claude-client`, `company/url-fetcher` |
