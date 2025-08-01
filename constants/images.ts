export const DEFAULT_IMAGES = {
  restaurant: 'https://via.placeholder.com/300x200/f0f0f0/666666?text=Restaurant',
  profile: 'https://via.placeholder.com/150x150/f0f0f0/666666?text=Profile',
  board: 'https://via.placeholder.com/300x200/f0f0f0/666666?text=Board',
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