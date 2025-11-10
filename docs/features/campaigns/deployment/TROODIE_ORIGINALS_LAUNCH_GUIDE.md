# Troodie Originals Campaign - Launch Guide

**Campaign:** "Troodie Creators: Local Gems"
**Budget:** $250 ($50 per creator × 5 creators)
**Objective:** Generate high-quality UGC to inspire restaurants to post opportunities
**Launch Date:** TBD
**Status:** Ready for Launch

---

## 🎯 Campaign Overview

### What is "Troodie Creators: Local Gems"?

The first Troodie-sponsored campaign designed to:
1. Demonstrate the value of the creator marketplace
2. Generate authentic user-generated content
3. Showcase successful creator-restaurant collaborations
4. Inspire restaurants to post their own opportunities
5. Build initial momentum for the platform

### Campaign Details

**Type:** Troodie Direct (Platform-Sponsored)
**Budget:** $250 total
**Creators:** 5 creators @ $50 each
**Duration:** 30 days from launch
**Content Type:** 15-45 second vertical video (Instagram Reels or TikTok)
**Platform:** Instagram, TikTok

---

## 📋 Pre-Launch Checklist

### Technical Requirements
- [ ] Database migration deployed to production
- [ ] Enhanced deliverables system tested
- [ ] App builds deployed (iOS + Android)
- [ ] Troodie system account verified (kouame@troodieapp.com)
- [ ] Campaign creation script ready

### Campaign Setup
- [ ] Campaign created in database
- [ ] Budget allocated ($250)
- [ ] Deliverable requirements configured
- [ ] Campaign visible in admin dashboard
- [ ] Campaign appears in creator marketplace

### Marketing Materials
- [ ] Campaign brief finalized
- [ ] Creator recruitment messaging prepared
- [ ] Social media announcement posts ready
- [ ] Email templates for creator outreach
- [ ] Example content/inspiration posts collected

### Legal/Compliance
- [ ] Creator payment terms reviewed
- [ ] 1099 requirements understood (if applicable)
- [ ] FTC disclosure requirements documented
- [ ] Content rights agreement in place
- [ ] Payment processing setup (Stripe Connect)

---

## 🚀 Launch Process

### Step 1: Create Campaign in Database

Run the campaign creation script:

```bash
# Option A: Via Supabase SQL Editor
# 1. Open https://supabase.com/dashboard/project/tcultsriqunnxujqiwea/sql/new
# 2. Copy scripts/create-troodie-originals-campaign.sql
# 3. Paste and execute

# Option B: Via psql
psql "postgresql://postgres:PASSWORD@db.tcultsriqunnxujqiwea.supabase.co:5432/postgres" \
  -f scripts/create-troodie-originals-campaign.sql
```

**Verify Success:**
- Campaign ID returned
- Campaign visible in admin dashboard
- Status = "active"
- Deliverable requirements set

### Step 2: Recruit Creators

#### Target Creator Profile
- **Followers:** 1,000 - 10,000 (micro-influencers)
- **Content Quality:** Strong food photography/videography
- **Engagement Rate:** >3%
- **Location:** Mix of cities (Charlotte, Raleigh, Durham, etc.)
- **Style:** Authentic, relatable, not overly polished

#### Recruitment Channels

**1. Direct Outreach (Most Effective)**
- Identify 10-15 target creators on Instagram/TikTok
- Send personalized DM:

```
Hi [Name]! 👋

We're launching Troodie, a creator marketplace connecting food creators with local restaurants. We're looking for authentic creators to be part of our inaugural "Local Gems" campaign.

✨ What's involved:
- Create a 15-45 sec reel at your favorite local spot
- $50 compensation (paid after posting)
- Full creative freedom
- Help launch something exciting!

Interested? Download Troodie and apply for the "Local Gems" campaign. Would love to have you as part of our founding creators!

[Link to app]
```

**2. Email to Existing Creator Waitlist**

Subject: "You're Invited: Troodie's First Creator Campaign ($50)"

```
Hey [Name],

You signed up early for Troodie, and we're excited to invite you to our first campaign!

🎬 Campaign: "Troodie Creators: Local Gems"
💰 Compensation: $50 cash
📍 Your Mission: Feature your favorite local spot in a 15-45 sec reel

We're looking for 5 authentic creators to kick things off. First come, first served!

[Apply Now Button]

- The Troodie Team
```

**3. Social Media Announcement**

Instagram/Twitter Post:
```
🚨 CALLING ALL FOOD CREATORS 🚨

We're launching Troodie's first campaign: "Local Gems"

💸 $50 per creator
📱 15-45 sec reel
🎥 Showcase your favorite local spot
🌟 Be a founding Troodie creator

Limited to 5 creators. Apply now! 👇
[Link]

#TroodieCreatorMarketplace #FoodCreators #UGC
```

