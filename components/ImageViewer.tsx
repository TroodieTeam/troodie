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
  // Must call hooks explicitly, not in a loop or callback
  const scale0 = useSharedValue(1);
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const scale4 = useSharedValue(1);
  const scale5 = useSharedValue(1);
  const scale6 = useSharedValue(1);
  const scale7 = useSharedValue(1);
  const scale8 = useSharedValue(1);
  const scale9 = useSharedValue(1);
  const scale10 = useSharedValue(1);
  const scale11 = useSharedValue(1);
  const scale12 = useSharedValue(1);
  const scale13 = useSharedValue(1);
  const scale14 = useSharedValue(1);
  const scale15 = useSharedValue(1);
  const scale16 = useSharedValue(1);
  const scale17 = useSharedValue(1);
  const scale18 = useSharedValue(1);
  const scale19 = useSharedValue(1);
  
  const translateX0 = useSharedValue(0);
  const translateX1 = useSharedValue(0);
  const translateX2 = useSharedValue(0);
  const translateX3 = useSharedValue(0);
  const translateX4 = useSharedValue(0);
  const translateX5 = useSharedValue(0);
  const translateX6 = useSharedValue(0);
  const translateX7 = useSharedValue(0);
  const translateX8 = useSharedValue(0);
  const translateX9 = useSharedValue(0);
  const translateX10 = useSharedValue(0);
  const translateX11 = useSharedValue(0);
  const translateX12 = useSharedValue(0);
  const translateX13 = useSharedValue(0);
  const translateX14 = useSharedValue(0);
  const translateX15 = useSharedValue(0);
  const translateX16 = useSharedValue(0);
  const translateX17 = useSharedValue(0);
  const translateX18 = useSharedValue(0);
  const translateX19 = useSharedValue(0);
  
  const translateY0 = useSharedValue(0);
  const translateY1 = useSharedValue(0);
  const translateY2 = useSharedValue(0);
  const translateY3 = useSharedValue(0);
  const translateY4 = useSharedValue(0);
  const translateY5 = useSharedValue(0);
  const translateY6 = useSharedValue(0);
  const translateY7 = useSharedValue(0);
  const translateY8 = useSharedValue(0);
  const translateY9 = useSharedValue(0);
  const translateY10 = useSharedValue(0);
  const translateY11 = useSharedValue(0);
  const translateY12 = useSharedValue(0);
  const translateY13 = useSharedValue(0);
  const translateY14 = useSharedValue(0);
  const translateY15 = useSharedValue(0);
  const translateY16 = useSharedValue(0);
  const translateY17 = useSharedValue(0);
  const translateY18 = useSharedValue(0);
  const translateY19 = useSharedValue(0);
  
  // Create arrays for easier access (but hooks are already called above)
  const scales = [scale0, scale1, scale2, scale3, scale4, scale5, scale6, scale7, scale8, scale9, scale10, scale11, scale12, scale13, scale14, scale15, scale16, scale17, scale18, scale19];
  const translateX = [translateX0, translateX1, translateX2, translateX3, translateX4, translateX5, translateX6, translateX7, translateX8, translateX9, translateX10, translateX11, translateX12, translateX13, translateX14, translateX15, translateX16, translateX17, translateX18, translateX19];
  const translateY = [translateY0, translateY1, translateY2, translateY3, translateY4, translateY5, translateY6, translateY7, translateY8, translateY9, translateY10, translateY11, translateY12, translateY13, translateY14, translateY15, translateY16, translateY17, translateY18, translateY19];
  
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

