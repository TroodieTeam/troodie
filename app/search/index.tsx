import { designTokens } from '@/constants/designTokens';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import debounce from 'lodash/debounce';
import {
  ChevronLeft,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import EmptyState from '../../components/EmptyState';
import FilterBadge from '../../components/FilterBadge';
import UserSearchResult from '../../components/UserSearchResult';
import { SearchUserResult } from '../../lib/supabase';
import { SearchFilters, UserSearchService } from '../../services/userSearchService';


export default function UserSearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchUserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [showFilters, setShowFilters] = useState(false)

  // Debounced search function
  const performSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (query.length < 3) {
          setResults([])
          return
        }

        setLoading(true)
        try {
          const searchResults = await UserSearchService.searchUsers(query, filters)
          setResults(searchResults)
        } catch (error) {
          Toast.show({
            type: 'error',
            text1: 'Search failed',
            text2: 'Please try again',
          })
          console.error('Search error:', error)
        } finally {
          setLoading(false)
        }
      }, 300),
    [filters]
  )

  useEffect(() => {
    performSearch(searchQuery)
  }, [searchQuery, performSearch])

  const handleFollowToggle = (userId: string) => {
    // Update the local state optimistically
    setResults(prevResults =>
      prevResults.map(user =>
        user.id === userId
          ? { ...user, isFollowing: !user.isFollowing }
          : user
      )
    )
  }

  const removeFilter = (filterKey: keyof SearchFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[filterKey]
      return newFilters
    })
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or username"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {Object.keys(filters).length > 0 && (
        <View style={styles.filtersContainer}>
          {filters.verifiedOnly && (
            <FilterBadge
              label="Verified Only"
              onRemove={() => removeFilter('verifiedOnly')}
            />
          )}
          {filters.location && (
            <FilterBadge
              label={`Location: ${filters.location}`}
              onRemove={() => removeFilter('location')}
            />
          )}
          {filters.followersMin && (
            <FilterBadge
              label={`${filters.followersMin}+ followers`}
              onRemove={() => removeFilter('followersMin')}
            />
          )}
        </View>
      )}
    </View>
  )

  const renderEmpty = () => {
    if (searchQuery.length < 3) return null
    if (loading) return null

    return (
      <EmptyState
        icon="search"
        title="No users found"
        description="Try adjusting your search or filters"
      />
    )
  }

  const renderFooter = () => {
    if (!loading) return null
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#FFAD27" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Search Users',
          headerLeft: () => (
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
          ),
          // headerRight: () => (
          //   <TouchableOpacity
          //     onPress={() => setShowFilters(true)}
          //     style={styles.filterButton}
          //   >
          //     <Ionicons name="filter" size={24} color="#FFAD27" />
          //   </TouchableOpacity>
          // ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderHeader()}

        <FlatList
          data={results}
          renderItem={({ item }) => (
            <UserSearchResult
              user={item}
              onFollowToggle={() => handleFollowToggle(item.id)}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    padding: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  listContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
})