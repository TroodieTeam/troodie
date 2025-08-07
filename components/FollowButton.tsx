import React from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native'

interface FollowButtonProps {
  isFollowing: boolean
  isLoading?: boolean
  onPress: () => void
  size?: 'small' | 'medium' | 'large'
  style?: ViewStyle
}

export default function FollowButton({
  isFollowing,
  isLoading = false,
  onPress,
  size = 'medium',
  style,
}: FollowButtonProps) {
  const [showUnfollow, setShowUnfollow] = React.useState(false);
  
  const buttonStyle = [
    styles.button,
    styles[size],
    isFollowing ? styles.followingButton : styles.followButton,
    showUnfollow && styles.unfollowButton,
    style,
  ]

  const textStyle = [
    styles.buttonText,
    styles[`${size}Text`],
    isFollowing ? styles.followingText : styles.followText,
    showUnfollow && styles.unfollowText,
  ]

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
      onPressIn={() => isFollowing && setShowUnfollow(true)}
      onPressOut={() => setShowUnfollow(false)}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={isFollowing ? '#666' : '#fff'}
        />
      ) : (
        <Text style={textStyle}>
          {showUnfollow ? 'Unfollow' : isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Size variations
  small: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 70,
  },
  medium: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 90,
  },
  large: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    minWidth: 110,
  },
  // Button states
  followButton: {
    backgroundColor: '#FFAD27',
  },
  followingButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  // Text styles
  buttonText: {
    fontWeight: '600',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  followText: {
    color: '#fff',
  },
  followingText: {
    color: '#666',
  },
  unfollowButton: {
    backgroundColor: '#ff4444',
    borderWidth: 0,
  },
  unfollowText: {
    color: '#fff',
  },
})