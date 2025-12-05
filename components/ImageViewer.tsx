import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const DOUBLE_TAP_SCALE = 2;

// Helper function to clamp values
const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

export function ImageViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Single set of shared values for the active image (only one image can be zoomed at a time)
  // This is more performant and follows React hooks rules
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const swipeX = useSharedValue(0);

  // Reset zoom/pan when image changes
  useEffect(() => {
    if (visible) {
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      swipeX.value = 0;
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex, scale, translateX, translateY, swipeX]);

  const updateIndex = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= images.length) return;
    
    // Reset zoom/pan when switching images
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    swipeX.value = 0;
    
    setCurrentIndex(newIndex);
  }, [images.length, scale, translateX, translateY, swipeX]);

  // Pan gesture for dragging zoomed image
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > MIN_SCALE) {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      }
    })
    .onEnd(() => {
      // Clamp translation to prevent dragging too far
      const maxTranslateX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
      const maxTranslateY = (SCREEN_HEIGHT * (scale.value - 1)) / 2;
      
      translateX.value = withSpring(
        clamp(translateX.value, -maxTranslateX, maxTranslateX)
      );
      translateY.value = withSpring(
        clamp(translateY.value, -maxTranslateY, maxTranslateY)
      );
    });

  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value < MIN_SCALE) {
        scale.value = withSpring(MIN_SCALE);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  // Double tap gesture for zoom in/out
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > MIN_SCALE) {
        // Zoom out
        scale.value = withSpring(MIN_SCALE);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        // Zoom in
        scale.value = withSpring(DOUBLE_TAP_SCALE);
      }
    });

  // Horizontal swipe gesture for changing images (only when not zoomed)
  const swipeGesture = Gesture.Pan()
    .enabled(scale.value <= MIN_SCALE)
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (scale.value <= MIN_SCALE) {
        swipeX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (scale.value > MIN_SCALE) {
        swipeX.value = withSpring(0);
        return;
      }
      
      const threshold = SCREEN_WIDTH * 0.25;
      const velocity = e.velocityX;
      
      if (Math.abs(e.translationX) > threshold || Math.abs(velocity) > 500) {
        if (e.translationX > 0 && currentIndex > 0) {
          // Swipe right - go to previous image
          const newIndex = currentIndex - 1;
          runOnJS(updateIndex)(newIndex);
        } else if (e.translationX < 0 && currentIndex < images.length - 1) {
          // Swipe left - go to next image
          const newIndex = currentIndex + 1;
          runOnJS(updateIndex)(newIndex);
        }
      }
      swipeX.value = withSpring(0);
    });

  // Combined gestures for active image
  const combinedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture),
    swipeGesture
  );

  const handleClose = () => {
    // Reset zoom/pan state
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    swipeX.value = 0;
    onClose();
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      updateIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      updateIndex(currentIndex + 1);
    }
  };

  // Create animated styles - limit to 10 images max for performance
  // Call hooks explicitly to follow React rules
  const style0 = useAnimatedStyle(() => {
    const isActive = 0 === currentIndex;
    const opacity = isActive ? 1 : 0;
    const activeScale = isActive ? scale.value : 1;
    const activeTx = isActive ? translateX.value : 0;
    const activeTy = isActive ? translateY.value : 0;
    const xOffset = isActive ? swipeX.value + (0 - currentIndex) * SCREEN_WIDTH : (0 - currentIndex) * SCREEN_WIDTH;
    return {
      opacity: withTiming(opacity, { duration: 200 }),
      transform: [{ translateX: xOffset + activeTx }, { translateY: activeTy }, { scale: activeScale }],
    };
  });
  
  const style1 = useAnimatedStyle(() => {
    const isActive = 1 === currentIndex;
    const opacity = isActive ? 1 : 0;
    const activeScale = isActive ? scale.value : 1;
    const activeTx = isActive ? translateX.value : 0;
    const activeTy = isActive ? translateY.value : 0;
    const xOffset = isActive ? swipeX.value + (1 - currentIndex) * SCREEN_WIDTH : (1 - currentIndex) * SCREEN_WIDTH;
    return {
      opacity: withTiming(opacity, { duration: 200 }),
      transform: [{ translateX: xOffset + activeTx }, { translateY: activeTy }, { scale: activeScale }],
    };
  });
  
  const style2 = useAnimatedStyle(() => {
    const isActive = 2 === currentIndex;
    const opacity = isActive ? 1 : 0;
    const activeScale = isActive ? scale.value : 1;
    const activeTx = isActive ? translateX.value : 0;
    const activeTy = isActive ? translateY.value : 0;
    const xOffset = isActive ? swipeX.value + (2 - currentIndex) * SCREEN_WIDTH : (2 - currentIndex) * SCREEN_WIDTH;
    return {
      opacity: withTiming(opacity, { duration: 200 }),
      transform: [{ translateX: xOffset + activeTx }, { translateY: activeTy }, { scale: activeScale }],
    };
  });
  
  const style3 = useAnimatedStyle(() => {
    const isActive = 3 === currentIndex;
    const opacity = isActive ? 1 : 0;
    const activeScale = isActive ? scale.value : 1;
    const activeTx = isActive ? translateX.value : 0;
    const activeTy = isActive ? translateY.value : 0;
    const xOffset = isActive ? swipeX.value + (3 - currentIndex) * SCREEN_WIDTH : (3 - currentIndex) * SCREEN_WIDTH;
    return {
      opacity: withTiming(opacity, { duration: 200 }),
      transform: [{ translateX: xOffset + activeTx }, { translateY: activeTy }, { scale: activeScale }],
    };
  });
  
  const style4 = useAnimatedStyle(() => {
    const isActive = 4 === currentIndex;
    const opacity = isActive ? 1 : 0;
    const activeScale = isActive ? scale.value : 1;
    const activeTx = isActive ? translateX.value : 0;
    const activeTy = isActive ? translateY.value : 0;
    const xOffset = isActive ? swipeX.value + (4 - currentIndex) * SCREEN_WIDTH : (4 - currentIndex) * SCREEN_WIDTH;
    return {
      opacity: withTiming(opacity, { duration: 200 }),
      transform: [{ translateX: xOffset + activeTx }, { translateY: activeTy }, { scale: activeScale }],
    };
  });
  
  const style5 = useAnimatedStyle(() => {
    const isActive = 5 === currentIndex;
    const opacity = isActive ? 1 : 0;
    const activeScale = isActive ? scale.value : 1;
    const activeTx = isActive ? translateX.value : 0;
    const activeTy = isActive ? translateY.value : 0;
    const xOffset = isActive ? swipeX.value + (5 - currentIndex) * SCREEN_WIDTH : (5 - currentIndex) * SCREEN_WIDTH;
    return {
      opacity: withTiming(opacity, { duration: 200 }),
      transform: [{ translateX: xOffset + activeTx }, { translateY: activeTy }, { scale: activeScale }],
    };
  });
  
  const style6 = useAnimatedStyle(() => {
    const isActive = 6 === currentIndex;
    const opacity = isActive ? 1 : 0;
    const activeScale = isActive ? scale.value : 1;
    const activeTx = isActive ? translateX.value : 0;
    const activeTy = isActive ? translateY.value : 0;
    const xOffset = isActive ? swipeX.value + (6 - currentIndex) * SCREEN_WIDTH : (6 - currentIndex) * SCREEN_WIDTH;
    return {
      opacity: withTiming(opacity, { duration: 200 }),
      transform: [{ translateX: xOffset + activeTx }, { translateY: activeTy }, { scale: activeScale }],
    };
  });
  
  const style7 = useAnimatedStyle(() => {
    const isActive = 7 === currentIndex;
    const opacity = isActive ? 1 : 0;
    const activeScale = isActive ? scale.value : 1;
    const activeTx = isActive ? translateX.value : 0;
    const activeTy = isActive ? translateY.value : 0;
    const xOffset = isActive ? swipeX.value + (7 - currentIndex) * SCREEN_WIDTH : (7 - currentIndex) * SCREEN_WIDTH;
    return {
      opacity: withTiming(opacity, { duration: 200 }),
      transform: [{ translateX: xOffset + activeTx }, { translateY: activeTy }, { scale: activeScale }],
    };
  });
  
  const style8 = useAnimatedStyle(() => {
    const isActive = 8 === currentIndex;
    const opacity = isActive ? 1 : 0;
    const activeScale = isActive ? scale.value : 1;
    const activeTx = isActive ? translateX.value : 0;
    const activeTy = isActive ? translateY.value : 0;
    const xOffset = isActive ? swipeX.value + (8 - currentIndex) * SCREEN_WIDTH : (8 - currentIndex) * SCREEN_WIDTH;
    return {
      opacity: withTiming(opacity, { duration: 200 }),
      transform: [{ translateX: xOffset + activeTx }, { translateY: activeTy }, { scale: activeScale }],
    };
  });
  
  const style9 = useAnimatedStyle(() => {
    const isActive = 9 === currentIndex;
    const opacity = isActive ? 1 : 0;
    const activeScale = isActive ? scale.value : 1;
    const activeTx = isActive ? translateX.value : 0;
    const activeTy = isActive ? translateY.value : 0;
    const xOffset = isActive ? swipeX.value + (9 - currentIndex) * SCREEN_WIDTH : (9 - currentIndex) * SCREEN_WIDTH;
    return {
      opacity: withTiming(opacity, { duration: 200 }),
      transform: [{ translateX: xOffset + activeTx }, { translateY: activeTy }, { scale: activeScale }],
    };
  });
  
  const animatedStyles = [style0, style1, style2, style3, style4, style5, style6, style7, style8, style9];
  const MAX_IMAGES = 10;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Image counter */}
          {images.length > 1 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {images.length}
              </Text>
            </View>
          )}

          {/* Image container with gestures */}
          <View style={styles.imageContainer}>
            {images.slice(0, MAX_IMAGES).map((imageUri, index) => {
              const isActive = index === currentIndex;
              const animatedStyle = animatedStyles[index] || animatedStyles[0]; // Fallback to first style

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.imageWrapper,
                    animatedStyle,
                    { zIndex: isActive ? 1 : 0 },
                  ]}
                  pointerEvents={isActive ? 'auto' : 'none'}
                >
                  {isActive && (
                    <GestureDetector gesture={combinedGesture}>
                      <View style={StyleSheet.absoluteFill} />
                    </GestureDetector>
                  )}
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.image}
                    contentFit="contain"
                    transition={200}
                  />
                </Animated.View>
              );
            })}
          </View>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.navButtonLeft]}
                  onPress={handlePrevious}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {currentIndex < images.length - 1 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.navButtonRight]}
                  onPress={handleNext}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navButtonLeft: {
    left: 20,
  },
  navButtonRight: {
    right: 20,
  },
});
