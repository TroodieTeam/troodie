# The Troodie Design System v2.0 - Source of Truth

This system is organized into foundational principles, a visual system, a component library, and interaction guidelines. Every new screen must conform to these specifications.

## 1.0 Foundational Principles

### 1.1 Design Philosophy
* **Clarity:** The interface must be immediately understandable. We achieve this through a card-based layout, generous white space, and a rigid typographic hierarchy. Users never hunt for information.
* **Approachability:** The app feels like a helpful friend. This is expressed through 8pt rounded corners, a warm and energetic accent color, and simple, universally understood iconography. The feeling is one of welcoming utility.
* **Purposeful Aesthetics:** Every visual choice serves a function. From a color shade to a shadow depth, design elements are tools that guide interaction and improve usability.

### 1.2 Brand Personality
* **Energetic & Vibrant:** The app is about discovery and excitement.
* **Trustworthy & Reliable:** Users trust our recommendations and feel safe on our platform.
* **Effortless & Intuitive:** The experience is smooth and frustration-free.

## 2.0 Visual System

### 2.1 Color System
The palette is semantic. Each color has a job.

* **Primary Palette**
    * **Action & Focus (`#FFAD27` - "Troodie Orange"):**
        * **Usage:** Used *exclusively* for primary calls-to-action (CTAs), selected navigation states, and interactive highlights.
        * **Psychology:** This vibrant orange leverages the Isolation Effect, making key actions impossible to miss. Its sparing use preserves its power.
        * **Accessibility:** Must be used on white or dark backgrounds that provide a minimum 3:1 contrast ratio.

* **Neutral Palette**
    * **Text & Key Elements (`#000000` - "Absolute Black"):**
        * **Usage:** All primary text, headlines, and static icons.
        * **Psychology:** Provides maximum legibility and a clean, modern feel.
    * **Secondary Text & Metadata (`#808080` - "Context Gray"):**
        * **Usage:** Usernames, timestamps, locations, captions, and helper text.
        * **Psychology:** Reduces visual noise, allowing primary content to stand out.
    * **Card Background (`#FFFFFF` - "Pure White"):**
        * **Usage:** The background for all content cards.
    * **Screen Background (`#F5F5F5` - "Light Gray"):**
        * **Usage:** The main screen background that sits behind the cards, creating a subtle sense of depth.

* **Semantic Palette (Feedback)**
    * **Success (`#4CAF50` - "Success Green"):** For positive feedback, like saving a streak.
    * **Warning & Ratings (`#FFC107` - "Warning Gold"):** For star ratings and non-critical alerts.

### 2.2 Typographic Scale
Built on a 4pt grid. The font family is a modern, geometric sans-serif (e.g., Poppins, Rubik).

| Role          | Font Properties                | Color           | Usage Context                                     |
|---------------|--------------------------------|-----------------|---------------------------------------------------|
| **Display (H1)** | 28pt Bold, 36pt Line Height    | Absolute Black  | Primary screen titles ONLY (e.g., "Discover").    |
| **Headline (H2)** | 20pt Semi-Bold, 28pt Line H. | Absolute Black  | Section headers within a page (e.g., "My Activity"). |
| **Body Text** | 16pt Regular, 24pt Line H.     | Absolute Black  | All primary content, descriptions, comments.      |
| **Metadata** | 12pt Regular, 16pt Line H.     | Context Gray    | Timestamps, locations, usernames, counts.         |
| **Button/Tab** | 14pt Semi-Bold, ALL CAPS       | Varies by state | All interactive button and tab labels.            |

### 2.3 Spacing & Grid System
* **Base Unit:** 4pt. All margins, padding, and positioning must be a multiple of 4.
* **Spacing Scale:** Use tokens: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`.
* **Screen Margins:** All screens have a consistent `16px` horizontal margin.
* **Component Spacing:** The vertical space between stacked cards and components is `16px`.

### 2.4 Iconography
* **Library:** Custom, minimalist line icons.
* **Specifications:** 1pt stroke weight. 24x24pt bounding box.
* **Coloring:** Icons are `Absolute Black` by default. They are ONLY colored `Troodie Orange` when they are part of a primary action button or are in a selected/active state.

### 2.5 Elevation
* **Standard Card Shadow:** `box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1)`. This is the only shadow style used for cards.

## 3.0 Component Library

### 3.1 Cards
* **Anatomy:** A container with a `Pure White` background.
* **Specifications:** `8pt` corner radius. The standard card shadow. `16px` internal padding on all sides.
* **Usage:** The fundamental container for all dynamic content in the app.

### 3.2 Buttons
* **Primary Action Button (Circular):**
    * **Anatomy:** A circular container with a centered icon.
    * **Specs:** 48x48pt container. Solid `Troodie Orange` background. 24x24pt white icon (1pt stroke).
    * **States:** `Pressed` state has 85% opacity. `Disabled` state is grayed out.
    * **Use Case:** For the single most important action on a card, e.g., "Save".

* **Secondary Action Button (Outlined):**
    * **Anatomy:** A rectangular container with a text label.
    * **Specs:** Transparent background. 1pt `Absolute Black` border. 14pt Semi-Bold ALL CAPS black text label. `8px` vertical padding, `16px` horizontal padding. `8pt` corner radius.
    * **Use Case:** For important but secondary actions, e.g., "FOLLOW".

* **Tertiary Action Button (Ghost/Text Link):**
    * **Anatomy:** Text label only.
    * **Specs:** 14pt Semi-Bold `Absolute Black` text. No container or border.
    * **Use Case:** Low-prominence actions like "View profile" or "Cancel".

### 3.3 Image Overlays
* **Rule:** Any image with UI elements (text, icons) on top MUST have a protective gradient.
* **Specification:** A linear gradient overlay from bottom to top: `rgba(0,0,0,0.5)` to `rgba(0,0,0,0)`.
* **Text on Images:** Text placed on this gradient MUST be white.

## 4.0 Accessibility & Interaction

* **Touch Targets:** All interactive elements must have a minimum touch target of 44x44pt.
* **Stateful Components:** All interactive elements must have defined `Default`, `Pressed`, and `Disabled` states.
* **Animations:** Motion should be purposeful. Use a standard `ease-out` curve with a duration of `250ms` for UI transitions.