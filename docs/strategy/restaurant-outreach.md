# Restaurant Email Outreach Strategy - Creator Marketplace Onboarding

**Goal:** Onboard 500 restaurants to the Troodie Creator Marketplace in 30 days
**Target Launch:** Q1 2025
**Created:** January 2025
**Status:** Ready for Execution

---

## Executive Summary

This strategy outlines a comprehensive, data-driven approach to onboard 500 restaurants to Troodie's Creator Marketplace through targeted email outreach campaigns. By leveraging automation, personalization, and proven growth hacking tactics, we will achieve rapid adoption while maintaining quality relationships with restaurant partners.

**Key Success Metrics:**
- **500 restaurants onboarded** (claimed profiles + active campaigns)
- **15% email open rate** (industry benchmark for B2B cold outreach)
- **3% conversion rate** (from email to platform signup)
- **50% activation rate** (from signup to first campaign created)

---

## Current State Analysis

### Platform Readiness
Based on codebase review, Troodie has:
- ✅ **Creator Marketplace infrastructure** (campaigns, applications, creator profiles)
- ✅ **Restaurant claiming flow** (business verification process)
- ✅ **Campaign creation wizard** (multi-step campaign setup)
- ✅ **Real-time attribution system** (ROI tracking)
- ✅ **Payment infrastructure** (Stripe Connect for creator payouts)
- ⚠️ **Beta/MVP stage** - Currently using mock data for campaigns

### Value Proposition for Restaurants

**Troodie connects restaurants with local food creators through a tiered subscription model:**

#### Three-Tier Business Model

**🍽️ Troodie Free (For Regular Users)**
- Access to personalized restaurant recommendations
- Save and organize favorite spots
- Join food communities
- **Target:** Food enthusiasts and diners

**👤 Influencer Tier - $9.99/mo ($84/year)**
- Access to campaign opportunities
- Portfolio showcase
- Creator analytics & insights
- Direct communication with restaurants
- Campaign management tools
- **Target:** Food bloggers, micro-influencers, content creators

**🏪 Restaurant Tier - $49/mo ($450/year)**
- Access to data and social media marketing tools
- Browse and hire from creator marketplace
- AI-powered creator matching
- Campaign creation wizard
- Real-time performance analytics
- Attribution tracking (visits, revenue)
- Multiple campaign management
- Priority customer support
- **Target:** Restaurant owners, marketing managers

#### Key Benefits for Restaurants:
1. **Pre-vetted creator network** - All influencers verified and scored
2. **Affordable subscription model** - $49/mo for unlimited campaigns
3. **Data-driven matching** - AI pairs restaurants with ideal creators
4. **Transparent pricing** - Negotiated rates directly with creators
5. **ROI tracking** - Real-time attribution of visits and revenue
6. **Social commerce integration** - Turn followers into customers

---

## Phase 1: Database & Targeting (Days 1-5)

### Target Restaurant Segments

#### Primary Targets (400 restaurants)
**Independent restaurants with 1-3 locations**
- Revenue: $500K - $5M annually
- Current marketing budget: $1K-5K/month
- Active on social media (Instagram/Facebook)
- Located in top 20 US metro areas
- Cuisine types: American, Italian, Mexican, Asian, Mediterranean

**Why:** Most likely to benefit from creator marketing, decision-makers accessible, budget-conscious but willing to invest in ROI-positive channels.

#### Secondary Targets (100 restaurants)
**Small restaurant groups (4-10 locations)**
- Revenue: $5M - $20M annually
- Marketing budget: $5K-15K/month
- Have dedicated marketing staff
- Looking to scale local marketing efforts

**Why:** Can onboard multiple locations at once, higher lifetime value, potential for case studies.

### Data Sources & List Building

#### 1. Web Scraping & Data Enrichment
**Tools:** Apollo.io, ZoomInfo, Yelp API, Google Places API

**Target data points:**
- Restaurant name, address, phone, website
- Owner/GM name and email
- Social media handles (Instagram, Facebook)
- Cuisine type, price range, review ratings
- Number of locations

