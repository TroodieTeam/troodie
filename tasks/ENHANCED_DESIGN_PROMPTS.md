# Troodie Enhanced Design Prompts with Testing Variants

## App Context & Background

### What is Troodie?
**Troodie is a social food discovery app that helps users save, organize, and share restaurant experiences with friends.** Think of it as Pinterest meets Yelp with a focus on personal curation and social recommendations rather than public reviews.

### Core Value Proposition
**"Your Personal Food Journey"** - Transform restaurant discovery from overwhelming choice into a curated, social experience based on trusted recommendations and personal taste.

### Target Audience
**Primary Users (Ages 25-40)**:
- Urban professionals who dine out 2-3 times per week
- Food enthusiasts who value experiences over just meals
- Social diners who trust friends' recommendations over anonymous reviews
- Organized planners who save restaurants for different occasions

**Secondary Users**:
- Food bloggers and influencers building curated collections
- Groups planning dining experiences together
- Couples maintaining date night lists
- Travelers discovering local spots through locals

### Key Problems We Solve
1. **Decision Fatigue**: Too many restaurant options with unreliable reviews
2. **Lost Recommendations**: Friends' suggestions forgotten in text messages
3. **Context Loss**: Saved restaurants without remembering why they were saved
4. **Social Discovery**: Hard to see what friends actually enjoy
5. **Organization Chaos**: Screenshots and notes scattered everywhere

### Core Features

#### 1. Smart Saving with Context
- Save restaurants with intention (Want to Try, Been There, Love It)
- Add notes and tags for context
- Organize into themed boards/collections
- Set reminders for special occasions

#### 2. Social Food Network
- Follow friends and food influencers
- See real-time activity of where friends are eating
- Get notified when friends try your recommendations
- Share collections and collaborate on lists

#### 3. Personalized Discovery
- AI-powered recommendations based on taste profile
- Time and location-aware suggestions
- Trending spots among your social circle
- Curated collections from the community

#### 4. Visual Food Journey
- Track your dining history over time
- See your evolving taste profile
- Achievement system for trying new cuisines
- Shareable food story/personality

### Competitive Differentiation

**vs. Yelp**: 
- Personal curation over public reviews
- Friend recommendations over stranger opinions
- Organized collections vs endless listings

**vs. Google Maps**: 
- Social layer and friend activity
- Intentional saving with context
- Food-specific features and discovery

**vs. Instagram**: 
- Actionable saves with restaurant details
- Organized collections vs infinite scroll
- Purpose-built for restaurant discovery

**vs. OpenTable/Resy**: 
- Discovery and curation, not just booking
- Social recommendations layer
- Personal food journey tracking

### Current App Structure

```
Main Navigation (5 tabs):
├── Discover - Personalized feed with friend activity
├── Nearby - Map-based local discovery
├── [+] - Quick actions (save, review, share)
├── Saved - Collections and boards
└── You - Profile and food journey

Key Screens:
- Onboarding (3-step progressive)
- Restaurant Detail (comprehensive info)
- Search & Filters (intelligent discovery)
- Activity Feed (friend updates)
- Collection Management (boards/lists)
```

### Design Goals for Redesign

1. **Reduce Cognitive Load**: Apply Miller's 7±2 rule throughout
2. **Increase Social Engagement**: Make friend activity more prominent
3. **Improve Save Context**: Capture intention and context easily
4. **Enhance Discovery**: Personalized, time-aware recommendations
5. **Build Identity**: Food journey and personality development

### Success Metrics

**User Activation**:
- First save within 3 minutes
- 3+ restaurants saved in first session
- Friend connection in first week

**Engagement**:
- Weekly active usage > 3 times
- Save-to-visit conversion > 25%
- Social interactions per session > 2

**Retention**:
- Day 7 retention > 40%
- Month 1 retention > 25%
- Month 6 retention > 15%

### Brand Personality

**Voice & Tone**:
- Friendly and enthusiastic about food
- Knowledgeable but not pretentious
- Encouraging exploration and discovery
- Celebrating personal taste, not judging