**4. Creator Communities**
- Post in Facebook groups (food bloggers, local influencers)
- Reddit (r/InstagramMarketing, local city subreddits)
- Discord servers (creator communities)

### Step 3: Review Applications

**Application Review Criteria:**
- [ ] Portfolio quality (3-5 sample photos/videos)
- [ ] Engagement rate on social media
- [ ] Content style (authentic, not overly branded)
- [ ] Location (prefer diverse cities)
- [ ] Follower count (1K-10K sweet spot)

**Selection Process:**
1. Applications come in via app
2. Review portfolios in admin dashboard
3. Accept first 5 qualified creators
4. Send acceptance notification
5. Send campaign brief and requirements

**Timeline:** Accept creators within 24 hours of application

### Step 4: Onboard Accepted Creators

**Send Welcome Email:**

```
Subject: You're in! Welcome to Troodie Originals: Local Gems

Hi [Name]!

Congratulations! You've been selected for Troodie's "Local Gems" campaign. 🎉

Here's what happens next:

📝 YOUR MISSION:
Create a 15-45 second reel featuring your favorite local restaurant. Show what makes it special - the food, atmosphere, experience, whatever you love about it!

📸 REQUIREMENTS:
✓ Vertical video (15-45 seconds)
✓ Post on Instagram Reels or TikTok
✓ Tag @TroodieApp in your post
✓ Use #TroodieCreatorMarketplace
✓ Include this CTA at the end: "I found this opportunity through the Troodie Creator Marketplace — if you're a creator looking to collaborate with restaurants, download Troodie!"

💰 PAYMENT:
$50 paid after you post and submit the link in the app.

⏰ DEADLINE:
Post within 2 weeks of acceptance.

🔗 SUBMIT YOUR DELIVERABLE:
1. Post your reel
2. Open Troodie app
3. Go to "My Campaigns"
4. Tap "Submit Deliverable"
5. Paste your post URL

Questions? Reply to this email or DM us @TroodieApp

Can't wait to see what you create! 🙌

- The Troodie Team

P.S. The restaurant is your choice! Pick somewhere you genuinely love.
```

### Step 5: Monitor Submissions

**Daily Monitoring:**
- [ ] Check deliverable submissions in restaurant dashboard
- [ ] Review submitted content quality
- [ ] Approve deliverables within 24 hours
- [ ] Track engagement metrics on posts

**Metrics to Track:**
- Application rate
- Acceptance rate
- Submission completion rate (% of accepted creators who submit)
- Average time to submission
- Content quality scores
- Engagement metrics (views, likes, comments, shares)
- Hashtag usage accuracy
- CTA inclusion rate

### Step 6: Review and Approve Deliverables

**Review Checklist:**
- [ ] Post is live and public
- [ ] Video length is 15-45 seconds
- [ ] Restaurant is featured prominently
- [ ] @TroodieApp tag included
- [ ] #TroodieCreatorMarketplace hashtag included
- [ ] CTA about Troodie included (exact wording flexible)
- [ ] Content quality meets standards

**Approval Timeline:**
- Review within 12 hours of submission (aim for same day)
- Approve if all requirements met
- Request changes if minor issues
- Only reject if completely off-brief

**Feedback Examples:**

✅ Approve: "This is perfect! Love the authentic vibe and great use of the CTA. Payment processing now!"

⚠️ Request Changes: "Looks great! Could you add the hashtag #TroodieCreatorMarketplace? Then we're good to approve."

❌ Reject: "This doesn't feature a restaurant as required in the brief. Please create new content showing your visit to a local spot."

### Step 7: Process Payments

**Payment Workflow:**
1. Deliverable approved → Payment triggered
2. Stripe Connect transfer initiated
3. Creator receives payment (3-5 business days)
4. Send payment confirmation email

**Payment Confirmation Email:**

```
Subject: Payment Sent! $50 for Troodie Originals Campaign

Hi [Name]!

Your deliverable has been approved and payment is on the way! 💸

Payment Details:
- Amount: $50
- Method: Stripe transfer to your connected account
- Expected arrival: 3-5 business days

Campaign: Troodie Creators: Local Gems
Post: [URL]

Thank you for being a founding Troodie creator! We hope to work with you on many more campaigns. 🙌

Keep an eye out for new opportunities in the Troodie app!

- The Troodie Team
```

### Step 8: Measure Results

**Success Metrics:**

| Metric | Target | Actual |
|--------|--------|--------|
| Creators Applied | 10+ | ___ |
| Creators Accepted | 5 | ___ |
| Deliverables Submitted | 5/5 (100%) | ___ |
| Submission Timeline | <2 weeks avg | ___ |
| Approval Rate | 100% (first try) | ___ |
| Total Reach | 25,000+ | ___ |
| Avg Engagement Rate | >3% | ___ |
| Hashtag Usage | 100% | ___ |
| CTA Inclusion | 100% | ___ |