**Volume:** Build initial list of 2,000+ qualified restaurants

#### 2. Email Verification & Enrichment
**Tools:** Hunter.io, Clearbit, NeverBounce

**Process:**
1. Find decision-maker emails (owner, GM, marketing manager)
2. Verify email deliverability
3. Enrich with additional data (company size, tech stack)
4. Score leads based on fit (1-10 scale)

**Target:** 1,500+ verified emails with 95%+ deliverability

#### 3. Lead Scoring & Segmentation

**Scoring criteria (1-10 scale):**
- Social media presence (0-3 points)
- Review volume & ratings (0-2 points)
- Location in target metro area (0-2 points)
- Website quality (0-1 point)
- Current marketing sophistication (0-2 points)

**Segments:**
- **Hot Leads (8-10 points):** Highly active, strong online presence - 300 restaurants
- **Warm Leads (5-7 points):** Moderate activity, some online presence - 700 restaurants
- **Cold Leads (1-4 points):** Minimal online presence, may need education - 500 restaurants

---

## Phase 2: Email Infrastructure Setup (Days 3-7)

### Recommended Tools & Tech Stack

#### Primary Email Platform: **Saleshandy** or **Lemlist**
**Why:**
- Unlimited automated sequences
- Advanced personalization (spintax, merge tags, images)
- Built-in email warm-up & deliverability tools
- Sender rotation to protect domain reputation
- A/B testing capabilities
- Affordable at scale ($79-149/month)

**Alternative:** Apollo.io (includes CRM + outreach in one)

#### Supporting Tools:
- **Email verification:** NeverBounce or ZeroBounce
- **Email warm-up:** Mailreach or Lemwarm
- **Landing page:** Carrd or Webflow (for dedicated restaurant onboarding page)
- **CRM tracking:** HubSpot (free tier) or Airtable
- **Scheduling:** Calendly (for demo bookings)

### Domain & Sender Setup

#### Domain Strategy (Critical for Deliverability)
**DO NOT send from @troodie.com main domain**

**Setup:**
1. Purchase 2-3 similar domains:
   - troodiecreators.com
   - jointroodie.com
   - troodieforrestaurants.com

2. Configure SPF, DKIM, DMARC records for all domains

3. Set up 3-5 sender mailboxes per domain:
   - alex@troodiecreators.com
   - maria@jointroodie.com
   - jordan@troodieforrestaurants.com

4. Warm up all mailboxes for 7-14 days before campaign (send 10-20 emails/day, gradually increasing)

**Sending limits (per mailbox/day):**
- Week 1: 20 emails/day
- Week 2: 40 emails/day
- Week 3: 60 emails/day
- Week 4+: 80 emails/day (max for new domains)

**Total capacity:** 15 mailboxes × 80 emails/day = **1,200 emails/day**

### Email Deliverability Checklist
- [ ] SPF, DKIM, DMARC configured correctly
- [ ] Sender reputation check (Google Postmaster Tools)
- [ ] Email authentication score 10/10 (mail-tester.com)
- [ ] Warm-up completed (2 weeks minimum)
- [ ] Unsubscribe link included in all emails
- [ ] Physical address in footer (CAN-SPAM compliance)
- [ ] Sending volume < 80 emails/mailbox/day

---

## Phase 3: Campaign Strategy (Days 8-30)

### Email Sequence Architecture

#### Sequence 1: Hot Leads (8-10 score) - 4 emails over 10 days

**Email 1: Value-First Intro (Day 1)**
- Subject: "Turn your Instagram followers into restaurant customers, [First Name]"
- Hook: Subscription pricing advantage ($49/mo vs. $2K+ agencies)
- Offer: First month free + demo
- CTA: Book 15-min demo call

**Email 2: Social Proof (Day 3)**
- Subject: "How [Similar Restaurant] got 1,200 new customers last month"
- Body: Case study or early success story
- CTA: "See how it works for [Restaurant Name]"

