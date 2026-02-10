# Stakeholder Questions: Campaign Detail Scroll Fix

> Feature: campaign-detail-scroll-fix
> Spec: `specs/features/campaign-detail-scroll-fix/spec.md`
> Created: 2026-02-09

## Priority Questions (Blocking)

_None — this is a straightforward padding fix._

## Design Tradeoffs (Affects Scope)

### Q1: Use static or dynamic bottom padding?
- **Context**: The home screen uses `useBottomTabBarHeight()` for dynamic tab bar sizing (see `app/(tabs)/index.tsx:63`). The campaign detail currently uses a static value of `DS.spacing.xxxl` (32px).
- **Options**:
  - A) Static `120` — Simple, covers all device sizes, consistent with other screens that use fixed values
  - B) Dynamic `useBottomTabBarHeight() + DS.spacing.xxxl` — More precise but adds a hook import
- **AI Recommendation**: Option B (dynamic) — follows the same pattern as the home screen and adapts to different device tab bar heights
- **Default if unanswered**: Option B (dynamic)
- **Answer**: Use default — Option B (dynamic `useBottomTabBarHeight() + DS.spacing.xxxl`)

## Nice-to-Know (Non-blocking)

_None_

---

## How to Approve

```
/groom --approve campaign-detail-scroll-fix Q1: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
