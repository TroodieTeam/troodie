// Design tokens extracted from screens_to_implement folder
// These tokens define the new visual design system for the app

export const designTokens = {
  colors: {
    // Primary colors
    primaryOrange: '#FFAD27', // Primary CTAs, active states
    white: '#FFFFFF', // Backgrounds, surfaces
    
    // Text colors
    textDark: '#1F2937', // Primary headings
    textMediumDark: '#374151', // Secondary headings
    textMedium: '#6B7280', // Body text, descriptions
    textLight: '#9CA3AF', // Tertiary text, placeholders
    
    // Background colors
    backgroundLight: '#F9FAFB', // Light gray backgrounds
    backgroundGray: '#F3F4F6', // Input backgrounds
    borderLight: '#E5E7EB', // Borders, dividers
    
    // Special colors
    overlayBlack: 'rgba(0, 0, 0, 0.3)', // Image overlays
    welcomeBannerStart: 'rgba(255, 173, 39, 0.1)', // Gradient start
    welcomeBannerEnd: 'rgba(255, 173, 39, 0.05)', // Gradient end
  },
  
  typography: {
    // Brand & headings
    brandHeading: {
      fontSize: 28,
      fontFamily: 'Poppins_700Bold',
      fontWeight: '700' as const,
    },
    screenTitle: {
      fontSize: 32,
      fontFamily: 'Poppins_700Bold',
      fontWeight: '700' as const,
    },
    sectionTitle: {
      fontSize: 22,
      fontFamily: 'Poppins_600SemiBold',
      fontWeight: '600' as const,
    },
    welcomeTitle: {
      fontSize: 24,
      fontFamily: 'Poppins_700Bold',
      fontWeight: '700' as const,
    },
    
    // Cards & content
    cardTitle: {
      fontSize: 18,
      fontFamily: 'Inter_600SemiBold',
      fontWeight: '600' as const,
    },
    bodyRegular: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      fontWeight: '400' as const,
    },
    bodyMedium: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      fontWeight: '600' as const,
    },
    detailText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      fontWeight: '400' as const,
    },
    smallText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      fontWeight: '400' as const,
    },
    
    // Special text
    filterText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      fontWeight: '500' as const,
    },
    inputText: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      fontWeight: '400' as const,
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
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