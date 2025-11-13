import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface VideoViewerProps {
  visible: boolean;
  videos: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function VideoViewer({
  visible,
  videos,
  initialIndex = 0,
  onClose,
}: VideoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Create video players for each video (max 5 videos supported)
  // We always create 5 players to follow React hooks rules, but only use the ones we need
  // Pass empty string for missing videos - player will handle it gracefully
  const player0 = useVideoPlayer(videos[0] || '');
  const player1 = useVideoPlayer(videos[1] || '');
  const player2 = useVideoPlayer(videos[2] || '');
  const player3 = useVideoPlayer(videos[3] || '');
  const player4 = useVideoPlayer(videos[4] || '');

  const allPlayers = useMemo(() => [player0, player1, player2, player3, player4], [player0, player1, player2, player3, player4]);

  // Configure all players for optimal playback (no looping, proper settings)
  useEffect(() => {
    allPlayers.forEach((player) => {
      if (player) {
        player.loop = false;
        // Ensure muted is false for audio playback
        player.muted = false;
      }
    });
  }, [allPlayers]);
  const players = useMemo(() => allPlayers.slice(0, videos.length), [allPlayers, videos.length]);
  
  // Memoize current player to prevent unnecessary re-renders
  const currentPlayer = useMemo(() => {
    return allPlayers[currentIndex] || allPlayers[0];
  }, [allPlayers, currentIndex]);
  
  // Update player sources when videos array changes
  const videosKeyRef = useRef('');
  useEffect(() => {
    if (!visible) return;
    
    const videosKey = videos.join(',');
    // Only update if videos actually changed
    if (videosKey === videosKeyRef.current) return;
    videosKeyRef.current = videosKey;
    
    const updatePlayers = async () => {
      for (let index = 0; index < allPlayers.length; index++) {
        const player = allPlayers[index];
        const videoUri = videos[index];
        if (videoUri && videoUri !== '') {
          try {
            await player.replaceAsync(videoUri);
          } catch (error) {
            console.error(`Error loading video ${index}:`, error);
          }
        }
      }
    };
    updatePlayers();
  }, [visible, videos.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track playing state for current player using useEvent
  const playingEvent = useEvent(currentPlayer, 'playingChange', {
    isPlaying: currentPlayer?.playing ?? false,
  });
  const isPlaying = playingEvent?.isPlaying ?? false;

  // Track current time from timeUpdate event
  const timeEvent = useEvent(currentPlayer, 'timeUpdate', {
    currentTime: currentPlayer?.currentTime ?? 0,
    currentLiveTimestamp: 0,
    currentOffsetFromLive: 0,
    bufferedPosition: 0,
  });
  const currentTime = timeEvent?.currentTime ?? 0;

  // Primary time source: Poll player's currentTime directly since timeUpdate event is unreliable
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const timeSyncIssueLoggedRef = useRef(false);
  useEffect(() => {
    if (!visible || !currentPlayer) {
      setPlayerCurrentTime(0);
      timeSyncIssueLoggedRef.current = false;
      return;
    }
    
    // Poll player's currentTime directly as primary source
    const interval = setInterval(() => {
      if (currentPlayer && currentPlayer.currentTime !== undefined) {
        const playerTime = currentPlayer.currentTime;
        setPlayerCurrentTime(playerTime);
        
        // Log time sync issue once if detected (event not working)
        if (!timeSyncIssueLoggedRef.current && Math.abs(playerTime - currentTime) > 1 && playerTime > 0) {
          console.log(`[VideoViewer] ⚠️ timeUpdate event not working - using player time directly: ${playerTime.toFixed(2)}s`);
          timeSyncIssueLoggedRef.current = true;
        }
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [visible, currentPlayer, currentTime]);

  // Use player time as primary source, fallback to event time
  const actualCurrentTime = playerCurrentTime > 0 ? playerCurrentTime : currentTime;

  // Track status from statusChange event
  const statusEvent = useEvent(currentPlayer, 'statusChange', {
    status: currentPlayer?.status ?? 'idle',
  });
  const status = statusEvent?.status ?? 'idle';

  // Get duration directly from player and update when it changes
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    if (currentPlayer) {
      const playerDuration = currentPlayer.duration ?? 0;
      if (playerDuration > 0 && Math.abs(playerDuration - duration) > 0.1) {
        setDuration(playerDuration);
      }
    }
  }, [currentPlayer, status, currentPlayer?.duration]);

  // Debug: Log when status changes to loading (might indicate buffering/reloading issue)
  // Also try to resume playback if it paused due to loading
  const wasPlayingBeforeLoadingRef = useRef(false);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!visible) {
      wasPlayingBeforeLoadingRef.current = false;
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
      return;
    }

    // Clear any existing resume timer
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    if (status === 'loading' && currentPlayer) {
      const playerTime = actualCurrentTime;
      console.log(`\n[VideoViewer] ⚠️ STATUS CHANGED TO LOADING ⚠️`);
      console.log(`Player Current Time: ${playerTime.toFixed(2)}s`);
      console.log(`Duration: ${duration.toFixed(2)}s`);
      console.log(`Is Playing: ${isPlaying}`);
      console.log(`This might indicate buffering or reloading issue!\n`);
      
      // Track if we were playing before loading started
      if (!wasPlayingBeforeLoadingRef.current && isPlaying) {
        wasPlayingBeforeLoadingRef.current = true;
      }
      
      // If video was playing and status changed to loading, try to resume after status returns to readyToPlay
      // This handles buffering scenarios
      if (wasPlayingBeforeLoadingRef.current && playerTime > 0 && playerTime < duration - 0.5) {
        // We'll handle resume in the next effect when status changes to readyToPlay
        // Don't set up a timer here to avoid accessing player in async callback
      }
    } else if (status === 'readyToPlay' && wasPlayingBeforeLoadingRef.current && !isPlaying) {
      // Status returned to readyToPlay and we were playing before, so resume
      console.log(`[VideoViewer] Attempting to resume playback after buffering...`);
      try {
        // Use a ref to safely access the player
        const playerRef = currentPlayer;
        if (playerRef) {
          const playResult: any = playerRef.play();
          // play() might return a Promise or void
          if (playResult && typeof playResult === 'object' && typeof playResult.catch === 'function') {
            playResult.catch((error: any) => {
              console.error(`[VideoViewer] Error resuming playback:`, error);
            });
          }
        }
        wasPlayingBeforeLoadingRef.current = false;
      } catch (error) {
        console.error(`[VideoViewer] Error resuming playback:`, error);
        wasPlayingBeforeLoadingRef.current = false;
      }
    } else if (status === 'readyToPlay' && !wasPlayingBeforeLoadingRef.current) {
      // Reset the flag when video is ready and we weren't trying to resume
      wasPlayingBeforeLoadingRef.current = false;
    }
  }, [status, visible, currentPlayer, duration, isPlaying, actualCurrentTime]);

  // Debug: Log video duration and metadata
  const prevDurationRef = useRef(0);
  const prevIndexRef = useRef(-1);
  const lastLogTimeRef = useRef(0);
  
  useEffect(() => {
    // Always log when modal opens/closes
    if (visible && prevIndexRef.current === -1) {
      console.log(`\n[VideoViewer] ===== MODAL OPENED =====`);
      console.log(`Video Index: ${currentIndex + 1}/${videos.length}`);
      if (videos[currentIndex]) {
        const videoUri = videos[currentIndex];
        console.log(`URI: ${videoUri.substring(0, 80)}${videoUri.length > 80 ? '...' : ''}`);
      }
      console.log(`Current Player exists: ${!!currentPlayer}`);
      prevIndexRef.current = currentIndex;
    }
    
    if (!visible) {
      if (prevIndexRef.current !== -1) {
        console.log(`\n[VideoViewer] ===== MODAL CLOSED =====\n`);
      }
      prevIndexRef.current = -1;
      prevDurationRef.current = 0;
      lastLogTimeRef.current = 0;
      return;
    }

    // Log when video index changes
    if (currentIndex !== prevIndexRef.current && videos[currentIndex]) {
      const videoUri = videos[currentIndex];
      console.log(`\n[VideoViewer] ===== VIDEO CHANGED - Video ${currentIndex + 1}/${videos.length} =====`);
      console.log(`URI: ${videoUri.substring(0, 80)}${videoUri.length > 80 ? '...' : ''}`);
      console.log(`Duration: ${duration.toFixed(2)}s`);
      console.log(`Status: ${status}`);
      if (currentPlayer) {
        try {
          console.log(`Player Duration: ${currentPlayer.duration?.toFixed(2) || 'N/A'}s`);
        } catch (e) {
          console.log(`Error accessing player duration: ${e}`);
        }
      }
      console.log(`==========================================\n`);
      prevIndexRef.current = currentIndex;
      lastLogTimeRef.current = Date.now();
    }

    // Log when duration becomes available or changes significantly (throttle to once per second)
    const now = Date.now();
    const durationChanged = Math.abs(duration - prevDurationRef.current) > 0.1;
    const shouldLogDuration = duration > 0 && (durationChanged || (now - lastLogTimeRef.current > 2000));
    
    if (shouldLogDuration && videos[currentIndex]) {
      const videoUri = videos[currentIndex];
      console.log(`\n[VideoViewer] ===== Video ${currentIndex + 1}/${videos.length} - Duration Update =====`);
      console.log(`URI: ${videoUri.substring(0, 80)}${videoUri.length > 80 ? '...' : ''}`);
      console.log(`Duration (from state): ${duration.toFixed(2)}s`);
      console.log(`Current Time (event): ${currentTime.toFixed(2)}s`);
      console.log(`Current Time (player/actual): ${actualCurrentTime.toFixed(2)}s`);
      console.log(`Status: ${status}`);
      console.log(`Is Playing: ${isPlaying}`);
      if (currentPlayer) {
        try {
          console.log(`Player Status: ${currentPlayer.status}`);
          console.log(`Player Duration: ${currentPlayer.duration?.toFixed(2) || 'N/A'}s`);
          console.log(`Player Current Time: ${currentPlayer.currentTime?.toFixed(2) || 'N/A'}s`);
        } catch (e) {
          console.log(`Error accessing player properties: ${e}`);
        }
      }
      console.log(`==========================================\n`);
      
      prevDurationRef.current = duration;
      lastLogTimeRef.current = now;
    }
  }, [visible, currentIndex, duration, currentTime, status, isPlaying, videos, currentPlayer]);

  // Swipe gesture for changing videos
  const swipeX = useSharedValue(0);

  // Reset and play initial video when modal opens
  useEffect(() => {
    if (!visible) return;

    // Pause all videos
    allPlayers.forEach((player) => {
      if (player) {
        player.pause();
      }
    });

    // Reset current index
    setCurrentIndex(initialIndex);

    // Preload and play initial video - wait for it to be ready before playing
    const preloadAndPlay = async () => {
      const player = allPlayers[initialIndex];
      if (!player || !videos[initialIndex]) return;

      try {
        // Reset to beginning
        player.currentTime = 0;
        
        // Wait for video to be ready (status === 'readyToPlay')
        // Poll until ready or timeout after 5 seconds
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max (50 * 100ms)
        
        const waitForReady = () => {
          return new Promise<void>((resolve) => {
            const checkReady = () => {
              attempts++;
              if (player.status === 'readyToPlay') {
                resolve();
              } else if (attempts >= maxAttempts) {
                console.warn('[VideoViewer] Video not ready after 5 seconds, playing anyway');
                resolve(); // Play anyway
              } else {
                setTimeout(checkReady, 100);
              }
            };
            checkReady();
          });
        };

        await waitForReady();
        
        // Small delay to ensure player is fully ready
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Now play
        const playResult: any = player.play();
        if (playResult && typeof playResult === 'object' && typeof playResult.catch === 'function') {
          playResult.catch((error: any) => {
            console.error('Error playing initial video:', error);
          });
        }
      } catch (error) {
        console.error('Error preloading/playing initial video:', error);
      }
    };

    // Start preloading after a short delay
    const timer = setTimeout(preloadAndPlay, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [visible, initialIndex, allPlayers, videos]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateIndex = useCallback(async (newIndex: number) => {
    // Pause current video
    const currentPlayer = allPlayers[currentIndex];
    if (currentPlayer) {
      currentPlayer.pause();
    }
    
    setCurrentIndex(newIndex);
    
    // Preload and play new video - wait for it to be ready
    const newPlayer = allPlayers[newIndex];
    if (!newPlayer || !videos[newIndex]) return;

    try {
      // Reset to beginning
      newPlayer.currentTime = 0;
      
      // Wait for video to be ready before playing
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      
      const waitForReady = () => {
        return new Promise<void>((resolve) => {
          const checkReady = () => {
            attempts++;
            if (newPlayer.status === 'readyToPlay') {
              resolve();
            } else if (attempts >= maxAttempts) {
              console.warn('[VideoViewer] Video not ready after 5 seconds, playing anyway');
              resolve();
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });
      };

      await waitForReady();
      
      // Small delay to ensure player is fully ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Now play
      const playResult: any = newPlayer.play();
      if (playResult && typeof playResult === 'object' && typeof playResult.catch === 'function') {
        playResult.catch((error: any) => {
          console.error('Error playing new video:', error);
        });
      }
    } catch (error) {
      console.error('Error preloading/playing new video:', error);
    }
  }, [currentIndex, allPlayers, videos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Horizontal swipe gesture for changing videos
  const createSwipeGesture = () => {
    return Gesture.Pan()
      .activeOffsetX([-10, 10])
      .onUpdate((e) => {
        swipeX.value = e.translationX;
      })
      .onEnd((e) => {
        const threshold = SCREEN_WIDTH * 0.25;
        const velocity = e.velocityX;
        
        if (Math.abs(e.translationX) > threshold || Math.abs(velocity) > 500) {
          if (e.translationX > 0 && currentIndex > 0) {
            // Swipe right - go to previous video
            const newIndex = currentIndex - 1;
            runOnJS(updateIndex)(newIndex);
          } else if (e.translationX < 0 && currentIndex < videos.length - 1) {
            // Swipe left - go to next video
            const newIndex = currentIndex + 1;
            runOnJS(updateIndex)(newIndex);
          }
        }
        swipeX.value = withSpring(0);
      });
  };

  const handleClose = () => {
    // Pause all videos
    players.forEach((player) => {
      player.pause();
    });
    swipeX.value = 0;
    onClose();
  };

  const handlePlayPause = () => {
    const player = players[currentIndex];
    if (!player) return;

    try {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error('Error in play/pause:', error);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      updateIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      updateIndex(currentIndex + 1);
    }
  };

  const handleRestart = () => {
    const player = players[currentIndex];
    if (player) {
      try {
        player.currentTime = 0;
        player.play();
      } catch (error) {
        console.error('Error restarting video:', error);
      }
    }
  };

  const handleSeek = (seekTime: number) => {
    const player = players[currentIndex];
    if (player && duration > 0) {
      const newTime = Math.max(0, Math.min(seekTime, duration));
      player.currentTime = newTime;
      // Update the state immediately for responsive UI
      setPlayerCurrentTime(newTime);
    }
  };

  // Auto-advance to next video when current finishes
  useEffect(() => {
    if (!visible || duration <= 0) return;

    // Use actual current time (from player polling) for accurate checking
    const timeRemaining = duration - actualCurrentTime;
    
    // Only auto-advance if we're actually playing and near the end
    // Don't auto-advance if status is loading (might be buffering)
    if (status === 'readyToPlay' && isPlaying && timeRemaining >= 0 && timeRemaining < 0.5) {
      if (currentIndex < videos.length - 1) {
        console.log(`[VideoViewer] Auto-advancing: duration=${duration.toFixed(2)}s, currentTime=${actualCurrentTime.toFixed(2)}s, remaining=${timeRemaining.toFixed(2)}s`);
        const timer = setTimeout(() => {
          updateIndex(currentIndex + 1);
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [status, actualCurrentTime, duration, currentIndex, videos.length, visible, isPlaying, updateIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Use actual current time (from player polling) for progress calculation
  const progress = duration > 0 ? (actualCurrentTime / duration) * 100 : 0;

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

          {/* Video counter */}
          {videos.length > 1 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {videos.length}
              </Text>
            </View>
          )}

          {/* Video container with gestures */}
          <View style={styles.videoContainer}>
            {videos.map((videoUri, index) => {
              if (!videoUri) return null;
              
              const isActive = index === currentIndex;
              const player = players[index];
              if (!player) return null;
              
              const animatedStyle = useAnimatedStyle(() => {
                const xOffset = swipeX.value + (index - currentIndex) * SCREEN_WIDTH;
                return {
                  opacity: withTiming(isActive ? 1 : 0, { duration: 200 }),
                  transform: [{ translateX: xOffset }],
                };
              });

              return (
                <GestureDetector key={index} gesture={createSwipeGesture()}>
                  <Animated.View
                    style={[
                      styles.videoWrapper,
                      animatedStyle,
                      { zIndex: isActive ? 1 : 0 },
                    ]}
                    pointerEvents={isActive ? 'auto' : 'none'}
                  >
                    <VideoView
                      player={player}
                      style={styles.video}
                      contentFit="contain"
                      nativeControls={false}
                      fullscreenOptions={{ enable: false }}
                      allowsPictureInPicture={false}
                    />
                    
                    {/* Video Controls - Always visible when active */}
                    {isActive && (
                      <>
                        {/* Play/Pause button - only show when paused */}
                        {!isPlaying && (
                          <TouchableOpacity
                            style={styles.playPauseOverlay}
                            onPress={handlePlayPause}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="play"
                              size={64}
                              color="#FFFFFF"
                            />
                          </TouchableOpacity>
                        )}

                        {/* Video Controls Bar - Always visible when video is active */}
                        <View style={styles.controlsContainer}>
                            {/* Scrubber */}
                            {duration > 0 ? (
                              <View style={styles.progressContainer}>
                                <TouchableOpacity
                                  style={styles.progressBar}
                                  activeOpacity={1}
                                  onPress={(e) => {
                                    const { locationX } = e.nativeEvent;
                                    const progressBarWidth = SCREEN_WIDTH - 40 - 32; // Account for padding
                                    const seekPercent = Math.max(0, Math.min(1, locationX / progressBarWidth));
                                    const seekTime = seekPercent * duration;
                                    handleSeek(seekTime);
                                  }}
                                >
                                  <View
                                    style={[
                                      styles.progressFill,
                                      {
                                        width: `${progress}%`,
                                      },
                                    ]}
                                  />
                                  <View
                                    style={[
                                      styles.progressThumb,
                                      {
                                        left: `${progress}%`,
                                        marginLeft: -6,
                                      },
                                    ]}
                                  />
                                </TouchableOpacity>
                                <View style={styles.timeContainer}>
                                  <Text style={styles.timeText}>
                                    {formatTime(actualCurrentTime)}
                                  </Text>
                                  <Text style={styles.timeText}>
                                    {formatTime(duration)}
                                  </Text>
                                </View>
                              </View>
                            ) : (
                              <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                  <View style={[styles.progressFill, { width: '0%' }]} />
                                </View>
                                <View style={styles.timeContainer}>
                                  <Text style={styles.timeText}>0:00</Text>
                                  <Text style={styles.timeText}>Loading...</Text>
                                </View>
                              </View>
                            )}

                            {/* Control Buttons */}
                            <View style={styles.controlButtons}>
                              <TouchableOpacity
                                style={styles.controlButton}
                                onPress={handleRestart}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="refresh" size={24} color="#FFFFFF" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.controlButton}
                                onPress={handlePlayPause}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={isPlaying ? 'pause' : 'play'}
                                  size={24}
                                  color="#FFFFFF"
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.controlButton}
                                onPress={() => handleSeek(Math.max(0, actualCurrentTime - 10))}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="play-back" size={24} color="#FFFFFF" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.controlButton}
                                onPress={() => handleSeek(Math.min(duration, actualCurrentTime + 10))}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="play-forward" size={24} color="#FFFFFF" />
                              </TouchableOpacity>
                            </View>
                          </View>
                      </>
                    )}
                  </Animated.View>
                </GestureDetector>
              );
            })}
          </View>

          {/* Navigation arrows */}
          {videos.length > 1 && (
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
              {currentIndex < videos.length - 1 && (
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
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoWrapper: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  playPauseOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 5,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    zIndex: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 8,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
