# Troodie Frontend Design Language

## Overview

This document serves as the living design system for Troodie's frontend implementation. It defines the visual language, component patterns, and UX principles that ensure consistency across all screens and features.

## Design Philosophy

### Core Principles
- **Warm & Inviting**: Food-focused app with warm colors and friendly interactions
- **Personalized**: User-centric design that adapts to individual preferences
- **Social-First**: Emphasis on community and sharing experiences
- **Accessible**: Inclusive design that works for all users
- **Performance**: Smooth animations and responsive interactions

### Brand Personality
- **Approachable**: Easy to use, no intimidating complexity
- **Authentic**: Real user experiences and genuine recommendations
- **Community-Driven**: Built around sharing and discovery
- **Quality-Focused**: Premium experience without being pretentious

## Color Palette

### Primary Colors
```typescript
// Primary Brand Colors
primary: '#FFAD27',        // Warm orange - Primary CTAs, highlights
secondary: '#5B4CCC',      // Purple - Secondary actions, accents
background: '#FFFDF7',     // Light cream - Main background
surface: '#FFFFFF',        // White - Cards, modals, surfaces
```

### Text Colors
```typescript
text: {
  primary: '#1F2937',      // Main text, headers
  secondary: '#6B7280',    // Body text, descriptions
  tertiary: '#9CA3AF',     // Muted text, captions
  dark: '#111827',         // Strong headers
  mediumDark: '#374151',   // Subheaders
}
```

### Semantic Colors
```typescript
error: '#E74C3C',          // Error states, destructive actions
success: '#2ECC71',        // Success states, confirmations
info: '#3498DB',           // Information, links
border: '#E5E7EB',         // Borders, dividers
```

### Background Variations
```typescript
backgroundLight: '#F9FAFB',  // Light backgrounds
backgroundGray: '#F3F4F6',   // Gray backgrounds
```

### Persona Colors
```typescript
personas: {
  trendsetter: '#FF6B6B',           // Red
  culinary_adventurer: '#4ECDC4',   // Teal
  luxe_planner: '#9B59B6',          // Purple
  hidden_gem_hunter: '#F39C12',     // Orange
  comfort_seeker: '#3498DB',        // Blue
  budget_foodie: '#2ECC71',         // Green
  social_explorer: '#E74C3C',       // Red
  local_expert: '#95A5A6',          // Gray
}
```

## Typography

### Font Families
```typescript
fonts: {
  heading: {
    bold: 'Poppins_700Bold',
    semiBold: 'Poppins_600SemiBold',
    medium: 'Poppins_500Medium',
    regular: 'Poppins_400Regular',
  },
  body: {
    bold: 'Inter_700Bold',
    semiBold: 'Inter_600SemiBold',
    medium: 'Inter_500Medium',
    regular: 'Inter_400Regular',
  },
}
```

### Text Hierarchy

#### Headers
```typescript
// Large Headers (Splash, Welcome)
fontSize: 32-36,
fontFamily: 'Poppins_700Bold',
color: '#333',
lineHeight: 40,

// Section Headers
fontSize: 24-28,
fontFamily: 'Poppins_600SemiBold',
color: '#333',
lineHeight: 32,

// Card Headers
fontSize: 18-20,
fontFamily: 'Poppins_600SemiBold',
color: '#333',
lineHeight: 24,
```

#### Body Text
```typescript
// Primary Body
fontSize: 16,
fontFamily: 'Inter_500Medium',
color: '#333',
lineHeight: 22,

// Secondary Body
fontSize: 14,
fontFamily: 'Inter_400Regular',
color: '#666',
lineHeight: 20,

// Caption Text
fontSize: 12,
fontFamily: 'Inter_400Regular',
color: '#999',
lineHeight: 16,
```

## Spacing System

