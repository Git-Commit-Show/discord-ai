# Requirements

Discord intro + moderation bot (Discord.js, ResilientLLM / OpenRouter).

## Done

- ✅ AI personalized welcome replies with one conversation starter
- ✅ Intro channel gating via `INTRO_CHANNEL_ID`
- ✅ Intro validation (length + keywords)
- ✅ AI intro moderation (APPROVE / REJECT)
- ✅ Duplicate intro detection (in-memory Jaccard)
- ✅ Welcome tracking (in-memory; one welcome per user)
- ✅ Ignore bots, replies, and short greetings
- ✅ AI spam detect → delete message + channel warn
- ✅ New-member role cleanup job (`NEW_MEMBER_ROLE_ID`, `NEW_MEMBER_DAYS`)
- ✅ Automatic new-member role assignment on join (when role is configured and present)

## In progress / planned

- 🚧 Wire keyword blacklist spam filter (`spamFilter.js` unused)
- 🚧 Spam / mod notifications (`NOTIFICATION_MODE`, `NOTIFICATION_TARGET_ID` in env only)
- 🚧 Persistent storage for welcomes + duplicate intros
- 🚧 Slash commands
- 🚧 Admin configuration commands
- 🚧 Analytics dashboard

