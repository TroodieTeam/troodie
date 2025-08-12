import { designTokens } from '@/constants/designTokens'
import { useAuth } from '@/contexts/AuthContext'
import { router } from 'expo-router'
import { debounce } from 'lodash'
import {
    ArrowLeft,
    Search,
    Users
} from 'lucide-react-native'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'
import Toast from 'react-native-toast-message'
import SearchSuggestions, { getDefaultSearchSuggestions } from '../components/SearchSuggestions'
import UserSearchResult from '../components/UserSearchResult'
import { SearchUserResult } from '../lib/supabase'
import {
    SearchFilters,
    UserSearchService
} from '../services/userSearchService'

type TabType = 'suggested' | 'search'

interface TabOption {
  id: TabType
  title: string
  icon: any
  description: string
}

export default function FindFriendsScreen() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('suggested')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<SearchUserResult[]>([])
  
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({})
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMoreUsers, setHasMoreUsers] = useState(true)
  
  const searchInputRef = useRef<TextInput>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scrollViewRef = useRef<ScrollView>(null)
  
  const USERS_PER_PAGE = 50

  const tabs: TabOption[] = [
    {
      id: 'suggested',
      title: 'For You',
      icon: Users,
      description: 'Discover food lovers in the community'
    },
    {
      id: 'search',
      title: 'Search',
      icon: Search,
      description: 'Find specific users'
    }
  ]

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([])
        return
      }

      setSearchLoading(true)
      try {
        const results = await UserSearchService.searchUsers(query, searchFilters, 20, 0)
        setSearchResults(results)
      } catch (error) {
        console.error('Search error:', error)
        Toast.show({
          type: 'error',
          text1: 'Search failed',
          text2: 'Please try again'
        })
      } finally {
        setSearchLoading(false)
      }
    }, 300),
    [searchFilters]
  )

  useEffect(() => {
    loadInitialData()
    // Animate screen entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [])

  useEffect(() => {
    if (activeTab === 'search') {
      debouncedSearch(searchQuery)
    }
  }, [searchQuery, activeTab, debouncedSearch])

  useEffect(() => {
    if (activeTab === 'suggested') {
      loadSuggestedUsers(true)
    }
  }, [activeTab])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      await loadSuggestedUsers(true)
    } catch (error) {
      console.error('Failed to load initial data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSuggestedUsers = async (reset = false) => {
    try {
      if (reset) {
        setCurrentPage(0)
        setHasMoreUsers(true)
      }
      
      const pageToLoad = reset ? 0 : currentPage
      const offset = pageToLoad * USERS_PER_PAGE
      
      // Get all users from the platform, excluding those already followed
      const results = await UserSearchService.getAllUsers(
        USERS_PER_PAGE,
        offset,
        true // excludeFollowing - don't show users we already follow
      )
      
      if (results.length < USERS_PER_PAGE) {
        setHasMoreUsers(false)
      }
      
      if (reset) {
        setSuggestedUsers(results)
      } else {
        setSuggestedUsers(prev => [...prev, ...results])
      }
      
      if (!reset) {
        setCurrentPage(prev => prev + 1)
      }
    } catch (error) {
      console.error('Failed to load suggested users:', error)
      Toast.show({
        type: 'error',
        text1: 'Loading failed',
        text2: 'Please try again'
      })
    }
  }

  const loadMoreUsers = async () => {
    if (!hasMoreUsers || loadingMore || isLoading) return
    
    setLoadingMore(true)
    try {
      await loadSuggestedUsers(false)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      if (activeTab === 'suggested') {
        await loadSuggestedUsers(true)
      }
      // Search results refresh automatically when query changes
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab)
    if (tab === 'search') {
      // Focus search input when switching to search tab
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }

  const handleFollowToggle = async (userId: string) => {
    // Remove the user from suggested list after following
    if (activeTab === 'suggested') {
      setSuggestedUsers(prev => prev.filter(u => u.id !== userId))
    }
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color={designTokens.colors.textDark} />
      </TouchableOpacity>
      
      <View style={styles.headerContent}>
        <Text style={styles.title}>Find Friends</Text>
        <Text style={styles.subtitle}>
          Connect with other food lovers
        </Text>
      </View>

      {/* Remove filter button to keep it simple */}
      <View style={styles.headerSpacer} />
    </View>
  )

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => handleTabPress(tab.id)}
          >
            <tab.icon 
              size={16} 
              color={activeTab === tab.id ? designTokens.colors.white : designTokens.colors.textMedium} 
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )

  const renderSearchBar = () => {
    if (activeTab !== 'search') return null

    return (
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={designTokens.colors.textMedium} style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search by name or username..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchLoading && (
            <ActivityIndicator 
              size="small" 
              color={designTokens.colors.primaryOrange}
              style={styles.searchLoader}
            />
          )}
        </View>
      </View>
    )
  }

  const renderEmptyState = (type: TabType) => {
    const emptyStates = {
      suggested: {
        icon: Users,
        title: 'No users found',
        subtitle: 'Check back later as more people join the community',
        action: null,
        onAction: null
      },
      search: {
        icon: Search,
        title: 'Start searching',
        subtitle: 'Enter a name or username to find other food lovers',
        action: null,
        onAction: null
      }
    }

    const empty = emptyStates[type]
    const IconComponent = empty.icon

    return (
      <View style={styles.emptyState}>
        <IconComponent size={48} color={designTokens.colors.textLight} />
        <Text style={styles.emptyTitle}>{empty.title}</Text>
        <Text style={styles.emptySubtitle}>{empty.subtitle}</Text>
        {empty.action && empty.onAction && (
          <TouchableOpacity style={styles.emptyAction} onPress={empty.onAction}>
            <Text style={styles.emptyActionText}>{empty.action}</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  const renderTabDescription = () => {
    const currentTab = tabs.find(tab => tab.id === activeTab)
    if (!currentTab) return null

    return (
      <View style={styles.tabDescription}>
        <Text style={styles.tabDescriptionText}>
          {currentTab.description}
        </Text>
      </View>
    )
  }

  const handleSuggestionPress = (suggestion: any) => {
    setSearchQuery(suggestion.text)
    // The useEffect will trigger the search automatically
  }

  const renderSearchSuggestions = () => {
    if (activeTab !== 'search' || searchQuery.length > 0) return null
    
    const suggestions = getDefaultSearchSuggestions(user?.location)
    return (
      <SearchSuggestions
        suggestions={suggestions}
        onSuggestionPress={handleSuggestionPress}
        title="Popular searches:"
      />
    )
  }

  const renderUserList = () => {
    let users: SearchUserResult[] = []
    
    switch (activeTab) {
      case 'suggested':
        users = suggestedUsers
        break
      case 'search':
        users = searchResults
        break
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
          <Text style={styles.loadingText}>Finding great people to follow...</Text>
        </View>
      )
    }

    // Show search suggestions for empty search tab
    if (activeTab === 'search' && searchQuery.length === 0) {
      return (
        <View style={styles.searchSuggestionsContainer}>
          {renderSearchSuggestions()}
          {renderEmptyState(activeTab)}
        </View>
      )
    }

    if (users.length === 0 && !loadingMore) {
      return renderEmptyState(activeTab)
    }

    // Group users by follow status
    const newUsers = users.filter(user => !user.isFollowing && !user.isCurrentUser)
    const followingUsers = users.filter(user => user.isFollowing)

    return (
      <View style={styles.userList}>
        {newUsers.length > 0 && (
          <View style={styles.userSection}>
            {activeTab === 'suggested' && (
              <Text style={styles.sectionTitle}>People to Follow</Text>
            )}
            {newUsers.map((userItem) => (
              <UserSearchResult
                key={userItem.id}
                user={userItem}
                onFollowToggle={() => handleFollowToggle(userItem.id)}
              />
            ))}
          </View>
        )}
        
        {followingUsers.length > 0 && (
          <View style={styles.userSection}>
            <Text style={styles.sectionTitle}>Already Following</Text>
            {followingUsers.map((userItem) => (
              <UserSearchResult
                key={userItem.id}
                user={userItem}
                onFollowToggle={() => handleFollowToggle(userItem.id)}
              />
            ))}
          </View>
        )}
        
        {/* Load more indicator for suggested tab */}
        {activeTab === 'suggested' && hasMoreUsers && (
          <View style={styles.loadMoreContainer}>
            {loadingMore ? (
              <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
            ) : (
              <TouchableOpacity onPress={loadMoreUsers} style={styles.loadMoreButton}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {renderHeader()}
        {renderTabs()}
        {renderTabDescription()}
        {renderSearchBar()}
        
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={designTokens.colors.primaryOrange}
            />
          }
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent
            const paddingToBottom = 20
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom
            
            if (isCloseToBottom && activeTab === 'suggested' && hasMoreUsers && !loadingMore && !isLoading) {
              loadMoreUsers()
            }
          }}
          scrollEventThrottle={400}
        >
          {renderUserList()}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  backButton: {
    padding: designTokens.spacing.xs,
    marginRight: designTokens.spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...designTokens.typography.headerLarge,
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  subtitle: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  headerSpacer: {
    width: 32, // Same width as back button for symmetry
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  tabScrollView: {
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    marginRight: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.backgroundLight,
    gap: designTokens.spacing.xs,
  },
  activeTab: {
    backgroundColor: designTokens.colors.primaryOrange,
  },
  tabText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
  activeTabText: {
    color: designTokens.colors.white,
  },
  tabDescription: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  tabDescriptionText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    paddingHorizontal: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  searchIcon: {
    marginRight: designTokens.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...designTokens.typography.bodyText,
    paddingVertical: designTokens.spacing.md,
    color: designTokens.colors.textDark,
  },
  searchLoader: {
    marginLeft: designTokens.spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  userList: {
    paddingVertical: designTokens.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxxl,
  },
  loadingText: {
    ...designTokens.typography.bodyText,
    color: designTokens.colors.textMedium,
    marginTop: designTokens.spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.xxxl,
  },
  emptyTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginTop: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.sm,
  },
  emptySubtitle: {
    ...designTokens.typography.bodyText,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: designTokens.spacing.lg,
  },
  emptyAction: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
  },
  emptyActionText: {
    ...designTokens.typography.bodyText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  searchSuggestionsContainer: {
    flex: 1,
  },
  userSection: {
    marginBottom: designTokens.spacing.md,
  },
  sectionTitle: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textMedium,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.lg,
  },
  loadMoreButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
  },
  loadMoreText: {
    ...designTokens.typography.bodyText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
})