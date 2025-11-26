# Meta Operating System
> Unix Philosophy 2.0 — a cinematic leap from shell scripts to sovereign, local-first runtimes guided by LLM copilots.

## The Paradigm Shift
Meta Operating System is the moment Unix looked at 2025 and decided to upgrade itself. Classic "do one thing well" discipline now lives inside a Deno-powered microkernel that supervises HTTP services, a cyberpunk REPL, performance beacons, and zero-dependency middleware. The result is **Unix Philosophy 2.0**—a manifesto where:
- **LLMs become first-class citizens**, encoding architectural knowledge in text so the system can literally instruct AI collaborators.
- **Modern runtimes** (Deno, Web APIs, native permissions) replace brittle bash glue.
- **Local-first theory is completed**, ensuring individuals and businesses run the entire stack on their own silicon, even when the network disappears.

## Unix Philosophy 2.0
Unix Philosophy 1.0 taught us to compose small programs, embrace text, and stay close to the metal. Version 2.0 keeps those axioms but commits three upgrades:
1. **AI-Augmented Craft** — large language models are folded into the workflow via `docs/02-framework/meta-documentation.md`, ensuring every command, architectural decision, and mistake is narratable to an AI apprentice.
2. **Runtime Modernism** — Deno's secure permissions, Web APIs, and command orchestration stand in for the unreliable shell pipelines of the 1970s.
3. **Local-First Completion** — we adopt the seven 2019 principles Martin Kleppmann and the Ink & Switch team published, then extend them so businesses and self-taught developers gain the same sovereignty as end users.

### Completing the Local-First Framework
Martin Kleppmann's 2019 research ("Local-first software: You own your data, in spite of the cloud") defined principles 1–7: immediate response, multi-device access, optional networks, collaboration, resilience, speed, and longevity. Meta Operating System operationalizes those ideas across the repo:
- `kernel.ts` orchestrates offline-first services with process supervision.
- `core/` delivers routers, middleware, and validation without third-party dependencies.
- `heartbeat/` and performance analyzers keep local deployments observable without SaaS dashboards.

### The New Principles
We introduce **Principle 8 and Principle 9** to finish the doctrine—see `docs/02-framework/9-principles.md`.
- **Principle #8 — Business Sovereignty**: Local-first systems must allow companies (and individuals) to own everything from hardware to domain logic. Meta OS enforces this through multi-tenant yet fully self-hosted stacks, Git-versioned configs, and the zero-SaaS kernel. No subscription, no upstream kill switch, no silent API changes.
- **Principle #9 — Developer Accessibility**: Local-first software should be easy to teach, replicate, and distribute. The Genesis REPL, CLI tooling, and AI-addressed documentation prove that a determined developer outside Silicon Valley can build an enterprise OS in months. Knowledge is text; text is infrastructure.

## Architecture Pulse
```
┌─────────────────────────────── Kernel Supervisor ───────────────────────────────┐
│ Signals, health probes, auto-restarts, Git-aware versioning, Meta REPL on tap   │
└──────┬──────────────────────────────┬──────────────────────────────┬────────────┘
       │                              │                              │
 ┌─────▼─────┐                ┌────────▼────────┐             ┌──────▼──────┐
 │ HTTP Core │                │ Heartbeat Stack │             │ Genesis REPL│
 │ Router +  │                │ Performance +   │             │ & CLI Suite │
 │ Middleware│                │ telemetry feeds │             │ Neon console│
 └─────┬─────┘                └────────┬────────┘             └──────┬──────┘
       │                              │                              │
 ┌─────▼──────┐                ┌───────▼──────┐              ┌───────▼──────┐
 │ Local DB & │                │ Business-Safe │              │ Developer    │
 │ file pipes │                │ alerts / sync │              │ UX / tooling │
 └────────────┘                └──────────────┘              └──────────────┘
```

## Capabilities that Feel Like Science Fiction
- **Microkernel Supervision** — `Kernel` manages Deno subprocesses with port probing, auto-restarts, health policies, and signal-driven REPL re-entry.
- **Zero-Dependency HTTP Framework** — `core/server.ts`, `core/router.ts`, and `core/middleware/` expose routers, schema validation, security, performance monitoring, and error analytics entirely through TypeScript primitives.
- **Heartbeat + Performance Telemetry** — `heartbeat/heartbeat.json` plus the performance middleware create local dashboards for latency, uptime, and resource usage without exposing secrets to third parties.
- **Genesis REPL & CLI** — `genesis-repl.ts` and `docs/GENESIS_REPL.md` describe a neon console that fuses process orchestration, status boards, and scripted automation with AI-friendly prompts.
- **AI-Readable Documentation** — The `docs/` tree is written to instruct models and humans simultaneously, embedding decision trees, ADRs, and principle mappings so knowledge never lives in a proprietary wiki.

## Why Businesses Care
| Principle | Meta OS Reality | Business Outcome |
|-----------|-----------------|------------------|
| No Spinners / Network Optional | Local runtimes remove WAN latency | Workers keep producing even when the ISP fails |
| Collaboration & Resilience | Middleware, websockets, and orchestrated restarts keep teams in sync | Fewer outages, no third-party throttling |
| Long Now | Open formats + Git versioning | Data survives longer than SaaS vendors |
| **Business Sovereignty** | Self-host every tier | Predictable cost, regulatory control, custom IP |
| **Developer Accessibility** | CLI journeys, AI-ready docs | Teams anywhere can replicate the stack |

## Getting Started
1. **Install Deno** (1.42+): `curl -fsSL https://deno.land/install.sh | sh`
2. **Clone the repo**:
   ```bash
   git clone https://github.com/<your-org>/meta-operating-system.git
   cd meta-operating-system
   ```
3. **Run the cinematic kernel**:
   ```bash
   deno run --allow-all kernel.ts
   ```
4. **Explore the HTTP framework**:
   ```bash
   deno run --allow-all example.ts rest
   ```
5. **Enter the Genesis REPL** (cyberpunk CLI experience):
   ```bash
   deno run --allow-all genesis-repl.ts
   ```
6. **Read the playbooks**: start with `docs/02-framework/meta-documentation.md` and `docs/02-framework/9-principles.md` to sync your mind (and your LLM copilot) with the architecture.

> Deno's permissions are intentional. Every command declares what it can access, reinforcing the "explicit security layers" philosophy showcased in `EXAMPLES.md`.

## Project Atlas
- `kernel.ts` — process supervisor, port guardian, and REPL trigger.
- `core/` — HTTP framework (router, middleware, adapters, config).
- `heartbeat/` — instrumentation snapshots for local observability.
- `docs/` — meta-documentation, ADRs, CLI guides, community manifestos.
- `examples/` & `EXAMPLES.md` — runnable showcases of routers, middleware, and Unix-style composability.

## Flight Plan
- **Roadmap** — Expand service plugins while keeping zero-dependency ethos.
- **LLM Pairing** — Continue refining documentation so AI copilots stay aligned with human intent.
- **Local-First Evangelism** — Package reference deployments so cities, cooperatives, and independent shops can adopt Principles 1–9 without acquiring a cloud addiction.

Meta Operating System is not another framework—it is the cinematic sequel to Unix. Version 1 gave us text streams and pipes; Version 2 hands sovereignty, speed, and self-reliance back to the people who plug in the ethernet cables. Welcome to the paradigm shift.
