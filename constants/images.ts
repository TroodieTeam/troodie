export const DEFAULT_IMAGES = {
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300&h=200&fit=crop',
  profile: 'https://ui-avatars.com/api/?name=User&size=150&background=FFA500&color=fff&bold=true',
  avatar: 'https://ui-avatars.com/api/?name=T&size=150&background=FFA500&color=fff&bold=true&rounded=true',
  board: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop',
} as const;

// Generate a placeholder image with the restaurant name
export const getRestaurantPlaceholder = (name: string): string => {
  const encodedName = encodeURIComponent(name || 'Restaurant');
  // Use different background colors based on the first letter of the name
  const colors = [
    'e8f4f8', // Light blue
    'f8e8e8', // Light pink
    'e8f8e8', // Light green
    'f8f8e8', // Light yellow
    'f0e8f8', // Light purple
    'f8f0e8', // Light orange
  ];
  const colorIndex = (name?.charCodeAt(0) || 0) % colors.length;
  const bgColor = colors[colorIndex];
  
  return `https://via.placeholder.com/300x200/${bgColor}/666666?text=${encodedName}`;
};