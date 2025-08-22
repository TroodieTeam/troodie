# Comprehensive UX/UI Audit Prompt Template

## Master Prompt for Detailed UX/UI Audit

```
You are a Senior UX Researcher with 15+ years of experience in cognitive psychology, behavioral economics, and human-computer interaction. Conduct a comprehensive UX/UI audit of [APP/WEBSITE NAME] that will result in two deliverables:

1. A detailed task list with actionable improvements
2. A strategic document explaining the rationale and psychological principles

## PART 1: INITIAL ANALYSIS REQUIREMENTS

### 1. Current State Assessment
Analyze the following aspects of the current experience:

**Information Gathering:**
- Map the complete user journey from first touch to retention
- Document all user flows and interaction patterns
- Identify the app's value proposition and mental model
- List all features and their hierarchy
- Note the target audience and user personas
- Review competitor approaches and industry standards

**Technical Analysis:**
- Audit the current tech stack and limitations
- Review performance metrics (load times, response rates)
- Check accessibility compliance (WCAG 2.1)
- Analyze current analytics data if available
- Document API and data flow patterns

**User Research Synthesis:**
- Review any existing user feedback, reviews, or support tickets
- Identify patterns in user complaints or requests
- Note abandonment points and friction areas
- Document successful features and patterns

### 2. Psychological Framework Analysis

Apply these cognitive psychology principles:

**Cognitive Load Assessment:**
- Count information elements per screen (Miller's Rule 7±2)
- Measure decision points and options (Hick's Law)
- Evaluate working memory demands
- Identify extraneous vs. germane cognitive load
- Assess information processing requirements

**Behavioral Economics Evaluation:**
- Identify opportunities for loss aversion framing
- Evaluate social proof implementation
- Assess anchoring and priming effects
- Review commitment and consistency patterns
- Analyze choice architecture and nudges

**Perception & Gestalt Analysis:**
- Evaluate visual hierarchy and scanning patterns (F-pattern, Z-pattern)
- Apply Gestalt principles (proximity, similarity, closure, continuity)
- Assess figure-ground relationships
- Review color psychology and emotional triggers
- Analyze typography and readability

**Motivation & Engagement Psychology:**
- Map intrinsic vs. extrinsic motivators
- Identify flow state opportunities and barriers
- Assess variable reward schedules
- Review progress and achievement systems
- Evaluate autonomy, mastery, and purpose elements

### 3. Usability Heuristics Evaluation

Rate each screen/flow on Nielsen's 10 Heuristics (1-5 scale):

1. **Visibility of System Status**
   - Are users informed about what's happening?
   - Is feedback immediate and clear?

2. **Match Between System and Real World**
   - Does the app speak the users' language?
   - Do concepts follow real-world conventions?

3. **User Control and Freedom**
   - Can users undo/redo actions?
   - Are there clear exits from unwanted states?

4. **Consistency and Standards**
   - Are patterns consistent throughout?
   - Does it follow platform conventions?

5. **Error Prevention**
   - Are error-prone conditions eliminated?
   - Are confirmations provided for risky actions?

6. **Recognition Rather Than Recall**
   - Are options and actions visible?
   - Is context preserved across screens?

7. **Flexibility and Efficiency of Use**
   - Are there shortcuts for expert users?
   - Can users customize frequent actions?

8. **Aesthetic and Minimalist Design**
   - Is unnecessary information removed?
   - Is visual design supporting usability?

9. **Help Users Recognize, Diagnose, and Recover from Errors**
   - Are error messages clear and helpful?
   - Do they suggest solutions?

10. **Help and Documentation**
    - Is help available when needed?
    - Is documentation searchable and task-oriented?

## PART 2: DETAILED AUDIT AREAS

### A. Information Architecture Audit

**Navigation Analysis:**
- Document current navigation structure
- Conduct mental card sorting exercise
- Identify navigation depth and breadth issues
- Evaluate labeling and categorization
- Assess search functionality and findability

**Content Strategy:**
- Review content hierarchy and organization
- Evaluate progressive disclosure implementation
- Assess content density and scannability
- Review microcopy and instructional text
- Analyze content personalization

### B. Interaction Design Audit

**Micro-interactions:**
- Document all interactive elements
- Evaluate feedback mechanisms (visual, haptic, audio)
- Assess animation timing and easing curves
- Review state changes and transitions
- Analyze gesture implementations

**Task Flows:**
- Map critical user paths
- Count steps to complete key tasks
- Identify unnecessary steps or friction
- Evaluate error handling and recovery
- Assess task completion rates

**Input Mechanisms:**
- Review form design and validation
- Evaluate input methods and shortcuts
- Assess default values and smart suggestions
- Review error messaging and help text
- Analyze accessibility of inputs

### C. Visual Design Audit

**Visual Hierarchy:**
- Evaluate typography scale and consistency
- Assess spacing and layout grid
- Review color usage and contrast
- Analyze visual weight distribution
- Check alignment and consistency

**Brand Expression:**
- Evaluate brand consistency
- Assess emotional design elements
- Review personality expression
- Analyze differentiation from competitors
- Check cohesiveness across platforms

**Responsive Design:**
- Test across device sizes
- Evaluate breakpoint decisions
- Assess touch target sizes (min 44x44px iOS, 48x48dp Android)
- Review thumb-zone optimization
- Check landscape/portrait handling

### D. Performance & Technical Audit

**Speed & Performance:**
- Measure Time to Interactive (TTI)
- Assess First Contentful Paint (FCP)
- Evaluate Cumulative Layout Shift (CLS)
- Review asset optimization
- Analyze API response times

**Accessibility:**
- Screen reader compatibility
- Keyboard navigation support
- Color contrast ratios (WCAG AAA 7:1)
- Focus indicators and management
- Alternative text and ARIA labels

### E. Emotional & Behavioral Audit

**Emotional Journey Mapping:**
- Map emotional states throughout journey
- Identify frustration points
- Note delight opportunities
- Assess trust and safety signals
- Evaluate community and belonging elements

**Behavioral Triggers:**
- Identify habit-forming patterns
- Evaluate trigger-action-reward loops
- Assess variable reward schedules
- Review social influence mechanisms
- Analyze commitment devices

## PART 3: OUTPUT REQUIREMENTS

### Deliverable 1: Detailed Task List

Create a structured task list with the following format for EACH issue found:

```markdown
## [CATEGORY]: [Issue Title]
**Impact**: Critical/High/Medium/Low | **Effort**: X days | **Status**: 🔴

