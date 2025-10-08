# The Troodie Design System v3.0 - Extended Specifications
*As Lead Product Designer, this is the complete source of truth for all screen designs*

## Extension Notice
This document extends DESIGN_GUIDE.md with critical specifications discovered through forensic analysis of existing screens. Every specification here is mandatory.

## 5.0 Advanced Component Specifications

### 5.1 Navigation Components

#### 5.1.1 Top Navigation Bar
* **Height:** 56px fixed
* **Background:** Pure White (#FFFFFF)
* **Border:** 1px bottom border, #F0F0F0
* **Content Layout:**
  - Left: Back arrow (24x24px) OR Screen title (20pt Semi-Bold)
  - Center: Optional title (16pt Regular)
  - Right: Action buttons (24x24px icons) with 12px spacing

#### 5.1.2 Tab Navigation
* **Specifications:**
  - Container: 48px height, Pure White background
  - Tab items: Equal width distribution
  - Active indicator: 2px bottom border, Troodie Orange (#FF8C00)
  - Text: 14pt Semi-Bold, Context Gray when inactive, Absolute Black when active
  - Icons: 20x20px, same color rules as text

#### 5.1.3 Pill Tab Selector
* **Container:** 36px height, #F5F5F5 background, 18px corner radius
* **Active Pill:** Pure White background, 16px corner radius, subtle shadow
* **Inactive:** Transparent background
* **Text:** 14pt Semi-Bold, Absolute Black
* **Padding:** 12px horizontal, centered vertically

### 5.2 Content Components

#### 5.2.1 Story Circles
* **Dimensions:** 64x64px circle
* **Border:** 2px dashed #FFD700 for "Add", 2px solid Troodie Orange for active
* **Avatar:** 56x56px centered image, circular crop
* **Label:** 12pt Regular below, Context Gray, truncated with ellipsis
* **Spacing:** 16px between centers
* **Container:** Horizontal scroll, no scrollbar visible

#### 5.2.2 Restaurant Cards
* **Large Card (Featured):**
  - Dimensions: Full width minus 32px margins, 240px height
  - Image: Full bleed with gradient overlay (bottom 40%)
  - Corner radius: 12px
  - Content overlay: White text on gradient
  - Restaurant name: 18pt Semi-Bold
  - Metadata: 14pt Regular (rating, price, distance)

* **Small Card (Grid):**
  - Dimensions: (Screen width - 48px) / 2, 180px height
  - Image: 16:9 aspect ratio top section
  - Text container: White background, 12px padding
  - Name: 14pt Semi-Bold, single line truncated
  - Details: 12pt Regular, Context Gray

#### 5.2.3 Activity Feed Items
* **Structure:**
  - Container: Full width card, variable height
  - Header: 48px height with avatar and user info
  - Content: Variable based on activity type
  - Footer: 44px height with action buttons

* **Header Anatomy:**
  - Avatar: 40x40px circular image
  - Name: 14pt Semi-Bold, Absolute Black
  - Action text: 14pt Regular, Context Gray
  - Timestamp: 12pt Regular, Context Gray
  - Location: 12pt Regular, Context Gray

* **Activity Types:**
  1. **Posted a place:** Image + details + action bar
  2. **Left a review:** Rating stars + text + helpful button
  3. **Added to board:** Mini previews (3 max) + board name
  4. **Created board:** Board cover + title + follow button
  5. **Commented:** Comment text + context link

#### 5.2.4 Onboarding Cards
* **Dimensions:** Full width minus 32px, auto height
* **Background:** #FFF9E6 (Light yellow tint)
* **Border:** None, rely on background color
* **Corner radius:** 12px
* **Padding:** 16px all sides
* **Dismiss:** X button, 20x20px, top right, Context Gray

### 5.3 Interactive Elements

#### 5.3.1 Action Buttons in Feed
* **Save Button:**
  - Default: Troodie Orange background, white bookmark icon
  - Saved: White background, 1px orange border, orange bookmark
  - Size: 80px width, 32px height, 16px corner radius
  - Text: 14pt Semi-Bold

* **Social Actions:**
  - Icons: 20x20px line icons
  - Text: 14pt Regular, Context Gray
  - Spacing: 16px between action groups
  - Active state: Icon becomes Troodie Orange

#### 5.3.2 Distance/Status Pills
* **Dimensions:** Auto width, 24px height
* **Background:** #F5F5F5
* **Corner radius:** 12px
* **Padding:** 8px horizontal
* **Text:** 12pt Semi-Bold, Absolute Black
* **Icon:** 16x16px, 4px right margin

#### 5.3.3 Rating Display
* **Star Icons:** 16x16px, filled #FFC107
* **Empty Stars:** Same size, #E0E0E0 fill
* **Text:** 14pt Semi-Bold for number, 12pt Regular for count

### 5.4 Information Patterns

#### 5.4.1 Metadata Line Pattern
Format: `[Rating] · [Price] · [Distance] · [Category]`
* Separator: " · " (space, middle dot, space)
* Each element: 12pt Regular, Context Gray
* Icons inline: 12x12px, 4px right margin

#### 5.4.2 User Attribution Pattern
Format: `[Name] [action] [time] · [location]`
* Name: 14pt Semi-Bold
* Action: 14pt Regular, Context Gray
* Time/Location: 12pt Regular, Context Gray

#### 5.4.3 Engagement Metrics Pattern
Format: `[Icon] [Count]` with 24px spacing between groups
* Icon: 20x20px
* Count: 14pt Regular, Context Gray
* Active: Both icon and text become Troodie Orange

## 6.0 Screen Composition Patterns

### 6.1 Feed Screen Architecture
```
┌─────────────────────────┐
│    Navigation Bar       │ 56px
├─────────────────────────┤
│    Tab Selector         │ 48px
├─────────────────────────┤
│    Onboarding Card      │ Variable (dismissible)
├─────────────────────────┤
│    Stories Row          │ 96px
├─────────────────────────┤
│    Section Header       │ 44px
├─────────────────────────┤
│    Content Cards        │ Variable
│    (16px spacing)       │
└─────────────────────────┘
```

### 6.2 Detail Screen Architecture
```
┌─────────────────────────┐
│    Navigation Bar       │ 56px
├─────────────────────────┤
│    Hero Image           │ 240px
├─────────────────────────┤
│    Quick Actions        │ 64px
├─────────────────────────┤
│    Information Sections │ Variable
│    (24px spacing)       │
└─────────────────────────┘
```

### 6.3 List Screen Architecture
```
┌─────────────────────────┐
│    Navigation Bar       │ 56px
├─────────────────────────┤
│    Filter Pills         │ 48px (horizontal scroll)
├─────────────────────────┤
│    List Items           │ Variable
│    (1px separator)      │
└─────────────────────────┘
```

## 7.0 Motion & Micro-interactions

### 7.1 Transition Specifications
* **Screen transitions:** 300ms, ease-in-out
* **Card appearances:** 250ms, ease-out, staggered by 50ms
* **Button presses:** Scale to 0.95, 100ms
* **Tab switches:** 200ms slide animation
* **Loading states:** Skeleton screens with shimmer animation

### 7.2 Gesture Responses
* **Pull to refresh:** 80px threshold, spring animation
* **Horizontal swipe:** 40% threshold for action trigger
* **Long press:** 500ms hold, haptic feedback
* **Double tap:** 300ms window, zoom or like action

### 7.3 Feedback Patterns
* **Save action:** Icon morph + color transition + subtle bounce
* **Follow action:** Button state change + checkmark appearance
* **Delete action:** Fade out + collapse animation
* **Error state:** Shake animation + red highlight

## 8.0 Content Strategy

### 8.1 Empty States
* **Illustration:** Centered, 120x120px
* **Title:** 18pt Semi-Bold, Absolute Black
* **Description:** 14pt Regular, Context Gray
* **CTA Button:** Primary action button style
* **Padding:** 48px vertical spacing

### 8.2 Loading States
* **Skeleton screens:** Match exact component dimensions
* **Shimmer effect:** Left to right, 1.5s duration
* **Progressive loading:** Headers → Images → Content

### 8.3 Error Handling
* **Inline errors:** Red text below field, 12pt Regular
* **Toast messages:** Bottom position, 3s duration
* **Error cards:** Red accent border, icon + message

## 9.0 Responsive Behaviors

### 9.1 Screen Size Adaptations
* **Small (320-374px):** Single column, reduced padding
* **Medium (375-413px):** Standard layouts (baseline)
* **Large (414px+):** Increased spacing, larger touch targets

### 9.2 Orientation Changes
* **Portrait:** Default layouts
* **Landscape:** Grid views expand to 3 columns

### 9.3 Dynamic Type Support
* **Scaling:** Support up to 200% text size
* **Layout reflow:** Automatic height adjustments
* **Truncation rules:** Maintain single lines where specified

## 10.0 Platform-Specific Considerations

### 10.1 iOS Specifications
* **Safe areas:** Respect notch and home indicator
* **Haptics:** Use UIImpactFeedback for actions
* **Gestures:** Follow iOS gesture priority rules

### 10.2 Android Specifications
* **Navigation:** Support both gesture and button navigation
* **Material compliance:** Respect elevation and ripple effects
* **Back button:** Predictable navigation stack behavior

## 11.0 Component States Matrix

| Component | Default | Hover | Pressed | Disabled | Active | Loading |
|-----------|---------|-------|---------|----------|--------|---------|
| Primary Button | Orange BG | 90% opacity | 85% opacity | Gray BG | N/A | Spinner |
| Card | White BG | 2px shadow | Scale 0.98 | 50% opacity | Orange border | Skeleton |
| Tab | Gray text | Black text | Scale 0.95 | 30% opacity | Orange underline | N/A |
| Input Field | Gray border | Black border | Orange border | Gray BG | Orange border | N/A |

## 12.0 Design Token Reference

```scss
// Spacing
$space-xs: 4px;
$space-sm: 8px;
$space-md: 12px;
$space-lg: 16px;
$space-xl: 24px;
$space-xxl: 32px;
$space-xxxl: 48px;

// Border Radius
$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;
$radius-pill: 24px;
$radius-circle: 50%;

// Shadows
$shadow-sm: 0px 1px 3px rgba(0, 0, 0, 0.1);
$shadow-md: 0px 2px 8px rgba(0, 0, 0, 0.15);
$shadow-lg: 0px 4px 16px rgba(0, 0, 0, 0.2);

// Z-index
$z-base: 0;
$z-dropdown: 100;
$z-sticky: 200;
$z-overlay: 300;
$z-modal: 400;
$z-toast: 500;
```

## 13.0 Quality Checklist

Before any screen is considered complete, verify:

- [ ] All colors match the defined palette exactly
- [ ] Typography follows the scale without deviation
- [ ] Spacing uses only defined tokens
- [ ] Touch targets meet 44x44px minimum
- [ ] Component states are fully defined
- [ ] Animations follow timing specifications
- [ ] Content follows information patterns
- [ ] Accessibility standards are met
- [ ] Platform guidelines are respected
- [ ] Edge cases have defined behaviors

## 14.0 Design Principles for New Screens

When creating new screens, follow this hierarchy:

1. **Consistency** - Match existing patterns exactly
2. **Clarity** - Information hierarchy must be obvious
3. **Efficiency** - Minimize taps to complete actions
4. **Delight** - Micro-interactions enhance experience
5. **Accessibility** - Usable by everyone

Remember: **Every pixel has been considered. Every deviation weakens the system.**

---

*This extended guide represents the complete design system as observed and mandated. Any new screen must demonstrate perfect adherence to these specifications.*

*- Alex, Lead Product Designer*