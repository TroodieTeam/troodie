# Creator Marketplace Q&A - Investor Technical Deep Dive

## Platform Architecture & Technical Implementation

### Q: How does your matching algorithm work between restaurants and creators?
**A:** Our algorithm considers multiple factors:
- **Creator metrics**: Follower count, engagement rate, content quality score
- **Geographic proximity**: Creators within restaurant's target radius
- **Audience alignment**: Demographics match between creator's audience and restaurant's target customers
- **Historical performance**: Past campaign success rates
- **Content style fit**: Visual aesthetic and brand alignment

**Technical Stack**: PostgreSQL for data storage, recommendation engine built with collaborative filtering, real-time matching via Supabase Edge Functions.

### Q: How do you handle content rights and licensing?
**A:**
- Creators grant restaurants limited commercial usage rights for campaign duration
- Content remains creator-owned for portfolio use
- Smart contracts track usage terms and expiration
- Watermarking system for tracking content distribution
- Built-in DMCA compliance and takedown procedures

### Q: What's your approach to fraud prevention?
**A:** Multi-layer verification:
- **Creator verification**: Social account OAuth, minimum follower thresholds, engagement rate analysis
- **Restaurant verification**: Business license validation, Google Places API verification, manual review for claimed businesses
- **Campaign fulfillment**: GPS check-ins, time-stamped content submission, AI-powered content verification
- **Payment protection**: Escrow system, milestone-based releases, dispute resolution process

## Monetization & Business Model

### Q: How do creators get paid through your platform?
**A:** Multiple payment models:
- **Direct payment**: Restaurants pay creators directly through Stripe Connect
- **Credit system**: Restaurants can offer dining credits (tracked digitally)
- **Hybrid model**: Combination of cash + dining credits
- **Performance bonuses**: Additional payment for exceeding engagement targets

**Revenue Model**: 15-20% platform fee on monetary transactions, 10% on credit redemptions

### Q: What's preventing restaurants from going directly to creators after the first connection?
**A:**
- **Value-add services**: Campaign management tools, performance analytics, content rights management
- **Trust layer**: Escrow payments, dispute resolution, verified creator badges
- **Efficiency gains**: Bulk campaign management, automated content approval workflows
- **Network effects**: Access to growing creator pool, reputation system
- **Legal framework**: Standardized contracts, tax documentation (1099s), liability protection

### Q: How do you handle different restaurant budgets?
**A:**
- **Tiered creator system**: Nano (1K-10K), Micro (10K-100K), Mid (100K-1M), Macro (1M+)
- **Flexible campaign types**: Single post, monthly retainer, event coverage
- **Credit-based campaigns**: For cash-strapped restaurants
- **Group campaigns**: Multiple restaurants pool resources for neighborhood campaigns

## Competitive Differentiation

### Q: How are you different from TikTok's upcoming local guides feature?
**A:**

| Feature | TikTok Local | Troodie |
|---------|-------------|---------|
| **Focus** | User-generated reviews | Professional creator campaigns |
| **Monetization** | Points/gamification | Direct creator payments |
| **Restaurant Control** | Passive recipient | Active campaign management |
| **Content Quality** | Variable UGC | Curated, professional content |
| **Business Tools** | Limited | Full campaign suite |
| **ROI Tracking** | Basic views | Detailed analytics & attribution |

### Q: Why wouldn't restaurants just use Instagram's partnership tools?
**A:**
- **Restaurant-specific features**: Menu item highlighting, seasonal campaign templates
- **Local discovery focus**: Not buried in global content
- **Integrated booking**: Direct reservation/ordering integration
- **Industry benchmarks**: Restaurant-specific performance metrics
- **Multi-platform distribution**: Post once, distribute everywhere

### Q: How do you compete with established influencer marketing platforms?
**A:**
- **Vertical focus**: Deep restaurant industry expertise
- **Lower barrier to entry**: Nano-influencers included
- **Local-first approach**: Neighborhood-level targeting
- **Built-in audience**: Consumer app drives discovery
- **Industry-specific metrics**: Table turns, order values, not just impressions

## Scale & Growth

### Q: How do you solve the chicken-and-egg problem?
**A:** Three-phase approach:
1. **Phase 1**: Build consumer app with restaurant discovery (current)
2. **Phase 2**: Convert power users to creators with low-friction onboarding
3. **Phase 3**: Attract restaurants with existing creator supply

**Current traction**:
- X active users discovering restaurants
- Y% qualify for creator program (40+ saves, 3+ boards)
- Z restaurants claimed profiles

### Q: What's your creator acquisition strategy?
**A:**
- **Organic conversion**: Upgrade active Troodie users to creators
- **Platform partnerships**: Import creator content from Instagram/TikTok
- **Referral program**: Creators earn for bringing other creators
- **Event strategy**: Food festival partnerships, creator meetups
- **Education content**: "Become a Food Creator" course/certification

