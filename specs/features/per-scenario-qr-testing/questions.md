# Stakeholder Questions: Per-Scenario QR Code Testing

> Feature: per-scenario-qr-testing
> Spec: `specs/features/per-scenario-qr-testing/spec.md`
> Created: 2026-03-02

## Priority Questions (Blocking)

These MUST be answered before implementation can begin.

### Q1: Should Phase 1 ship without auto-login, or should we go straight to Phase 2?
- **Context**: Phase 1 generates QR codes that navigate to the right screen but require manual login first. Phase 2 adds auto-login via `signInWithPassword`. Phase 1 is ~1 day, Phase 2 adds ~2-3 more days.
- **Options**:
  - A) Ship Phase 1 first — QR codes with manual login instructions. Fast to ship, stakeholders still save navigation time. Auto-login comes later.
  - B) Go straight to Phase 1+2 — Full auto-login experience from day one. More work upfront but the real value is zero-friction login.
- **AI Recommendation**: B — the core value proposition is "scan and you're there." Manual login defeats half the purpose. It's only 2-3 extra days.
- **Answer**: Phase 1+2. Ship with full auto-login from day one — the core value is zero-friction testing.

### Q2: Which QR code library should we use?
- **Context**: QA Studio is a Next.js app. Options range from lightweight to full-featured.
- **Options**:
  - A) `qrcode.react` (~20KB) — Most popular React QR lib, simple `<QRCodeSVG>` component, good enough for static URLs
  - B) `next-qrcode` (~15KB) — Next.js-specific wrapper, slightly smaller but less community support
  - C) Server-side generation via `qrcode` npm package — Generate as SVG string in the server component, no client JS needed
- **AI Recommendation**: A (`qrcode.react`) — widest adoption, works perfectly for this use case, the scenario page is already a server component that can pass the URL to a client component
- **Answer**: `qrcode.react` — use the most popular React QR library.

## Design Tradeoffs (Affects Scope)

### Q3: Should we include Phase 3 (campaign-specific deep links) in scope?
- **Context**: Test data already uses deterministic campaign UUIDs (e.g., `c2aaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa` for "Spring Menu Launch"). Phase 3 maps campaign names from Gherkin to these UUIDs, enabling deep links like `troodie://business/campaigns/c2aaa.../deliverables` that go directly to a specific campaign tab.
- **Options**:
  - A) Include Phase 3 — Full deep linking including campaign-specific navigation (~2 extra days)
  - B) Defer Phase 3 — Ship Phases 1+2, evaluate if generic screen-level navigation is sufficient
- **AI Recommendation**: B (defer) — generic navigation (`business/deliverables`) gets stakeholders 90% there. Campaign-specific links can be groomed separately if needed.
- **Default if unanswered**: Defer Phase 3
- **Answer**: Use default — defer Phase 3. Ship Phases 1+2 first.

### Q4: Where should the QR code appear on the scenario page?
- **Context**: The current scenario page layout is: breadcrumb → title → account info card → media panel (walkthrough/gallery) → Gherkin steps → review controls. The QR code needs to be prominent but not dominate the page.
- **Options**:
  - A) Inside the existing account info card — expand the blue card to include QR + "Test on Device" section
  - B) New card between account info and media panel — separate "Test on Device" section
  - C) Collapsible section between account info and media panel — collapsed by default, expand to reveal QR
- **AI Recommendation**: A — keeps it compact, the account card already shows the email/type, adding QR + deep link text is a natural extension
- **Default if unanswered**: Option A
- **Answer**: Use default — Option A, inside the existing account info card.

## Nice-to-Know (Non-blocking)

### Q5: Do stakeholders primarily test on iOS or Android?
- **Context**: `troodie://` custom scheme works on both platforms, but Android may need `intent://` URLs for some QR scanners. If stakeholders are iOS-only (TestFlight), we can skip Android URL considerations.
- **Answer**: _pending_

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve per-scenario-qr-testing Q1: [answer] Q2: [answer] Q3: [answer or "use default"] Q4: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
