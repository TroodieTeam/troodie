# TROODIE AUDIT AND RESKIN FRAMEWORK
## Complete Technical Blueprint for Full-Application Visual Transformation

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** ACTIVE - Phase 1 Reskin Initiative  
**Source of Truth:** docs/DESIGN_GUIDE_EXTENDED.md  

---

## Executive Summary

This framework provides the definitive methodology for conducting a comprehensive functional audit of the Troodie application and systematically reskinning every component to align with our new design system. This is a presentation-layer-only transformation that maintains 100% functional parity while achieving complete visual consistency.

**Scope:** Visual reskin only. No functional changes, no new features, no backend modifications.

---

# PART 1: FUNCTIONAL AUDIT PROTOCOL

## Purpose

The functional audit creates a complete inventory of all existing UI components and their behaviors BEFORE applying any visual changes. This ensures no functionality is lost during the reskin process and provides a clear checklist for QA validation.

## Audit Instructions

### Step-by-Step Process

1. **Screen Identification**
   - Record the exact file path (e.g., `app/(tabs)/index.tsx`)
   - Note the screen's primary purpose and user context
   - Document any conditional states (loading, empty, error)

2. **Component Discovery**
   - Work top-to-bottom, left-to-right through the screen
   - Identify every interactive and display element
   - Group related elements into logical components

3. **Functionality Documentation**
   - For each component, describe WHAT the user can do
   - Record all user interactions (tap, swipe, long-press)
   - Note any animations or transitions

4. **Data Mapping**
   - List every dynamic data field displayed
   - Use exact property names from the codebase
   - Include conditional data (e.g., "shows only if user.is_verified")

5. **State Capture**
   - Document all possible states (default, hover, pressed, disabled)
   - Note any loading or error states
   - Record empty state presentations

## Functional Inventory Template

Copy and populate this table for each screen:

```markdown
## Screen: [Screen Name]
**File Path:** `[exact/file/path.tsx]`
**Purpose:** [Primary user goal for this screen]
**Route:** [Navigation path to reach this screen]

### Component Inventory

| Component/Feature | Functionality Description | Displayed Data | User Interactions | States |
|------------------|---------------------------|----------------|-------------------|---------|
| [Component Name] | [What it does] | • `data.field1`<br>• `data.field2` | • Tap: [action]<br>• Swipe: [action] | • Default<br>• Loading<br>• Error |
| | | | | |
| | | | | |

### Conditional Elements

| Condition | Element | Behavior |
|-----------|---------|----------|
| [When shown] | [Component name] | [What happens] |
| | | |

### Navigation Flows

| Trigger | Destination | Data Passed |
|---------|-------------|-------------|
| [User action] | [Screen/Modal] | [Parameters] |
| | | |
```

---

# PART 2: MASTER RESKIN SPECIFICATION TEMPLATE

## Overview

This template provides the exact technical specification for reskinning any component identified in the audit. Every specification MUST map directly to tokens and components defined in `DESIGN_GUIDE_EXTENDED.md`.

## Master Component Reskin Template

