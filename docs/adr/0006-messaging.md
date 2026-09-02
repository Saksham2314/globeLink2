# ADR 0006 — Messaging (Phase 4)

- **Status:** accepted
- **Date:** 2026-09-02

## Context

Phase 4 lets travellers message a journey's author (and each other): an inbox
at `/messages`, a thread view, an unread badge, a "Message" button on the
journey page, and near-real-time updates. Two options were put to the project
owner; both recommended choices were taken.

## Decisions

### 1. One conversation per pair of users

`Conversation.pairKey` = the two user ids sorted and joined (`"<idA>:<idB>"`),
with a **unique** constraint. `getOrCreateConversation` is therefore a single
indexed lookup, order-independent. `journeyId` (optional) just records what a
conversation was started about — messaging the same person from a second
journey continues the same thread. Group conversations are a future,
schema-compatible extension.

### 2. Updates by polling an incremental fetch route

`GET /api/messages/[conversationId]?after=<lastMessageId>` returns only messages
newer than the anchor (with a `(createdAt, id)` tiebreak so same-millisecond
inserts aren't missed), oldest → newest. The open thread polls it every 4s
**while the tab is visible** and on `visibilitychange`, and merges by id. The
header badge polls `GET /api/messages/unread` every 25s. This route is the
exact seam a websocket/SSE transport replaces later — the client contract
("give me everything after X") doesn't change.

### 3. Unread counts computed, not denormalized

`listConversations` runs **one grouped raw query** joining `messages` to the
viewer's `conversation_participants` row and counting
`senderId <> me AND createdAt > lastReadAt` per conversation — no N+1, no
counter to keep consistent. `getTotalUnread` is the same query without the
`GROUP BY`. `lastReadAt` defaults to join time and is advanced by `markRead`
(called client-side on thread open / focus / new message) and by sending.

### 4. No email-on-new-message in v1

Resend is wired, but new-message email is deferred — it needs delivery
preferences and rate limiting to not be a nuisance.

## Authorization

Every service function begins with `assertParticipant(userId, conversationId)`,
which returns **NOT_FOUND** for both a missing conversation and a non-member —
so a stranger can't probe which conversation ids exist. Verified: reads and
sends by a non-participant are rejected.

## Consequences

- New module `src/modules/messaging/` (`pair-key`, `messaging.schema`,
  `messaging.mappers`, `messaging.service`, `messaging.actions`), same shape as
  earlier phases; `getPublicJourney` now also returns `authorId` for the
  "Message" button.
- Routes: `/messages`, `/messages/[conversationId]` (thread + a narrow
  conversation list on `lg+`), `/api/messages/[conversationId]`,
  `/api/messages/unread`. `/messages` joins the sign-in-gated prefixes.
- `Conversation` / `Message` are hard-deleted with the journey/user cascade;
  no soft-delete or edit history yet (`Message.editedAt` is reserved).
- Empty conversations (created by "Message" but never sent to) show in the
  inbox with a "Say hello" state — acceptable; a cleanup job can prune them
  later if it matters.
