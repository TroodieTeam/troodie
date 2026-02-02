# TestFlight Stakeholder Testing Guide

## Quick Start

### 1. Install TestFlight
- Download **TestFlight** from the App Store
- Accept the invitation email from Troodie
- Open TestFlight and install the Troodie app

### 2. Test Credentials

**Creator Account:**
- Email: `creator1@troodieapp.com`
- Password: `BypassPassword123`

**Admin Account:**
- Email: `kouame@troodieapp.com` 
- Password: `BypassPassword123`

**Business Account:**
- Email: `restaurant1@troodieapp.com`
- Password: `BypassPassword123`

### 3. 10-Minute Test Script

#### Step 1: Creator Flow (5 minutes)
1. **Login as Creator** (`creator1@troodieapp.com`)
2. **Explore Campaigns** - Browse available campaigns
3. **Apply to Campaign** - Select "Troodie Creators: Local Gems" ($50 compensation)
4. **Submit Application** - Fill out application form
5. **Check Status** - Go to "My Campaigns" to see "Pending Review"

#### Step 2: Admin Flow (3 minutes)
1. **Login as Admin** (`kouame@troodieapp.com`)
2. **Manage Campaigns** - View campaign dashboard
3. **Review Application** - Click on campaign to see pending applications
4. **Accept Application** - Approve the creator's application
5. **Verify Status** - Confirm application shows as "Accepted"

#### Step 3: Creator Deliverable Submission (2 minutes)
1. **Switch back to Creator** (`creator1@troodieapp.com`)
2. **My Campaigns** - Should now show "Submit Deliverables"
3. **Submit Deliverable** - Upload Instagram post URL
4. **Add Notes** - Include campaign-specific details
5. **Submit** - Confirm submission success

#### Step 4: Admin Review (2 minutes)
1. **Switch back to Admin** (`kouame@troodieapp.com`)
2. **Campaign Details** - Check "Deliverables" tab
3. **Review Content** - View submitted deliverable
4. **Approve/Reject** - Test approval workflow
5. **Verify Updates** - Confirm status changes reflect

### 4. What to Test

#### ✅ Core Functionality
- [ ] User authentication (login/logout)
- [ ] Campaign discovery and browsing
- [ ] Application submission process
- [ ] Admin campaign management
- [ ] Application approval workflow
- [ ] Deliverable submission
- [ ] Content review and approval
- [ ] Real-time status updates

#### ✅ User Experience
- [ ] Navigation flow between screens
- [ ] Form validation and error handling
- [ ] Loading states and feedback
- [ ] Responsive design on different devices
- [ ] Accessibility features

#### ✅ Business Logic
- [ ] Campaign compensation display
- [ ] Application status tracking
- [ ] Deliverable review timeline (72-hour auto-approval)
- [ ] User role permissions
- [ ] Data persistence across sessions

### 5. Known Limitations

#### Current State
- **Environment**: Development database (test data)
- **Payments**: Not yet implemented
- **Notifications**: Basic in-app only
- **Campaigns**: Limited to test campaigns
- **Users**: Test accounts only

#### Expected Behavior
- All test accounts use `@troodieapp.com` domain
- Passwords are `BypassPassword123` for all accounts
- Campaign data resets periodically
- Some features may be incomplete

### 6. Feedback Collection

#### What We're Looking For
1. **User Experience Issues**
   - Confusing navigation
   - Unclear instructions
   - Missing functionality
   - Performance problems

2. **Business Logic Concerns**
   - Workflow gaps
   - Missing validation
   - Inconsistent behavior
   - Security concerns

3. **Feature Requests**
   - Additional functionality needed
   - Workflow improvements
   - User interface enhancements
   - Integration requirements

#### How to Provide Feedback
- **In-App**: Use the feedback form (if available)
- **Email**: Send to `kouame@troodieapp.com`
- **Screenshots**: Include visual issues
- **Steps to Reproduce**: For bugs, include exact steps

### 7. Technical Details

#### App Information
- **Version**: 1.0.0 (Build 13)
- **Platform**: iOS (TestFlight)
- **Environment**: Development
- **Database**: Supabase Development
- **Last Updated**: January 16, 2025

#### Supported Devices
- iPhone (iOS 13.0+)
- iPad (iOS 13.0+)
- Tested on latest iOS versions

### 8. Troubleshooting

#### Common Issues
1. **Login Problems**
   - Verify email format: `username@troodieapp.com`
   - Use exact password: `BypassPassword123`
   - Check internet connection

2. **App Crashes**
   - Force close and reopen app
   - Restart device if persistent
   - Report with device model and iOS version

3. **Data Not Loading**
   - Check internet connection
   - Log out and log back in
   - Clear app cache (if option available)

4. **Missing Features**
   - Some features may be in development
   - Check this guide for current limitations
   - Report missing functionality

#### Support Contact
- **Email**: `kouame@troodieapp.com`
- **Response Time**: Within 24 hours
- **Priority**: High for critical issues

### 9. Next Steps

#### After Testing
1. **Complete Test Script** - Follow all steps above
2. **Document Issues** - Note any problems encountered
3. **Provide Feedback** - Share thoughts on user experience
4. **Suggest Improvements** - Recommend enhancements

#### Future Updates
- **Staging Environment** - More realistic data
- **Payment Integration** - Stripe Checkout implementation
- **Enhanced Notifications** - Push notifications
- **More Campaigns** - Expanded campaign library
- **User Onboarding** - Improved signup flow

---

**Thank you for testing Troodie!** Your feedback is crucial for improving the platform before launch.

**Questions?** Contact `kouame@troodieapp.com`
