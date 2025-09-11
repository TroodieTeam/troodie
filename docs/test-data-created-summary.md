# Test Data Creation Summary

## ✅ Successfully Created Test Data

### 📱 Test User Accounts

All test accounts use:
- **Email pattern:** `*@bypass.com`
- **OTP Code:** `000000`
- **Password:** Not needed (OTP bypass is active)

#### Consumer Accounts (Default Type)
| Email | Username | Account Type | Description |
|-------|----------|--------------|-------------|
| `consumer1@bypass.com` | test_consumer_1 | consumer | Food explorer, default experience |
| `consumer2@bypass.com` | test_consumer_2 | consumer | Ready for creator upgrade testing |
| `consumer3@bypass.com` | test_consumer_3 | consumer | Ready for business claiming testing |

#### Creator Accounts
| Email | Username | Account Type | Features |
|-------|----------|--------------|----------|
| `creator1@bypass.com` | test_creator_1 | creator | • 5K followers<br>• Verified status<br>• Specialties: Restaurant Reviews, Food Photography |
| `creator2@bypass.com` | test_creator_2 | creator | • 8K followers<br>• Verified status<br>• Specialties: Travel Food, Street Food |

#### Business Owner Accounts
| Email | Username | Account Type | Restaurant Claimed |
|-------|----------|--------------|-------------------|
| `business1@bypass.com` | test_business_1 | business | The Rustic Table ✅ |
| `business2@bypass.com` | test_business_2 | business | Sakura Sushi ✅ |

#### Multi-Role Account
| Email | Username | Account Type | Roles | Restaurant |
|-------|----------|--------------|-------|------------|
| `multi_role@bypass.com` | test_multi_role | business | Creator + Business Owner | Bella Vista Italian Kitchen ✅ |

---

### 🍽️ Test Restaurants Created

#### Claimed Restaurants (3)
| Restaurant Name | Owner | Location | Cuisine | Price |
|----------------|-------|----------|---------|-------|
| **The Rustic Table** | business1@bypass.com | Portland, OR | American, Farm-to-Table | $$$ |
| **Sakura Sushi** | business2@bypass.com | Seattle, WA | Japanese, Sushi | $$$$ |
| **Bella Vista Italian Kitchen** | multi_role@bypass.com | San Francisco, CA | Italian, Pizza | $$$ |

#### Unclaimed Restaurants (10+)
Available for testing the claiming flow:
- Taco Libre (Austin, TX) - Mexican, $$
- The Green Garden (Los Angeles, CA) - Vegetarian/Vegan, $$$
- Bombay Spice House (Chicago, IL) - Indian, $$
- Le Petit Bistro (New York, NY) - French, $$$$
- Dragon Palace (Boston, MA) - Chinese, $$$
- BBQ Pit Master (Nashville, TN) - BBQ, $$
- Pho Saigon (Houston, TX) - Vietnamese, $
- Mediterranean Mezze (Miami, FL) - Mediterranean, $$$
- Seoul Kitchen (Denver, CO) - Korean, $$$
- The Breakfast Club (Phoenix, AZ) - American Breakfast, $$

---

## 🧪 Testing Scenarios

### Scenario 1: Consumer Experience Testing
**Test Account:** `consumer1@bypass.com`

1. **Sign In:**
   ```
   Email: consumer1@bypass.com
   OTP Code: 000000
   ```

2. **Verify Consumer Features:**
   - Navigate to **More** tab
   - Should see "Food Explorer" badge
   - Should see "Grow with Troodie" section with:
     - "Become a Creator" option (BETA badge)
     - "Claim Your Restaurant" option
   - Can explore and save restaurants
   - Can create posts and reviews

3. **Expected More Tab Structure:**
   ```
   Profile Card
   └── Test Consumer One
       └── Food Explorer badge
   
   Grow with Troodie
   ├── Become a Creator (BETA)
   └── Claim Your Restaurant
   
   Account & Settings
   └── [Standard options]
   ```

---

### Scenario 2: Creator Upgrade Flow
**Test Account:** `consumer2@bypass.com`

1. **Sign In as Consumer:**
   ```
   Email: consumer2@bypass.com
   OTP Code: 000000
   ```

2. **Upgrade to Creator:**
   - Go to More tab
   - Tap "Become a Creator"
   - Complete creator onboarding
   - Fill in specialties and social links

3. **Verify Creator Features:**
   - Profile badge changes to "Content Creator"
   - New "Creator Tools" section appears with:
     - Creator Dashboard
     - My Campaigns
     - Earnings
     - Creator Analytics

4. **Expected More Tab After Upgrade:**
   ```
   Profile Card
   └── Test Consumer Two
       └── Content Creator badge
   
   Creator Tools (NEW)
   ├── Creator Dashboard
   ├── My Campaigns
   ├── Earnings
   └── Creator Analytics
   
   Grow with Troodie
   └── Claim Your Restaurant (only option left)
   ```

---

### Scenario 3: Business Claiming Flow
**Test Account:** `consumer3@bypass.com`

1. **Sign In as Consumer:**
   ```
   Email: consumer3@bypass.com
   OTP Code: 000000
   ```

2. **Claim a Restaurant:**
   - Go to More tab
   - Tap "Claim Your Restaurant"
   - Search for an unclaimed restaurant (e.g., "Taco Libre")
   - Complete verification process
   - Provide business information

3. **Verify Business Features:**
   - Profile badge changes to "Business Owner"
   - New "Business Tools" section appears with:
     - Business Dashboard
     - Manage Campaigns
     - Analytics
     - Restaurant Settings

