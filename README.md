# Écho — Autonomous Recruiting Agent

**PSVIEW technical test submission** — a mini web app where a company configures its own recruiting agent, sources candidates, runs a live call preview, and receives a post-call scorecard.

**Live demo:** Deploy via Vercel (see below) — import from GitHub and add `ANTHROPIC_API_KEY`  
**Repo:** https://github.com/Skopusai/echo-recruiting-agent

---

## What I built

Écho is an end-to-end recruiting agent demo:

1. **Onboarding** — company context (manual or URL auto-fill) → Claude builds company intelligence + a branded agent persona (`{Company}'s Écho`)
2. **Engagement wizard** — define a role, pick call type (intro / assessment / technical), source mock candidates, select one
3. **Live call preview** — you play the candidate; the agent speaks (TTS), listens (STT), and shows deterministic reasoning per turn
4. **Post-call report** — call-type-specific scorecard (e.g. English & confidence for intro; tech depth for technical) with next-round likelihood

Session state persists in the browser so you can navigate away and resume.

---

## Key design choices

| Choice | Why |
|--------|-----|
| **Deterministic agent engine + one LLM write per turn** | Strategy (classify, phase, next beat, status) is code-owned; Claude only writes the message — not a single prompt chain |
| **Call-purpose policies** | Intro, assessment, and technical calls follow different phase guides, scoring dimensions, and wrap-up rules |
| **3–4 exchange cap** | Keeps the demo focused; agent winds down and closes naturally |
| **Branded agent from company name** | Persona is traits/voice only; display name is always `{Company}'s Écho` |
| **Server-side API routes** | All Claude calls run on the server; API key never reaches the browser |
| **Zustand + localStorage** | Lightweight session persistence without a database for this scope |

---

## What makes the agent intelligent (not just an LLM call)

> **The agent decides *what* to do next in code — classify the reply, update candidate memory, pick the conversation phase and beat — and uses Claude only once per turn to *write* the words.**

See `lib/agent/engine.ts` (0 LLM calls) + `lib/agent/orchestrator.ts` (1 write call).

---

## Stack

Next.js 16 · React 19 · Tailwind 4 · Anthropic Claude · Zustand · Web Speech API

---

## Run locally

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy (Vercel)

1. Go to [vercel.com/new](https://vercel.com/new) → **Import** `Skopusai/echo-recruiting-agent`
2. **Environment variables** → add `ANTHROPIC_API_KEY` (your key from Anthropic console — never commit it)
3. Click **Deploy**

Optional: `ANTHROPIC_MODEL` (defaults to `claude-sonnet-4-6`).

Your live URL will look like `https://echo-recruiting-agent.vercel.app`.

---

## Project structure

| Path | Purpose |
|------|---------|
| `app/onboarding/` | Company setup → build persona |
| `app/dashboard/agent/` | Role wizard, sourcing, live call, report |
| `lib/agent/engine.ts` | Deterministic turn logic |
| `lib/agent/orchestrator.ts` | Agent class + LLM write calls |
| `lib/agent/report.ts` | Post-call scorecard generation |
| `lib/session/store.ts` | Client session & engagement draft |

More detail: [ARCHITECTURE.md](./ARCHITECTURE.md)
