# Troodie Tasks — README Template

This is a template for organizing engineering tasks for a new cycle. Fill in epics, create task files from the template below, and track progress in `TODO.md`.

## File Structure (example)

```
tasks/
├── README.md                 # This file (template)
├── TODO.md                   # Master task tracking per cycle
└── task-<epic>-<seq>-<slug>.md
```

- <epic>: short numeric or mnemonic epic id (e.g., 1, auth, growth)
- <seq>: sequential number within the epic (e.g., 1, 2, 3)
- <slug>: short-kebab description (e.g., email-verification)

Example: `task-2-1-email-verification.md`

---

## Status Legend
- 🔴 Not Started
- 🟡 In Progress
- 🟢 Completed
- ⏸️ Blocked
- 🔄 Review

---

## Task Naming Convention

`task-<epic>-<seq>-<short-name>.md`

- Prefer concise names that describe the outcome
- Keep the same <epic> across related tasks
- Increment <seq> for each new task in that epic

---

## Task File Template

Copy this into a new file named `task-<epic>-<seq>-<slug>.md` and fill in.

```md
# <Task Title>

- Epic: <EX or number>
- Priority: <Critical | High | Medium | Low>
- Estimate: <X days>
- Status: 🔴 Not Started
- Assignee: <name or ->
- Dependencies: <task ids or ->

## Overview
Brief description of the user value and scope boundaries.

## Business Value
Why this matters (impact, metrics, user outcomes).

## Acceptance Criteria (Gherkin)
```gherkin
Feature: <feature>
  As a <user type>
  I want <goal>
  So that <benefit>

  Scenario: <happy path>
    Given <precondition>
    When <action>
    Then <expected>

  Scenario: <edge case>
    Given <precondition>
    When <action>
    Then <expected>
```

## Technical Implementation
- Data model / API changes
- UI components / screens
- Services / hooks to touch
- Analytics / telemetry
- Error states and retries

## Definition of Done
- [ ] Meets all acceptance criteria
- [ ] Unit/Integration coverage where applicable
- [ ] UX copy reviewed
- [ ] Perf and accessibility checked
- [ ] Feature flagged if risky

## Notes
Links, diagrams, references.
```

---

## Epics (Template)

Keep epics high-level; link tasks underneath.

| ID | Epic | Focus | Owner | Status |
|---|---|---|---|---|
| E1 | <name> | <one-line focus> | <owner> | 🔴 |
| E2 | <name> | <one-line focus> | <owner> | 🔴 |

---

## Working Agreement (Lightweight)
- Tasks should be atomic and shippable (< 2 days ideal)
- Start by filling acceptance criteria before coding
- Update `TODO.md` status as you work; keep notes terse
- Use task IDs in commit messages and PR titles

---

## Gherkin Example

```gherkin
Feature: Contextual notification prompt
  As a new user
  I want to control when I grant notifications
  So that I only enable them after understanding value

  Scenario: User enables notifications from settings
    Given I am on Settings
    When I toggle "Push notifications" on
    Then I see an OS permission prompt
    And after accepting, in-app toggle stays on
```

---

## Release Checklist (Per Cycle)
- [ ] App config: version/bundle/build updated
- [ ] Permissions usage strings verified
- [ ] Privacy links and nutrition labels current
- [ ] Crash/error monitoring enabled
- [ ] Store metadata/screenshots updated

---

Last initialized as template: 2025-__-__