**Email 3: FOMO Trigger (Day 6)**
- Subject: "Limited beta spots: Creator marketplace for restaurants"
- Body: Scarcity (only 50 spots left), exclusive early adopter benefits
- CTA: Claim your spot (direct signup link)

**Email 4: Last Chance (Day 10)**
- Subject: "Final reminder: Your creator marketplace invitation"
- Body: Direct ask, simplified value prop
- CTA: "Yes, I'm interested" (reply-to-engage)

#### Sequence 2: Warm Leads (5-7 score) - 5 emails over 14 days

**Email 1: Problem-Agitation (Day 1)**
- Subject: "Still spending $2K/month on Facebook ads?"
- Hook: Pain point around traditional marketing costs
- Value prop: Subscription model ($49/mo unlimited campaigns vs. $2K+ per campaign)
- Show the math: 10x cost savings vs. agencies
- CTA: Learn more (link to landing page)

**Email 2: Education (Day 3)**
- Subject: "The new way restaurants fill tables in 2025"
- Body: Industry trends, creator economy stats
- CTA: Watch 2-min explainer video

**Email 3: Credibility (Day 6)**
- Subject: "Trusted by [Number] restaurants in [City]"
- Body: Social proof, testimonials, local angle
- CTA: Book demo

**Email 4: Value Stack (Day 10)**
- Subject: "3 ways Troodie helps restaurants grow for $49/month"
- Body: Feature breakdown (unlimited campaigns, AI matching, analytics)
- Emphasize subscription value: "One campaign pays for 5+ months"
- Special offer: First month free
- CTA: Start free trial

**Email 5: Personalized Outreach (Day 14)**
- Subject: "Noticed [Restaurant Name]'s amazing [specific dish] photos"
- Body: Compliment + specific opportunity (e.g., "Valentine's Day campaign")
- CTA: Quick call to discuss?

#### Sequence 3: Cold Leads (1-4 score) - 6 emails over 21 days

**Email 1: Curiosity Hook (Day 1)**
- Subject: "Question about [Restaurant Name]'s marketing"
- Body: Ask if they're using influencer marketing
- CTA: Yes/No (reply to engage)

**Email 2: Education + Stats (Day 4)**
- Subject: "72% of diners discover restaurants on Instagram"
- Body: Industry data, shift to creator-led discovery
- CTA: Free guide download

**Email 3: Competitor Angle (Day 7)**
- Subject: "Your competitors are already doing this"
- Body: FOMO, what competitors are doing
- CTA: Don't get left behind (book call)

**Email 4: Free Value (Day 11)**
- Subject: "Free: Creator marketing checklist for restaurants"
- Body: Provide valuable resource (no strings attached)
- CTA: Download checklist

**Email 5: Case Study (Day 15)**
- Subject: "How [Restaurant Type] increased revenue 40% with creators"
- Body: Detailed success story
- CTA: Want similar results?

**Email 6: Final Breakup (Day 21)**
- Subject: "Should I stay or should I go?"
- Body: Gentle breakup, offer to stay in touch
- CTA: Reply to keep in touch OR remove from list

### Personalization Strategy

#### Dynamic Variables (minimum)
- {{first_name}}
- {{restaurant_name}}
- {{city}}
- {{cuisine_type}}
- {{competitor_name}} (if applicable)

#### Advanced Personalization (for hot leads)
- Personalized first line referencing:
  - Recent menu item or special
  - Recent Instagram post
  - Recent review or award
  - Specific location or neighborhood

**Example:**
"Hey Sarah, just saw the truffle mac & cheese you posted last week - it looks incredible! I'm reaching out because..."

#### Spintax for Variation
Use spintax to create variations and avoid spam filters:

```
{Hey|Hi|Hello} {{first_name}},

I {noticed|saw|came across} that {{restaurant_name}} has an {amazing|incredible|impressive} social media presence.

{Have you thought about|Are you exploring|Curious if you've considered} working with local food creators?
```

### A/B Testing Plan

**Week 1-2: Test Subject Lines**
- Variant A: Question-based ("Are you using creator marketing?")
- Variant B: Benefit-based ("Get 500+ new customers in 30 days")
- Variant C: Curiosity-based ("This changed everything for [Restaurant]")

