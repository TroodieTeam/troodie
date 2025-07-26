import { theme } from '@/constants/theme';
import { BoardType } from '@/types/add-flow';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Check,
  Crown,
  Globe,
  Lock
} from 'lucide-react-native';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateBoardScreen() {
  const router = useRouter();

  const boardTypes: BoardType[] = [
    {
      type: 'free',
      title: 'Public Board',
      description: 'Anyone can view and save',
      icon: Globe,
      features: ['Public visibility', 'Social sharing', 'Basic analytics']
    },
    {
      type: 'private',
      title: 'Private Board',
      description: 'Invite-only access',
      icon: Lock,
      features: ['Invite-only access', 'Collaboration', 'Privacy controls']
    },
    {
      type: 'paid',
      title: 'Paid Board',
      description: 'Monetize your recommendations',
      icon: Crown,
      features: ['Premium content', 'Revenue sharing', 'Advanced analytics']
    }
  ];

  const getBoardColor = (type: string) => {
    switch (type) {
      case 'free': return '#10B981';
      case 'private': return '#64748B';
      case 'paid': return theme.colors.primary;
      default: return theme.colors.primary;
    }
  };

  const handleSelectType = (type: 'free' | 'private' | 'paid') => {
    router.push({
      pathname: '/add/board-details',
      params: { boardType: type }
    } as any);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color={theme.colors.text.dark} />
      </TouchableOpacity>
      
      <View style={styles.headerTitle}>
        <Text style={styles.title}>Create Board</Text>
        <Text style={styles.subtitle}>Organize your recommendations</Text>
      </View>
      
      <View style={styles.placeholder} />
    </View>
  );

  const renderBoardTypes = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Board Type</Text>
      
      {boardTypes.map((board) => (
        <TouchableOpacity
          key={board.type}
          style={[
            styles.typeCard,
            board.type === 'paid' && styles.typeCardPremium
          ]}
          onPress={() => handleSelectType(board.type)}
        >
          <View style={[styles.typeIcon, { backgroundColor: getBoardColor(board.type) + '1A' }]}>
            <board.icon size={16} color={getBoardColor(board.type)} />
          </View>
          <View style={styles.typeContent}>
            <Text style={styles.typeTitle}>{board.title}</Text>
            <Text style={styles.typeDescription}>{board.description}</Text>
          </View>
          {board.type === 'paid' && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
      
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Quick Start Tips</Text>
        <View style={styles.infoItem}>
          <Check size={14} color={theme.colors.success} />
          <Text style={styles.infoText}>Create up to 1 private board for free</Text>
        </View>
        <View style={styles.infoItem}>
          <Check size={14} color={theme.colors.success} />
          <Text style={styles.infoText}>Public boards help you gain followers</Text>
        </View>
        <View style={styles.infoItem}>
          <Check size={14} color={theme.colors.success} />
          <Text style={styles.infoText}>Upgrade to Troodie+ for unlimited boards</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderBoardTypes()}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.dark,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  placeholder: {
    width: 32,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  content: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.dark,
    marginBottom: 12,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  typeCardPremium: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: '#FFF8F3',
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeContent: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.dark,
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
  },
  premiumBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  infoSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.dark,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    flex: 1,
  },
  bottomPadding: {
    height: 100,
  },
});