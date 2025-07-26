import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';

interface CreatePostButtonProps {
  communityId: string;
  communityName: string;
}

export const CreatePostButton: React.FC<CreatePostButtonProps> = ({ 
  communityId, 
  communityName 
}) => {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/add/create-post',
      params: { 
        communityId,
        communityName 
      }
    });
  };

  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={handlePress}
      accessibilityLabel="Create a new post in this community"
      accessibilityRole="button"
    >
      <Plus size={20} color="#FFFFFF" />
      <Text style={styles.text}>Create Post</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  }
});