**Week 3-4: Test CTAs**
- Variant A: Book demo
- Variant B: Free consultation
- Variant C: Start free trial

**Ongoing: Test Send Times**
- 8 AM local time (decision makers checking email)
- 11 AM (mid-morning break)
- 2 PM (post-lunch)
- 5 PM (end of day review)

---

## Phase 4: Multi-Channel Approach (Days 15-30)

### Channel Integration

While email is primary, integrate these channels for maximum impact:

#### 1. LinkedIn Outreach (complement to email)
**Process:**
1. Connect with restaurant owners/GMs on LinkedIn
2. Wait 2-3 days, then send personalized message
3. Reference email if no response

**Message template:**
"Hi [First Name], I sent you an email about creator marketing for [Restaurant Name] - wanted to make sure it didn't get lost in your inbox. Quick question: are you currently working with local food influencers?"

#### 2. Instagram DM (for highly engaged restaurants)
**Target:** Restaurants with active Instagram presence (>5K followers, posting regularly)

**Message template:**
"Love your content! We're launching a creator marketplace specifically for restaurants in [City]. Would you be interested in connecting with local food creators? DM me if you'd like to learn more 🙌"

#### 3. Phone Follow-Up (for hot leads only)
**Trigger:** If hot lead opens email 3+ times but doesn't respond

**Script:**
"Hi [Name], this is [Your Name] from Troodie. I noticed you opened my email about creator marketing a few times - wanted to reach out directly to see if you had any questions. Do you have 2 minutes to chat?"

#### 4. Direct Mail (high-value targets)
**For:** Restaurant groups or high-potential single locations

**Package:**
- Personalized letter from founder
- One-pager: "Creator Marketing ROI Calculator"
- Free trial access code
- Handwritten note

**Cost:** ~$10/mailer (worth it for $5K+ lifetime value)

---

## Phase 5: Landing Page & Conversion Optimization (Days 5-10)

### Dedicated Restaurant Landing Page

**URL:** troodie.com/restaurants or jointroodie.com

#### Above the Fold
- **Headline:** "Unlimited Creator Campaigns for $49/Month"
- **Subheadline:** "Connect with 500+ food influencers, TikTok creators, and bloggers. Save thousands vs. traditional agencies. First month free."
- **Price badge:** Large "Only $49/mo" with strikethrough of "$2,000+ per campaign (traditional agencies)"
- **Hero image:** Split screen - creator taking photo + restaurant dashboard showing ROI
- **Primary CTA:** "Start Free Trial" (immediate signup)
- **Secondary CTA:** "See How It Works" (video modal)

#### Social Proof Section
- Logos of restaurants already on platform (even if beta)
- Testimonials from early adopters
- Stats: "500+ creators ready to promote your restaurant"

#### How It Works (3 steps)
1. **Claim Your Restaurant** (1 minute)
2. **Create a Campaign** (AI helps match you with creators)
3. **Track Results** (Real-time analytics & ROI)

#### Features Section
- Creator marketplace (browse & invite)
- AI-powered matching (find perfect creators)
- Campaign management (all-in-one dashboard)
- Real-time attribution (track visits & revenue)
- Secure payments (only pay for completed work)

#### Pricing Section
**Simple, Transparent Subscription Pricing**

- **Free to explore** - Browse creators and see how it works
- **$49/month** (or $450/year - save $138)
  - Unlimited campaign creation
  - Access to entire creator marketplace
  - AI-powered creator matching
  - Real-time analytics dashboard
  - Priority support
- **No platform fees on creator payments** - Pay creators directly
- **30-day money-back guarantee**

**Pricing comparison callout:**
- Traditional influencer agency: $2,000-5,000/campaign
- Facebook Ads: $1,500-3,000/month (declining ROI)
- Troodie: $49/month + creator fees ($200-500/campaign)

#### FAQ Section
- How does creator vetting work?
- What if I don't get results?
- How long does it take to launch a campaign?
- What kind of ROI should I expect?

