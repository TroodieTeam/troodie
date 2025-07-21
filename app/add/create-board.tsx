import { designTokens } from '@/constants/designTokens';
import { BoardType } from '@/types/add-flow';
import { useRouter } from 'expo-router';
import {
  Check,
  ChevronLeft,
  Crown,
  Globe,
  Lock
} from 'lucide-react-native';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function CreateBoardScreen() {
  const router = useRouter();

  const boardTypes: BoardType[] = [
    {
      type: 'free',
      title: 'Free Board',
      description: 'Anyone can view and save your recommendations',
      icon: Globe,
      features: ['Public visibility', 'Social sharing', 'Basic analytics']
    },
    {
      type: 'private',
      title: 'Private Board',
      description: 'Only people you invite can see this board',
      icon: Lock,
      features: ['Invite-only access', 'Collaboration', 'Privacy controls']
    },
    {
      type: 'paid',
      title: 'Paid Board',
      description: 'Monetize your exclusive recommendations',
      icon: Crown,
      features: ['Premium content', 'Revenue sharing', 'Advanced analytics']
    }
  ];

  const getBoardColor = (type: string) => {
    switch (type) {
      case 'free': return designTokens.colors.primaryOrange;
      case 'private': return '#6B46C1';
      case 'paid': return '#10B981';
      default: return designTokens.colors.primaryOrange;
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
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color={designTokens.colors.textDark} />
      </TouchableOpacity>
      <Text style={styles.title}>Create Board</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderBoardTypes = () => (
    <View style={styles.content}>
      <Text style={styles.subtitle}>Choose Board Type</Text>
      
      {boardTypes.map((board) => (
        <TouchableOpacity
          key={board.type}
          style={[
            styles.boardTypeCard,
            board.type === 'paid' && styles.boardTypeCardPremium
          ]}
          onPress={() => handleSelectType(board.type)}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: getBoardColor(board.type) }]}>
              <board.icon size={20} color={designTokens.colors.white} />
            </View>
            
            <View style={styles.boardInfo}>
              <View style={styles.boardHeader}>
                <Text style={styles.boardTitle}>{board.title}</Text>
                {board.type === 'paid' && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>Premium</Text>
                  </View>
                )}
              </View>
              <Text style={styles.boardDescription}>{board.description}</Text>
              
              <View style={styles.features}>
                {board.features.slice(0, 2).map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Check size={12} color="#4CAF50" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.cardIndicator} />
          </View>
        </TouchableOpacity>
      ))}
      
      <View style={styles.note}>
        <Text style={styles.noteTitle}>Note:</Text>
        <Text style={styles.noteText}>
          • Users can create 1 private board for free{'\n'}
          • Paid boards require a Troodie+ subscription
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderBoardTypes()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textMedium,
    marginBottom: 16,
  },
  boardTypeCard: {
    backgroundColor: designTokens.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    ...designTokens.shadows.card,
  },
  boardTypeCardPremium: {
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  boardInfo: {
    flex: 1,
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  boardTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
  },
  premiumBadge: {
    marginLeft: 8,
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: designTokens.colors.white,
  },
  boardDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginBottom: 12,
  },
  features: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  cardIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: designTokens.colors.primaryOrange,
  },
  note: {
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
  },
  noteTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    lineHeight: 20,
  },
});