```markdown
---
### **[Component Name]**
**Location:** `[Screen Name]`  
**File:** `[path/to/file.tsx]`  
**Objective:** Replace the legacy UI component with its Design System equivalent while maintaining 1:1 functional parity.

#### **1. Design System Mapping**

| Element | Current State (Description) | New Specification (from DESIGN_GUIDE_EXTENDED.md) |
|---------|-----------------------------|----------------------------------------------------|
| **Container** | [Current implementation] | `Component: [DS Component]`<br>`Props: { borderRadius: '[token]', shadow: '[token]', padding: '[token]' }` |
| **Typography - Primary** | [Current text style] | `Typography: [DS Typography Token]`<br>`Color: [DS Color Token]`<br>`Size: [exact px]`<br>`Weight: [number]` |
| **Typography - Secondary** | [Current text style] | `Typography: [DS Typography Token]`<br>`Color: [DS Color Token]` |
| **Icons** | [Current icon] | `Icon: [icon-name]`<br>`Size: [24px/20px/16px]`<br>`Color: [DS Color Token]` |
| **Primary Action** | [Current button] | `Component: [Primary/Secondary Button]`<br>`Variant: [filled/outline]`<br>`Size: [large/medium/small]` |
| **Interactive States** | [Current states] | `Default: [specification]`<br>`Hover: [specification]`<br>`Pressed: [specification]`<br>`Disabled: [specification]` |
| **Spacing** | [Current spacing] | `Margin: [4pt grid value]`<br>`Padding: [4pt grid value]`<br>`Gap: [4pt grid value]` |
| **Layout** | [Current layout] | `Display: [flex/grid]`<br>`Direction: [row/column]`<br>`Alignment: [center/start/end]` |

#### **2. Color Token Mapping**

| Use Case | Current Color | New Design System Token |
|----------|--------------|-------------------------|
| Primary CTA | [hex value] | `DS.colors.primaryOrange` (#FF8C00) |
| Text Primary | [hex value] | `DS.colors.textDark` (#000000) |
| Text Secondary | [hex value] | `DS.colors.textGray` (#808080) |
| Border | [hex value] | `DS.colors.border` (#E5E5E5) |
| Background | [hex value] | `DS.colors.surface` (#FFFFFF) |

#### **3. Responsive Behavior**

| Breakpoint | Current Behavior | New Specification |
|------------|------------------|-------------------|
| Mobile (default) | [description] | [specification] |
| Tablet | [if applicable] | [specification] |

#### **4. Animation Specifications**

| Trigger | Current Animation | New Specification |
|---------|------------------|-------------------|
| On Mount | [description] | `Duration: [ms]`, `Easing: [curve]` |
| On Interaction | [description] | `Duration: [ms]`, `Easing: [curve]` |

#### **5. Accessibility Requirements**

- **Touch Target:** Minimum 44x44pt
- **Color Contrast:** WCAG AA compliant
- **Screen Reader:** Label = "[text]"
- **Focus State:** [specification]

#### **6. Implementation Notes**

```typescript
// Example implementation structure
const styles = StyleSheet.create({
  container: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.md,
    padding: DS.spacing.md,
    ...DS.shadows.sm,
  },
  text: {
    ...DS.typography.body,
    color: DS.colors.textDark,
  },
});
```

#### **7. Functional Preservation Checklist**

- [ ] All user interactions remain identical
- [ ] All data fields continue to display
- [ ] Navigation flows unchanged
- [ ] Loading states preserved
- [ ] Error states preserved
- [ ] Empty states preserved
- [ ] No new API calls required
- [ ] No backend changes needed

#### **8. QA Validation Points**

1. Visual consistency with design system
2. All interactions function as before
3. Data displays correctly in all states
4. Performance metrics unchanged or improved
5. Accessibility standards maintained

---
```

## Component-Specific Templates

### Card Component Template

```markdown
### **[Card Type] Card**
**Applies to:** All card-based list items

| Element | Specification |
|---------|--------------|
| **Container** | `borderRadius: 12px`, `padding: 16px`, `shadow: 0px 1px 3px rgba(0,0,0,0.1)` |
| **Image** | `aspectRatio: 1.5`, `borderRadius: 8px` |
| **Title** | `Typography: H3`, `Color: Absolute Black`, `numberOfLines: 2` |
| **Subtitle** | `Typography: Body`, `Color: Context Gray` |
| **Actions** | `flexDirection: row`, `gap: 8px`, `marginTop: 12px` |
```

### Button Component Template

```markdown
### **Button - [Type]**

| Property | Primary CTA | Secondary CTA | Text Button |
|----------|------------|---------------|-------------|
| **Background** | `#FF8C00` | `transparent` | `transparent` |
| **Text Color** | `#FFFFFF` | `#FF8C00` | `#FF8C00` |
| **Border** | `none` | `1px solid #FF8C00` | `none` |
| **Padding** | `12px 24px` | `12px 24px` | `8px 16px` |
| **Border Radius** | `24px` | `24px` | `0` |
| **Min Height** | `44px` | `44px` | `44px` |
```

### Form Input Template

```markdown
### **Input Field - [Type]**