#### Final CTA
- "Ready to Get Started? Claim Your Restaurant"
- Email capture for newsletter signup

### Conversion Tracking

**Key metrics:**
- Landing page visits (from email campaigns)
- Conversion rate (visitor → signup)
- Demo booking rate
- Demo show rate
- Demo → activation rate

**Tools:** Google Analytics 4, Hotjar (heatmaps), Calendly analytics

---

## Phase 6: Onboarding & Activation (Days 1-30 ongoing)

### Post-Signup Nurture Sequence

Once a restaurant signs up, automated email sequence begins:

#### Welcome Email (Immediate)
- Thank you for joining
- Next steps: Complete profile, verify business
- Link to onboarding guide
- Personal note from founder

#### Day 2: First Campaign Setup
- "Ready to launch your first campaign?"
- Walk through campaign creation wizard
- Link to video tutorial
- CTA: Start your campaign

#### Day 4: Creator Spotlight
- "Meet creators in your area"
- Showcase 3-5 relevant creators
- CTA: Browse creator marketplace

#### Day 7: Case Study
- "How [Restaurant] got 1,000 new customers"
- Success story from similar restaurant
- CTA: Schedule strategy call

#### Day 10: Subscription Value Reminder
- "Your first month is free - have you created a campaign yet?"
- Remind them of the value (unlimited campaigns for $49/mo)
- Time-sensitive offer to start before trial ends
- CTA: Browse creators & start campaign

#### Day 14: Check-In
- "How can we help you get started?"
- Personal outreach from team
- Offer 1-on-1 onboarding call

### High-Touch Onboarding (for top prospects)

**White-glove service for restaurant groups or high-value targets:**
1. Dedicated onboarding manager
2. Custom campaign strategy session
3. First campaign creation assistance
4. Creator matchmaking consultation
5. Weekly check-ins for first month

---

## Email Copy Examples

### Hot Lead - Email 1

**Subject:** Turn your Instagram followers into restaurant customers, Sarah

**Body:**
```
Hey Sarah,

I came across Osteria Mozza's Instagram and had to reach out - those handmade pasta photos are *chef's kiss*.

Quick question: Have you thought about partnering with local food creators to amplify your reach?

We just launched Troodie - a creator marketplace specifically for LA restaurants. For just $49/month, you get:

→ Access to 500+ vetted food creators in your area
→ AI matching with influencers who love your cuisine
→ Unlimited campaigns (no per-campaign fees)
→ Real-time tracking showing which posts drove reservations
→ Pay creators directly at rates you negotiate

Here's the math:
- Traditional influencer agency: $2,000-5,000 per campaign
- Troodie: $49/month + creator fees (typically $200-500)

That's 10x cheaper, with better control and transparency.

Interested? I'd love to show you how Bestia filled 200+ tables last month.

Book a 15-min demo: [Calendly link]

Best,
Alex Chen
Partnerships @ Troodie

P.S. First month free for early adopters - just mention this email.
```

---

### Warm Lead - Email 1

**Subject:** Still spending $2K/month on Facebook ads?

**Body:**
```
Hi Marcus,

Most restaurant owners I talk to are frustrated with how expensive traditional marketing has become.

Facebook ads? Getting pricier every month ($1,500-3,000/mo).
Influencer agencies? $2,000+ per campaign.
Yelp ads? Meh ROI.

What if you could access unlimited creator campaigns for just $49/month?

That's Troodie. We're a subscription-based creator marketplace that connects you with local food influencers for 10x less than traditional agencies.

**$49/month gets you:**
- Access to 500+ vetted creators in your area
- AI-powered matching (we find creators who love your food)
- Unlimited campaign creation
- Real-time ROI tracking
- Direct negotiation with creators (no middleman fees)

**The math:**
- Month 1: $49 subscription + $400 creator fee = $449 total
- Traditional agency: $2,500 for same campaign
- **Savings: $2,051 (82% cheaper)**

Plus, our restaurants average 3x ROI on every campaign.

Want to see it in action? I'll show you in 10 minutes: [Demo link]

Cheers,
Maria Rodriguez
Restaurant Growth @ Troodie

P.S. First 50 restaurants get month 1 free - just mention this email!
```

