# Design

Source of truth for architecture and technical approach. Behavior details live in `REQUIREMENTS.md`.

## Purpose

A Discord community bot that improves onboarding and safety:

1. Welcome genuine introductions in a dedicated channel with personalized AI replies.
2. Moderate spam and abusive promotional content across messages.
3. Age out temporary “new member” roles after a configured membership period.

## Principles

- **Fail open on AI errors.** If moderation or spam classification fails, prefer not blocking legitimate users.
- **Cheap filters before expensive AI.** Heuristics (channel, greetings, length, keywords, similarity) run before LLM calls where practical.
- **Single-purpose pipelines.** Spam handling and introduction handling are separate concerns with a defined order.
- **Config over code.** Channel IDs, roles, AI provider/model, and notification targets come from environment configuration.
- **Stateless Discord client, stateful community memory.** Discord is the event source; the bot owns welcome and duplicate memory (today ephemeral; persistence is planned).

## System context

```
Discord Gateway
      │
      ▼
┌─────────────────┐     ┌──────────────────┐
│  Discord Bot    │────▶│  LLM Provider    │
│  (event loop)   │     │  (via resilient  │
│                 │     │   AI client)     │
└────────┬────────┘     └──────────────────┘
         │
         ├── Community memory (welcomed users, intro fingerprints)
         └── Guild role store (Discord as source of truth for roles)
```

**External dependencies**


| Dependency                           | Role                                                      |
| ------------------------------------ | --------------------------------------------------------- |
| Discord API / Gateway                | Message events, replies, deletes, role changes            |
| LLM provider (OpenRouter by default) | Welcome generation, intro moderation, spam classification |
| Environment / secrets                | Tokens, channel/role IDs, model selection                 |


## Logical architecture

Layers (conceptual, not folder layout):

1. **Runtime bootstrap** - load config, connect to Discord, register event listeners and scheduled jobs.
2. **Message ingress** - receive `messageCreate` events; ignore bot authors early.
3. **Safety pipeline** - classify and act on spam before any onboarding logic.
4. **Onboarding pipeline** - validate, moderate, and welcome introductions in the configured channel only.
5. **AI service** - shared LLM client with retries/backoff; task-specific prompts for welcome, intro moderation, and spam detection.
6. **Community memory** - track who has been welcomed and near-duplicate introductions.
7. **Membership jobs** - periodic cleanup of the new-member role based on join age.

## Message processing flow

Every non-bot message follows this order:

```
Message received
      │
      ▼
 Spam detection (AI; keyword rules planned as a fast path)
      │
      ├─ SPAM ──▶ delete message + public warn (+ notify mods, planned)
      │
      └─ SAFE
            │
            ▼
     Introduction pipeline
            │
            ├─ wrong channel / reply / greeting ──▶ ignore
            ├─ already welcomed ──▶ short acknowledgment
            ├─ AI moderation REJECT ──▶ refuse with reason
            ├─ heuristic validation fail ──▶ coach required fields
            ├─ near-duplicate intro ──▶ warn similarity
            └─ accept ──▶ AI welcome + conversation starter
                           then record welcome + intro fingerprint
```

**Ordering rationale:** spam can appear in any channel, so safety runs globally first. Onboarding is channel-scoped and must not run after a spam action.

## Pipelines

### Safety

- **Input:** message content (and author/channel for actions).
- **Decision:** `SAFE` or `SPAM`.
- **Actions on SPAM:** remove the message; warn in-channel; optionally notify moderators (DM or channel target - planned).
- **Planned fast path:** deterministic keyword / link / mention heuristics before or alongside AI classification to cut cost and latency.

### Onboarding

- **Scope:** configured introductions channel only.
- **Noise rejection:** ignore replies and trivial greetings so the channel stays introduction-focused.
- **Quality gates (in order):**
  1. One welcome per user (community memory).
  2. AI content moderation (abuse, promo, scams, invites, etc.) → `APPROVE` / `REJECT`.
  3. Heuristic structure check (minimum substance; signals of a real intro).
  4. Near-duplicate detection against recent intros (similarity threshold).
- **Success path:** personalized welcome (3–5 sentences) ending in exactly one conversation-starting question; then update community memory.

### Membership role lifecycle

- Discord remains the source of truth for who holds the new-member role.
- On `guildMemberAdd`, assign the configured new-member role when `NEW_MEMBER_ROLE_ID` is set and the role exists in the guild; skip otherwise.
- A scheduled job scans guild members with that role and removes it once join age ≥ configured days.

## AI usage model

Three distinct LLM tasks share one provider client:


| Task                | Output contract                       | Used when              |
| ------------------- | ------------------------------------- | ---------------------- |
| Welcome generation  | Natural-language reply + one question | Intro accepted         |
| Intro moderation    | `APPROVE` or `REJECT` only            | Candidate intro        |
| Spam classification | `SAFE` or `SPAM` only                 | Every eligible message |


**Client traits:** configurable service/model/API key; token and temperature caps; retries with exponential backoff.

**Prompt policy:** task prompts are owned as product logic (tone, reject criteria, spam criteria). Binary classifiers must return a single label so parsing stays reliable.

## State and persistence


| Data                                     | Current approach      | Target approach                     |
| ---------------------------------------- | --------------------- | ----------------------------------- |
| Welcomed user IDs                        | Process memory        | Durable store (survive restarts)    |
| Intro fingerprints / text for similarity | Process memory        | Durable store + retention policy    |
| Role membership                          | Discord               | Unchanged                           |
| Bot config                               | Environment variables | Env + optional admin commands later |


**Implication:** restart can re-welcome users or miss duplicate history until persistence is added. Design should treat memory as a replaceable store behind a narrow interface (has-welcomed / mark-welcomed / is-duplicate / save-intro).

## Configuration surface


| Concern                    | Config knobs                                  |
| -------------------------- | --------------------------------------------- |
| Discord auth               | Bot token                                     |
| Onboarding scope           | Introductions channel ID                      |
| AI                         | Service name, model, API key                  |
| New-member role            | Role ID, days until removal, cleanup interval |
| Moderator alerts (planned) | Mode (`dm` / channel), target ID              |


## Cross-cutting concerns

- **Intents / permissions:** message content, send/delete messages, manage roles for cleanup, read member join times as needed.
- **Observability:** structured console logging per pipeline stage is enough for v1; metrics/dashboard are future.
- **Multi-guild:** role cleanup iterates all connected guilds; intro channel is a single configured ID (one primary guild / channel assumed unless config expands).
- **Cost control:** global AI spam checks are the dominant cost driver; heuristic prefilters and channel scoping for onboarding limit spend.

## Planned extensions (architecture impact)


| Extension              | Approach                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| Keyword spam filter    | Insert before AI spam call; short-circuit on hit                       |
| Mod notifications      | Side effect after SPAM (and optionally REJECT); target from config     |
| Persistent memory      | Swap in-memory community store for DB without changing pipeline order  |
| Auto role on join      | Done: `guildMemberAdd` assigns role when configured and present        |
| Slash / admin commands | Separate command ingress; mutate config or memory via privileged users |
| Analytics              | Emit pipeline outcomes to a metrics sink; dashboard reads the sink     |


## Non-goals (current design)

- General-purpose chat agent outside intro + safety.
- Replacing Discord's native permission/moderation stack.
- Guaranteed durable state before a persistence store is adopted.