| State | Border Color | Background | Text Color |
|-------|-------------|------------|------------|
| **Default** | `#E5E5E5` | `#FFFFFF` | `#000000` |
| **Focused** | `#FF8C00` | `#FFFFFF` | `#000000` |
| **Error** | `#DC2626` | `#FEF2F2` | `#000000` |
| **Disabled** | `#E5E5E5` | `#F5F5F5` | `#808080` |
```

---

# PART 3: PROJECT WORKFLOW GUIDE

## Phase 1: Audit (Week 1-2)

1. **Create Screen Inventory**
   - List all screens in the application
   - Prioritize by user traffic and business impact
   - Assign screens to team members

2. **Conduct Screen Audits**
   - Create a new file: `audits/[screen-name]-audit.md`
   - Use the Functional Inventory Template from Part 1
   - Complete one screen at a time, thoroughly
   - Review with product owner for completeness

3. **Compile Master Audit**
   - Combine all screen audits into `MASTER_AUDIT.md`
   - Identify common components across screens
   - Create component frequency matrix

## Phase 2: Specification (Week 2-3)

4. **Generate Reskin Specifications**
   - For each audited component, create a reskin spec using Part 2 template
   - File naming: `specs/[screen-name]-reskin-spec.md`
   - Group common components into shared specifications

5. **Technical Review**
   - Engineering reviews all specifications for feasibility
   - Design reviews for design system compliance
   - Product reviews for functional preservation

6. **Create Implementation Plan**
   - Priority 1: High-traffic screens (Home, Restaurant Detail, Profile)
   - Priority 2: Core flows (Save, Post, Search)
   - Priority 3: Settings and auxiliary screens

## Phase 3: Implementation (Week 3-6)

7. **Component Development**
   - Build shared components first
   - Create a `components/design-system/` directory
   - Implement one component at a time with full testing

8. **Screen-by-Screen Reskin**
   - Follow specifications exactly
   - Create feature branches: `reskin/[screen-name]`
   - Include before/after screenshots in PR

9. **Quality Assurance**
   - Visual QA against specifications
   - Functional regression testing
   - Performance testing
   - Accessibility audit

## Phase 4: Rollout (Week 6-7)

10. **Staged Deployment**
    - Internal testing build
    - Beta user group (5%)
    - Gradual rollout (25%, 50%, 100%)

11. **Monitoring**
    - Track crash rates
    - Monitor user engagement metrics
    - Collect user feedback
    - Document any issues for hotfix

12. **Documentation**
    - Update component library documentation
    - Create migration guide for future development
    - Archive old component code

## Success Criteria

- ✅ 100% design system compliance
- ✅ 0% functionality regression
- ✅ Performance metrics maintained or improved
- ✅ Accessibility standards met (WCAG AA)
- ✅ No increase in crash rate
- ✅ Positive user sentiment

## Governance

**Design System Compliance Officer:** Reviews all specs for design system adherence  
**Technical Lead:** Approves implementation approach  
**QA Lead:** Validates functional preservation  
**Product Owner:** Signs off on each completed screen  

## Tools & Resources

- **Design Tokens:** `docs/DESIGN_GUIDE_EXTENDED.md`
- **Audit Templates:** Use Part 1 of this document
- **Reskin Templates:** Use Part 2 of this document
- **Component Library:** `components/design-system/`
- **Testing Suite:** `__tests__/reskin/`

## Critical Constraints (MUST NOT VIOLATE)

1. **NO NEW FEATURES** - This is a reskin only
2. **NO BACKEND CHANGES** - API contracts must remain identical
3. **NO DATA SCHEMA CHANGES** - Work with existing data structures
4. **NO NAVIGATION CHANGES** - Maintain current user flows
5. **NO FUNCTIONALITY REMOVAL** - Every current feature must work

## Appendix: Quick Reference

### Design System Colors
- **Primary Orange:** `#FF8C00` (CTAs only)
- **Absolute Black:** `#000000` (primary text)
- **Context Gray:** `#808080` (secondary text)
- **Border:** `#E5E5E5`
- **Surface:** `#FFFFFF`

### Typography Scale
- **H1:** 28px, weight 700
- **H2:** 20px, weight 600
- **H3:** 16px, weight 600
- **Body:** 14px, weight 400
- **Metadata:** 12px, weight 400

### Spacing Scale (4pt grid)
- **xs:** 4px
- **sm:** 8px
- **md:** 12px
- **lg:** 16px
- **xl:** 20px
- **xxl:** 24px

### Shadow Tokens
- **sm:** `0px 1px 3px rgba(0, 0, 0, 0.1)`
- **md:** `0px 2px 8px rgba(0, 0, 0, 0.15)`
- **lg:** `0px 4px 16px rgba(0, 0, 0, 0.2)`

---

**END OF FRAMEWORK DOCUMENT**

*This framework is version-controlled and should be updated as the design system evolves.*