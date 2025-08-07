import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { Check, Users, X, Plus } from 'lucide-react-native';
import { designTokens, compactDesign } from '@/constants/designTokens';
import { communityService } from '@/services/communityService';
import { useAuth } from '@/contexts/AuthContext';

interface Community {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  cover_image_url: string | null;
}

interface CommunitySelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (communities: string[]) => void;
  selectedCommunities?: string[];
  maxSelections?: number;
}

export function CommunitySelector({
  visible,
  onClose,
  onSelect,
  selectedCommunities = [],
  maxSelections = 5,
}: CommunitySelectorProps) {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedCommunities));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && user) {
      loadUserCommunities();
    }
  }, [visible, user]);

  useEffect(() => {
    setSelected(new Set(selectedCommunities));
  }, [selectedCommunities]);

  const loadUserCommunities = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { joined, created } = await communityService.getUserCommunities(user.id);
      
      // Combine both joined and created communities
      const allCommunities = [...created, ...joined].map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        member_count: c.member_count,
        cover_image_url: c.cover_image_url,
      }));
      setCommunities(allCommunities);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const toggleCommunity = (communityId: string) => {
    const newSelected = new Set(selected);
    const communityName = communities.find(c => c.id === communityId)?.name || 'Unknown';
    
    if (newSelected.has(communityId)) {
      newSelected.delete(communityId);
    } else if (newSelected.size < maxSelections) {
      newSelected.add(communityId);
    } else {
    }
    
    setSelected(newSelected);
  };

  const handleDone = () => {
    const selectedIds = Array.from(selected);
    const selectedNames = selectedIds.map(id => communities.find(c => c.id === id)?.name || id);
    
    
    onSelect(selectedIds);
    onClose();
  };

  const renderCommunity = ({ item }: { item: Community }) => {
    const isSelected = selected.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.communityItem, isSelected && styles.communityItemSelected]}
        onPress={() => toggleCommunity(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.communityInfo}>
          <View style={styles.communityIcon}>
            <Users size={20} color={isSelected ? '#FFF' : designTokens.colors.textMedium} />
          </View>
          <View style={styles.communityText}>
            <Text style={[styles.communityName, isSelected && styles.communityNameSelected]}>
              {item.name}
            </Text>
            <Text style={styles.memberCount}>
              {item.member_count} members
            </Text>
          </View>
        </View>
        {isSelected && (
          <View style={styles.checkIcon}>
            <Check size={20} color={designTokens.colors.primaryOrange} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={designTokens.colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.title}>Share to Communities</Text>
            <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selected.size} of {maxSelections} communities selected
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
            </View>
          ) : communities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={48} color={designTokens.colors.textLight} />
              <Text style={styles.emptyTitle}>No Communities Yet</Text>
              <Text style={styles.emptyText}>
                Join communities to share your posts with them
              </Text>
              <TouchableOpacity style={styles.browseButton} onPress={onClose}>
                <Text style={styles.browseButtonText}>Browse Communities</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={communities}
              renderItem={renderCommunity}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: designTokens.borderRadius.xl,
    borderTopRightRadius: designTokens.borderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: compactDesign.content.padding,
    paddingVertical: compactDesign.content.paddingCompact,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
    flex: 1,
    textAlign: 'center',
  },
  doneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  doneText: {
    ...designTokens.typography.buttonText,
    color: designTokens.colors.primaryOrange,
    fontWeight: '600',
  },
  selectionInfo: {
    paddingHorizontal: compactDesign.content.padding,
    paddingVertical: 12,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  selectionText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: compactDesign.content.padding,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  communityItemSelected: {
    backgroundColor: designTokens.colors.primaryOrange + '10',
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  communityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designTokens.colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  communityText: {
    flex: 1,
  },
  communityName: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  communityNameSelected: {
    color: designTokens.colors.primaryOrange,
    fontWeight: '600',
  },
  memberCount: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textLight,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: designTokens.colors.primaryOrange + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: compactDesign.content.padding,
  },
  emptyTitle: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: designTokens.colors.primaryOrange,
    borderRadius: designTokens.borderRadius.md,
  },
  browseButtonText: {
    ...designTokens.typography.buttonText,
    color: '#FFF',
    fontWeight: '600',
  },
});