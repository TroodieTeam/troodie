// Design tokens extracted from screens_to_implement folder
// These tokens define the new visual design system for the app

export const designTokens = {
  colors: {
    // Primary colors
    primaryOrange: '#FFAD27', // Primary CTAs, active states
    white: '#FFFFFF', // Backgrounds, surfaces
    
    // Text colors
    textDark: '#1F2937', // Primary headings
    textPrimary: '#1F2937', // Primary text (alias for textDark)
    textMediumDark: '#374151', // Secondary headings
    textMedium: '#6B7280', // Body text, descriptions
    textSecondary: '#6B7280', // Secondary text (alias for textMedium)
    textLight: '#9CA3AF', // Tertiary text, placeholders
    
    // Background colors
    backgroundLight: '#F9FAFB', // Light gray backgrounds
    backgroundGray: '#F3F4F6', // Input backgrounds
    backgroundSecondary: '#F3F4F6', // Secondary backgrounds (alias for backgroundGray)
    borderLight: '#E5E7EB', // Borders, dividers
    
    // Special colors
    overlayBlack: 'rgba(0, 0, 0, 0.3)', // Image overlays
    welcomeBannerStart: 'rgba(255, 173, 39, 0.1)', // Gradient start
    welcomeBannerEnd: 'rgba(255, 173, 39, 0.05)', // Gradient end
    error: '#EF4444', // Error states, delete buttons
    success: '#10B981', // Success states, confirmations
  },
  
  typography: {
    // Compact sizes based on HTML reference
    // text-lg = 18px, text-base = 16px, text-sm = 14px, text-xs = 12px
    
    // Brand & headings
    brandHeading: {
      fontSize: 20, // Reduced from 28
      fontFamily: 'Poppins_700Bold',
      fontWeight: '700' as const,
    },
    screenTitle: {
      fontSize: 24, // Reduced from 32
      fontFamily: 'Poppins_700Bold',
      fontWeight: '700' as const,
    },
    sectionTitle: {
      fontSize: 18, // Reduced from 22 (text-lg)
      fontFamily: 'Poppins_600SemiBold',
      fontWeight: '600' as const,
    },
    welcomeTitle: {
      fontSize: 18, // Reduced from 24 (text-lg)
      fontFamily: 'Poppins_700Bold',
      fontWeight: '700' as const,
    },
    
    // Cards & content
    cardTitle: {
      fontSize: 16, // Reduced from 18 (text-base)
      fontFamily: 'Inter_600SemiBold',
      fontWeight: '600' as const,
    },
    bodyRegular: {
      fontSize: 14, // Reduced from 16 (text-sm)
      fontFamily: 'Inter_400Regular',
      fontWeight: '400' as const,
    },
    bodyMedium: {
      fontSize: 14, // Reduced from 16 (text-sm)
      fontFamily: 'Inter_600SemiBold',
      fontWeight: '600' as const,
    },
    detailText: {
      fontSize: 13, // Reduced from 14
      fontFamily: 'Inter_400Regular',
      fontWeight: '400' as const,
    },
    smallText: {
      fontSize: 12, // Kept same (text-xs)
      fontFamily: 'Inter_400Regular',
      fontWeight: '400' as const,
    },
    
    // Special text
    filterText: {
      fontSize: 13, // Reduced from 14
      fontFamily: 'Inter_500Medium',
      fontWeight: '500' as const,
    },
    inputText: {
      fontSize: 14, // Reduced from 16 (text-sm)
      fontFamily: 'Inter_400Regular',
      fontWeight: '400' as const,
    },
    buttonText: {
      fontSize: 14, // Reduced from 16 (text-sm)
      fontFamily: 'Inter_600SemiBold',
      fontWeight: '600' as const,
    },
  },
  
  spacing: {
    // Compact spacing based on HTML reference
    // py-3 = 12px, p-4 = 16px, p-3 = 12px, space-y-3 = 12px
    xs: 4,
    sm: 8,
    md: 12,  // Primary spacing (p-3, py-3)
    lg: 16,  // Content padding (p-4)
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 30, // For pill shapes
    round: 9999, // For circles
  },
  
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2, // Android
    },
    button: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4, // Android
    },
  },
  
  gradients: {
    welcomeBanner: ['rgba(255, 173, 39, 0.1)', 'rgba(255, 173, 39, 0.05)'],
  },
};

// Helper function to apply shadows consistently
export const applyShadow = (type: keyof typeof designTokens.shadows) => {
  return designTokens.shadows[type];
};

// Compact design system constants based on HTML reference
export const compactDesign = {
  // Header/Title sections
  header: {
    paddingVertical: 12, // py-3
    paddingHorizontal: 16, // px-4
    height: 48, // Compact header height
  },
  
  // Content areas
  content: {
    padding: 16, // p-4
    paddingCompact: 12, // p-3
    gap: 12, // space-y-3
  },
  
  // Cards
  card: {
    padding: 12, // p-3
    borderRadius: 12, // rounded-xl
    gap: 8, // space-y-2
  },
  
  // Buttons
  button: {
    height: 36, // h-9
    heightSmall: 28, // h-7
    paddingHorizontal: 16, // px-4
    paddingHorizontalSmall: 12, // px-3
    fontSize: 14, // text-sm
  },
  
  // Icons
  icon: {
    small: 16, // h-4 w-4
    medium: 20, // h-5 w-5
    large: 24, // h-6 w-6
  },
  
  // Input fields
  input: {
    height: 40, // h-10
    paddingHorizontal: 12, // px-3
    fontSize: 14, // text-sm
  },
  
  // Tab bar
  tabBar: {
    height: 48, // Compact tab bar
    paddingVertical: 8,
  },
};