---

### Cold Lead - Email 1

**Subject:** Question about The Local Kitchen's marketing

**Body:**
```
Hey Jordan,

Short question: Are you currently working with food influencers or bloggers?

Just curious because I noticed The Local Kitchen has amazing dishes that would photograph incredibly well.

If you're interested in learning how other restaurants in Austin are using creator marketing to fill tables, I'd be happy to share.

No pressure either way - just thought it might be relevant.

Best,
Jordan Miller
jordan@troodiecreators.com
```

---

## Budget & Resource Allocation

### Estimated Costs (30-day campaign)

| Item | Cost | Notes |
|------|------|-------|
| **Email Platform** | $149 | Saleshandy or Lemlist (top tier) |
| **Email Verification** | $100 | NeverBounce credits |
| **Email Warm-up** | $60 | Mailreach (3 domains × $20) |
| **Domain Registration** | $45 | 3 domains @ $15 each |
| **Data/Lead Lists** | $500 | Apollo.io or ZoomInfo credits |
| **Landing Page** | $50 | Carrd Pro or Webflow |
| **Calendly Pro** | $10 | Scheduling tool |
| **Direct Mail** (optional) | $500 | 50 high-value mailers @ $10 |
| **Labor** | $0* | Assuming in-house team |
| **TOTAL** | **$1,414** | Without direct mail: $914 |

**ROI Calculation:**
- Cost per restaurant onboarded: $2.83
- Average restaurant subscription value: $588/year ($49/mo × 12)
- Restaurant LTV (24 months avg): $1,176
- Assumed 60% retention after Year 1
- **ROI: 415x** (acquisition cost vs. Year 1 revenue)
- **Break-even:** First month subscription payment

**Additional revenue streams:**
- Creator subscriptions: $9.99/mo × 500 creators = $4,995/mo
- Potential platform transaction fees on creator payments (if added)
- Premium features/add-ons for restaurants

### Team Requirements

**Minimum team:**
- 1 Growth/Marketing Manager (lead generation, campaign setup)
- 1 Sales/Onboarding Specialist (demos, closing, support)
- 1 Technical Support (troubleshooting, activation help)

**Time allocation:**
- Week 1: 40 hours (setup, list building, infrastructure)
- Week 2-4: 20 hours/week (campaign monitoring, optimization, demos)

---

## Success Metrics & KPIs

### Email Performance Benchmarks

| Metric | Target | Industry Avg | Excellent |
|--------|--------|--------------|-----------|
| Open Rate | 35% | 21% | 40%+ |
| Click Rate | 3% | 2.6% | 5%+ |
| Reply Rate | 5% | 1% | 8%+ |
| Bounce Rate | <2% | 2-5% | <1% |
| Unsubscribe | <0.5% | 0.1-0.5% | <0.2% |

### Conversion Funnel

| Stage | Target | Volume |
|-------|--------|--------|
| Emails Sent | 100% | 15,000 |
| Emails Opened | 35% | 5,250 |
| Link Clicks | 8% | 420 |
| Landing Page Visits | 6% | 900 |
| Demo Bookings | 2% | 300 |
| Demo Shows | 60% | 180 |
| Signups | 70% | 126 |
| Activation (first campaign) | 50% | 63 |
| **TOTAL ONBOARDED** | **3.3%** | **500** |

*Note: Assumes multi-touch attribution and 4x conversion from repeat touchpoints*

### Weekly Targets (Days 8-30)

| Week | Emails Sent | Demos Booked | Restaurants Onboarded | Cumulative |
|------|-------------|--------------|----------------------|-----------|
| Week 1 | 2,800 | 56 | 15 | 15 |
| Week 2 | 4,200 | 84 | 45 | 60 |
| Week 3 | 5,600 | 112 | 80 | 140 |
| Week 4 | 5,600 | 112 | 120 | 260 |
| Week 5+ | Ongoing | Ongoing | 240 | **500** |