### Base Spacing
```typescript
spacing: {
  xs: 4,    // Minimal spacing
  sm: 8,    // Small spacing
  md: 12,   // Medium spacing
  lg: 16,   // Large spacing
  xl: 20,   // Extra large spacing
  xxl: 24,  // Section spacing
  xxxl: 32, // Large section spacing
}
```

### Layout Patterns
```typescript
// Screen Padding
paddingHorizontal: 24,
paddingVertical: 20,

// Card Padding
padding: 16-20,

// Button Padding
paddingVertical: 16,
paddingHorizontal: 24,

// Input Padding
paddingVertical: 16,
paddingHorizontal: 16,
```

## Border Radius

### Radius System
```typescript
borderRadius: {
  sm: 8,     // Small elements
  md: 12,    // Buttons, inputs
  lg: 16,    // Cards, modals
  xl: 20,    // Large cards
  xxl: 30,   // Pill shapes
  full: 9999, // Circular elements
}
```

## Component Patterns

### Buttons

#### Primary Button
```typescript
// Primary CTA Button
backgroundColor: '#FFAD27',
paddingVertical: 16,
paddingHorizontal: 24,
borderRadius: 12,
alignItems: 'center',
// Text
fontSize: 16,
fontFamily: 'Poppins_600SemiBold',
color: '#FFFFFF',
```

#### Secondary Button
```typescript
// Secondary Action Button
backgroundColor: 'transparent',
paddingVertical: 16,
paddingHorizontal: 24,
borderRadius: 12,
borderWidth: 2,
borderColor: '#FFAD27',
alignItems: 'center',
// Text
fontSize: 16,
fontFamily: 'Poppins_600SemiBold',
color: '#FFAD27',
```

#### Disabled Button
```typescript
// Disabled State
backgroundColor: '#D3D3D3',
// Text
color: '#FFFFFF',
```

### Input Fields

#### Text Input
```typescript
// Standard Input
fontSize: 16-24,
fontFamily: 'Inter_500Medium',
color: '#333',
paddingVertical: 16,
paddingHorizontal: 16,
borderBottomWidth: 2,
borderBottomColor: '#E5E5E5',
// Placeholder
placeholderTextColor: '#999',
```

#### Search Input
```typescript
// Search Field
backgroundColor: '#F8F8F8',
borderRadius: 12,
paddingVertical: 12,
paddingHorizontal: 16,
fontSize: 16,
fontFamily: 'Inter_400Regular',
```

### Cards

#### Standard Card
```typescript
// Card Container
backgroundColor: '#FFFFFF',
borderRadius: 16,
padding: 20,
marginBottom: 12,
borderWidth: 1,
borderColor: '#E5E5E5',
// Shadow
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.05,
shadowRadius: 4,
elevation: 2,
```

#### Interactive Card
```typescript
// Pressable Card
backgroundColor: '#FFFFFF',
borderRadius: 16,
padding: 20,
borderWidth: 2,
borderColor: '#E5E5E5',
// Active state
borderColor: '#FFAD27',
```

### Navigation

#### Header Pattern
```typescript
// Standard Header
flexDirection: 'row',
alignItems: 'center',
paddingHorizontal: 20,
paddingTop: 10,
paddingBottom: 10,
```

#### Back Button
```typescript
// Back Navigation
width: 40,
height: 40,
justifyContent: 'center',
// Icon
size: 28,
color: '#333',
```

### Progress Indicators

#### Progress Bar
```typescript
// Progress Container
height: 8,
backgroundColor: '#E5E5E5',
borderRadius: 4,
overflow: 'hidden',
// Progress Fill
backgroundColor: '#FFAD27',
borderRadius: 4,
```

#### Loading States
```typescript
// Activity Indicator
color: '#FFAD27',
size: 'small' | 'large',
```

## Screen Layouts

