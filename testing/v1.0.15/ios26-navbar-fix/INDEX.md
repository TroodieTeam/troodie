# iOS 26 Nav Bar Fix

> Spec: `specs/features/ios26-navbar-fix/`
> Version: v1.0.15
> Date: 2026-02-09

## Description

Navigation tabs unresponsive on iOS 26 (iPhone 17 Pro, iPhone 14 Pro). Fixed tab bar rendering for iOS 26 compatibility.

## Artifacts

| File | Type | Description |
|------|------|-------------|
| `manual-test.md` | Manual test | Verify all 5 tabs navigate correctly on iOS 26 devices |
| `e2e/tab-navigation.yaml` | E2E (Maestro) | Verifies all tab bar buttons tappable and functional |

## How to Run

```bash
maestro test e2e/flows/ios26-navbar-fix/tab-navigation.yaml
```