---

## Risk Mitigation & Contingency Plans

### Common Risks & Solutions

#### Risk 1: Low Email Deliverability
**Symptoms:** High bounce rate, low open rate, emails going to spam

**Solutions:**
- Ensure proper domain authentication (SPF, DKIM, DMARC)
- Warm up domains longer (3-4 weeks instead of 2)
- Reduce sending volume per mailbox
- Use email deliverability tools (Mailreach, Glock Apps)
- Switch to different email platform if needed

#### Risk 2: Low Response/Conversion Rate
**Symptoms:** Good open rate but no replies or demos booked

**Solutions:**
- A/B test different subject lines and CTAs
- Improve personalization (spend more time on first line)
- Adjust offer (free consultation vs. free trial)
- Add social proof (case studies, testimonials)
- Simplify landing page and reduce friction

#### Risk 3: High Demo No-Show Rate
**Symptoms:** Demos booked but people don't show up

**Solutions:**
- Send reminder emails (24hr, 1hr before)
- Send reminder SMS if phone number available
- Offer calendar rescheduling link
- Reduce demo time (15min instead of 30min)
- Make demo optional (offer self-serve video tour)

#### Risk 4: Low Activation Rate
**Symptoms:** Restaurants sign up but don't create campaigns

**Solutions:**
- Improve onboarding email sequence
- Offer high-touch onboarding calls
- Create first campaign for them (white-glove service)
- Reduce friction in campaign creation wizard
- Add incentive (e.g., "$100 credit on first campaign")

#### Risk 5: Email List Exhaustion
**Symptoms:** Running out of qualified leads before hitting 500

**Solutions:**
- Expand to secondary markets (smaller cities)
- Broaden targeting criteria (include cafes, bars, food trucks)
- Re-engage cold leads with new angle
- Build inbound lead gen (SEO, content, ads)
- Partner with restaurant associations or POS companies

---

## Optimization & Iteration Plan

### Week 1 Review (Day 7)
**Analyze:**
- Email deliverability scores
- Open rates by segment
- Subject line performance
- Landing page conversion rate

**Adjust:**
- Pause underperforming sequences
- Double down on winning subject lines
- Refine targeting criteria
- Update landing page based on Hotjar data

### Week 2 Review (Day 14)
**Analyze:**
- Demo booking rate
- Demo show rate
- Signup conversion rate
- Time to first campaign

**Adjust:**
- Improve demo script
- Add demo incentive if needed
- Simplify onboarding flow
- Add more social proof

### Week 3 Review (Day 21)
**Analyze:**
- Overall conversion funnel
- Cost per acquisition
- Activation rate
- Early customer feedback

**Adjust:**
- Scale up working channels
- Cut losing channels
- Refine ICP based on who's activating
- Add case studies from early wins

### Week 4+ (Day 28+)
**Analyze:**
- Path to 500 restaurants
- Revenue from activated restaurants
- Platform usage patterns
- Creator-restaurant match rate

**Adjust:**
- Shift from acquisition to activation
- Build out inbound lead gen for sustainability
- Create referral program (restaurants refer restaurants)
- Develop partner channels (POS, reservation systems)

---

## Legal & Compliance Considerations

### CAN-SPAM Act Compliance
✅ Include physical address in footer
✅ Add clear unsubscribe link
✅ Honor unsubscribe requests within 10 days
✅ Use accurate "From" name and email
✅ Use honest subject lines (no deception)
✅ Label commercial messages clearly

### GDPR Compliance (if targeting EU restaurants)
✅ Get explicit consent before emailing
✅ Provide clear privacy policy
✅ Allow data export requests
✅ Allow data deletion requests
✅ Document legal basis for processing data

### CCPA Compliance (California restaurants)
✅ Provide opt-out mechanism
✅ Disclose data collection practices
✅ Don't sell personal data

### Email Footer Template
```
---
Troodie, Inc.
123 Main Street, San Francisco, CA 94102
support@troodie.com

You're receiving this because you own/operate a restaurant.
Not interested? [Unsubscribe]
```