### Standard Screen Structure
```typescript
// Screen Container
<SafeAreaView style={styles.container}>
  <StatusBar style="dark" />
  
  {/* Header */}
  <View style={styles.header}>
    <TouchableOpacity style={styles.backButton}>
      <Ionicons name="chevron-back" size={28} color="#333" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Screen Title</Text>
    <TouchableOpacity style={styles.skipButton}>
      <Text style={styles.skipText}>Skip</Text>
    </TouchableOpacity>
  </View>

  {/* Content */}
  <View style={styles.content}>
    {/* Screen content */}
  </View>

  {/* Bottom Actions */}
  <View style={styles.bottomContent}>
    <TouchableOpacity style={styles.primaryButton}>
      <Text style={styles.primaryButtonText}>Continue</Text>
    </TouchableOpacity>
  </View>
</SafeAreaView>
```

### Common Layout Patterns

#### Centered Content
```typescript
// Centered Layout
flex: 1,
justifyContent: 'center',
alignItems: 'center',
paddingHorizontal: 24,
```

#### Spaced Content
```typescript
// Spaced Layout
flex: 1,
paddingHorizontal: 24,
justifyContent: 'space-between',
```

#### Scrollable Content
```typescript
// Scrollable Layout
<ScrollView 
  style={styles.container}
  contentContainerStyle={styles.content}
  showsVerticalScrollIndicator={false}
>
  {/* Content */}
</ScrollView>
```

## Animation Patterns

### Fade In Animation
```typescript
// Fade In Effect
const fadeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 600,
    useNativeDriver: true,
  }).start();
}, []);

<Animated.View style={{ opacity: fadeAnim }}>
  {/* Content */}
</Animated.View>
```

### Scale Animation
```typescript
// Scale Effect
const scaleAnim = useRef(new Animated.Value(0.8)).current;

useEffect(() => {
  Animated.spring(scaleAnim, {
    toValue: 1,
    friction: 5,
    useNativeDriver: true,
  }).start();
}, []);

<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
  {/* Content */}
</Animated.View>
```

### Progress Animation
```typescript
// Progress Bar Animation
const progressAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(progressAnim, {
    toValue: progress,
    duration: 300,
    useNativeDriver: false,
  }).start();
}, [progress]);

<Animated.View 
  style={[
    styles.progressFill,
    {
      width: progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
      }),
    },
  ]} 
/>
```

## Modal Patterns

### Bottom Sheet Modal
```typescript
// Bottom Sheet
<Modal
  visible={showModal}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setShowModal(false)}
>
  <KeyboardAvoidingView 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={styles.modalContainer}
  >
    <View style={styles.modalContent}>
      {/* Modal content */}
    </View>
  </KeyboardAvoidingView>
</Modal>

// Modal Styles
modalContainer: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'flex-end',
},
modalContent: {
  backgroundColor: '#FFFFFF',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 24,
  paddingBottom: 40,
},
```

## Form Patterns

### Input Validation
```typescript
// Input with Validation
const [isValid, setIsValid] = useState(false);
const [error, setError] = useState('');

const handleInputChange = (text: string) => {
  setValue(text);
  const valid = validateInput(text);
  setIsValid(valid);
  setError(valid ? '' : 'Invalid input');
};

<TextInput
  style={[styles.input, !isValid && styles.inputError]}
  value={value}
  onChangeText={handleInputChange}
  placeholder="Enter text"
/>
{error && <Text style={styles.errorText}>{error}</Text>}
```

### Rate Limiting
```typescript
// Rate Limited Actions
const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

useEffect(() => {
  if (lastRequestTime) {
    const interval = setInterval(() => {
      const { limited, secondsRemaining } = checkRateLimit(lastRequestTime);
      setRateLimitCountdown(secondsRemaining);
      if (!limited) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }
}, [lastRequestTime]);

{rateLimitCountdown > 0 && (
  <View style={styles.rateLimitContainer}>
    <Text style={styles.rateLimitText}>
      Please wait {rateLimitCountdown} seconds
    </Text>
  </View>
)}
```

