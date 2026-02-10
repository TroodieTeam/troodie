# Stakeholder Questions: iOS 26 Nav Bar Fix

> Feature: ios26-navbar-fix
> Spec: `specs/features/ios26-navbar-fix/spec.md`
> Created: 2026-02-09

## Priority Questions (Blocking)

These MUST be answered before implementation can begin.

### Q1: What exactly is broken — is the tab bar invisible, unresponsive to taps, or mispositioned?
- **Context**: User reports say "nav bar not working" which is ambiguous. The fix strategy differs based on the symptom:
  - Invisible → BlurView rendering + absolute positioning issue
  - Unresponsive → touch target / hit area issue from safe area overlap
  - Mispositioned → absolute positioning without bottom inset compensation
- **Options**:
  - A) Invisible / not rendering — prioritize BlurView removal + absolute positioning fix
  - B) Visible but taps don't register — prioritize touch target / safe area fix
  - C) Mispositioned (overlapping content or clipped) — prioritize absolute positioning fix
  - D) Unknown / all of the above — apply all fixes defensively
- **AI Recommendation**: D — apply all fixes. Since we can't reproduce on iOS 26 easily, the safest approach is to remove both the absolute positioning AND the BlurView, which addresses all three symptoms. The fixes are low-risk and non-breaking.
- **Answer**: **B) Visible but taps don't register.** The nav bar is there and visible, but when tapping on it, it does not work as expected. This is a touch target / hit area issue — taps are not reaching the tab bar buttons. Focus fix on resolving the touch interception problem caused by `position: 'absolute'` allowing screen content to overlay the tab bar's touch area on iOS 26.

### Q2: Should we keep the BlurView transparency effect on the tab bar, or switch to an opaque white background?
- **Context**: The current iOS tab bar uses `expo-blur` BlurView for a frosted-glass translucent effect (`components/ui/TabBarBackground.ios.tsx`). This is purely cosmetic. Removing it in favor of an opaque white background is the simplest fix and matches Android behavior. However, some teams prefer the iOS-native blur aesthetic.
- **Options**:
  - A) Remove BlurView, use opaque white background (Recommended) — simplest fix, eliminates a known iOS 26 compatibility risk, consistent cross-platform
  - B) Keep BlurView but add fallback — try BlurView, catch rendering failure, fall back to opaque. More complex.
  - C) Keep BlurView as-is — only fix the absolute positioning. Riskier if BlurView is part of the problem.
- **AI Recommendation**: A — remove BlurView. The frosted-glass effect adds visual complexity for minimal UX benefit, and `expo-blur` has had recurring iOS compatibility issues. An opaque white tab bar is standard and reliable.
- **Answer**: **C) Keep BlurView as-is.** Stakeholder wants to preserve the frosted-glass blur aesthetic. Fix will focus on touch target / absolute positioning issue only. BlurView stays, but `position: 'absolute'` must be removed so the tab bar participates in normal layout flow and receives touch events correctly.

## Design Tradeoffs (Affects Scope)

These have sensible defaults but stakeholder input is valuable.

### Q3: Should we update `react-native-screens`, `expo-blur`, and `@react-navigation/bottom-tabs` as part of this fix, or keep it minimal?
- **Context**: Current versions (`react-native-screens: ~4.16.0`, `expo-blur: ~15.0.7`, `@react-navigation/bottom-tabs: ^7.3.10`) predate iOS 26. Updating could provide additional fixes but introduces risk of other regressions.
- **Options**:
  - A) Minimal fix only — just change styling/BlurView, no dep updates
  - B) Update navigation-related deps — bump `react-native-screens`, `@react-navigation/bottom-tabs`
  - C) Full dep update — bump all potentially affected packages
- **AI Recommendation**: A for this PR, B as a follow-up PR. Keeping the fix minimal reduces regression risk and makes it shippable faster.
- **Default if unanswered**: A — minimal fix only
- **Answer**: A — minimal fix only (default applied, not explicitly answered)

### Q4: Should we remove the unused `components/BottomNavigation.tsx` component as cleanup?
- **Context**: This file is a standalone bottom navigation component that's not imported anywhere. It actually has better safe area handling than the current tab bar (uses `useSafeAreaInsets`), but it's dead code. Removing it reduces confusion.
- **Options**:
  - A) Remove it — clean up dead code
  - B) Keep it — might be useful as reference or future fallback
- **AI Recommendation**: A — remove it. Dead code adds confusion, especially since it has patterns that should be in the actual tab bar.
- **Default if unanswered**: B — keep it (safe default, no risk)
- **Answer**: B — keep it (default applied, not explicitly answered)

## Nice-to-Know (Non-blocking)

### Q5: Can you reproduce the issue on a simulator running iOS 26, or only on physical devices?
- **Context**: If reproducible on simulator, we can verify the fix before shipping. If physical-device-only, we'll need to rely on beta testers.
- **Answer**: _pending_

### Q6: Are there any other UI elements reported as broken on iOS 26, or is it just the tab bar?
- **Context**: If other elements are also broken, it may indicate a broader `react-native-screens` or New Architecture issue rather than tab-bar-specific styling.
- **Answer**: _pending_

---

## How to Approve

Once Priority Questions are answered, approve the spec:

```
/groom --approve ios26-navbar-fix Q1: [answer] Q2: [answer] Q3: [answer or "use default"] Q4: [answer or "use default"]
```

Design Tradeoffs default to AI recommendations if not explicitly answered.
Nice-to-Know questions are optional.