### Q: How do you ensure content quality at scale?
**A:**
- **AI-powered QC**: Automatic flagging of low-quality images/videos
- **Creator tiers**: Higher tiers get premium campaign access
- **Community moderation**: Peer review system
- **Restaurant feedback loop**: Rating system affects future matching
- **Content templates**: Professional presets for consistency

## Technical Capabilities

### Q: Why is video not implemented yet?
**A:** Strategic sequencing:
- **Current focus**: Nail photo-based campaigns first (lower bandwidth, easier QC)
- **Infrastructure ready**: Supabase Storage supports video, CDN configured
- **Planned Q2 2025**: Video campaigns with TikTok/Reels integration
- **Technical approach**: HLS streaming, automated transcoding, 60-second limits initially

### Q: How does cross-platform content distribution work?
**A:**
- **API integrations**: Direct posting to Instagram, TikTok, Facebook
- **Content adaptation**: Auto-formatting for each platform's specifications
- **Tracking pixels**: Attribution across platforms
- **Rights management**: Platform-specific usage terms
- **Performance aggregation**: Unified analytics dashboard

### Q: What's your approach to AI/ML?
**A:** Four key areas:
1. **Content quality scoring**: Computer vision for food photo quality
2. **Caption generation**: AI-assisted writing with brand voice
3. **Trend prediction**: Identify emerging food trends from content
4. **Fraud detection**: Anomaly detection in engagement patterns

**Tech stack**: OpenAI API for text, custom TensorFlow models for images

## Risk Mitigation

### Q: What if TikTok or Instagram adds similar features?
**A:**
- **Defensibility**: Direct restaurant relationships, specialized tools
- **Platform agnostic**: We're a layer above social platforms
- **Industry depth**: Restaurant-specific features they won't build
- **B2B focus**: Enterprise features for restaurant chains
- **Data moat**: Historical campaign performance data

### Q: How do you handle negative reviews or campaigns gone wrong?
**A:**
- **Content approval**: Restaurants review before posting
- **Crisis management**: 24-hour takedown capability
- **Insurance**: Creator liability insurance offered
- **Mediation process**: Built-in dispute resolution
- **Reputation recovery**: Follow-up campaign strategies

### Q: What about fake followers or engagement?
**A:**
- **Third-party verification**: Integration with HypeAuditor/Similar
- **Engagement analysis**: Historical pattern recognition
- **Performance guarantees**: Minimum engagement thresholds
- **Clawback provisions**: Payment reversal for proven fraud
- **Ongoing monitoring**: Real-time engagement tracking

## Financial Projections & Metrics

### Q: What are your key metrics?
**Current metrics** (example):
- GMV: $X per month in creator campaigns
- Take rate: 15-20%
- CAC: $X per restaurant, $Y per creator
- LTV: $X per restaurant (12-month)
- Gross margin: 70%

**Growth metrics**:
- MoM creator growth: X%
- MoM restaurant growth: Y%
- Campaign success rate: Z%
- Creator retention: X% monthly active

### Q: Path to profitability?
**A:**
- **Year 1**: Focus on GMV growth, reinvest in product
- **Year 2**: Optimize take rate, add premium features
- **Year 3**: Profitability at city level
- **Year 4**: Company-wide profitability

**Unit economics**: Positive contribution margin per campaign after 6 months

## Future Roadmap

### Q: What's the 5-year vision?
**A:** Three horizons:
1. **Horizon 1** (0-2 years): Dominate local creator-restaurant marketplace
2. **Horizon 2** (2-4 years): Expand to all local businesses, become the "Shopify for creator commerce"
3. **Horizon 3** (4-5 years): Global platform, AI-powered campaign automation, potential acquisition target

### Q: What features are on the roadmap?
**Next 6 months**:
- Video content support
- TikTok/Instagram content import
- Automated campaign workflows
- Restaurant analytics dashboard
- Creator certification program

**Next 12 months**:
- Multi-restaurant campaigns
- Franchise support
- API for POS integration
- White-label solution for chains
- International expansion (English-speaking markets)

## Team & Execution

### Q: How will you build the technical team?
**A:**
- **Current**: Founder (technical) + 2 engineers
- **Next hires**: Senior backend engineer, ML engineer, QA lead
- **Advisory**: Former Instagram/DoorDash product leaders
- **Outsourced initially**: Video processing, payment compliance

### Q: What are the biggest technical risks?
**A:**
1. **Scale risk**: Mitigated with serverless architecture (Supabase/Vercel)
2. **Content moderation**: AI + human review hybrid approach
3. **Platform dependency**: Multi-platform strategy, own the relationship
4. **Payment complexity**: Stripe Connect handles compliance
5. **Data privacy**: GDPR/CCPA compliant from day one

---

## Quick Facts for Pitch
- **TAM**: $10B influencer marketing × 15% restaurant industry = $1.5B
- **Current traction**: X restaurants, Y creators, Z GMV
- **Competitive moat**: Network effects + industry-specific features
- **Capital efficiency**: $X revenue per $ raised
- **Exit potential**: Strategic buyers (DoorDash, Toast, Meta) or PE roll-up