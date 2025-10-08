# Creator Application Flow - Implementation Guide

## Recommended Approach: Progressive Discovery

### Entry Points (Multiple Touchpoints)

```
USER JOURNEY TO CREATOR STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PROFILE SCREEN (Primary Entry)
┌─────────────────────────────────────────────────────────────┐
│  Profile Tab                                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  [Avatar]                                             │ │
│  │  Sarah Chen                                           │ │
│  │  @sarahchen                                           │ │
│  │                                                       │ │
│  │  📍 47 Saves  👥 23 Friends  📝 12 Reviews          │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  💡 You qualify to become a creator!            │ │ │
│  │  │  Turn your food expertise into income           │ │ │
│  │  │                                                 │ │ │
│  │  │  [Become a Creator →]                           │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  │  [Edit Profile]  [Settings]  [Share Profile]        │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

2. SETTINGS SCREEN (Persistent Option)
┌─────────────────────────────────────────────────────────────┐
│  Settings                                            [←]   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Account                                             │ │
│  │  ├── Profile Settings                                │ │
│  │  ├── Privacy                                         │ │
│  │  └── Notifications                                   │ │
│  │                                                       │ │
│  │  Monetization                                        │ │
│  │  ├── 💼 Creator Program          [NEW]              │ │
│  │  └── 💳 Payment Methods                             │ │
│  │                                                       │ │
│  │  About                                               │ │
│  │  ├── Help Center                                     │ │
│  │  └── Terms & Privacy                                │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

3. CONTEXTUAL TRIGGERS (Smart Discovery)
┌─────────────────────────────────────────────────────────────┐
│  After 20th Save:                                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ✅ Restaurant saved!                                 │ │
│  │                                                       │ │
│  │  🎉 Milestone: 20 restaurants saved!                 │ │
│  │  You could earn money sharing your favorites         │ │
│  │                                                       │ │
│  │  [Learn About Creator Program]  [Maybe Later]        │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Code

### 1. Profile Screen Integration

```typescript
// app/(tabs)/profile.tsx

import { CreatorCTA } from '@/components/creator/CreatorCTA';

const ProfileScreen = () => {
  const { user } = useAuth();
  const qualifiesForCreator = user.saves >= 20 && !user.isCreator;
  
  return (
    <Screen scrollable>
      <Container padding="lg">
        {/* User Info */}
        <Avatar uri={user.avatar} size="xl" />
        <H2>{user.name}</H2>
        <Caption>@{user.username}</Caption>
        
        {/* Stats */}
        <Row gap="lg">
          <Column align="center">
            <H3>{user.saves}</H3>
            <Caption>Saves</Caption>
          </Column>
          <Column align="center">
            <H3>{user.friends}</H3>
            <Caption>Friends</Caption>
          </Column>
        </Row>
        
        {/* Creator CTA - Only shows when qualified */}
        {qualifiesForCreator && (
          <>
            <Spacer size="lg" />
            <CreatorCTA 
              saves={user.saves}
              onPress={() => router.push('/creator/apply')}
            />
          </>
        )}
        
        {/* Action Buttons */}
        <Row gap="sm">
          <SecondaryButton 
            title="Edit Profile" 
            onPress={editProfile}
            style={{ flex: 1 }}
          />
          <SecondaryButton 
            title="Settings" 
            onPress={() => router.push('/settings')}
            style={{ flex: 1 }}
          />
        </Row>
      </Container>
    </Screen>
  );
};
```

### 2. Settings Screen Integration

```typescript
// app/settings.tsx

const SettingsScreen = () => {
  const { user } = useAuth();
  
  return (
    <Screen scrollable>
      <Container padding="lg">
        <H2>Settings</H2>
        
        {/* Account Section */}
        <Section title="Account">
          <SettingsRow 
            icon={User}
            title="Profile Settings"
            onPress={() => router.push('/settings/profile')}
          />
          <SettingsRow 
            icon={Lock}
            title="Privacy"
            onPress={() => router.push('/settings/privacy')}
          />
        </Section>
        
        {/* Monetization Section */}
        <Section title="Monetization">
          <SettingsRow 
            icon={DollarSign}
            title="Creator Program"
            badge={!user.isCreator ? "NEW" : null}
            subtitle={
              user.isCreator 
                ? "Manage your creator account" 
                : "Turn your recommendations into income"
            }
            onPress={() => 
              user.isCreator 
                ? router.push('/creator/dashboard')
                : router.push('/creator/apply')
            }
          />
          {user.isCreator && (
            <SettingsRow 
              icon={CreditCard}
              title="Payment Methods"
              onPress={() => router.push('/settings/payments')}
            />
          )}
        </Section>
      </Container>
    </Screen>
  );
};
```

### 3. Creator Application Screen

```typescript
// app/creator/apply.tsx

