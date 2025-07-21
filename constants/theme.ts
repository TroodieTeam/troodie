export const theme = {
  colors: {
    primary: '#FFAD27', // Orange/Yellow - Primary CTA color
    secondary: '#5B4CCC', // Purple - Secondary actions
    background: '#FFFDF7', // Light cream background
    surface: '#FFFFFF',
    text: {
      primary: '#1F2937', // Updated to match design tokens (was #333333)
      secondary: '#6B7280', // Updated to match design tokens (was #666666)
      tertiary: '#9CA3AF', // Updated to match design tokens (was #999999)
      dark: '#111827', // New - for headers
      mediumDark: '#374151', // New - for subheaders
    },
    border: '#E5E7EB', // Updated to match design tokens (was #E5E5E5)
    error: '#E74C3C',
    success: '#2ECC71',
    info: '#3498DB',
    // New background variations
    backgroundLight: '#F9FAFB',
    backgroundGray: '#F3F4F6',
    // Persona colors
    personas: {
      trendsetter: '#FF6B6B',
      culinary_adventurer: '#4ECDC4',
      luxe_planner: '#9B59B6',
      hidden_gem_hunter: '#F39C12',
      comfort_seeker: '#3498DB',
      budget_foodie: '#2ECC71',
      social_explorer: '#E74C3C',
      local_expert: '#95A5A6',
    },
  },
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
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12, // Updated from 16
    lg: 16, // Updated from 24
    xl: 20, // Updated from 32
    xxl: 24, // Updated from 40
    xxxl: 32, // New
  },
  borderRadius: {
    sm: 8, // Updated from 4
    md: 12, // Updated from 8
    lg: 16, // Updated from 12
    xl: 20, // Updated from 16
    xxl: 30, // Updated from 20, for pill shapes
    full: 9999,
  },
};