4. **Expected More Tab After Claiming:**
   ```
   Profile Card
   └── Test Consumer Three
       └── Business Owner badge
   
   Business Tools (NEW)
   ├── Business Dashboard - Taco Libre
   ├── Manage Campaigns
   ├── Analytics
   └── Restaurant Settings
   
   [Growth section disappears - no more upgrades]
   ```

---

### Scenario 4: Multi-Role User Testing
**Test Account:** `multi_role@bypass.com`

1. **Sign In:**
   ```
   Email: multi_role@bypass.com
   OTP Code: 000000
   ```

2. **Verify Both Role Sections:**
   - Should see BOTH Creator Tools and Business Tools
   - Business Tools appears first (higher priority)
   - All features from both roles accessible

3. **Expected More Tab Structure:**
   ```
   Profile Card
   └── Test Multi Role User
       └── Business Owner badge (highest level)
   
   Business Tools
   ├── Business Dashboard - Bella Vista Italian Kitchen
   ├── Manage Campaigns
   ├── Analytics
   └── Restaurant Settings
   
   Creator Tools
   ├── Creator Dashboard
   ├── My Campaigns
   ├── Earnings
   └── Creator Analytics
   
   [No Growth section - already at highest level]
   ```

---

### Scenario 5: Existing Creator Account Testing
**Test Account:** `creator1@bypass.com`

1. **Sign In:**
   ```
   Email: creator1@bypass.com
   OTP Code: 000000
   ```

2. **Verify Creator Profile:**
   - Already has creator status
   - Has 5,000 followers in metrics
   - Specialties: Restaurant Reviews, Food Photography, Local Cuisine
   - Can still claim a restaurant to become multi-role

---

### Scenario 6: Existing Business Account Testing
**Test Account:** `business1@bypass.com`

1. **Sign In:**
   ```
   Email: business1@bypass.com
   OTP Code: 000000
   ```

2. **Verify Business Profile:**
   - Owns "The Rustic Table"
   - Has full management permissions
   - Restaurant shows as claimed and verified
   - Business Dashboard shows restaurant name

---

## 🔍 Database Verification Queries

### Check All Test Users
```sql
SELECT 
    email,
    account_type,
    CASE 
        WHEN is_creator THEN '✓' ELSE '✗'
    END as is_creator,
    CASE 
        WHEN is_restaurant THEN '✓' ELSE '✗'
    END as is_business
FROM users 
WHERE email LIKE '%@bypass.com'
ORDER BY 
    CASE account_type 
        WHEN 'business' THEN 1
        WHEN 'creator' THEN 2
        WHEN 'consumer' THEN 3
    END,
    email;
```

### Check Creator Profiles
```sql
SELECT 
    u.email,
    cp.verification_status,
    cp.specialties,
    cp.metrics->>'followers' as followers
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email LIKE '%@bypass.com';
```

### Check Business Profiles
```sql
SELECT 
    u.email,
    r.name as restaurant_name,
    bp.verification_status,
    r.is_claimed,
    r.is_verified
FROM business_profiles bp
JOIN users u ON bp.user_id = u.id
JOIN restaurants r ON bp.restaurant_id = r.id
WHERE u.email LIKE '%@bypass.com';
```

### Check Available Restaurants for Claiming
```sql
SELECT 
    name,
    city,
    state,
    cuisine_types[1] as primary_cuisine,
    price_range
FROM restaurants 
WHERE website LIKE '%.test' 
    AND is_claimed = false
ORDER BY name;
```

---

## 🎯 Key Testing Points

### Authentication
- ✅ All accounts use `@bypass.com` pattern
- ✅ OTP code `000000` works for all test accounts
- ✅ No email verification needed

### Account Types
- ✅ Consumer accounts show "Food Explorer" badge
- ✅ Creator accounts show "Content Creator" badge
- ✅ Business accounts show "Business Owner" badge
- ✅ Multi-role shows highest level badge (Business Owner)

### More Tab Sections
- ✅ Growth section only shows for non-maxed accounts
- ✅ Creator Tools only shows for creators
- ✅ Business Tools only shows for business owners
- ✅ Multi-role users see both tool sections

### Permissions
- ✅ Consumers can't access creator/business features
- ✅ Creators can't access business features (unless multi-role)
- ✅ Business owners have full restaurant management
- ✅ Account downgrades are prevented

---

## 🛠️ Troubleshooting

### If login fails with "Test account not found"
- The auth bypass is working but the user doesn't exist in the database
- Re-run the SQL seeding script

### If OTP code 000000 doesn't work
- Check that `services/authService.ts` has the bypass logic for `@bypass.com` emails
- Verify the bypass pattern is active in the code

### If More tab doesn't show expected sections
- Check the account type in the database
- Verify creator_profiles or business_profiles exist for the user
- Check that the migration has been run

### If restaurant claiming fails
- Ensure the restaurant exists and is not already claimed
- Check that business_profiles table is properly set up
- Verify the user doesn't already have a business profile

---

## 🧹 Cleanup

To remove all test data:

```sql
-- Remove test data in order (respects foreign keys)
DELETE FROM business_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
DELETE FROM creator_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
DELETE FROM board_restaurants WHERE board_id IN (SELECT id FROM boards WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com'));
DELETE FROM boards WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@bypass.com');
DELETE FROM users WHERE email LIKE '%@bypass.com';
DELETE FROM restaurants WHERE website LIKE '%.test';
```

---

## 📝 Notes

- All test restaurants have `.test` domain websites for easy identification
- Test users have placeholder avatar URLs from ui-avatars.com
- Creator metrics are pre-populated with sample follower counts
- Business profiles have full management permissions array
- The system prevents account type downgrades automatically