**Content Quality Assessment:**
- [ ] Professional video quality
- [ ] Authentic storytelling
- [ ] Clear restaurant features
- [ ] Engaging hook (first 3 seconds)
- [ ] Strong CTA delivery
- [ ] On-brand for Troodie

---

## 📊 Post-Campaign Analysis

### Week 1 Review (After 5 submissions)

**Questions to Answer:**
1. What was the application → acceptance → submission rate?
2. Which creators produced the highest quality content?
3. What was the average engagement per post?
4. Did creators follow the brief accurately?
5. How long did the review/approval process take?
6. Were there any payment issues?

**Action Items:**
- Identify top performers for future campaigns
- Document common issues/feedback
- Refine creator brief based on learnings
- Calculate true ROI (reach, engagement, restaurant interest)

### Week 2-4: Amplification

**Leverage the Content:**
1. **Repost on Troodie Channels**
   - Instagram: Repost to stories with creator tag
   - TikTok: Duet/stitch best posts
   - Website: Feature in "Creator Spotlight"

2. **Share with Restaurants**
   - Email top-performing posts to restaurant prospects
   - "This is what creators are making about restaurants like yours"
   - Include engagement metrics

3. **Create Case Study**
   - Document campaign results
   - Create PDF showcasing best content
   - Use in sales/marketing materials

4. **Thank You Posts**
   - Feature all 5 creators in a thank-you post
   - Tag each creator
   - Build community feeling

### Month 1: Restaurant Acquisition

**Use Campaign Results to Drive Restaurant Sign-Ups:**

Sales Email Template:
```
Subject: See What [X] Creators Are Saying About Local Restaurants

Hi [Restaurant Name],

We just wrapped up our first campaign with food creators in [City]. Check out what they created about local spots like yours:

[Embed/Link to top posts]

These 5 creators reached 25,000+ people with authentic content about their favorite local restaurants.

Want creators making content like this about your restaurant? Troodie connects you with local food creators.

Post your first opportunity for free → [Link]

- Kouame, Troodie
```

---

## 🚨 Troubleshooting

### Issue: Not Enough Applications

**Solutions:**
- Increase compensation to $75-100
- Extend application window
- Broaden target creator criteria
- Increase outreach efforts
- Offer bonus for first 3 applicants

### Issue: Low Quality Submissions

**Solutions:**
- Provide more detailed brief
- Share example content
- Offer 1-on-1 consultation
- Allow resubmissions without penalty
- Tighten application screening

### Issue: Creators Not Submitting

**Solutions:**
- Send reminder emails at 7 days, 10 days, 13 days
- Offer to extend deadline
- Ask if they need support
- Remove non-responsive creators, recruit replacements

### Issue: Payment Processing Delays

**Solutions:**
- Check Stripe Connect setup
- Verify creator payment info
- Manual payment via Venmo/PayPal if needed
- Communicate delays proactively

---

## ✅ Post-Launch Checklist

- [ ] All 5 creators recruited and accepted
- [ ] All creators onboarded with welcome email
- [ ] All 5 deliverables submitted
- [ ] All deliverables reviewed and approved
- [ ] All payments processed
- [ ] Campaign analytics documented
- [ ] Top content identified for reuse
- [ ] Creator feedback collected
- [ ] Learnings documented
- [ ] Next campaign planned

---

## 📈 Success Criteria

**Must-Haves (Critical):**
- [ ] 5 creators complete campaign
- [ ] 100% submission rate
- [ ] All content meets quality standards
- [ ] $250 budget not exceeded
- [ ] Zero payment issues
- [ ] Zero creator complaints

**Nice-to-Haves (Ideal):**
- [ ] Average engagement >3%
- [ ] Total reach >30,000
- [ ] 2+ restaurants inquire about posting campaigns
- [ ] Creators request to do more campaigns
- [ ] Content usable in marketing materials
- [ ] Local press coverage (bonus!)

---

## 🔄 Next Campaigns

Based on learnings from "Local Gems":

**Campaign 2:** "Brunch Spotlight" ($250, 5 creators, brunch-focused)
**Campaign 3:** "Hidden Gems" ($500, 10 creators, lesser-known spots)
**Campaign 4:** Partner with specific restaurant ($200-500, mixed funding)

---

## 📞 Support & Contacts

**Campaign Manager:** [Name]
**Payment Issues:** [Email]
**Technical Issues:** [Email]
**Creator Support:** [Email/DM]

---

**Launch Status:** 🟢 **READY TO LAUNCH**

**Prerequisites Complete:** All systems go
**Next Action:** Execute Step 1 (Create Campaign in Database)
**Timeline:** Launch within 48 hours of readiness

---

_Last Updated: October 16, 2025_
_Campaign Budget: $250_
_Expected ROI: High-quality UGC + Platform validation_
