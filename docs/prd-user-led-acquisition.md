# Product Requirements Document: User-led Restaurant Acquisition

## Executive Summary
Convert every user interaction into a restaurant acquisition opportunity by automatically generating restaurant profiles from user saves and triggering targeted outreach campaigns to unclaimed restaurants.

## Problem Statement
- **Current Challenge**: Users save thousands of restaurants but this signal isn't leveraged for growth
- **Opportunity**: Each save represents user validation and social proof for restaurants
- **Impact**: User activity can drive viral restaurant acquisition at zero CAC

## Solution Overview
An automated system that transforms user saves into restaurant leads by creating instant restaurant profiles, notifying restaurants of trending activity, and providing simple claim workflows - making every user a potential acquisition channel.

## User Personas

### Primary: Restaurant Owners/Managers
- **Profile**: Restaurant decision-makers unaware of Troodie activity
- **Pain Points**:
  - Don't know when customers are talking about them online
  - Missing customer engagement opportunities
  - No visibility into social media impact
- **Goals**:
  - Monitor online presence
  - Engage with customers
  - Understand customer preferences

### Secondary: Troodie Users
- **Profile**: Active users who save 5+ restaurants monthly
- **Pain Points**:
  - Limited information on saved restaurants
  - Can't share recommendations effectively
  - No feedback loop with restaurants
- **Goals**:
  - Build comprehensive restaurant lists
  - Share discoveries with friends
  - Get updates from favorite restaurants

## Core Features

### 1. Automatic Restaurant Profile Generation
**Description**: Create basic restaurant profiles instantly when users save unclaimed restaurants

**Functionality**:
- Triggered on first user save
- Pull basic info from Google Places/Yelp
- Generate SEO-optimized page
- Display save count and user activity

**Profile Components**:
- Restaurant name and address
- Phone and website (if available)
- Cuisine type and price range
- User save counter
- Recent user activity feed
- "Claim this listing" CTA

**Technical Requirements**:
- Event-driven architecture
- Google Places API integration
- Profile generation templates
- CDN for fast page loads

### 2. Smart Notification System
**Description**: Multi-channel notifications to restaurants about trending activity

**Notification Triggers**:
- First save (immediate)
- 5 saves (trending alert)
- 10 saves (viral alert)
- Weekly digest (if unclaimed)

**Channel Strategy**:
```
Day 0: First save → Email notification
Day 2: 5+ saves → SMS alert
Day 7: Still unclaimed → Email with metrics
Day 14: Social proof email (show user comments)
Day 30: Monthly summary with claim incentive
```

**Message Examples**:
- "🔥 Your restaurant is trending on Troodie with 10 saves this week"
- "Sarah M. and 4 others saved [Restaurant Name] to their must-try list"
- "Claim your free profile and connect with 50+ customers who love your restaurant"

**Technical Requirements**:
- Notification queue system
- Template engine with personalization
- Delivery tracking and analytics
- Unsubscribe management

### 3. Two-Click Claim Flow
**Description**: Frictionless onboarding for restaurant owners to claim their profile

**User Flow**:
1. Click "Claim" from email
2. Verify ownership (phone/email)
3. Auto-populate profile
4. Live in <2 minutes

**Verification Methods**:
- SMS to registered business phone
- Email to domain email
- Google My Business verification
- Upload business license (fallback)

**Post-Claim Benefits**:
- Respond to user saves
- Post updates and specials
- View detailed analytics
- Export customer data

**Technical Requirements**:
- OAuth integration
- Phone verification (Twilio)
- Document upload and OCR
- Progressive onboarding flow

### 4. Save-to-Lead Pipeline
**Description**: CRM integration to track restaurant acquisition funnel

**Pipeline Stages**:
1. Profile Created (automatic)
2. First Notification Sent
3. Email Opened
4. Claim Page Visited
5. Verification Started
6. Profile Claimed
7. Converted to Paid

**Automation Rules**:
- 5+ saves → Move to "Warm Lead"
- Claim page visit → Assign to sales
- 30 days unclaimed → Nurture campaign
- Claimed → Onboarding sequence

**Technical Requirements**:
- HubSpot/Salesforce integration
- Lead scoring algorithm
- Automated task creation
- Pipeline reporting

### 5. User Feedback Loop
**Description**: Notify users when restaurants they saved claim their profile

**Features**:
- Push notification when restaurant claims
- Special offers for early savers
- Direct messaging with restaurant
- Exclusive updates for savers

**Benefits**:
- Increases user engagement
- Rewards discovery behavior
- Creates network effects
- Drives repeat saves

## Success Metrics

