import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
    Bell,
    ChevronRight,
    HelpCircle,
    LogOut,
    Moon,
    Shield,
    Star,
    Trash2,
    User,
    X
} from 'lucide-react-native';
import React from 'react';
import {
    Alert,
    Modal,
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
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);

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
              'Type DELETE to confirm account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'I understand, delete my account',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: Implement account deletion
                    Alert.alert('Feature Coming Soon', 'Account deletion will be available in a future update.');
                  }
                }
              ]
            );
          },
        },
      ]
    );
  };

  const settingSections: Array<{title: string; items: SettingItem[]}> = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Edit Profile',
          onPress: () => {
            onClose();
            // TODO: Navigate to edit profile screen
            Alert.alert('Coming Soon', 'Profile editing will be available soon!');
          },
          showArrow: true,
        } as SettingItemWithArrow,
        {
          icon: Bell,
          label: 'Notifications',
          onPress: () => setNotificationsEnabled(!notificationsEnabled),
          rightElement: (
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E5E5E5', true: '#FFAD27' }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          ),
        } as SettingItemWithElement,
        {
          icon: Shield,
          label: 'Privacy & Security',
          onPress: () => {
            onClose();
            Alert.alert('Coming Soon', 'Privacy settings will be available soon!');
          },
          showArrow: true,
        } as SettingItemWithArrow,
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Moon,
          label: 'Dark Mode',
          onPress: () => setDarkModeEnabled(!darkModeEnabled),
          rightElement: (
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: '#E5E5E5', true: '#FFAD27' }}
              thumbColor={darkModeEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          ),
        } as SettingItemWithElement,
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          label: 'Help & Support',
          onPress: () => {
            onClose();
            Alert.alert('Coming Soon', 'Help center will be available soon!');
          },
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
            <Text style={styles.versionText}>Version 1.0.0 (Beta)</Text>
            <Text style={styles.versionSubtext}>
              Built with ❤️ for food lovers
            </Text>
          </View>
        </ScrollView>
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
}); 