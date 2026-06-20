# Écho — Autonomous Recruiting Agent

**PSVIEW technical test submission.**

**Live demo:** https://echo-recruiting-agent.vercel.app
**Repo:** https://github.com/Omkar921/echo-recruiting-agent

---

## What I built

A company configures its own recruiting agent, then previews it end to end:

1. **Onboarding** — company context → Claude builds company intelligence and a branded agent persona (`{Company}'s Écho`)
2. **Engagement wizard** — pick a role and call type (intro / assessment / technical), select a candidate
3. **Live call preview** — you play the candidate; the agent speaks (TTS), listens (STT), and shows its reasoning per turn
4. **Post-call report** — a call-type-specific scorecard with a next-round likelihood

Nothing is sent for real. Session state persists in the browser.

---

## How this maps to the brief

| Requirement | Where it lives |
|---|---|
| **Autonomous** — context + intent, no step-by-step driving | One company context + one role/call-type input is all you give it. Sourcing, sequencing, and the live conversation all run without further input. |
| **Personality stays consistent, changes when configured differently** | Persona is generated once per company (`{Company}'s Écho`) and reused as a fixed identity on every later call — a different company produces a visibly different agent. |
| **Knows the company** | Company intelligence from onboarding is threaded through every call — persona generation, message writing, and live reasoning all reference it. |
| **Reasons — not just text generation** | `lib/agent/engine.ts` decides classification, conversation phase, and next action in code, before Claude is ever called. That decision is shown live in the reasoning panel each turn — not inferred from the reply text after the fact. |
| **Deployed, usable without us** | Live on Vercel. No setup, no API key required from whoever's reviewing it. |

---

## Key choices

- **Deterministic agent engine, one LLM call per turn.** Classification, conversation phase, and next action are decided in code (`lib/agent/engine.ts`) — Claude is called once per turn, only to write the message for a decision that's already been made.
- **Call-purpose policies.** Intro, assessment, and technical calls each follow their own phase guide and scoring dimensions.
- **No database.** Zustand + localStorage — appropriate for a single-session preview tool, and means it works the instant it's deployed.

---

## What makes the agent intelligent — not just an LLM call

> The agent decides *what* to do next in code — classifying the reply, updating candidate memory, choosing the phase and next beat — and calls Claude exactly once per turn, only to write the words for a decision already made.

---

## Run locally

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```
