# Discord AI

An AI-powered Discord bot for community onboarding and safety. It welcomes genuine introductions in a dedicated channel, filters spam in every channel, and can assign a temporary new-member role on join.

Spam checks run first. Introduction handling runs only in the configured channel, and only if the message was not treated as spam. After the first successful welcome, later top-level messages from that user stay quiet. If an intro is deleted while the bot is still working, it does not reply.

## Features

- Personalized AI welcome with one conversation-starting question
- Intro validation (length and keywords) and AI content moderation
- Duplicate introduction detection and one welcome per user (in-memory)
- Ignores bots, replies, and short greetings
- AI spam detect: delete the message and warn in-channel
- Skip intro replies when the source message is deleted mid-processing
- Optional new-member role on join, with periodic age-out
- Fail-open spam and moderation when the LLM errors or returns empty output

## Quick start

Node.js **v18+**. Full Discord portal, intents, and permissions: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

```bash
git clone https://github.com/Git-Commit-Show/discord-ai.git
cd discord-ai
npm install
cp .env.example .env
```

Fill at least `DISCORD_TOKEN`, `INTRO_CHANNEL_ID`, `OPENROUTER_API_KEY`, `AI_SERVICE`, and `MODEL`. Then:

```bash
npm run dev
```

Or `npm start` without auto-reload.

## Tests

```bash
npm test          # Offline unit and integration tests (what CI runs)
npm run test:e2e  # Live OpenRouter check; needs a real API key
```

GitHub Actions (`.github/workflows/test.yml`) runs `npm test` on pull requests, pushes to `main`, and manual workflow dispatch.

## Docs

| Doc | Contents |
| --- | -------- |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | What is built vs planned |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Architecture and message flow |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Discord app, env, hosting |
| [`EXAMPLES.md`](EXAMPLES.md) | What the bot says (and when it stays silent) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Local setup, codebase map, PR bar |

## Tech stack

Node.js, Discord.js, ResilientLLM, OpenRouter.

## License

Apache-2.0.