### Problem Statement
[Describe the current problem, including user impact and business implications]

### Subtasks:
1. **[Subtask 1 Title]**
   - Specific implementation steps
   - Files to modify: `path/to/file.tsx`
   - Technical requirements
   - Dependencies

2. **[Subtask 2 Title]**
   - Specific implementation steps
   - Files to modify: `path/to/file.tsx`
   - Technical requirements
   - Dependencies

3. **[Subtask 3 Title]**
   - Specific implementation steps
   - Files to modify: `path/to/file.tsx`
   - Technical requirements
   - Dependencies

### Acceptance Criteria:
- [ ] Specific measurable outcome 1
- [ ] Specific measurable outcome 2
- [ ] Specific measurable outcome 3

### Testing Steps:
1. Exact reproduction/testing step
2. Expected behavior
3. Edge cases to verify

### Metrics:
- Primary: [Metric name] improvement of X%
- Secondary: [Metric name] improvement of Y%
```

Organize tasks into these categories:
1. **Functional Issues** - Bugs and broken features
2. **Data & State Management** - State, caching, persistence
3. **Performance Issues** - Speed, optimization, efficiency
4. **UX/Design Improvements** - User experience enhancements
5. **Feature Enhancements** - New capabilities

### Deliverable 2: Strategic Redesign Document

Create a comprehensive document with:

```markdown
# [App Name] Redesign Considerations & UX Research Insights

## Executive Summary
[Overview of findings and strategic recommendations]

## Current State Analysis
### Mental Model Assessment
- Current user journey
- Value proposition clarity
- Feature discovery and adoption
- Pain points and friction

### Psychological Barriers
- Cognitive overload areas
- Decision paralysis points
- Trust and safety concerns
- Motivation gaps

## Redesign Framework

### 1. Cognitive Psychology Applications
[For each principle, provide:]
- **Research Basis**: Academic/industry research
- **Current Problem**: How the app fails this principle
- **Redesign Strategy**: Specific improvements
- **Expected Impact**: Measurable outcomes
- **A/B Test Design**: Control vs. treatment testing

### 2. Behavioral Economics Integration
[Detail how to leverage:]
- Loss aversion
- Social proof
- Anchoring effects
- Scarcity and urgency
- Commitment and consistency

### 3. Information Architecture Redesign
- Navigation restructuring with rationale
- Content hierarchy optimization
- Progressive disclosure strategy
- Search and findability improvements

### 4. Interaction Design Patterns
- Micro-interaction specifications
- Gesture mapping and rationale
- Feedback mechanism design
- State management patterns

### 5. Visual Design System
- Typography scale and rationale
- Color psychology application
- Spacing system (4, 8, 12, 16, 24, 32, 48px)
- Component standardization

### 6. Accessibility & Inclusion
- Cognitive accessibility features
- Motor accessibility accommodations
- Sensory accessibility support
- Cultural and demographic considerations

### 7. Emotional Design Strategy
- Emotional journey mapping
- Delight moment identification
- Trust building mechanisms
- Community and belonging features

## Metrics Framework

### Cognitive Metrics
- Information processing speed
- Decision confidence scores
- Error rates and recovery time
- Learning curve measurements

### Behavioral Metrics
- Task completion rates
- Time to complete critical tasks
- Feature adoption rates
- User path optimization

