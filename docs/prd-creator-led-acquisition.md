# Product Requirements Document: Creator-led Restaurant Acquisition

## Executive Summary
Transform content creators into Troodie's primary growth engine by providing automated tools that convert their restaurant mentions into qualified leads and onboarded restaurant partners.

## Problem Statement
- **Current Challenge**: Manual restaurant acquisition is slow and expensive
- **Opportunity**: Creators naturally mention restaurants in their content but this value isn't captured
- **Impact**: Creators have authentic relationships with restaurants that traditional sales can't replicate

## Solution Overview
A comprehensive creator toolkit that automatically identifies restaurant mentions, generates restaurant profiles, and initiates targeted outreach workflows - turning every creator post into a potential restaurant acquisition.

## User Personas

### Primary: Content Creators
- **Profile**: Food bloggers, Instagram influencers, TikTok creators (500-50K followers)
- **Pain Points**:
  - Difficulty monetizing restaurant content
  - No clear way to track impact on restaurants
  - Manual process to partner with restaurants
- **Goals**:
  - Monetize their influence
  - Build stronger restaurant relationships
  - Track their impact on restaurant success

### Secondary: Restaurant Owners/Managers
- **Profile**: Independent restaurants and small chains
- **Pain Points**:
  - Unaware when creators mention them
  - No easy way to track social media impact
  - Missing opportunities from creator content
- **Goals**:
  - Claim and manage their online presence
  - Connect with influential creators
  - Track marketing ROI

## Core Features

### 1. Restaurant Tagging Tool
**Description**: AI-powered tool that identifies restaurant mentions in creator content and enables manual tagging

**Functionality**:
- Auto-detect restaurant names in uploaded content
- Manual tagging interface for creators
- Bulk upload for multiple posts
- Integration with Instagram/TikTok APIs for auto-import

**Technical Requirements**:
- NLP for restaurant name extraction
- Fuzzy matching against restaurant database
- Content upload/import APIs
- Real-time processing pipeline

### 2. Auto-Generated Restaurant Pages
**Description**: Automatically create basic restaurant profiles when creators tag unclaimed restaurants

**Functionality**:
- Generate profile from available data (name, location, cuisine type)
- Aggregate all creator mentions
- Display sample content from creators
- "Claim this page" CTA for restaurants

**Technical Requirements**:
- Restaurant data enrichment APIs (Google Places, Yelp)
- Profile template system
- Content aggregation engine
- SEO optimization

### 3. Automated Outreach Workflow
**Description**: Trigger multi-channel outreach campaigns when restaurants are tagged

**Functionality**:
- Email sequences via HubSpot/SendGrid
- SMS notifications (Twilio)
- Social media DMs (where available)
- Personalized messaging based on creator influence

**Workflow Example**:
1. Creator tags "Joe's Pizza" in post
2. System checks if restaurant is claimed
3. If unclaimed → trigger outreach sequence
4. Day 1: Email "You're trending on Troodie"
5. Day 3: SMS reminder
6. Day 7: Email with creator metrics
7. Day 14: Final email with special offer

**Technical Requirements**:
- HubSpot API integration
- Email service provider (SendGrid/Mailgun)
- SMS gateway (Twilio)
- Campaign automation engine

### 4. Creator Analytics Dashboard
**Description**: Show creators their impact on restaurant discovery and acquisition

**Metrics**:
- Restaurants tagged
- Restaurants claimed after tagging
- Engagement on tagged content
- Commission earned
- Trending restaurants

**Technical Requirements**:
- Real-time analytics pipeline
- Attribution tracking
- Dashboard UI components
- Export functionality

### 5. Commission/Affiliate Tracking
**Description**: Track and pay creators for successful restaurant acquisitions

**Structure**:
- Tier 1: Restaurant claims page ($10)
- Tier 2: Restaurant completes profile ($25)
- Tier 3: Restaurant becomes paying customer ($100)
- Bonus: Monthly recurring commission (5% of restaurant subscription)

**Technical Requirements**:
- Attribution tracking system
- Payment processing (Stripe Connect)
- Commission calculation engine
- Payout automation

## Success Metrics

### Primary KPIs
- **Acquisition Rate**: # of restaurants acquired via creators per month
- **Creator Activation**: % of creators who tag at least 5 restaurants
- **Claim Rate**: % of tagged restaurants that claim their profile
- **Revenue Attribution**: $ generated from creator-acquired restaurants

### Secondary KPIs
- Time to first restaurant tag
- Average restaurants tagged per creator
- Creator retention (monthly active taggers)
- Email open/click rates
- Cost per acquisition via creators

## MVP Scope (Phase 1 - 4 weeks)

### Week 1-2: Core Tagging
- Basic tagging interface
- Manual restaurant entry
- Simple restaurant profile generation

### Week 3: Outreach Integration
- Email workflow via HubSpot
- Basic email templates
- Claim page landing

### Week 4: Creator Dashboard
- Basic metrics display
- Tagged restaurant list
- Claim status tracking

### Out of Scope for MVP
- Automated content import
- SMS/social outreach
- Commission payments
- Advanced analytics

## Technical Architecture

### Frontend
- React Native components for mobile tagging
- Web dashboard (Next.js)
- Responsive design for creator tools

### Backend
- Node.js API server
- PostgreSQL for restaurant/creator data
- Redis for caching/sessions
- Queue system for email workflows

### Integrations
- HubSpot API for CRM/email
- Google Places API for restaurant data
- Stripe for payments (Phase 2)
- Social media APIs (Phase 2)

### Infrastructure
- AWS/Vercel hosting
- CDN for content delivery
- S3 for media storage
- CloudWatch for monitoring

## Risks & Mitigation

### Risk 1: Low Creator Adoption
- **Mitigation**: Start with 5-10 high-engagement creators for pilot
- **Mitigation**: Offer guaranteed minimum commission for first 3 months

### Risk 2: Restaurant Spam Complaints
- **Mitigation**: Limit outreach frequency (max 1 email per week)
- **Mitigation**: Easy unsubscribe/opt-out process
- **Mitigation**: Personalized, value-driven messaging

### Risk 3: False Restaurant Matches
- **Mitigation**: Manual review queue for first 100 restaurants
- **Mitigation**: Creator verification before sending outreach
- **Mitigation**: Restaurant dispute/correction process

## Implementation Timeline

### Month 1: Foundation
- Build tagging interface
- Create restaurant profile templates
- Set up HubSpot integration
- Recruit 10 pilot creators

### Month 2: Automation
- Launch email workflows
- Build creator dashboard
- Implement basic analytics
- Onboard 50 restaurants

### Month 3: Optimization
- Refine based on feedback
- Add commission tracking
- Expand creator pool to 100
- Target 200 restaurants

## Budget Estimate

### Development (3 months)
- 2 Full-stack developers: $60,000
- 1 Designer: $15,000
- 1 Product Manager: $20,000

### Tools & Infrastructure
- HubSpot: $800/month
- AWS: $500/month
- APIs: $300/month

### Creator Incentives
- Pilot program: $5,000
- Commission pool: $10,000

**Total 3-month budget**: ~$115,000

## Next Steps
1. Validate with 3-5 target creators
2. Design mockups for tagging interface
3. Set up HubSpot account and templates
4. Build MVP tagging tool
5. Run 30-day pilot with 10 creators