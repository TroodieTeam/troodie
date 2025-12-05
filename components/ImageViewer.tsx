import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
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
  
  // Use a fixed maximum number of hooks (max 20 images supported)
  // This ensures hooks are always called in the same order
  const MAX_IMAGES = 20;
  const scales = Array.from({ length: MAX_IMAGES }, () => useSharedValue(1));
  const translateX = Array.from({ length: MAX_IMAGES }, () => useSharedValue(0));
  const translateY = Array.from({ length: MAX_IMAGES }, () => useSharedValue(0));
  
  // Swipe gesture for changing images
  const swipeX = useSharedValue(0);

  const updateIndex = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= images.length) return;
    setCurrentIndex(newIndex);
    // Reset zoom when changing images
    if (scales[newIndex] && translateX[newIndex] && translateY[newIndex]) {
      scales[newIndex].value = 1;
      translateX[newIndex].value = 0;
      translateY[newIndex].value = 0;
    }
  }, [scales, translateX, translateY, images.length]);

  // Pan gesture for dragging zoomed image
  const createPanGesture = (index: number) => {
    if (!scales[index] || !translateX[index] || !translateY[index]) {
      return Gesture.Tap(); // Return a no-op gesture if index is out of bounds
    }
    return Gesture.Pan()
      .onUpdate((e) => {
        if (scales[index].value > MIN_SCALE) {
          translateX[index].value = e.translationX;
          translateY[index].value = e.translationY;
        }
      })
      .onEnd(() => {
        // Clamp translation to prevent dragging too far
        const maxTranslateX = (SCREEN_WIDTH * (scales[index].value - 1)) / 2;
        const maxTranslateY = (SCREEN_HEIGHT * (scales[index].value - 1)) / 2;
        
        translateX[index].value = withSpring(
          clamp(translateX[index].value, -maxTranslateX, maxTranslateX)
        );
        translateY[index].value = withSpring(
          clamp(translateY[index].value, -maxTranslateY, maxTranslateY)
        );
      });
  };

  // Pinch gesture for zooming
  const createPinchGesture = (index: number) => {
    if (!scales[index] || !translateX[index] || !translateY[index]) {
      return Gesture.Tap(); // Return a no-op gesture if index is out of bounds
    }
    return Gesture.Pinch()
      .onUpdate((e) => {
        scales[index].value = clamp(e.scale, MIN_SCALE, MAX_SCALE);
      })
      .onEnd(() => {
        if (scales[index].value < MIN_SCALE) {
          scales[index].value = withSpring(MIN_SCALE);
          translateX[index].value = withSpring(0);
          translateY[index].value = withSpring(0);
        }
      });
  };

  // Double tap gesture for zoom in/out
  const createDoubleTapGesture = (index: number) => {
    if (!scales[index] || !translateX[index] || !translateY[index]) {
      return Gesture.Tap(); // Return a no-op gesture if index is out of bounds
    }
    return Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        if (scales[index].value > MIN_SCALE) {
          // Zoom out
          scales[index].value = withSpring(MIN_SCALE);
          translateX[index].value = withSpring(0);
          translateY[index].value = withSpring(0);
        } else {
          // Zoom in
          scales[index].value = withSpring(DOUBLE_TAP_SCALE);
        }
      });
  };

  // Horizontal swipe gesture for changing images (only when not zoomed)
  const createSwipeGesture = (index: number) => {
    if (!scales[index]) {
      return Gesture.Tap(); // Return a no-op gesture if index is out of bounds
    }
    return Gesture.Pan()
      .enabled(scales[index].value <= MIN_SCALE)
      .activeOffsetX([-10, 10])
      .onUpdate((e) => {
        if (scales[index].value <= MIN_SCALE) {
          swipeX.value = e.translationX;
        }
      })
      .onEnd((e) => {
        if (scales[index].value > MIN_SCALE) {
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
  };

  const handleClose = () => {
    // Reset all zoom states (only for images that exist)
    images.forEach((_, index) => {
      if (scales[index] && translateX[index] && translateY[index]) {
        scales[index].value = 1;
        translateX[index].value = 0;
        translateY[index].value = 0;
      }
    });
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
          {images.map((imageUri, index) => {
            const isActive = index === currentIndex;
            
            // Combined gestures for active image
            const combinedGesture = isActive
              ? Gesture.Race(
                  createDoubleTapGesture(index),
                  Gesture.Simultaneous(
                    createPinchGesture(index),
                    createPanGesture(index)
                  ),
                  createSwipeGesture(index)
                )
              : Gesture.Tap();

            const animatedStyle = useAnimatedStyle(() => {
              const opacity = isActive ? 1 : 0;
              const scale = scales[index]?.value ?? 1;
              const tx = translateX[index]?.value ?? 0;
              const ty = translateY[index]?.value ?? 0;
              
              // Calculate position for swipe between images
              let xOffset = 0;
              if (isActive) {
                xOffset = swipeX.value + (index - currentIndex) * SCREEN_WIDTH;
              } else {
                xOffset = (index - currentIndex) * SCREEN_WIDTH;
              }

              return {
                opacity: withTiming(opacity, { duration: 200 }),
                transform: [
                  { translateX: xOffset + tx },
                  { translateY: ty },
                  { scale },
                ],
              };
            });

            return (
              <GestureDetector key={index} gesture={combinedGesture}>
                <Animated.View
                  style={[
                    styles.imageWrapper,
                    animatedStyle,
                    { zIndex: isActive ? 1 : 0 },
                  ]}
                  pointerEvents={isActive ? 'auto' : 'none'}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.image}
                    contentFit="contain"
                    transition={200}
                  />
                </Animated.View>
              </GestureDetector>
            );
          })}
        </View>

        {/* Navigation arrows (optional, for better UX) */}
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

