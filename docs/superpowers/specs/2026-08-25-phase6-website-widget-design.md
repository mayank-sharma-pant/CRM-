# Phase 6.17 — Website widget → lead (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.17.

## Problem

Competitors ship a paste-on-site chat/contact widget that creates a CRM lead.
We have `/f/{slug}` forms; site owners still need an embeddable bubble.

## Decisions (locked)

1. **Not a live agent chat.** No websockets, no inbox. Visitor leaves name +
   contact + message; CRM creates a lead (`source=Website widget`).
2. **Same public form slug** as `/f/{slug}`. Inactive/unknown slug → 404.
3. **Embed** is an iframe of `/w/{slug}` via `GET /api/public/widget/{slug}/embed.js`
   so the visitor’s origin never needs CORS to our API.
4. Honeypot + existing public form rate limit. Cross-tenant lead GET → 404/403.

## Non-goals

Human chat, bot replies, typing indicators, SalesIQ parity.