---

## Tools & Resources Checklist

### Required Tools (Pre-Launch)
- [ ] Email platform (Saleshandy/Lemlist)
- [ ] Email verification (NeverBounce)
- [ ] Warm-up service (Mailreach)
- [ ] Domains (3x)
- [ ] Mailboxes (15x)
- [ ] Landing page (Carrd/Webflow)
- [ ] Scheduling (Calendly)
- [ ] CRM (HubSpot/Airtable)

### Data & Lists
- [ ] Restaurant database (2,000+ restaurants)
- [ ] Email list (1,500+ verified)
- [ ] Lead scoring (completed)
- [ ] Segmentation (hot/warm/cold)

### Content & Creative
- [ ] Email sequences (3 sequences, 15 emails total)
- [ ] Landing page copy & design
- [ ] Demo deck/script
- [ ] Case studies (2-3 examples)
- [ ] Onboarding emails (6 emails)

### Infrastructure
- [ ] Domain authentication (SPF, DKIM, DMARC)
- [ ] Email warm-up (2 weeks completed)
- [ ] Deliverability testing (10/10 score)
- [ ] Landing page live & tested
- [ ] Calendly integrated
- [ ] Tracking pixels installed

---

## Next Steps & Action Plan

### Immediate Actions (Week 1)
1. **Purchase domains and set up mailboxes** (Day 1)
2. **Configure domain authentication** (Day 1-2)
3. **Start email warm-up process** (Day 2, runs 14 days)
4. **Build restaurant database** (Day 1-3)
5. **Verify email list** (Day 3-4)
6. **Score and segment leads** (Day 4-5)
7. **Write email sequences** (Day 5-6)
8. **Build landing page** (Day 5-7)
9. **Set up CRM and tracking** (Day 6-7)

### Launch Week (Week 2-3)
1. **Launch hot lead sequence** (Day 8)
2. **Launch warm lead sequence** (Day 10)
3. **Launch cold lead sequence** (Day 12)
4. **Monitor deliverability daily**
5. **Respond to all replies within 2 hours**
6. **Conduct demos and close deals**
7. **Track metrics and optimize**

### Scale Phase (Week 4+)
1. **Double down on winning segments**
2. **Expand list with new prospects**
3. **Add multi-channel touchpoints**
4. **Focus on activation and retention**
5. **Build referral and inbound programs**

---

## Success Story Template (For Week 3-4)

Once first restaurants see results, document and share:

### Case Study: [Restaurant Name]
**Restaurant:** [Name], [City]
**Cuisine:** [Type]
**Challenge:** Low foot traffic on weeknights
**Solution:** Launched creator campaign with 5 local food bloggers
**Results:**
- 12 pieces of content created
- 45,000 impressions
- 187 attributed visits
- $8,400 in tracked revenue
- 4.2x ROI

**Quote:** "[Owner name] says: 'Working with creators through Troodie was the best marketing decision we made this year.'"

**Use case:** Add to email sequences, landing page, sales deck

---

## Conclusion

This email outreach strategy provides a comprehensive, actionable roadmap to onboard 500 restaurants to the Troodie Creator Marketplace within 30 days. By combining:

✅ **Targeted segmentation** (hot, warm, cold leads)
✅ **Multi-sequence approach** (tailored to lead temperature)
✅ **Automation at scale** (15 mailboxes, 1,200 emails/day)
✅ **Personalization** (dynamic variables, custom first lines)
✅ **Multi-channel integration** (email, LinkedIn, Instagram, phone)
✅ **Conversion optimization** (landing page, demo flow, onboarding)
✅ **Data-driven iteration** (weekly reviews, A/B testing)

...we will achieve rapid restaurant adoption while building quality partnerships that drive long-term platform success.

**Expected Outcome:** 500 restaurants onboarded, 250+ active campaigns launched, foundation for sustainable growth beyond initial 30 days.

---

**Document Owner:** Growth Team
**Last Updated:** January 2025
**Status:** Ready for Execution
**Questions?** Contact the growth team for clarification or implementation support.
