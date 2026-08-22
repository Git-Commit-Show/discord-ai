# Requirements

Discord intro + moderation bot (Discord.js, ResilientLLM / OpenRouter).

## Done

- AI personalized welcome replies with one conversation starter
- Intro channel gating via `INTRO_CHANNEL_ID`
- Intro validation (length + keywords)
- AI intro moderation (`APPROVE` / `REJECT`)
- Duplicate intro detection (in-memory Jaccard)
- Welcome tracking (in-memory; one welcome per user; follow-ups stay silent)
- Ignore bots, replies, and short greetings
- Do not process admin messages unless the bot is specifically tagged
- AI spam detect → delete message + channel warn
- Skip intro replies when the message is deleted while processing (including Discord unknown-message errors)
- Fail-open spam (`SAFE`) and intro moderation (`APPROVE`) on LLM error or empty output, with `[LLM_FAIL_OPEN]` logs
- New-member role cleanup job (`NEW_MEMBER_ROLE_ID`, `NEW_MEMBER_DAYS`)
- Automatic new-member role assignment on join (when role is configured and present)
- Offline Mocha tests (`npm test`) and live LLM e2e (`npm run test:e2e`)
- GitHub Actions runs `npm test` on pull requests, merges to `main`, and manual dispatch

## In progress / planned

- Wire keyword blacklist spam filter (`spamFilter.js` unused)
- Report moderation activity in a channel, with a clickable link to the message the action was taken on (`NOTIFICATION_MODE`, `NOTIFICATION_TARGET_ID` in env only)
- Persistent storage for welcomes + duplicate intros
- Slash commands
- Admin configuration commands
- Analytics dashboard
