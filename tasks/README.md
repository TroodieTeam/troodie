# Troodie Engineering Tasks Organization

This folder contains a comprehensive task management system for the Troodie app development project, with individual task files and a master tracking system.

## 📁 File Structure

```
tasks/
├── README.md                          # This file - organization guide
├── TODO.md                            # Master task tracking and progress
├── task-1-1-supabase-setup.md         # Individual task files
├── task-1-2-email-auth.md
├── task-2-1-restaurant-seeding.md
├── task-6-1-restaurant-detail.md
└── ... (additional task files)

docs/
├── backend-design.md                   # Living database schema documentation
├── frontend-design-language.md         # Living UI/UX design system
└── ... (additional documentation)
```

## 🎯 Task Naming Convention

Tasks follow a structured naming pattern:
- `task-{epic}-{sequence}-{short-name}.md`
- Example: `task-1-1-supabase-setup.md`
  - Epic 1 (Backend Infrastructure)
  - Task 1 in that epic
  - Short descriptive name

## 📊 Epic Organization

### Epic 1: Backend Infrastructure & Database Setup
- **1.1** - Supabase Backend Setup
- **1.2** - Email OTP Authentication

### Epic 2: Restaurant Data Management System  
- **2.1** - Charlotte Restaurant Seeding
- **2.2** - Restaurant Search & Discovery

### Epic 3: Core Social Features
- **3.1** - Restaurant Save Functionality
- **3.2** - User Profiles & Social Network
- **3.3** - Activity Feed & Interactions

### Epic 4: Board and Community Features
- **4.1** - Board Creation & Management
- **4.2** - Community Features

### Epic 5: Search and Discovery Enhancement
- **5.1** - Enhanced Restaurant Search
- **5.2** - Personalized Recommendations

### Epic 6: Missing Core Screens and Functionality
- **6.1** - Restaurant Detail Screen ✅
- **6.2** - Post Creation & Management
- **6.3** - Notifications System

### Epic 7: Performance and Polish
- **7.1** - Real-time Features
- **7.2** - Offline Support & Caching

## 📋 Task File Structure

Each task file contains:

### Header Information
- **Epic**: Which epic this belongs to
- **Priority**: Critical, High, Medium, Low
- **Estimate**: Time estimate in days
- **Status**: 🔴 Not Started, 🟡 In Progress, 🟢 Completed, ⏸️ Blocked, 🔄 Review

### Core Sections
1. **Overview**: Brief description of the task
2. **Business Value**: Why this task matters
3. **Dependencies**: What must be completed first
4. **Blocks**: What this task enables
5. **Acceptance Criteria**: Gherkin scenarios defining done
6. **Technical Implementation**: Code examples and approach
7. **Definition of Done**: Checklist of completion criteria
8. **Resources**: Relevant documentation and links
9. **Notes**: Additional context and considerations

## 🧪 Gherkin Scenarios

All acceptance criteria use the Gherkin framework:

```gherkin
Feature: Description of the feature
  As a [user type]
  I want [goal]
  So that [benefit]

Scenario: Specific test case
  Given [initial condition]
  When [action occurs]
  Then [expected result]
```

This provides:
- Clear, testable requirements
- Shared understanding between team members
- Foundation for automated testing
- User-focused acceptance criteria

## 📈 Progress Tracking

### Master TODO.md
The `TODO.md` file provides:
- **Epic-level progress tracking** with completion percentages
- **Sprint planning** with phase organization
- **Dependency mapping** showing critical path
- **Risk assessment** identifying potential blockers
- **Overall project status** and metrics

### Status Icons
- 🔴 **Not Started** - Task defined but work hasn't begun
- 🟡 **In Progress** - Currently being worked on
- 🟢 **Completed** - Finished and tested
- ⏸️ **Blocked** - Waiting on dependencies
- 🔄 **Review** - Complete but under review/testing

## 🚀 Getting Started

### For Developers
1. **Review the master TODO.md** to understand overall progress
2. **Check dependencies** before starting any task
3. **Read the full task file** for your assigned work
4. **Update status** as you make progress
5. **Check off Definition of Done** items as completed

### For Project Managers
1. **Monitor TODO.md** for overall project health
2. **Track epic progress** and identify bottlenecks
3. **Manage dependencies** to prevent blocking
4. **Update estimates** based on actual completion times
5. **Plan sprints** using the phase organization

### For QA/Testing
1. **Use Gherkin scenarios** as test cases
2. **Verify Definition of Done** criteria
3. **Test acceptance criteria** systematically
4. **Update task status** when testing is complete

## ✅ How to Update Progress

### When Starting a Task
1. Change status to 🟡 **In Progress** in `TODO.md`
2. Add your name to the **Assignee** column
3. Add start date to **Notes** if needed

