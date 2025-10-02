import { DS } from '@/components/design-system/tokens';
import { BoardCard } from '@/components/BoardCard';
import { useAuth } from '@/contexts/AuthContext';
import { boardService } from '@/services/boardService';
import { Board } from '@/types/board';
import { useRouter } from 'expo-router';
import { Plus, Grid3X3 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function BoardsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBoards = useCallback(async () => {
    if (!user?.id) return;
    try {
      const userBoards = await boardService.getUserBoards(user.id);
      setBoards(userBoards);
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBoards();
    setRefreshing(false);
  }, [fetchBoards]);

  const handleCreateBoard = () => {
    router.push('/add/create-board');
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Grid3X3 size={64} color={DS.colors.textGray} />
      <Text style={styles.emptyTitle}>No Boards Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create boards to organize your favorite restaurants and food experiences
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateBoard}>
        <Plus size={20} color={DS.colors.textWhite} />
        <Text style={styles.createButtonText}>Create Board</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBoardItem = ({ item }: { item: Board }) => (
    <View style={styles.boardItem}>
      <BoardCard
        board={item}
        onPress={() => router.push(`/boards/${item.id}`)}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Boards</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Boards</Text>
        <TouchableOpacity onPress={handleCreateBoard} style={styles.headerRight}>
          <Plus size={24} color={DS.colors.primaryOrange} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={boards}
        renderItem={renderBoardItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          boards.length === 0 && styles.emptyListContent
        ]}
        numColumns={2}
        columnWrapperStyle={boards.length > 0 ? styles.columnWrapper : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DS.colors.primaryOrange}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.spacing.lg,
    paddingVertical: DS.spacing.md,
    backgroundColor: DS.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.borderLight,
  },
  backButton: {
    fontSize: 28,
    color: DS.colors.textDark,
    width: 40,
  },
  headerTitle: {
    ...DS.typography.h2,
    color: DS.colors.textDark,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: DS.spacing.md,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  boardItem: {
    width: '48%',
    marginBottom: DS.spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.xl,
  },
  emptyTitle: {
    ...DS.typography.h2,
    color: DS.colors.textDark,
    marginTop: DS.spacing.lg,
    marginBottom: DS.spacing.sm,
  },
  emptySubtitle: {
    ...DS.typography.body,
    color: DS.colors.textGray,
    textAlign: 'center',
    marginBottom: DS.spacing.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
    backgroundColor: DS.colors.primaryOrange,
    paddingHorizontal: DS.spacing.lg,
    paddingVertical: DS.spacing.md,
    borderRadius: DS.borderRadius.md,
  },
  createButtonText: {
    ...DS.typography.button,
    color: DS.colors.textWhite,
  },
});