const CreatorApplicationScreen = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  const qualifications = {
    saves: { required: 20, current: user.saves, met: user.saves >= 20 },
    profile: { required: true, current: !!user.avatar, met: !!user.avatar },
    account: { required: 30, current: user.accountAge, met: user.accountAge >= 30 }
  };
  
  const canApply = Object.values(qualifications).every(q => q.met);
  
  return (
    <Screen>
      {step === 1 && (
        <Container padding="lg">
          <H2>Become a Creator</H2>
          <Spacer size="md" />
          
          <Body>Turn your restaurant knowledge into income by partnering with local businesses.</Body>
          <Spacer size="lg" />
          
          <H3>Requirements</H3>
          <Spacer size="sm" />
          
          <Card padding="md">
            <QualificationItem 
              label="20+ restaurant saves"
              met={qualifications.saves.met}
              current={`${user.saves} saves`}
            />
            <Divider />
            <QualificationItem 
              label="Profile photo"
              met={qualifications.profile.met}
              action={!qualifications.profile.met ? "Add Photo" : null}
            />
            <Divider />
            <QualificationItem 
              label="30 day account age"
              met={qualifications.account.met}
              current={`${user.accountAge} days`}
            />
          </Card>
          
          <Spacer size="xl" />
          
          <PrimaryButton
            title={canApply ? "Continue" : "Not Qualified Yet"}
            disabled={!canApply}
            onPress={() => setStep(2)}
            fullWidth
          />
        </Container>
      )}
      
      {step === 2 && (
        <Container padding="lg">
          <H2>How It Works</H2>
          <Spacer size="md" />
          
          <Column gap="md">
            <Row gap="md">
              <View style={styles.stepNumber}>
                <Body color="white">1</Body>
              </View>
              <Column style={{ flex: 1 }}>
                <Body weight="semibold">Browse Promotions</Body>
                <Caption>Find restaurants offering paid campaigns</Caption>
              </Column>
            </Row>
            
            <Row gap="md">
              <View style={styles.stepNumber}>
                <Body color="white">2</Body>
              </View>
              <Column style={{ flex: 1 }}>
                <Body weight="semibold">Create Content</Body>
                <Caption>Share authentic reviews and photos</Caption>
              </Column>
            </Row>
            
            <Row gap="md">
              <View style={styles.stepNumber}>
                <Body color="white">3</Body>
              </View>
              <Column style={{ flex: 1 }}>
                <Body weight="semibold">Get Paid</Body>
                <Caption>Earn $25-100 per approved post</Caption>
              </Column>
            </Row>
          </Column>
          
          <Spacer size="xl" />
          
          <PrimaryButton
            title="Activate Creator Account"
            onPress={activateCreatorAccount}
            fullWidth
          />
          
          <Spacer size="md" />
          
          <TextButton
            title="Set up payments later"
            onPress={skipPayments}
          />
        </Container>
      )}
    </Screen>
  );
};
```

### 4. CreatorCTA Component

```typescript
// components/creator/CreatorCTA.tsx

export const CreatorCTA = ({ saves, onPress }) => (
  <Card 
    padding="md" 
    variant="outlined"
    style={{ borderColor: DS.colors.primaryOrange + '33' }}
    onPress={onPress}
  >
    <Row gap="md" align="center">
      <View style={styles.iconContainer}>
        <DollarSign size={24} color={DS.colors.primaryOrange} />
      </View>
      <Column style={{ flex: 1 }}>
        <Body weight="semibold">You qualify to be a creator!</Body>
        <Caption>
          With {saves} saves, you could earn money sharing restaurants
        </Caption>
      </Column>
      <ChevronRight size={20} color={DS.colors.textLight} />
    </Row>
  </Card>
);
```

## Quick Decision Framework

### Where to Put "Become a Creator":

1. **Primary:** Profile screen (when qualified)
2. **Secondary:** Settings → Monetization → Creator Program
3. **Contextual:** Trigger after milestones

### Qualification Check:
- ✅ 20+ saves
- ✅ Profile photo
- ✅ 30-day old account

### Activation Type:
- **Instant activation** for basic creators
- **Application review** only for premium features

This gives users multiple natural discovery points while keeping the UI clean!