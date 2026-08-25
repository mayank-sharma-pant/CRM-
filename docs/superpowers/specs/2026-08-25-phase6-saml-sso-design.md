# Phase 6.18 — SAML / enterprise SSO (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.18.
> Extends Phase 4.7 (Google/Microsoft OAuth). Existing users only.

## Problem

Enterprise buyers want company IdP login. OAuth covers Google/Microsoft; SAML is
the remaining SSO path.

## Decisions (locked)

1. **Existing users only.** Email from the assertion must match a user in **that**
   company. No JIT signup.
2. **One IdP per company** (`saml_configs`). Admin/MD sets IdP entity ID, SSO URL,
   X.509 PEM, enabled.
3. **SP-initiated Redirect** `GET /api/auth/saml/{company_code}/start` → IdP.
   **ACS** `POST /api/auth/saml/{company_code}/acs` (HTTP-POST binding).
4. **RelayState** JWT (`aud=saml_state`, 10 min) binds the ACS to the start.
5. **Signature** — RSA-SHA256 over `NameID\\nemail` using the stored IdP cert
   (stdlib + `cryptography`, already a dep). Not exclusive-C14N XML-DSig.
6. Unknown/disabled company code → **404**. Other-company settings → 404.
   No new pip deps. No Alembic.

## Non-goals

IdP-initiated SSO, SLO, signed AuthnRequest, XML exclusive C14N, JIT provisioning,
forcing SSO, platform-admin SAML.
