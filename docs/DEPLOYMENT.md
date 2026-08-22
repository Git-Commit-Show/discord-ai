# Deployment

How to configure Discord, set environment variables, and run the bot in development or production.

Behavior details: `REQUIREMENTS.md`. Architecture: `DESIGN.md`.

## Prerequisites

- Node.js **v18+**
- A Discord server where you can manage roles and invite bots
- A Discord application + bot token ([Developer Portal](https://discord.com/developers/applications))
- An [OpenRouter](https://openrouter.ai) API key (default LLM provider)

## 1. Discord application setup

High-trust bot (Manage Messages / Roles) - keep it **private** and least-privilege.

### 1.1 Bot page

1. [Developer Portal](https://discord.com/developers/applications) → create/select app → **Bot**.
2. Copy **Token** into `DISCORD_TOKEN` (not Public Key / Client Secret).
3. Intents on: **Message Content**, **Server Members**; **Presence** off.
4. **Public Bot** off; **Requires OAuth2 Code Grant** off.

### 1.2 Installation (do this before Public Bot will stay off)

1. Open **Installation**.
2. Contexts: **Guild Install** on; **User Install** off.
3. **Install Link** → **None** (other options block private).
4. **OAuth2** → Default Authorization Link → **None** (if shown).
5. Save → **Bot** → Public Bot **Off** → Save.
6. Verified apps usually cannot go private again - stay unverified for internal use.
7. Invite via URL Generator below (owner/team only when private).

### 1.3 OAuth2 URL Generator (invite permissions live here, not on Bot)

1. **OAuth2 → URL Generator**.
2. Scopes: **`bot` only** (`applications.commands` later if you add slash commands).
3. **Bot Permissions** appear on this same page after checking `bot`:
   - View Channels, Send Messages, Read Message History, Embed Links
   - Manage Messages (spam delete)
   - Manage Roles (only if using `NEW_MEMBER_ROLE_ID`)
4. Do not grant Administrator / Kick / Ban / Manage Server / Manage Channels.
5. Copy URL → open → pick server → Authorize; keep the URL private.
6. Token leak → reset on Bot page immediately.
7. No new-member role → omit Manage Roles and Server Members Intent.

### 1.4 Server role hierarchy

1. Bot role above `NEW_MEMBER_ROLE_ID`; below mod/admin roles.
2. Optional: restrict channels via overrides (spam needs read + Manage Messages).

## 2. Collect Discord IDs

Enable **Developer Mode** (User Settings → App Settings → Advanced), then copy:

| Value | How |
| ----- | --- |
| `INTRO_CHANNEL_ID` | Right-click introductions channel → Copy Channel ID |
| `NEW_MEMBER_ROLE_ID` | Right-click the temporary new-member role → Copy Role ID |
| `NOTIFICATION_TARGET_ID` | User or mod-log channel ID (planned; env only today) |

## 3. Environment configuration

Copy `.env.example` to `.env` in the project root and fill in values.

### Required

| Variable | Purpose |
| -------- | ------- |
| `DISCORD_TOKEN` | Bot login token |
| `INTRO_CHANNEL_ID` | Channel where introductions are welcomed |
| `OPENROUTER_API_KEY` | LLM API key (`sk-or-v1-…`) |
| `AI_SERVICE` | Provider name (`openrouter`) |
| `MODEL` | OpenRouter model id (e.g. `openrouter/free`, `openai/gpt-4o-mini`) |

### Optional (new-member role)

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `NEW_MEMBER_ROLE_ID` | unset | Role assigned on join and aged out by the cleanup job |
| `NEW_MEMBER_DAYS` | `7` | Days after join before the role is removed |
| `ROLE_CLEANUP_INTERVAL_HOURS` | `24` | How often the cleanup job runs |

Omit `NEW_MEMBER_ROLE_ID` to skip join assignment and role cleanup.

### Planned (not wired yet)

| Variable | Notes |
| -------- | ----- |
| `NOTIFICATION_MODE` | `dm` or `channel` - spam/mod alerts |
| `NOTIFICATION_TARGET_ID` | User or channel ID for those alerts |

Full comments and examples live in `.env.example`.

## 4. Install and run

```bash
npm install
```

**Development** (auto-restart on file changes):

```bash
npm run dev
```

**Production-style process:**

```bash
npm start
```

On success you should see a log like `Logged in as <bot>#NNNN`. The role cleanup job runs once at startup, then on the configured interval.

### LLM smoke check

```bash
npm run test:e2e
```

Runs the live OpenRouter welcome check in `test/llmService.e2e.test.js` (uses the same env vars). Offline unit and integration tests are `npm test`.

### CI

`.github/workflows/test.yml` runs `npm ci` then `npm test` on:

- pull requests
- pushes to `main` (including merges)
- manual **Run workflow** (`workflow_dispatch`)

CI uses Node 24. Local development stays Node v18+. Live e2e is not part of CI.

## 5. Production hosting

The bot is a **long-running Node process** connected to the Discord Gateway. It must stay online continuously; serverless request handlers are not a fit.

### Hosting options

Any always-on host works (VPS, Railway, Render, Fly.io, a home server, etc.). Requirements:

- Persistent process (or a process manager that restarts on crash)
- Outbound HTTPS to Discord and OpenRouter
- Environment variables / secrets set in the host (do not commit `.env`)

### Process management

Use a process manager so the bot restarts after crashes and reboots. Examples:

- **PM2:** `pm2 start src/index.js --name discord-ai`
- **systemd:** unit with `ExecStart=/usr/bin/node /path/to/src/index.js` and `Restart=always`

Keep Node at v18+ on the host. Pin or lock dependencies via `package-lock.json` (`npm ci` in deploy scripts).

### Secrets

- Store `DISCORD_TOKEN` and `OPENROUTER_API_KEY` only in the host's secret store or `.env` (gitignored).
- Rotate tokens in the Developer Portal / OpenRouter if they leak.
- Prefer least-privilege Discord permissions; do not invite with Administrator unless you intend to.

## 6. Post-deploy checklist

- [ ] Installation: Guild Install only; Install Link = None (if keeping private)
- [ ] Public Bot off (when not verified / after Install Link is None)
- [ ] Privileged intents enabled (Message Content + Server Members as needed)
- [ ] Invited via URL Generator with `bot` scope and least-privilege Bot Permissions (not Administrator)
- [ ] Bot appears online in the server member list
- [ ] Bot can see and speak in the introductions channel
- [ ] Post a test intro in `INTRO_CHANNEL_ID` → personalized welcome with one question
- [ ] Post obvious spam in another channel → message deleted + warn (needs Manage Messages)
- [ ] If using new-member role: join with a test account → role assigned; bot role is above that role
- [ ] Logs show cleanup job output at startup / interval (when role is configured)

## 7. Operational notes

- **In-memory state:** welcomed users and intro fingerprints live in process memory. Restarts can re-welcome users or miss duplicate history until persistence is added (see `DESIGN.md`).
- **Cost:** every eligible message can trigger an LLM spam check; choose a cost-appropriate `MODEL` and monitor OpenRouter usage.
- **Fail-open AI:** if moderation/spam classification fails or returns empty text, the bot prefers not blocking users (`DESIGN.md`). Empty welcome generation is treated as an error.
- **Multi-guild:** role cleanup walks connected guilds; intro channel is a single configured ID (one primary channel assumed).

## 8. Troubleshooting


| Symptom | Likely cause |
| ------- | ------------ |
| Cannot turn Public Bot off | Install Link or OAuth2 Default Authorization Link not **None**; or app is verified |
| Bot offline / login fails | Bad or missing `DISCORD_TOKEN` |
| No reactions to messages | Message Content Intent disabled, or bot lacks channel access |
| No role on join / cleanup does nothing | Missing `NEW_MEMBER_ROLE_ID`, Server Members Intent off, or bot role below target role |
| Spam not deleted | Missing Manage Messages (re-invite with that permission on URL Generator) |
| Welcome never fires | Wrong `INTRO_CHANNEL_ID`, or message filtered (reply / greeting / already welcomed) |
| LLM errors in logs | Bad `OPENROUTER_API_KEY`, invalid `MODEL`, or provider outage |
| “Missing Permissions” on role changes | Bot role below target role, or Manage Roles not granted at invite |

---

For local feature work, prefer `npm run dev`. For production, use `npm start` under a process manager with secrets injected by the host.