## Icon Usage

### Icon Sizes
```typescript
// Standard Icon Sizes
small: 16,    // Inline icons
medium: 20,   // Action icons
large: 24,    // Primary actions
xlarge: 28,   // Navigation
xxlarge: 32,  // Feature icons
```

### Icon Colors
```typescript
// Icon Color System
primary: '#FFAD27',    // Primary actions
secondary: '#666',     // Secondary actions
success: '#2ECC71',    // Success states
error: '#E74C3C',      // Error states
disabled: '#D3D3D3',   // Disabled states
```

## Image Patterns

### Logo Usage
```typescript
// Logo Styling
<Image 
  source={require('../../assets/images/trodie_logo_gray.png')}
  style={styles.logoImage}
  resizeMode="contain"
/>

// Logo Sizes
logoImage: {
  width: 160-200,
  height: 64-80,
},
```

### Profile Images
```typescript
// Profile Image
<Image 
  source={{ uri: profileImageUrl }}
  style={styles.profileImage}
  resizeMode="cover"
/>

// Profile Image Sizes
profileImage: {
  width: 80,
  height: 80,
  borderRadius: 40,
},
```

## Error States

### Error Messages
```typescript
// Error Alert
Alert.alert('Error Title', 'Error message description');

// Inline Error
<Text style={styles.errorText}>Error message</Text>

// Error Container
<View style={styles.errorContainer}>
  <Text style={styles.errorText}>Error message</Text>
</View>
```

### Loading States
```typescript
// Loading Button
<TouchableOpacity style={styles.button} disabled={loading}>
  {loading ? (
    <ActivityIndicator color="#FFFFFF" />
  ) : (
    <Text style={styles.buttonText}>Button Text</Text>
  )}
</TouchableOpacity>
```

## Accessibility

### Touch Targets
```typescript
// Minimum Touch Target
minHeight: 44,
minWidth: 44,
```

### Text Contrast
```typescript
// High Contrast Text
color: '#333',  // Primary text
color: '#666',  // Secondary text
color: '#999',  // Tertiary text
```

### Screen Reader Support
```typescript
// Accessibility Props
accessible={true}
accessibilityLabel="Button description"
accessibilityHint="Double tap to activate"
```

## Responsive Design

### Screen Adaptations
```typescript
// Responsive Layout
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Adaptive Spacing
paddingHorizontal: SCREEN_WIDTH > 375 ? 24 : 20,

// Adaptive Font Sizes
fontSize: SCREEN_WIDTH > 375 ? 16 : 14,
```

## Performance Guidelines

### Image Optimization
```typescript
// Optimized Images
resizeMode="cover" | "contain" | "center",
// Use appropriate resizeMode for context
```

### Animation Performance
```typescript
// Use Native Driver
useNativeDriver: true,  // For opacity and transform
useNativeDriver: false, // For layout properties
```

### List Performance
```typescript
// FlatList Optimization
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ItemComponent item={item} />}
  showsVerticalScrollIndicator={false}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
/>
```

## Implementation Checklist

### For New Screens
- [ ] Use SafeAreaView for proper layout
- [ ] Implement StatusBar with appropriate style
- [ ] Follow spacing system (24px horizontal padding)
- [ ] Use consistent typography hierarchy
- [ ] Implement proper loading states
- [ ] Add error handling with user-friendly messages
- [ ] Test accessibility features
- [ ] Optimize for performance

### For New Components
- [ ] Follow established component patterns
- [ ] Use theme colors and spacing
- [ ] Implement proper touch targets
- [ ] Add loading and error states
- [ ] Test on different screen sizes
- [ ] Ensure accessibility compliance

### For Animations
- [ ] Use appropriate easing curves
- [ ] Implement proper loading states
- [ ] Consider performance impact
- [ ] Test on lower-end devices
- [ ] Provide fallbacks for disabled animations

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Maintainer**: Design & Engineering Team 