/**
 * TROODIE DESIGN SYSTEM TOKENS v3.0
 * Single source of truth for all design values
 * Based on DESIGN_GUIDE_EXTENDED.md
 */

// ============================================
// COLOR TOKENS
// ============================================
export const colors = {
  // Primary - ONLY for CTAs and active states
  primaryOrange: '#FFAD27',
  primaryOrangeHover: '#E67E00',
  primaryOrangePressed: '#CC7000',
  
  // Text
  textDark: '#000000',        // Primary text (Absolute Black)
  textGray: '#808080',         // Secondary text (Context Gray)
  textLight: '#B3B3B3',        // Tertiary text
  textWhite: '#FFFFFF',
  
  // Backgrounds
  surface: '#FFFFFF',          // Cards, modals
  surfaceLight: '#F5F5F5',     // Subtle backgrounds
  background: '#FAFAFA',       // App background
  
  // Borders
  border: '#E5E5E5',           // Default borders
  borderLight: '#F0F0F0',      // Subtle borders
  borderDark: '#CCCCCC',       // Emphasized borders
  
  // Semantic
  success: '#10B981',          // Green
  warning: '#F59E0B',          // Amber
  error: '#DC2626',            // Red
  info: '#3B82F6',             // Blue
  
  // Special
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

// ============================================
// TYPOGRAPHY TOKENS
// ============================================
export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  metadata: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  button: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
    letterSpacing: 0.2,
  }
} as const;

// ============================================
// SPACING TOKENS (4pt grid)
// ============================================
export const spacing = {
  none: 0,
  xxs: 2,   // 0.5x grid
  xs: 4,    // 1x grid
  sm: 8,    // 2x grid
  md: 12,   // 3x grid
  lg: 16,   // 4x grid
  xl: 20,   // 5x grid
  xxl: 24,  // 6x grid
  xxxl: 32, // 8x grid
  huge: 48, // 12x grid
} as const;

// ============================================
// BORDER RADIUS TOKENS
// ============================================
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

// ============================================
// SHADOW TOKENS
// ============================================
export const shadows = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ============================================
// LAYOUT TOKENS
// ============================================
export const layout = {
  screenPadding: spacing.lg,
  cardPadding: spacing.lg,
  headerHeight: 56,
  tabBarHeight: 56,
  buttonHeight: {
    small: 32,
    medium: 44,  // Default, meets minimum touch target
    large: 56,
  },
  iconSize: {
    xs: 16,
    sm: 20,
    md: 24,  // Default
    lg: 32,
    xl: 48,
  },
  avatarSize: {
    xs: 24,
    sm: 32,
    md: 40,  // Default
    lg: 56,
    xl: 64,  // Story circles
    xxl: 80,
  },
} as const;

// ============================================
// ANIMATION TOKENS
// ============================================
export const animation = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

// ============================================
// Z-INDEX TOKENS
// ============================================
export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  toast: 600,
} as const;

// ============================================
// EXPORT COMPLETE DESIGN SYSTEM
// ============================================
export const DS = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  layout,
  animation,
  zIndex,
} as const;

export default DS;