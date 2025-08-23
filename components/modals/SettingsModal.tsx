import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { pushNotificationService } from '@/services/pushNotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
    Bell,
    ChevronRight,
    FileText,
    HelpCircle,
    Lock,
    LogOut,
    Shield,
    Star,
    Trash2,
    User,
    UserX,
    X
} from 'lucide-react-native';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface BaseSettingItem {
  icon: any;
  label: string;
  onPress: () => void;
}

interface SettingItemWithArrow extends BaseSettingItem {
  showArrow: true;
  danger?: boolean;
}

interface SettingItemWithElement extends BaseSettingItem {
  rightElement: React.ReactElement;
  danger?: boolean;
}

interface DangerSettingItem extends BaseSettingItem {
  danger: true;
}

type SettingItem = SettingItemWithArrow | SettingItemWithElement | DangerSettingItem;

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);
  const [checkingNotifications, setCheckingNotifications] = React.useState(true);

  // Check notification permission status on mount
  React.useEffect(() => {
    const checkNotificationStatus = async () => {
      try {
        const status = await pushNotificationService.getPermissionsStatus();
        setNotificationsEnabled(status === 'granted');
      } catch (error) {
        console.error('Error checking notification status:', error);
      } finally {
        setCheckingNotifications(false);
      }
    };

    if (visible) {
      checkNotificationStatus();
    }
  }, [visible]);

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      // Request permission when enabling
      try {
        const status = await pushNotificationService.requestPermissions();
        
        if (status === 'granted') {
          setNotificationsEnabled(true);
          // Initialize notifications after permission granted
          await pushNotificationService.initialize();
          
          // Register device if user is logged in
          if (user?.id) {
            const token = await pushNotificationService.getPushToken();
            if (token) {
              const platform = Platform.OS === 'ios' ? 'ios' : 'android';
              await pushNotificationService.registerDevice(user.id, token, platform as any);
            }
          }
          
          Alert.alert('Notifications Enabled', 'You will now receive notifications from Troodie');
        } else {
          setNotificationsEnabled(false);
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive updates from Troodie',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
      } catch (error) {
        console.error('Error requesting notification permissions:', error);
        setNotificationsEnabled(false);
      }
    } else {
      // Disable notifications
      setNotificationsEnabled(false);
      Alert.alert(
        'Notifications Disabled',
        'You can re-enable notifications anytime from settings'
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Clear any local storage data
              await AsyncStorage.multiRemove([
                'hasCompletedOnboarding',
                'userPreferences',
                'cachedData'
              ]);
              onClose();
              // Navigate back to onboarding
              router.replace('/onboarding/splash');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data including saves, boards, and profile will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? This will permanently delete your account and all associated data. This action cannot be reversed.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Yes, permanently delete my account',
                  style: 'destructive',
                  onPress: async () => {
                    await performAccountDeletion();
                  }
                }
              ]
            );
          },
        },
      ]
    );
  };

  const handlePrivacyPolicy = async () => {
    const url = 'https://www.troodieapp.com/privacy-policy';
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open Privacy Policy link');
      }
    } catch (error) {
      console.error('Error opening privacy policy:', error);
      Alert.alert('Error', 'Failed to open Privacy Policy');
    }
  };

  const handleTermsOfService = async () => {
    const url = 'https://www.troodieapp.com/terms-of-service';
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open Terms of Service link');
      }
    } catch (error) {
      console.error('Error opening terms of service:', error);
      Alert.alert('Error', 'Failed to open Terms of Service');
    }
  };

  const handleHelpSupport = async () => {
    // Gather device information for support
    const appVersion = Constants.expoConfig?.version || '1.0.0';
    const platform = Platform.OS;
    const osVersion = Platform.Version as string | number;

    const bodyPlain = [
      'Hi Troodie Team,',
      '',
      'I need help with:',
      '',
      '[Please describe your issue here]',
      '',
      '----',
      `App Version: ${appVersion}`,
      `Platform: ${platform}`,
      `OS Version: ${osVersion}`,
      `User: ${user?.email || 'Not logged in'}`,
    ].join('\n');

    const subject = 'Help & Support Request';
    const mailtoUrl = `mailto:team@troodieapp.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyPlain)}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert('Contact Support', 'Please email us at: team@troodieapp.com');
      }
    } catch (error) {
      console.error('Error opening email client:', error);
      Alert.alert('Contact Support', 'Please email us at: team@troodieapp.com');
    }
  };

  const performAccountDeletion = async () => {
    try {
      setIsDeletingAccount(true);

      // Get the current session to retrieve the auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Unable to authenticate. Please sign in again and try.');
      }

      // Call the delete-account Edge Function
      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      // Clear all local storage data
      await AsyncStorage.multiRemove([
        'hasCompletedOnboarding',
        'userPreferences',
        'cachedData',
        'supabase.auth.token'
      ]);

      // Close the modal
      onClose();

      // Show success message
      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been permanently deleted.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to onboarding splash screen
              router.replace('/onboarding/splash');
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Account deletion error:', error);
      Alert.alert(
        'Deletion Failed',
        error.message || 'Failed to delete account. Please try again or contact support.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const settingSections: Array<{title: string; items: SettingItem[]}> = [
    {
      title: 'Account',
      items: [
        {
          icon: Bell,
          label: 'Notifications',
          onPress: () => handleNotificationToggle(!notificationsEnabled),
          rightElement: (
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#E5E5E5', true: '#FFAD27' }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#FFFFFF'}
              disabled={checkingNotifications}
            />
          ),
        } as SettingItemWithElement,
        {
          icon: UserX,
          label: 'Blocked Users',
          onPress: () => {
            // Navigate to blocked users screen
            router.push('/settings/blocked-users');
            // Close settings modal after a small delay for smooth transition
            setTimeout(() => onClose(), 100);
          },
          showArrow: true,
        } as SettingItemWithArrow,
        {
          icon: Shield,
          label: 'Privacy & Security',
          onPress: () => {
            onClose();
            router.push('/settings/privacy');
          },
          showArrow: true,
        } as SettingItemWithArrow,
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          label: 'Help & Support',
          onPress: handleHelpSupport,
          showArrow: true,
        } as SettingItemWithArrow,
        {
          icon: Star,
          label: 'Rate App',
          onPress: () => {
            Alert.alert('Thank You!', 'App Store rating will be available when the app is published.');
          },
          showArrow: true,
        } as SettingItemWithArrow,
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          icon: Lock,
          label: 'Privacy Policy',
          onPress: handlePrivacyPolicy,
          showArrow: true,
        } as SettingItemWithArrow,
        {
          icon: FileText,
          label: 'Terms of Service',
          onPress: handleTermsOfService,
          showArrow: true,
        } as SettingItemWithArrow,
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          icon: LogOut,
          label: 'Sign Out',
          onPress: handleSignOut,
          danger: true,
        } as DangerSettingItem,
        {
          icon: Trash2,
          label: 'Delete Account',
          onPress: handleDeleteAccount,
          danger: true,
        } as DangerSettingItem,
      ],
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Info Section */}
          <View style={styles.userInfoSection}>
            <View style={styles.userAvatar}>
              <User size={32} color="#666" />
            </View>
            <View>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Text style={styles.userStatus}>Active Member</Text>
            </View>
          </View>

          {/* Settings Sections */}
          {settingSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    'danger' in item && item.danger && styles.dangerItem,
                    itemIndex === section.items.length - 1 && styles.lastItem
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.settingLeft}>
                    <View style={[
                      styles.iconContainer,
                      'danger' in item && item.danger && styles.dangerIconContainer
                    ]}>
                      <item.icon 
                        size={20} 
                        color={'danger' in item && item.danger ? '#FF3B30' : '#666'} 
                      />
                    </View>
                    <Text style={[
                      styles.settingLabel,
                      'danger' in item && item.danger && styles.dangerLabel
                    ]}>
                      {item.label}
                    </Text>
                  </View>
                  
                  <View style={styles.settingRight}>
                    {'rightElement' in item ? item.rightElement : (
                      'showArrow' in item && item.showArrow && (
                        <ChevronRight size={16} color="#999" />
                      )
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* App Version */}
          <View style={styles.versionSection}>
            <Text style={styles.versionText}>
              Version {Constants.expoConfig?.version || '1.0.0'}
              {__DEV__ ? ' (Dev)' : ''}
            </Text>
            <Text style={styles.versionSubtext}>
              Built with ❤️ for food lovers
            </Text>
          </View>
        </ScrollView>

        {/* Loading overlay during account deletion */}
        {isDeletingAccount && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFAD27" />
              <Text style={styles.loadingText}>Deleting your account...</Text>
              <Text style={styles.loadingSubtext}>This may take a few moments</Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  lastItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerIconContainer: {
    backgroundColor: '#FFE5E5',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dangerLabel: {
    color: '#FF3B30',
  },
  settingRight: {
    alignItems: 'center',
  },
  dangerItem: {
    // Additional styling for danger items if needed
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: '#999',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
}); 