### Primary KPIs
- **Claim Rate**: % of generated profiles claimed within 30 days
- **Save-to-Claim**: Average saves needed before claim
- **Viral Coefficient**: New restaurants from user saves
- **Activation Time**: Hours from profile creation to claim

### Secondary KPIs
- Saves per user per month
- Profile views before claim
- Notification open rates
- User retention after restaurant claim
- Revenue from user-generated restaurants

### Funnel Metrics
```
User Saves Restaurant: 100%
  ↓
Profile Generated: 100%
  ↓
Notification Sent: 95%
  ↓
Email Opened: 35%
  ↓
Claim Page Visited: 15%
  ↓
Verification Started: 8%
  ↓
Profile Claimed: 5%
  ↓
Converted to Paid: 2%
```

## MVP Scope (Phase 1 - 3 weeks)

### Week 1: Profile Generation
- Basic profile creation on save
- Simple template with restaurant info
- Save counter display

### Week 2: Email Notifications
- Single email template
- Trigger on 5+ saves
- Basic claim landing page

### Week 3: Claim Flow
- Email verification only
- Manual profile completion
- Success tracking

### Out of Scope for MVP
- SMS notifications
- Social media monitoring
- Advanced verification
- User feedback loop
- CRM automation

## Technical Architecture

### Backend Services
- **Profile Service**: Generates and manages restaurant profiles
- **Notification Service**: Handles all outbound communications
- **Verification Service**: Manages claim and verification flow
- **Analytics Service**: Tracks funnel metrics

### Data Flow
```
User Save Event
    ↓
Check if Restaurant Exists
    ↓ (No)
Generate Profile
    ↓
Enrich with External Data
    ↓
Add to Notification Queue
    ↓
Send Notifications (Email/SMS)
    ↓
Track Engagement
    ↓
Handle Claim Request
    ↓
Verify & Activate
```

### Infrastructure
- PostgreSQL for profile data
- Redis for save counters
- SQS for notification queue
- Lambda for event processing
- S3 for profile media

## Risks & Mitigation

### Risk 1: Invalid Contact Information
- **Mitigation**: Use multiple data sources for contact info
- **Mitigation**: Try multiple channels (email, phone, social)
- **Mitigation**: Partner with data providers for accuracy

### Risk 2: Spam/Abuse Reports
- **Mitigation**: Strict rate limiting (1 notification per week max)
- **Mitigation**: Clear value proposition in messaging
- **Mitigation**: Immediate unsubscribe option

### Risk 3: Low Claim Rates
- **Mitigation**: A/B test notification copy and timing
- **Mitigation**: Add social proof (show competitor claims)
- **Mitigation**: Offer time-limited incentives

### Risk 4: Fake Claims
- **Mitigation**: Multi-factor verification required
- **Mitigation**: Manual review for suspicious activity
- **Mitigation**: Dispute resolution process

## Implementation Timeline

### Sprint 1 (Weeks 1-2): Foundation
- Set up profile generation pipeline
- Create basic profile templates
- Implement save tracking
- Deploy to staging

### Sprint 2 (Weeks 3-4): Notifications
- Build email templates
- Set up SendGrid/HubSpot
- Create notification triggers
- Implement tracking

### Sprint 3 (Weeks 5-6): Claim Flow
- Design claim pages
- Build verification system
- Create onboarding flow
- Launch beta test

## A/B Testing Plan

### Test 1: Notification Timing
- Variant A: Immediate notification on first save
- Variant B: Wait for 3 saves before notifying
- Metric: Claim rate

### Test 2: Message Framing
- Variant A: "You're trending" (FOMO)
- Variant B: "Connect with customers" (Value)
- Metric: Email open rate

### Test 3: Claim Incentive
- Variant A: No incentive
- Variant B: "Free for 3 months"
- Variant C: "Early adopter badge"
- Metric: Conversion rate

## Budget Estimate

### Development (6 weeks)
- Backend development: $30,000
- Frontend development: $20,000
- Design: $10,000

### Infrastructure (Monthly)
- AWS services: $1,000
- Email/SMS: $500
- Data enrichment APIs: $300

### Marketing
- Claim incentives: $5,000
- Test budget: $2,000

**Total 2-month budget**: ~$70,000

## Integration Points

### With Creator-Led Acquisition
- Creators can trigger bulk saves
- Combined social proof in notifications
- Shared claim flow

### With Data Flywheel
- Feed analytics from user behavior
- Provide insights to claimed restaurants
- Build recommendation engine

## Next Steps
1. Analyze current save patterns and volumes
2. Identify top 100 unclaimed restaurants
3. Design notification templates
4. Build profile generation MVP
5. Run pilot with 50 restaurants