### Emotional Metrics
- Satisfaction scores (CSAT)
- Net Promoter Score (NPS)
- Emotional response mapping
- Trust and safety perception

### Business Metrics
- Conversion improvements
- Retention rates
- Engagement depth
- Revenue impact

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1-2)
[High impact, low effort improvements]

### Phase 2: Core Experience (Week 3-4)
[Fundamental UX improvements]

### Phase 3: Enhancement (Month 2)
[Advanced features and optimizations]

### Phase 4: Innovation (Month 3+)
[Differentiating features and experiences]

## Testing & Validation Strategy
- A/B testing framework
- User testing protocols
- Analytics implementation
- Continuous optimization process

## Risk Mitigation
- Potential user confusion points
- Technical implementation challenges
- Change management strategies
- Rollback procedures
```

## PART 4: ANALYSIS METHODOLOGY

### Quantitative Analysis:
1. **Click Tracking**: Analyze user interaction patterns
2. **Heatmaps**: Identify attention and interaction zones
3. **Funnel Analysis**: Find drop-off points
4. **Task Success Rate**: Measure completion percentages
5. **Time on Task**: Evaluate efficiency
6. **Error Rate**: Count and categorize user errors
7. **System Usability Scale (SUS)**: Standard usability metric

### Qualitative Analysis:
1. **Cognitive Walkthrough**: Step through tasks as users
2. **Heuristic Evaluation**: Apply Nielsen's heuristics
3. **Competitive Analysis**: Compare to best-in-class
4. **Accessibility Audit**: WCAG 2.1 compliance check
5. **Content Audit**: Evaluate messaging and clarity
6. **Emotional Response**: Map feeling throughout journey

### Prioritization Framework:
Use ICE scoring for each improvement:
- **Impact** (1-10): User and business value
- **Confidence** (1-10): Certainty of success
- **Ease** (1-10): Implementation simplicity
- **Priority Score** = (Impact × Confidence × Ease) / 30

## PART 5: SPECIFIC FOCUS AREAS

Based on the audit type, emphasize:

### For Mobile Apps:
- Thumb-zone optimization
- Gesture interactions
- Offline functionality
- App size and performance
- Platform-specific patterns (iOS/Android)
- Push notification strategy

### For Web Applications:
- Responsive design breakpoints
- Browser compatibility
- SEO and discoverability
- Page load performance
- Cross-device continuity

### For E-commerce/Marketplace:
- Trust signals and social proof
- Cart abandonment reduction
- Product discovery optimization
- Checkout flow streamlining
- Payment security perception

### For Social/Community Platforms:
- Onboarding and network effects
- Content creation friction
- Community safety and moderation
- Engagement and retention loops
- Privacy and data concerns

### For SaaS/Productivity Tools:
- Time to value optimization
- Feature discovery and adoption
- Collaboration workflows
- Learning curve reduction
- Integration points

## DELIVERY SPECIFICATIONS

Your audit should result in:

1. **Task List Document** (TASKS_DETAILED.md):
   - 30-50 specific tasks
   - Each with 3+ subtasks
   - Clear acceptance criteria
   - Testing procedures
   - Effort estimates

2. **Strategy Document** (REDESIGN_CONSIDERATIONS.md):
   - 15-20 page comprehensive analysis
   - Research-backed recommendations
   - Psychological principles applied
   - Measurable success metrics
   - Implementation roadmap

3. **Quick Reference** (AUDIT_SUMMARY.md):
   - Executive summary (1 page)
   - Top 10 critical issues
   - Quick wins list
   - 30-60-90 day plan

Remember to:
- Be specific, not generic
- Provide evidence for claims
- Include quantifiable improvements
- Consider technical feasibility
- Balance user needs with business goals
- Maintain cultural sensitivity
- Ensure accessibility throughout
- Think mobile-first
- Consider edge cases
- Plan for scalability
```

## How to Use This Prompt:

1. **Replace [APP/WEBSITE NAME]** with your specific product
2. **Add any specific context** about your users, market, or constraints
3. **Include any existing data** (analytics, user feedback, etc.)
4. **Specify any focus areas** that are particularly important
5. **Note any technical constraints** or platform requirements

## Expected Output Quality:

This prompt should generate:
- **100+ specific observations** across all audit areas
- **50+ actionable tasks** with detailed implementation steps
- **20+ psychological principles** applied with rationale
- **Comprehensive testing strategies** for each improvement
- **Measurable success metrics** for every recommendation
- **Phased implementation plan** considering effort vs. impact

## Tips for Best Results:

1. **Provide Screenshots**: Include key screens for visual analysis
2. **Share User Data**: Analytics, feedback, and research findings
3. **Define Success**: Clear business and user success metrics
4. **Set Constraints**: Budget, timeline, technical limitations
5. **Specify Audience**: Detailed user personas and demographics