# What to expect from the bot

Bot watches every message. Spam is checked first, in every channel. Introduction handling runs only in the introductions channel, and only if the message was not treated as spam.

Bot does **not** chat, answer questions, or moderate off-topic talk as a general assistant. After the first successful welcome, later top-level messages from that user are ignored. Replies to other messages are ignored too.

The examples below are fictional stand-ins for real server patterns. Reply text can vary when the welcome is AI-generated. The **intention** of each reply type stays the same.

---

## Reply types at a glance

| What happened | What Bot does | Intention |
|---|---|---|
| Looks like a real first intro | Personalized welcome + one question | Welcome them and start a conversation |
| Message is very short | Checklist: name, location, interests | Coach a proper intro |
| Long enough, but no intro keywords | Same checklist, different reason | Reject chatter that is not an intro |
| Insults, promo, or the moderator model says no | "Inappropriate or promotional content" | Block bad intros |
| Same user already got a welcome (this bot process) | Silence | Avoid a second welcome without a canned line |
| Intro text is too similar to someone else's | "Looks very similar to another introduction" | Block copy-paste intros |
| Spam model says spam | Deletes the message and warns in-channel | Remove spam |
| Exact greeting, a reply, or an already-welcomed user | Silence | Ignore noise |
| Handler crashes | "Sorry! Something went wrong." | Error fallback |

---

## 1. Successful welcome

A first-time post in the intro channel with a name and some background. Bot greets them by name, reflects a detail from the post, and asks one follow-up question.

**User**

> Hi, I'm Jordan. I'm a software engineer, and I'm hoping to find a partner who speaks native English.

**Bot** (welcome)

> Personalized hello to Jordan, mentions software engineering / finding a partner, then one question.

**User**

> Hi everyone! I am Priya from India. I have a technical team that focuses on software development.

**Bot** (welcome)

> Personalized hello to Priya, mentions India and the software team, then one question.

What "good" looks like: name is spelled as the user wrote it, details match the post, one relevant question, no second welcome if they reply in-thread.

---

## 2. Too short

Under 25 characters, or a hello that is not an exact ignored greeting (`Hello guys`, `Hello` plus an emoji, and similar).

**User**

> Hello guys

**Bot**

> Your introduction is too short.
>
> Please include: your name, where you're from, your interests.

**User**

> what is ur gender?

**Bot**

> Same too-short checklist.

Bot treats this as a failed intro, not as a question.

---

## 3. Not an introduction

Long enough, but missing keywords such as `i'm`, `i am`, `from`, `engineer`, `interested`, `working`.

**User**

> hi @Bot hi

**Bot**

> This doesn't look like an introduction.
>
> Please include: your name, where you're from, your interests.

---

## 4. Moderation reject

The intro moderator returns REJECT. The public message is always the same, whether the post was an insult, a sales pitch, or a false positive.

**User** (insult)

> r u stupid?

**Bot**

> Your introduction contains inappropriate or promotional content.

**User** (sales pitch)

> Turn your SaaS idea into a functional, user-ready product fast. I handle the full journey… Ready to launch? Drop me a message.

**Bot**

> Your introduction contains inappropriate or promotional content.

**User** (often also rejected today)

> Hi I'm looking for long term partner.

> I've been working on a niche I genuinely believe in, and I'm looking for one person who's just as serious about building something…

> how are you?

> ?? Where is my intro

Bot uses one label for all of these. Partner-seeking, small talk, and "where is my intro?" are frequently treated the same as promo or abuse.

---

## 5. Already introduced

After a successful welcome, the user id is stored in memory until the bot restarts. Later top-level messages from that user are skipped with no reply, so Bot does not post a second welcome or a canned "already introduced" line.

**User** (after a welcome)

> Tech

**Bot**

> *(no reply)*

**User**

> Can i share whatsapp or other link like linkedin?

**Bot**

> *(no reply)*

A reply to Bot's welcome (threaded reply) is also silent.

---

## 6. Duplicate introduction

Not common in the live log, but implemented. If the text is very similar to an intro Bot already saved this process (word overlap about 80%+), she does not generate a welcome.

**User**

> Hi I'm Alex from Spain, software engineer interested in AI.

*(later, same or another user, near-copy)*

**Bot**

> This introduction looks very similar to another introduction.

---

## 7. Spam removed

Any channel. The original message is deleted. Bot posts a warning that pings the author. Introduction handling does not run on that message.

**Bot**

> @User, your message has been removed because it was detected as spam.

You will not see the deleted text in channel history. False positives look the same as real spam.

---

## 8. Ignored (no reply)

Bot stays silent when:

- The author is a bot
- The message is empty
- The whole message is exactly a greeting: `hi`, `hello`, `hey`, `welcome`, `thanks`, `thank you`, `nice`, `cool`, `yo`, `sup`, `good morning`, `good afternoon`, `good evening`
- The message is a reply to another message (including Bot)
- The author already received a successful welcome in this bot process
- The channel is not the configured intro channel (spam check still runs)

**User** (reply to Bot)

> Hi Bot, we mainly focus on RAG and Python.

**Bot**

> *(no reply)*

`Hello guys` and `how are you?` are **not** in the ignore list. Those get a checklist or a moderation reject.

---

## 9. Something went wrong

If welcome generation or another intro step throws, Bot replies with a generic error. This can appear next to a spam warning if two messages are processed close together.

**Bot**

> Sorry! Something went wrong.

---

## Full thread: first intro, then follow-ups

This is the usual happy path. Follow-ups after a welcome stay quiet.

**User**

> Sam from earth
> And looking for network

**Bot** (welcome)

> Hello Sam, mentions Earth / networking, asks what kind of network they mean.

**User**

> Tech

**Bot**

> *(no reply)*

**User**

> Can i share whatsapp or other link like linkedin?

**Bot**

> *(no reply)*

---

## Full thread: trolling still gets intro replies

Bot does not switch into "stop engaging." Each new top-level message is another intro attempt.

**Bot** *(after deleting a message)*

> @User, your message has been removed because it was detected as spam.

**User**

> hi @Bot hi

**Bot**

> This doesn't look like an introduction. *(checklist)*

**User**

> what is ur gender?

**Bot**

> Your introduction is too short. *(checklist)*

**User**

> r u stupid?

**Bot**

> Inappropriate or promotional content.

**User**

> @Bot go away

**Bot**

> Inappropriate or promotional content.

---

## What a welcome should look like vs what sometimes happens

The welcome model is asked to: greet warmly, use details from the post, stay at 3 to 5 sentences, ask exactly one question tied to their interests, and not sound like an AI.

**On-target**

> Hello Priya! It's great to have you join us from India with your software development team. … What AI project are you currently working on?

**Off-target (seen live)**

- Question ignores what they said ("What AI project…?" after someone asked for an English-speaking partner)
- Name changed (`nikhil` became `Nicholas`)
- Location "Earth" treated as a real place
- Two welcomes glued together, plus a nonsense word (`cucumber`)
- Internal classifier text posted in channel (`User Safety: safe`)

Those last cases are bugs, not intended reply types.
