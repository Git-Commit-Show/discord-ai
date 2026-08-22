# Contributing

Thanks for helping improve this Discord intro + moderation bot. This guide covers local setup, how the codebase is organized, and where to make changes.

Product behavior: [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)  
Architecture: [`docs/DESIGN.md`](docs/DESIGN.md)  
Deploy / Discord portal setup: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Prerequisites

- Node.js **v18+**
- A Discord server you can invite a bot into (dev/test server recommended)
- Discord bot token + OpenRouter API key (see Deployment doc for portal steps)

## Run locally

1. Clone the repo and install dependencies:

```bash
git clone <repo-url>
cd discord-ai
npm install
```

2. Copy env template and fill values:

```bash
cp .env.example .env
```

Minimum to exercise intros + spam:

| Variable | Notes |
| -------- | ----- |
| `DISCORD_TOKEN` | Bot token; enable **Message Content** + **Server Members** intents |
| `INTRO_CHANNEL_ID` | Your test `#introductions` channel ID |
| `OPENROUTER_API_KEY` | From [openrouter.ai/keys](https://openrouter.ai/keys) |
| `AI_SERVICE` | `openrouter` |
| `MODEL` | e.g. `openrouter/free` or any model id from OpenRouter |

Optional: `NEW_MEMBER_ROLE_ID`, `NEW_MEMBER_DAYS`, `ROLE_CLEANUP_INTERVAL_HOURS` for join/role cleanup.

3. Start with auto-reload:

```bash
npm run dev
```

Or without reload: `npm start`.

4. Optional live LLM check (uses the same `.env`):

```bash
npm run test:e2e
```

You should see `Logged in as …` in the console. Then post in your intro channel and watch the stage logs (`MESSAGE RECEIVED` → spam check → introduction pipeline).

Full Discord invite permissions and troubleshooting: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Codebase map

Entry: `src/index.js` wires Discord events. Everything else hangs off that.

```
src/
├── index.js                 # Bootstrap: login, messageCreate, messageDelete, guildMemberAdd, role job
├── bot.js                   # Discord.js client + gateway intents
├── config.js                # Loads .env → typed config object
├── constants.js             # Defaults (model, tokens, timeouts)
├── handlers/                # Event pipelines (orchestration)
│   ├── spamHandler.js       # Global AI spam → delete + warn
│   ├── introductionHandler.js  # Intro channel welcome flow
│   └── newMemberRoleHandler.js # Assign new-member role on join
├── middleware/              # Pure-ish checks / in-memory state
│   ├── introductionValidator.js
│   ├── welcomeTracker.js    # In-memory “already welcomed”
│   ├── duplicateDetector.js # Jaccard similarity vs recent intros
│   ├── inFlightMessageTracker.js  # Skip reply if the intro is deleted mid-pipeline
│   └── spamFilter.js        # Keyword filter (planned; not wired yet)
├── services/
│   └── llmService.js        # ResilientLLM client: welcome, moderate, spam
├── prompts/                 # System prompts for each LLM task
│   ├── introductionPrompt.js
│   └── spamPrompt.js
├── jobs/
│   └── removeNewMemberRole.js  # Periodic age-out of new-member role
├── utils/
│   └── logger.js

test/
├── 01-spam.test.js                # Spam delete / warn, then stop
├── 02-intro-gates.test.js         # Ignore, validate, moderate, duplicate
├── 03-welcome-and-errors.test.js  # First welcome, follow-up silence, error
├── deletedIntroduction.test.js    # Skip reply when the intro is gone
├── introductionValidator.test.js  # Unit: heuristic intro validation
├── llmService.test.js             # Unit: spam classifier fail-open
├── llmService.e2e.test.js         # Live OpenRouter welcome check
└── helpers/
    ├── messagePipeline.js         # Shared fake Discord message + pipeline
    └── silenceConsole.js          # Hide production console.log during tests
```

### How a message is handled

Order matters (see Design). In `src/index.js`:

1. **`handleSpam`** - every non-bot message; if spam, delete/warn and **stop**.
2. If the message was deleted while spam ran, **stop** (no intro).
3. **`handleIntroduction`** - only continues for non-spam; channel-scoped onboarding.

Introduction pipeline (inside the handler), roughly:

1. Ignore bots, replies, short greetings  
2. Require `INTRO_CHANNEL_ID`  
3. Already welcomed? → silence  
4. AI moderate (`APPROVE` / `REJECT`)  
5. Heuristic validation (length / keywords)  
6. Near-duplicate check  
7. If the intro is gone, skip the reply  
8. AI welcome reply → record welcome + intro fingerprint  

Join / roles:

- `guildMemberAdd` → `newMemberRoleHandler`  
- `messageDelete` / `messageDeleteBulk` → mark in-flight message deleted  
- Startup + interval → `removeNewMemberRole` job  

### Where to change what


| Goal | Start here |
| ---- | ---------- |
| Welcome tone / length / question rule | `src/prompts/introductionPrompt.js` |
| Spam / intro reject criteria | `src/prompts/spamPrompt.js`, moderation prompt in `llmService.js` |
| Channel / greeting / pipeline order | `src/handlers/introductionHandler.js` |
| Spam actions (delete, warn, future mod notify) | `src/handlers/spamHandler.js` |
| Intro structure rules | `src/middleware/introductionValidator.js` |
| Duplicate similarity | `src/middleware/duplicateDetector.js` |
| Skip reply after delete | `src/middleware/inFlightMessageTracker.js`, `src/index.js`, intro handler |
| LLM retries, model, API | `src/services/llmService.js`, `src/config.js`, `src/constants.js` |
| Role assign / cleanup | `handlers/newMemberRoleHandler.js`, `jobs/removeNewMemberRole.js` |
| Wire keyword spam prefilter | `middleware/spamFilter.js` + call from spam handler / `index.js` |

## Design principles (keep these)

From [`docs/DESIGN.md`](docs/DESIGN.md):

- **Fail open on AI errors** - if classification fails or returns empty text, do not block the user (see `[LLM_FAIL_OPEN]` in `llmService.js`).
- **Cheap filters before expensive AI** - heuristics first when you add new checks.
- **Single-purpose pipelines** - keep spam and intro separate; spam always runs first.
- **Config over code** - new knobs go in `.env` / `config.js`, not hard-coded IDs.
- **In-memory community state today** - welcome + duplicate stores reset on restart; design new persistence behind the same middleware APIs.

## Development workflow

1. Branch from the default branch for your change.
2. Run locally with `npm run dev` against a **test** Discord server (avoid experimenting in production communities).
3. Prefer small, focused PRs (one concern: e.g. spam filter wiring, not spam + slash commands).
4. Update docs when behavior or config changes:
   - Feature status → `docs/REQUIREMENTS.md`
   - Architecture / flow → `docs/DESIGN.md`
   - Env / run / host → `docs/DEPLOYMENT.md` or this file
5. Add a short comment on new functions/classes stating their purpose (project convention).

### Scripts


| Script | Command | Use |
| ------ | ------- | --- |
| Start | `npm start` | Production-style run |
| Dev | `npm run dev` | Nodemon reload |
| Unit / integration | `npm test` | Mocha tests under `test/` with no live third-party APIs. Production logs print by default; pass `--silent` to hide them (`npm test --silent`). |
| E2E | `npm run test:e2e` | Live LLM checks (`*.e2e.test.js`) |

Keep each suite small (about three cases: one happy path, two edge/error paths). Files that call live services must be named `*.e2e.test.js`. CI (`.github/workflows/test.yml`) runs `npm test` on pull requests, pushes to `main`, and manual workflow dispatch. It does not run e2e.

## Good first issues

From [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) planned work:

- Wire `spamFilter.js` as a pre-AI fast path in the spam pipeline
- Moderator notifications using `NOTIFICATION_MODE` / `NOTIFICATION_TARGET_ID`
- Persistent storage for welcomes + duplicate intros
- Slash / admin commands
- Analytics

Ask maintainers before large refactors (e.g. swapping Discord.js patterns or LLM providers).

## Pull requests

- Describe **why** the change exists and how you verified it (e.g. “posted intro in test channel”, “spam deleted in #general”).
- Do not commit `.env`, tokens, or API keys (`.env` is gitignored).
- Match existing style: ES modules (`"type": "module"`), async handlers, console stage logs.
- Prefer Apache-2.0–compatible dependencies; call out any package that is not free for commercial use.

## License

This project is licensed under **Apache-2.0**. Contributions are expected under the same license.
