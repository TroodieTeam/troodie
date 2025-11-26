import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { DEFAULT_IMAGES } from '@/constants/images';

interface VideoThumbnailProps {
  videoUri: string;
  style?: ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch';
}

export function VideoThumbnail({ videoUri, style, resizeMode = 'cover' }: VideoThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const player = useVideoPlayer(videoUri || '');

  useEffect(() => {
    if (!videoUri) {
      setHasError(true);
      return;
    }

    // Set looping to false for thumbnails
    player.loop = false;

    let mounted = true;

    const loadVideo = async () => {
      try {
        await player.replaceAsync(videoUri);
        if (mounted) {
          // Seek to a small time to get a frame (some videos don't have a frame at 0)
          player.currentTime = 0.1;
          player.pause();
        }
      } catch (error) {
        console.error('Error loading video thumbnail:', error);
        if (mounted) {
          setHasError(true);
        }
      }
    };

    loadVideo();

    return () => {
      mounted = false;
    };
  }, [videoUri, player]);

  if (hasError || !videoUri) {
    return (
      <Image
        source={{ uri: DEFAULT_IMAGES.restaurant }}
        style={[styles.thumbnail, style]}
        resizeMode={resizeMode}
      />
    );
  }

  // Always render VideoView - it will show a black screen until ready, avoiding flicker
  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit={resizeMode}
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  loading: {
    backgroundColor: '#F5F5F5',
  },
});