### During Development
1. Check off **Definition of Done** items as completed
2. Update **Notes** with any blockers or insights
3. Adjust **Estimate** if needed based on progress

### When Completing a Task
1. Ensure all **Definition of Done** items are checked
2. Verify all **Gherkin scenarios** pass
3. Change status to 🔄 **Review** for testing
4. Update **Epic Progress** in `TODO.md`
5. After review approval, mark as 🟢 **Completed**

## 🔗 Dependencies and Blocking

### Critical Path Items
Tasks marked as **Critical** priority are on the critical path:
- Task 1.1: Supabase Backend Setup (blocks everything)
- Task 1.2: Email Authentication (blocks user features)
- Task 6.1: Restaurant Detail Screen (referenced throughout)

### Dependency Chain
```
1.1 (Supabase Setup) 
 ├── 1.2 (Email Auth)
 ├── 2.1 (Restaurant Seeding)
 └── 3.1 (Restaurant Save)

2.1 (Restaurant Seeding)
 └── 2.2 (Restaurant Search)

3.1 (Restaurant Save) + 3.2 (User Profiles)
 └── 3.3 (Activity Feed)
```

### Managing Blockers
If a task becomes blocked:
1. Update status to ⏸️ **Blocked**
2. Document the blocker in **Notes**
3. Identify alternative work streams
4. Communicate with dependent task owners

## 📝 Best Practices

### Writing Tasks
- **Be specific** in acceptance criteria
- **Include edge cases** in scenarios
- **Provide code examples** for complex implementations
- **Link to relevant documentation**
- **Consider accessibility and performance**

### Managing Progress
- **Update status regularly** (daily standup)
- **Document blockers immediately**
- **Communicate changes** to dependent tasks
- **Review estimates** based on actual completion

### Quality Assurance
- **Test all Gherkin scenarios**
- **Verify cross-platform compatibility**
- **Check accessibility compliance**
- **Validate performance requirements**

## 🎯 Sprint Planning

### Phase 1: Core Infrastructure (Weeks 1-4)
**Focus**: Foundation that enables all other features
- Tasks 1.1, 1.2, 2.1, 2.2
- Total: 16 days estimated

### Phase 2: Core Features (Weeks 5-8)  
**Focus**: Essential user functionality
- Tasks 3.1, 3.2, 6.1, 6.2
- Total: 15 days estimated

### Phase 3: Social Features (Weeks 9-12)
**Focus**: Social engagement and interaction
- Tasks 3.3, 4.1, 6.3, 5.1
- Total: 15 days estimated

### Phase 4: Advanced Features (Weeks 13-16)
**Focus**: Enhancement and optimization
- Tasks 4.2, 5.2, 7.1, 7.2
- Total: 15 days estimated

## 📞 Support and Questions

### For Task Clarification
- Review the **PRD documents** in `/prd` folder
- Check **Backend Design** in `/docs/backend-design.md` for database schema and architecture
- Consult **Acceptance Criteria** in task files

### Backend Design Documentation
The **`/docs/backend-design.md`** file serves as the living documentation for Troodie's database schema and backend architecture. It includes:

- **Complete database schema** with all tables and relationships
- **Row Level Security (RLS) policies** for data protection
- **API design patterns** and RESTful endpoints
- **Real-time subscription** configurations
- **Performance optimization** strategies
- **Security considerations** and best practices

**Always reference this document when:**
- Creating new engineering tasks that involve database changes
- Implementing new features that require backend integration
- Debugging data-related issues
- Planning API endpoints and data flows

### Frontend Design Language Documentation
The **`/docs/frontend-design-language.md`** file serves as the living design system for Troodie's UI/UX implementation. It includes:

- **Complete color palette** and semantic color system
- **Typography hierarchy** and font families
- **Component patterns** for buttons, inputs, cards, and navigation
- **Screen layout patterns** and common structures
- **Animation patterns** and performance guidelines
- **Accessibility standards** and responsive design principles

**Always reference this document when:**
- Creating new screens without specific design requirements
- Implementing UI components that need to match existing patterns
- Ensuring consistent styling across the application
- Planning user interactions and animations
- Maintaining accessibility and performance standards

### For Technical Issues
- Reference **Technical Implementation** sections
- Check **Resources** links in task files
- Review related task dependencies

### For Process Questions
- Refer to this README
- Check **TODO.md** for current status
- Consult with project lead for clarification

---

## 📊 Current Status Summary

**Total Tasks**: 15  
**Completed**: 0  
**In Progress**: 0  
**Not Started**: 15  
**Total Estimated Duration**: 61 days (~12 weeks)

Last Updated: [Current Date] 