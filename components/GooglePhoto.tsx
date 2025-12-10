import { DEFAULT_IMAGES } from '@/constants/images';
import React, { useMemo, useState } from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';

interface GooglePhotoProps {
  photoReference: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

export const GooglePhoto = ({ photoReference, style, resizeMode = 'cover' }: GooglePhotoProps) => {
  const [hasError, setHasError] = useState(false);
  const imageSource = useMemo(() => {
    if (!photoReference || hasError) {
      return { uri: DEFAULT_IMAGES.restaurant };
    }
    if (photoReference.startsWith('http') && !photoReference.includes('maps.googleapis.com')) {
      return { uri: photoReference };
    }
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    let referenceId = photoReference;
    if (photoReference.includes('photoreference=')) {
      const match = photoReference.match(/photoreference=([^&]+)/);
      if (match && match[1]) {
        referenceId = match[1];
      }
    }

    const finalUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${referenceId}&key=${API_KEY}`;
    return {
      uri: finalUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': '', 
        'Accept': 'image/*'
      }
    };
  }, [photoReference, hasError]);

  if (!photoReference) {
    return <Image source={{ uri: DEFAULT_IMAGES.restaurant }} style={style} resizeMode={resizeMode} />;
  }

  return (
    <Image 
      source={imageSource} 
      resizeMode={resizeMode}
      onError={() => setHasError(true)}
      style={[style, { backgroundColor: '#f0f0f0' }]} 
    />
  );
};