**Visual Identity**:
- Warm, appetite-stimulating colors (golden orange primary #FFAD27)
- Clean, modern, and uncluttered
- Food-forward imagery
- Delightful micro-interactions

### Technical Context

**Platform**: React Native (iOS & Android)
**Backend**: Supabase (PostgreSQL + Realtime)
**State Management**: React Context
**Navigation**: Expo Router
**Key Libraries**: 
- React Native Maps (location features)
- React Native Reanimated (animations)
- AsyncStorage (local data)

### Current Pain Points to Address

1. **Onboarding**: Generic, doesn't establish clear value
2. **Home Feed**: Static, not personalized enough
3. **Save Flow**: Binary (saved/not saved) lacks context
4. **Discovery**: Overwhelming choices without guidance
5. **Social**: Friend activity buried, not prominent
6. **Profile**: Stats-focused, lacks narrative/identity

### Design Constraints

1. **Performance**: Must load in < 3 seconds
2. **Accessibility**: WCAG 2.1 AAA compliance required
3. **Offline**: Core features must work offline
4. **Data**: Minimize data usage for emerging markets
5. **Battery**: Optimize for battery efficiency

### Cultural Considerations

**Global Adaptability**:
- Support for RTL languages
- Dietary restriction accommodations
- Local cuisine categorizations
- Regional social norms
- Price point relativity

---

## Global Design System & Principles

### Core Design Principles (Include in Every Screen)
```
1. Cognitive Load Management: Apply Miller's 7±2 rule
2. Social Proof Hierarchy: Friends > Local > General
3. Progressive Disclosure: Layer information by importance
4. Emotional Design: Context-aware, delightful interactions
5. Accessibility First: WCAG 2.1 AAA compliance
```

### Brand Color System (Use Across All Screens)
```
Primary Colors:
- Orange (Primary): #FFAD27 - CTAs, active states
- Orange Light: #FFC04D - Hover states
- Orange Dark: #E69A1F - Pressed states

Secondary Colors:
- Blue: #4A90E2 - Links, info
- Green: #52C41A - Success, positive
- Yellow: #FFD93D - Warnings, ratings
- Red: #F5222D - Errors, negative

Neutral Colors:
- Text Primary: #262626
- Text Secondary: #8C8C8C
- Text Light: #BFBFBF
- Background: #FFFFFF
- Surface: #FAFAFA
- Border: #E8E8E8
```

### Typography System
```
Headings:
- H1: 28px/1.2 - Bold (Screen titles)
- H2: 24px/1.3 - Semibold (Section headers)
- H3: 20px/1.4 - Semibold (Card titles)

Body:
- Body: 16px/1.5 - Regular (Main content)
- Caption: 14px/1.4 - Regular (Supporting text)
- Small: 12px/1.3 - Regular (Metadata)
```

---

## 1. ONBOARDING SCREENS

### User Scenario
**Sarah, 28, Marketing Manager**
"I just downloaded Troodie because my friend recommended it. I want to quickly see what restaurants are around me without signing up first. I'm looking for a quick lunch spot near my office."

### Navigation Bar
```
No navigation bar - Full screen experience
[Skip →] button in top-right corner
Progress dots at bottom: ● ● ○ ○
```

### Screen 1.1: Welcome & Intent Discovery

#### OPTION A: Question-Based Approach
```
┌─────────────────────────┐
│  [Skip →]               │
│                         │
│     🍽️                  │ (Animated pulse)
│                         │
│  What brings you to     │ Font: H1, #262626
│  Troodie today?         │
│                         │
│ ┌─────────────────────┐ │
│ │ 🔍 Discover new     │ │ BG: #FFAD27
│ │    restaurants      │ │ Text: White, 16px
│ └─────────────────────┘ │ Height: 56px
│                         │ Radius: 12px
│ ┌─────────────────────┐ │
│ │ 📱 Save & organize  │ │ BG: #FAFAFA
│ │    my favorites     │ │ Text: #262626
│ └─────────────────────┘ │ Border: 1px #E8E8E8
│                         │
│ ┌─────────────────────┐ │
│ │ 👥 See what friends │ │
│ │    are eating       │ │
│ └─────────────────────┘ │
│                         │
│  ● ● ○ ○                │ Progress: #FFAD27/#E8E8E8
└─────────────────────────┘

Design Principles Applied:
- Miller's Rule: 3 clear options only
- Progressive Disclosure: Skip option available
- Emotional: Welcoming question format
```

#### OPTION B: Value-First Approach
```
┌─────────────────────────┐
│                         │
│  23 great spots near    │ Font: H2, #262626
│  you right now 📍       │
│                         │
│ ┌─────────────────────┐ │ Preview cards
│ │ [Blurred card 1]    │ │ with overlay
│ │ [Blurred card 2]    │ │ "Enable location
│ │ [Blurred card 3]    │ │  to see details"
│ └─────────────────────┘ │
│                         │
│  Join 50,000+ foodies   │ Font: Body, #8C8C8C
│  in your city           │
│                         │
│ ┌─────────────────────┐ │
│ │   Get Started       │ │ BG: #FFAD27
│ └─────────────────────┘ │ Text: White
│                         │
│ ┌─────────────────────┐ │
│ │   Browse First      │ │ BG: Transparent
│ └─────────────────────┘ │ Text: #4A90E2
└─────────────────────────┘

Design Principles Applied:
- Social Proof: "50,000+ foodies"
- Loss Aversion: Show what they're missing
- Immediate Value: Restaurant preview
```

#### OPTION C: Personalization-First Approach
```
┌─────────────────────────┐
│                         │
│  Let's find your        │ Font: H1, #262626
│  perfect spot           │
│                         │
│  I'm looking for...     │ Font: Caption, #8C8C8C
│                         │
│ ┌─────────────────────┐ │
│ │ 🍕 Quick lunch      │ │ Chip style
│ └─────────────────────┘ │ BG: #FAFAFA
│                         │ Border: 2px #FFAD27
│ ┌─────────────────────┐ │ (when selected)
│ │ ☕ Coffee & work    │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 🍷 Date night      │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 👥 Group dinner    │ │
│ └─────────────────────┘ │
│                         │
│ [Show me options →]     │ BG: #FFAD27
└─────────────────────────┘

Design Principles Applied:
- Context Awareness: Time-based suggestions
- Cognitive Ease: Visual icons for quick scanning
- Personalization: Immediate preference capture
```

---

## 2. HOME/DISCOVER SCREEN

### User Scenario
**Mike, 35, Software Engineer**
"It's 6 PM and I just opened Troodie to find dinner options. I want to see what my friends have been trying lately and find something new but not too far from home."

### Navigation Bar
```
┌─────────────────────────┐
│ Discover │ Nearby │ [+] │ Saved │ You │
└─────────────────────────┘
Active: #FFAD27 icon/text
Inactive: #8C8C8C icon, #262626 text
Background: #FFFFFF
Border-top: 1px #E8E8E8
```

### Screen 2.1: Dynamic Feed

#### OPTION A: Story-Based Feed
```
┌─────────────────────────┐
│ Good evening, Mike 🌙   │ H2, #262626
│ 📍 East Village         │ Caption, #8C8C8C
│                         │
│ ┌─────────────────────┐ │ Stories row
│ │ [Avatar][Avatar][+] │ │ 64px circles
│ │  Lisa   John   You  │ │ Border: 2px #FFAD27
│ └─────────────────────┘ │ (for unseen)
│                         │
│ Friends are loving 👥   │ H3, #262626
│ ┌─────────────────────┐ │
│ │ [Restaurant card]    │ │ Card design:
│ │ Italian Kitchen      │ │ - Image: 16:9
│ │ ⭐4.8 · $$ · 0.3mi   │ │ - Shadow: 0 4px 8px
│ │ "3 friends here"     │ │ - Radius: 12px
│ └─────────────────────┘ │ - Padding: 16px
│                         │
│ Perfect for tonight 🕐  │
│ ┌─────────────────────┐ │
│ │ [Restaurant card]    │ │
│ └─────────────────────┘ │
└─────────────────────────┘

Design Principles Applied:
- Social Proof: Friends' stories prominent
- Temporal Context: Evening greeting
- Visual Hierarchy: Stories > Friends > Suggestions
```

#### OPTION B: Grid-Based Discovery
```
┌─────────────────────────┐
│ Mike's Feed · Evening   │ H3, #262626
│ ┌──────────┬──────────┐ │
│ │ Friends  │ For You  │ │ Tab style
│ └──────────┴──────────┘ │ Active: #FFAD27
│                         │
│ ┌──────────┬──────────┐ │ 2-column grid
│ │  Card 1  │  Card 2  │ │ Gap: 12px
│ │  [Image] │  [Image] │ │
│ │  Name    │  Name    │ │ Font: Body
│ │  ⭐4.8·$$ │  ⭐4.5·$ │ │ Font: Caption
│ ├──────────┼──────────┤ │
│ │  Card 3  │  Card 4  │ │
│ │  [Image] │  [Image] │ │
│ │  Name    │  Name    │ │
│ │  ⭐4.7·$$ │  ⭐4.9·$$$│ │
│ └──────────┴──────────┘ │
│                         │
│ [Load more ↓]           │ Text: #4A90E2
└─────────────────────────┘

Design Principles Applied:
- Cognitive Load: Compact grid view
- Quick Scanning: Visual-first approach
- Efficiency: More content visible
```

#### OPTION C: Contextual Smart Feed
```
┌─────────────────────────┐
│ ┌─────────────────────┐ │ Context bar
│ │ 🌙 Dinner · 6:00 PM │ │ BG: #FFF8E7
│ │ Within 15 min walk  │ │ Text: #E69A1F
│ └─────────────────────┘ │ Radius: 20px
│                         │
│ Right now nearby 📍     │ H3, #262626
│ ┌─────────────────────┐ │
│ │ [Large hero card]    │ │ Hero card:
│ │ Trending: Thai House │ │ Height: 200px
│ │ ⭐4.9 · Thai · $$    │ │ Gradient overlay
│ │ "12 people here now" │ │ Live indicator
│ └─────────────────────┘ │
│                         │
│ More dinner spots       │
│ ┌─────────────────────┐ │ Horizontal scroll
│ │[Card][Card][Card]→  │ │ Width: 140px each
│ └─────────────────────┘ │ Snap scrolling
│                         │
│ Based on your taste     │
│ ┌─────────────────────┐ │
│ │ [Personalized list] │ │
│ └─────────────────────┘ │
└─────────────────────────┘

Design Principles Applied:
- Context Awareness: Time & location based
- Scarcity: "12 people here now"
- Progressive Disclosure: Horizontal sections
```

---

## 3. NEARBY/MAP SCREEN

### User Scenario
**Lisa, 31, Designer**
"I'm walking around a new neighborhood and want to see what's around me visually. I prefer seeing things on a map to understand the area better."

### Navigation Bar
```
┌─────────────────────────┐
│ Discover │ Nearby │ [+] │ Saved │ You │
└─────────────────────────┘
Active: Nearby
```

### Screen 3.1: Map Discovery

#### OPTION A: Map-First View
```
┌─────────────────────────┐
│ ┌─────────────────────┐ │ Search bar
│ │ 🔍 Search area...   │ │ BG: #FFFFFF
│ └─────────────────────┘ │ Shadow: 0 2px 4px
│ ┌────┬────┬────┬─────┐ │ Filter chips
│ │All │Open│ $$ │ ⭐4+ │ │ BG: #FAFAFA
│ └────┴────┴────┴─────┘ │ Active: #FFAD27
│                         │
│ ┌─────────────────────┐ │ Map: 70% screen
│ │                     │ │ Custom markers:
│ │    [Map View]       │ │ - Restaurant type
│ │   📍 📍 📍          │ │ - Price on pin
│ │      📍 YOU         │ │ - Color by rating
│ │   📍     📍         │ │
│ │                     │ │
│ └─────────────────────┘ │
│ ├─────────────────────┤ │ Drag handle
│ ┌─────────────────────┐ │ List: 30% screen
│ │ Nearest first (5)   │ │ Caption, #8C8C8C
│ │ 1. Thai House 0.1mi │ │ Numbered list
│ │ 2. Pasta Bar 0.2mi  │ │ Distance highlight
│ └─────────────────────┘ │
└─────────────────────────┘

Design Principles Applied:
- Spatial Cognition: Visual map primary
- Information Hierarchy: Map > List
- Gesture Support: Draggable divider
```

#### OPTION B: Split View Balanced
```
┌─────────────────────────┐
│ [Search & Filters]      │
│ ┌──────────┬──────────┐ │ 50/50 split
│ │          │          │ │
│ │   Map    │  List    │ │
│ │   View   │  View    │ │
│ │          │          │ │
│ │  📍 📍   │ ┌──────┐ │ │
│ │    YOU   │ │Card 1│ │ │
│ │  📍 📍   │ ├──────┤ │ │
│ │          │ │Card 2│ │ │
│ │          │ ├──────┤ │ │
│ │          │ │Card 3│ │ │
│ │          │ └──────┘ │ │
│ └──────────┴──────────┘ │
│ ┌─────────────────────┐ │ Selected details
│ │ [Selected spot info] │ │ Slides up
│ └─────────────────────┘ │ from bottom
└─────────────────────────┘

Design Principles Applied:
- Balanced Information: Equal map/list
- Quick Comparison: Side-by-side
- Selection Feedback: Detail panel
```

#### OPTION C: Augmented Reality View
```
┌─────────────────────────┐
│ ┌─────────────────────┐ │ Toggle button
│ │ AR View │ Map View  │ │ Segmented control
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │ Camera view
│ │                     │ │ 
│ │  [Camera Feed]      │ │ AR overlays:
│ │                     │ │ - Distance tags
│ │  ↗️ Thai House       │ │ - Direction arrows
│ │     0.2 mi · $$     │ │ - Rating badges
│ │                     │ │
│ │  ← Pasta Bar        │ │ Semi-transparent
│ │    0.1 mi · $$$     │ │ BG: #000000/80
│ │                     │ │ Text: #FFFFFF
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │ Info bar
│ │ 📍 5 spots nearby   │ │ BG: #262626
│ │ Tap for details     │ │ Text: #FFFFFF
│ └─────────────────────┘ │
└─────────────────────────┘

Design Principles Applied:
- Innovation: AR for spatial understanding
- Real-World Context: Camera integration
- Reduced Cognitive Load: Visual directions
```

---

## 4. QUICK ACTION (+) SCREEN

### User Scenario
**Alex, 26, Consultant**
"I just had an amazing dinner and want to quickly save this place with context so I remember why I loved it. I might want to come back for a date."

### Navigation Bar
```
┌─────────────────────────┐
│ Discover │ Nearby │ [+] │ Saved │ You │
└─────────────────────────┘
Active: [+] (Expanded modal/sheet)
```

### Screen 4.1: Smart Save Flow

#### OPTION A: Intent-Based Save
```
┌─────────────────────────┐
│ ┌─────────────────────┐ │ Modal header
│ │ ✕  Save Restaurant  │ │ H3, #262626
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │ Search bar
│ │ 🔍 Search or paste  │ │ BG: #FAFAFA
│ └─────────────────────┘ │
│                         │
│ [Selected: Thai House]  │ Chip, #FFAD27
│                         │
│ Save as:                │ Body, #262626
│ ┌─────────────────────┐ │
│ │ 📍 Want to try      │ │ List items
│ ├─────────────────────┤ │ Height: 56px
│ │ ✅ Been there       │ │ Icon: 24px
│ ├─────────────────────┤ │ Tap: BG #FFF8E7
│ │ ❤️ Love it         │ │
│ ├─────────────────────┤ │
│ │ 🎁 Special occasion │ │
│ └─────────────────────┘ │
│                         │
│ Add details (optional): │ Caption, #8C8C8C
│ ┌─────────────────────┐ │
│ │ "Perfect for dates" │ │ Placeholder text
│ └─────────────────────┘ │
│                         │
│ [Save to Collection]    │ BG: #FFAD27
└─────────────────────────┘

Design Principles Applied:
- Implementation Intention: Specific contexts
- Progressive Enhancement: Optional details
- Clear Mental Model: Save "as" something
```

#### OPTION B: Quick Multi-Action
```
┌─────────────────────────┐
│ Quick Actions           │ H2, #262626
│                         │
│ ┌────────┬────────────┐ │ Grid layout
│ │  Save  │   Review   │ │ 2x2
│ │   📌   │     ⭐     │ │ Icon: 32px
│ ├────────┼────────────┤ │ Label: Caption
│ │ Share  │   Photo    │ │
│ │   📤   │     📷     │ │
│ └────────┴────────────┘ │
│                         │
│ Recent Places:          │ Body, #262626
│ ┌─────────────────────┐ │
│ │ • Thai House (now)  │ │ List with time
│ │ • Pasta Bar (2h)    │ │ Tap to select
│ │ • Coffee Co (5h)    │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Or search a place   │ │ Secondary action
│ └─────────────────────┘ │ Text: #4A90E2
└─────────────────────────┘

Design Principles Applied:
- Quick Access: Common actions grid
- Recency: Recent places for context
- Flexibility: Multiple entry points
```

#### OPTION C: AI-Assisted Save
```
┌─────────────────────────┐
│ ┌─────────────────────┐ │
│ │ 🤖 Smart Save       │ │ Header with AI
│ └─────────────────────┘ │
│                         │
│ Based on your location  │ Caption, #8C8C8C
│ and time, we think:     │
│                         │
│ ┌─────────────────────┐ │ AI suggestion
│ │ Thai House          │ │ BG: #FFF8E7
│ │ "Dinner - Been here"│ │ Border: #FFAD27
│ │ [✓ Correct]         │ │ Confidence: 95%
│ └─────────────────────┘ │
│                         │
│ Want to add?            │
│ ┌─────────────────────┐ │ Enhancement
│ │ 😊 Loved the pad   │ │ Quick reactions
│ │    thai!           │ │ Prefilled based
│ └─────────────────────┘ │ on common items
│                         │
│ ┌─────────────────────┐ │ Tags
│ │ #DateNight #Thai    │ │ Auto-suggested
│ └─────────────────────┘ │
│                         │
│ [Save Smart] [Manual]   │ Two options
└─────────────────────────┘

Design Principles Applied:
- AI Assistance: Reduce cognitive load
- Confirmation: Easy to verify/correct
- Smart Defaults: Context-aware suggestions
```

---

## 5. SAVED/COLLECTIONS SCREEN

### User Scenario
**Emma, 29, Food Blogger**
"I've saved dozens of restaurants and need to organize them for different occasions. I want to create a 'Best Brunch Spots' collection to share with friends."

### Navigation Bar
```
┌─────────────────────────┐
│ Discover │ Nearby │ [+] │ Saved │ You │
└─────────────────────────┘
Active: Saved
```

### Screen 5.1: Collections Overview

#### OPTION A: Pinterest-Style Boards
```
┌─────────────────────────┐
│ Your Collections        │ H2, #262626
│ ┌─────────────────────┐ │ Stats bar
│ │ 127 saved · 12 boards│ │ Caption, #8C8C8C
│ └─────────────────────┘ │
│                         │
│ ┌──────────┬──────────┐ │ 2-column grid
│ │ Want to  │ Been     │ │ Smart collections
│ │ Try (45) │ There(32)│ │ Auto-organized
│ │ [4-img]  │ [4-img]  │ │
│ ├──────────┼──────────┤ │
│ │ Date     │ Brunch   │ │ Custom boards
│ │ Night(12)│ Spots(8) │ │
│ │ [4-img]  │ [4-img]  │ │
│ ├──────────┼──────────┤ │
│ │ [+ New Board]       │ │ Create action
│ └──────────┴──────────┘ │ Dashed border
│                         │
│ Suggested Collections:  │ AI suggestions
│ [Weekend] [Healthy]     │ Chips style
└─────────────────────────┘

Design Principles Applied:
- Visual Organization: Image-based boards
- Smart Categorization: Auto collections
- Discovery: AI-suggested collections
```

#### OPTION B: List-Based Organization
```
┌─────────────────────────┐
│ ┌────────┬────────────┐ │ View toggle
│ │ Boards │ All Saved  │ │ Tabs
│ └────────┴────────────┘ │
│                         │
│ Your Boards (5)         │ H3, #262626
│ ┌─────────────────────┐ │
│ │ ❤️ Favorites (23)   │ │ List style
│ │ Last added: 2d ago  │ │ Icon: 20px
│ ├─────────────────────┤ │ Subtitle: Caption
│ │ 📍 Want to Try (45) │ │
│ │ Last added: today   │ │
│ ├─────────────────────┤ │
│ │ ☕ Coffee Spots (12)│ │
│ │ Last added: 1w ago  │ │
│ └─────────────────────┘ │
│                         │
│ Quick Filters:          │ Horizontal scroll
│ [Nearby][Open][Friends] │ Chip filters
│                         │
│ ┌─────────────────────┐ │
│ │ + Create New Board  │ │ Primary action
│ └─────────────────────┘ │ BG: #FFAD27
└─────────────────────────┘

Design Principles Applied:
- Scannable Lists: Text-first approach
- Metadata: Last activity shown
- Quick Access: Filters for saved items
```

#### OPTION C: Map-Based Collections
```
┌─────────────────────────┐
│ Collections Map View    │ H3, #262626
│ ┌─────────────────────┐ │
│ │ [Map with colored   │ │ Visual clusters
│ │  pins by collection]│ │ Color-coded
│ │ 🔴 Date spots (5)   │ │ Legend overlay
│ │ 🟡 Brunch (8)       │ │
│ │ 🔵 Coffee (12)      │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │ Collection stats
│ │ Coverage: 2.5 mi    │ │ BG: #FAFAFA
│ │ Most visited: Tues  │ │ Insights
│ └─────────────────────┘ │
│                         │
│ Collections:            │ Scrollable list
│ ┌─────────────────────┐ │
│ │ [Collection cards]  │ │ With mini-map
│ └─────────────────────┘ │
└─────────────────────────┘

Design Principles Applied:
- Spatial Memory: Geographic organization
- Visual Clustering: Color-coded groups
- Insights: Data-driven observations
```

---

## 6. PROFILE/YOU SCREEN

### User Scenario
**David, 34, Entrepreneur**
"I want to see my food journey over time and understand my dining patterns. I'm curious about my restaurant personality and want to share my profile with friends."

### Navigation Bar
```
┌─────────────────────────┐
│ Discover │ Nearby │ [+] │ Saved │ You │
└─────────────────────────┘
Active: You
```

### Screen 6.1: Personal Food Story

#### OPTION A: Instagram-Style Profile
```
┌─────────────────────────┐
│ ┌────────────────────┐  │ Header
│ │ [Avatar]  David K.  │  │ Avatar: 80px
│ │ @davidk   [Edit]    │  │ Name: H3
│ └────────────────────┘  │ Handle: Caption
│                         │
│ ┌────┬─────┬─────────┐ │ Stats grid
│ │ 234│  67 │   892   │ │ Number: H2
│ │Saved│Tried│ Points  │ │ Label: Small
│ └────┴─────┴─────────┘ │ Tap for details
│                         │
│ 🏆 Adventurous Foodie   │ Badge: #FFD93D
│ "Tries everything once" │ Quote: Italic
│                         │
│ ┌────────┬────────────┐ │ Tab bar
│ │ Grid   │  Insights  │ │
│ └────────┴────────────┘ │
│ ┌────┬────┬────┬────┐  │ Photo grid
│ │ 📷 │ 📷 │ 📷 │ 📷 │  │ 3 columns
│ ├────┼────┼────┼────┤  │ Square ratio
│ │ 📷 │ 📷 │ 📷 │ 📷 │  │
│ └────┴────┴────┴────┘  │
└─────────────────────────┘

Design Principles Applied:
- Familiar Pattern: Instagram-like layout
- Visual First: Photo grid of visits
- Social Identity: Shareable profile
```

#### OPTION B: Dashboard Analytics
```
┌─────────────────────────┐
│ Your Food Journey       │ H2, #262626
│ ┌─────────────────────┐ │
│ │ [David K.]  [⚙️]    │ │ Compact header
│ └─────────────────────┘ │
│                         │
│ This Month's Story      │ H3, #262626
│ ┌─────────────────────┐ │
│ │ [Circular progress] │ │ Donut chart
│ │  67% to goal       │ │ Animation
│ │  Try 3 new places  │ │ Goal tracking
│ └─────────────────────┘ │
│                         │
│ Taste Profile           │
│ ┌─────────────────────┐ │ Radar chart
│ │   Italian ████      │ │ Bar graphs
│ │   Asian   ███       │ │ Color-coded
│ │   Mexican ██        │ │ by frequency
│ └─────────────────────┘ │
│                         │
│ Recent Achievements     │
│ ┌─────────────────────┐ │
│ │ 🌟 5 new cuisines   │ │ Icon: 16px
│ │ 🗺️ 3 neighborhoods  │ │ Text: Caption
│ │ 👥 10 friend recs   │ │
│ └─────────────────────┘ │
└─────────────────────────┘

Design Principles Applied:
- Data Visualization: Charts and graphs
- Goal Orientation: Progress tracking
- Self-Improvement: Achievement system
```

#### OPTION C: Timeline Story
```
┌─────────────────────────┐
│ David's Food Timeline   │ H2, #262626
│ ┌─────────────────────┐ │
│ │ [Profile summary]    │ │ Minimal header
│ └─────────────────────┘ │
│                         │
│ October 2024            │ Month marker
│ ├───────────────────────┤
│ │ Oct 28 - Thai House  │ Timeline style
│ │ ⭐⭐⭐⭐⭐ "Amazing!"  │ Vertical flow
│ │ [Photo thumbnail]    │ 
│ ├───────────────────────┤
│ │ Oct 25 - Coffee Co   │
│ │ ☕ Morning spot      │
│ ├───────────────────────┤
│ │ Oct 20 - Pasta Bar   │
│ │ 👥 With friends      │
│ │ [Group photo]        │
│ └───────────────────────┘
│                         │
│ September 2024          │
│ [Collapsed]             │ Expandable
│                         │
│ [Share Your Story]      │ Export option
└─────────────────────────┘

Design Principles Applied:
- Narrative Structure: Chronological story
- Memory Aid: Timeline with context
- Shareability: Export food journey
```

---

## 7. RESTAURANT DETAIL SCREEN

### User Scenario
**Nina, 27, Nurse**
"I'm checking out a restaurant my friend recommended. I need to know if it's open now, see the menu, and understand what makes it special before deciding to go."

### Navigation Bar
```
No bottom nav - Full screen with back button
┌─────────────────────────┐
│ [←] Restaurant Details  │
└─────────────────────────┘
```

### Screen 7.1: Restaurant Information

#### OPTION A: Immersive Visual
```
┌─────────────────────────┐
│ [Full-width hero image] │ 40% screen
│ ┌─────────────────────┐ │ Gradient overlay
│ │ ← Thai House     ♡  │ │ White text
│ └─────────────────────┘ │ on image
│                         │
│ ┌─────────────────────┐ │ Floating card
│ │ ⭐4.8 · Thai · $$    │ │ BG: White
│ │ 🟢 Open until 10pm   │ │ Shadow: 0 4px 12px
│ │ 📍 0.3 mi · 5 min    │ │ Radius: 16px top
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │ Action bar
│ │ [Save][Share][Call] │ │ Sticky bottom
│ └─────────────────────┘ │ BG: #FFFFFF
│                         │
│ What's Special          │ H3, #262626
│ ┌─────────────────────┐ │
│ │ 🌶️ Authentic spice  │ │ Highlight cards
│ │ 🥢 Family recipes   │ │ BG: #FAFAFA
│ │ 🌱 Vegan options    │ │ Icon + text
│ └─────────────────────┘ │
│                         │
│ Friends Say             │ Social proof
│ [Friend reviews]        │
└─────────────────────────┘

Design Principles Applied:
- Visual Impact: Large hero image
- Immediate Actions: Sticky CTA bar
- Social Validation: Friends' opinions
```

#### OPTION B: Information Dense
```
┌─────────────────────────┐
│ Thai House              │ H2, #262626
│ ⭐4.8 (234) · Thai · $$ │ Caption, #8C8C8C
│                         │
│ ┌─────────────────────┐ │ Status card
│ │ 🟢 Open · Closes 10pm│ │ BG: #E6F7E6
│ │ 🪑 Not busy right now│ │ Green theme
│ │ ⏱️ No wait time      │ │ Real-time info
│ └─────────────────────┘ │
│                         │
│ [Image carousel →]      │ Horizontal scroll
│                         │
│ ┌────┬────┬────┬─────┐ │ Quick actions
│ │Save│Menu│Call│ Map │ │ Icon buttons
│ └────┴────┴────┴─────┘ │ Equal width
│                         │
│ About                   │ Sections
│ [Description text]      │ Expandable
│                         │
│ Popular Dishes          │
│ • Pad Thai (45 orders) │ Data-driven
│ • Green Curry (38)     │ Order counts
│ • Tom Yum (31)         │
│                         │
│ Reviews (234)           │
│ [Review list]           │
└─────────────────────────┘

Design Principles Applied:
- Information Hierarchy: Status first
- Data Transparency: Order counts
- Scannable Structure: Clear sections
```

#### OPTION C: Experience-Focused
```
┌─────────────────────────┐
│ ┌─────────────────────┐ │ Mood selector
│ │ What brings you?     │ │ Context-aware
│ │ [Lunch][Date][Group]│ │ Changes content
│ └─────────────────────┘ │
│                         │
│ Perfect for Dates 💕    │ Dynamic heading
│ ┌─────────────────────┐ │
│ │ [Ambiance photos]   │ │ Context photos
│ │ "Romantic lighting" │ │ Relevant info
│ │ "Quiet corners"     │ │
│ └─────────────────────┘ │
│                         │
│ Thai House              │
│ ⭐4.8 · $$ · 0.3 mi     │
│                         │
│ Why couples love it:    │ Contextual
│ • Intimate atmosphere   │ reasons
│ • Sharing plates        │
│ • Great wine selection  │
│                         │
│ ┌─────────────────────┐ │
│ │ [Reserve for 2]     │ │ Context CTA
│ └─────────────────────┘ │ BG: #FFAD27
│                         │
│ Also good for dates:    │ Alternatives
│ [Similar restaurants]   │
└─────────────────────────┘

Design Principles Applied:
- Context Adaptation: Mood-based content
- Emotional Connection: Experience focus
- Decision Support: Contextual alternatives
```

---

## 8. SEARCH & DISCOVERY SCREEN

### User Scenario
**Tom, 40, Teacher**
"It's my anniversary and I need to find a special restaurant for tonight. I want something romantic, not too expensive, and with good vegetarian options."

### Navigation Bar
```
Search mode - Full screen overlay
┌─────────────────────────┐
│ [←] Search              │
└─────────────────────────┘
```

### Screen 8.1: Intelligent Search

#### OPTION A: Natural Language
```
┌─────────────────────────┐
│ ┌─────────────────────┐ │ Search input
│ │ 🔍 Ask me anything  │ │ Large: 18px
│ │    about food...    │ │ Placeholder
│ └─────────────────────┘ │
│                         │
│ Try:                    │ Suggestions
│ ┌─────────────────────┐ │
│ │ "Romantic dinner    │ │ Natural language
│ │  tonight under $50" │ │ examples
│ ├─────────────────────┤ │
│ │ "Kid-friendly       │ │
│ │  brunch spots"      │ │
│ ├─────────────────────┤ │
│ │ "Vegan options      │ │
│ │  near me"           │ │
│ └─────────────────────┘ │
│                         │
│ Recent Searches:        │ History
│ [Italian] [Nearby]      │ Chip style
│                         │
│ Trending Now:           │ Social proof
│ • "Rooftop dining"     │ List style
│ • "New openings"       │ with counts
│ • "Date night spots"   │
└─────────────────────────┘

Design Principles Applied:
- Natural Input: Conversational search
- Smart Suggestions: Context examples
- Social Validation: Trending searches
```

#### OPTION B: Visual Discovery
```
┌─────────────────────────┐
│ [Search bar]            │ Minimal top
│                         │
│ Browse by Mood          │ H3, #262626
│ ┌────────┬────────────┐ │ Image cards
│ │Romantic│   Casual   │ │ with overlay
│ │  [🕯️]  │    [🍔]    │ │ text
│ ├────────┼────────────┤ │
│ │Business│   Family   │ │
│ │  [💼]  │    [👨‍👩‍👧]   │ │
│ └────────┴────────────┘ │
│                         │
│ Browse by Cuisine       │
│ [Horizontal scroll →]   │ Carousel
│ [🍕][🍣][🌮][🍝][🥘]    │ 60px circles
│                         │
│ Quick Filters:          │ Toggle chips
│ [Open Now] [Under $30]  │ Multi-select
│ [Vegetarian] [Nearby]   │
│                         │
│ [Show Results]          │ CTA button
└─────────────────────────┘

Design Principles Applied:
- Visual Browsing: Image-based discovery
- Mood Matching: Emotional categories
- Progressive Filtering: Build criteria
```

#### OPTION C: AI Assistant
```
┌─────────────────────────┐
│ ┌─────────────────────┐ │ Chat interface
│ │ 🤖 Food Assistant   │ │ Header
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │ AI message
│ │ Hi! What kind of    │ │ BG: #FAFAFA
│ │ dining experience   │ │ Rounded corners
│ │ are you looking for?│ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │ Quick replies
│ │ [Special occasion]  │ │ Suggested
│ │ [Quick lunch]       │ │ responses
│ │ [Group dinner]      │ │ Tap to select
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │ User input
│ │ Anniversary dinner  │ │ BG: #FFF8E7
│ │ for 2, romantic...  │ │ Right-aligned
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │ AI response
│ │ Perfect! I found 3  │ │ with results
│ │ romantic spots:     │ │ Cards embedded
│ │ [Restaurant cards]  │ │
│ └─────────────────────┘ │
└─────────────────────────┘

Design Principles Applied:
- Conversational UI: Natural dialogue
- Guided Discovery: AI assistance
- Contextual Results: Personalized matches
```

---

## 9. ACTIVITY/SOCIAL SCREEN

### User Scenario
**Rachel, 30, Marketer**
"I want to see what my friends have been eating lately and get inspired. I especially trust my foodie friend Jessica's recommendations."

### Navigation Bar
```
Optional - Can be accessed from Discover
┌─────────────────────────┐
│ [←] Friends Activity    │
└─────────────────────────┘
```

### Screen 9.1: Social Feed

#### OPTION A: Story-Style Updates
```
┌─────────────────────────┐
│ Friends' Food Stories   │ H2, #262626
│ ┌─────────────────────┐ │
│ │ Today │ This Week   │ │ Time filter
│ └─────────────────────┘ │ Tabs
│                         │
│ ┌─────────────────────┐ │ Activity card
│ │ [Jessica's avatar]  │ │ Avatar: 40px
│ │ Jessica Chen        │ │ Name: Body bold
│ │ 2 hours ago         │ │ Time: Caption
│ │                     │ │
│ │ "Found a hidden gem"│ │ Quote: Italic
│ │ ⭐⭐⭐⭐⭐ Thai House  │ │ Rating visible
│ │ [Photo of dish]     │ │ Image: 16:9
│ │                     │ │
│ │ ❤️ 12  💬 3  📤 2   │ │ Social actions
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │ Next activity
│ │ [Mike's avatar]     │ │ Different format
│ │ Mike saved 3 spots  │ │ for saves
│ │ in "Weekend Brunch" │ │
│ │ [3 mini previews]   │ │
│ └─────────────────────┘ │
└─────────────────────────┘

Design Principles Applied:
- Social Proof: Friends' real activity
- Visual Variety: Different activity types
- Engagement: Social interaction options
```

#### OPTION B: Leaderboard Style
```
┌─────────────────────────┐
│ This Week's Foodies     │ H2, #262626
│ ┌─────────────────────┐ │ Leaderboard
│ │ 🥇 Jessica (15 pts) │ │ Gamification
│ │    5 reviews, 3 new │ │ Activity summary
│ ├─────────────────────┤ │
│ │ 🥈 Mike (12 pts)    │ │
│ │    3 reviews, 4 new │ │
│ ├─────────────────────┤ │
│ │ 🥉 You (10 pts)     │ │ Your position
│ │    2 reviews, 3 new │ │ highlighted
│ └─────────────────────┘ │
│                         │
│ Trending Among Friends  │ Section header
│ ┌─────────────────────┐ │
│ │ 1. Thai House       │ │ Numbered list
│ │    5 friends visited│ │ Social count
│ │ 2. Pasta Bar        │ │
│ │    4 friends saved │ │
│ └─────────────────────┘ │
│                         │
│ [See All Activity →]    │ Link to full feed
└─────────────────────────┘

Design Principles Applied:
- Gamification: Points and rankings
- Competition: Friendly leaderboard
- Trending: Social popularity metrics
```

#### OPTION C: Map-Based Social
```
┌─────────────────────────┐
│ Where Friends Are Eating│ H2, #262626
│ ┌─────────────────────┐ │
│ │ [Map with friend    │ │ Friend avatars
│ │  avatars at spots]  │ │ on map pins
│ │ 👤 Jessica @ Thai   │ │
│ │ 👤 Mike @ Coffee Co │ │
│ │ 👥 3 @ Pasta Bar    │ │ Group indicators
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │ Time selector
│ │ Now │ Today │ Week  │ │ Changes map
│ └─────────────────────┘ │
│                         │
│ Recent Friend Activity  │ List below map
│ ┌─────────────────────┐ │
│ │ • Jess: Thai House  │ │ Compact format
│ │ • Mike: Coffee Co   │ │ Tappable items
│ │ • Sarah: Pasta Bar  │ │
│ └─────────────────────┘ │
└─────────────────────────┘

Design Principles Applied:
- Spatial Social: Geographic friend activity
- Real-Time: "Now" option for live updates
- Visual Clustering: See popular spots
```

---

## 10. ONBOARDING COMPLETION

### User Scenario
**First-time user completing initial setup**
"I've explored the app and now I'm ready to create an account to save my favorites and connect with friends."

### Navigation Bar
```
Modal overlay - No navigation
┌─────────────────────────┐
│ [Maybe Later]     [→]   │
└─────────────────────────┘
```

### Screen 10.1: Account Creation

#### OPTION A: Social-First Signup
```
┌─────────────────────────┐
│ Join Your Food Community│ H2, #262626
│                         │
│ ┌─────────────────────┐ │ Value prop
│ │ You've explored:    │ │ BG: #FFF8E7
│ │ • 23 restaurants    │ │ Personalized
│ │ • 5 saved spots     │ │ stats
│ │ Create account to   │ │
│ │ keep them!          │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │ Social signup
│ │ Continue with Apple │ │ BG: #000000
│ └─────────────────────┘ │ Text: #FFFFFF
│ ┌─────────────────────┐ │
│ │ Continue with Google│ │ BG: #FFFFFF
│ └─────────────────────┘ │ Border: 1px
│                         │
│ ─────── OR ──────       │ Divider
│                         │
│ ┌─────────────────────┐ │
│ │ Phone number        │ │ Input field
│ └─────────────────────┘ │
│                         │
│ [Continue]              │ BG: #FFAD27
└─────────────────────────┘

Design Principles Applied:
- Loss Aversion: "Keep your saves"
- Social Proof: Community framing
- Low Friction: Social login options
```

#### OPTION B: Benefit-Focused
```
┌─────────────────────────┐
│ Unlock Full Experience  │ H2, #262626
│                         │
│ ✓ Save unlimited spots  │ Benefit list
│ ✓ Create collections    │ Green checks
│ ✓ Follow friends        │ Body text
│ ✓ Get personalized recs │
│ ✓ Share your journey    │
│                         │
│ ┌─────────────────────┐ │ Progress shown
│ │ 70% Complete        │ │ Progress bar
│ │ ████████░░          │ │ Visual progress
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │ Simple form
│ │ Name                │ │
│ ├─────────────────────┤ │
│ │ Email/Phone         │ │
│ └─────────────────────┘ │
│                         │
│ [Create Account]        │ Primary CTA
│                         │
│ Already have account?   │ Secondary
│ [Sign In]               │ Text link
└─────────────────────────┘

Design Principles Applied:
- Value Communication: Clear benefits
- Progress Indication: Almost complete
- Simplicity: Minimal fields required
```

#### OPTION C: Gamified Completion
```
┌─────────────────────────┐
│ Complete Your Profile   │ H2, #262626
│ Earn your first badge!  │ Subtitle
│                         │
│ ┌─────────────────────┐ │ Visual reward
│ │    🏆 Explorer      │ │ Badge preview
│ │  "Viewed 20+ spots" │ │ Achievement
│ │   [Claim Badge]     │ │ CTA
│ └─────────────────────┘ │
│                         │
│ Quick Setup:            │ Minimal fields
│ ┌─────────────────────┐ │
│ │ Choose username     │ │ Gamertag style
│ │ @_____________      │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Add profile photo   │ │ Visual element
│ │ [📷]                │ │ Camera icon
│ └─────────────────────┘ │
│                         │
│ [Start My Journey]      │ Emotional CTA
│                         │
│ Terms apply · Privacy   │ Legal text
└─────────────────────────┘

Design Principles Applied:
- Gamification: Achievement system
- Identity Building: Username/photo
- Emotional Connection: "Journey" framing
```

---

## Testing & Validation Framework for Each Screen

### A/B Testing Priority
1. **Onboarding**: Test completion rates for each option
2. **Home Feed**: Test engagement metrics per layout
3. **Save Flow**: Test context capture rates
4. **Restaurant Cards**: Test information density impact
5. **Social Features**: Test sharing and interaction rates

### Key Metrics to Track
```javascript
// Per screen variation
{
  screen_variant: "A/B/C",
  time_on_screen: seconds,
  interaction_rate: percentage,
  task_completion: boolean,
  user_satisfaction: 1-5,
  cognitive_load: measured_via_time,
  error_rate: percentage,
  conversion_to_next: boolean
}
```

### User Testing Protocol
1. **Recruit**: 5-8 users per variant
2. **Tasks**: Specific scenarios per screen
3. **Measure**: Time, errors, satisfaction
4. **Interview**: Qualitative feedback
5. **Iterate**: Refine based on insights

---

## Implementation Notes

### Design Handoff Checklist
- [ ] Export all assets at @1x, @2x, @3x
- [ ] Document all hex colors and opacity values
- [ ] Specify all animation timings and curves
- [ ] Include touch target sizes (min 44x44)
- [ ] Note platform-specific variations
- [ ] Provide edge case designs
- [ ] Include loading and error states
- [ ] Document accessibility labels

### Platform Considerations

#### iOS Specific
- Safe area insets for notch devices
- Haptic feedback types specified
- iOS gesture conflicts avoided
- Apple HIG compliance checked

#### Android Specific
- Material Design principles applied
- Back button behavior defined
- Navigation patterns consistent
- Device fragmentation considered

### Performance Guidelines
- Images: WebP format, lazy loaded
- Animations: 60fps, GPU accelerated
- Data: Paginated, cached locally
- Fonts: System fonts preferred
- Initial load: < 3 seconds target

---

_Enhanced design prompts document completed: January 2025_
_Each screen includes 3 testable variants with detailed specifications_
_Ready for design implementation and A/B testing framework_