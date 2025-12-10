import { useAuth } from '@/contexts/AuthContext';
import { mockCampaigns } from '@/data/mockCampaigns';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Building,
  Calendar,
  Clock,
  DollarSign,
  Filter,
  MapPin,
  Search,
  Sparkles,
  Star,
  Target,
  Users,
  X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Campaign {
  id: string;
  restaurant_id: string;
  title: string;
  description: string;
  requirements: string[] | null;
  deliverable_requirements?: any; // JSONB field containing expected deliverables
  budget_cents: number;
  start_date: string;
  end_date: string;
  status: string;
  max_creators: number;
  selected_creators_count: number;
  campaign_type: string;
  created_at?: string;
  restaurant?: {
    id: string;
    name: string;
    cuisine_types: string[];
    address: string;
    city: string;
    state: string;
    cover_photo_url?: string;
  };
  applications?: {
    id: string;
    status: string;
    creator_id?: string;
  }[];
}

type FilterType = 'all' | 'local' | 'high-paying' | 'urgent' | 'new';
type SortType = 'relevance' | 'budget' | 'deadline' | 'newest';

const DELIVERABLE_TYPES = [
  'Instagram Post',
  'Instagram Story',
  'Instagram Reel',
  'TikTok Video',
  'YouTube Video',
  'Blog Article',
  'Google Review',
];

export default function ExploreCampaigns() {
  const router = useRouter();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedSort, setSelectedSort] = useState<SortType>('relevance');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [proposedRate, setProposedRate] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  // Engineering Request: Proposed Deliverables now uses button-based selection
  // matching app/(tabs)/business/campaigns/create.tsx pattern for consistency
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([]);

  // Filter pills configuration
  const filterOptions: { type: FilterType; label: string; icon: any }[] = [
    { type: 'all', label: 'All Campaigns', icon: Sparkles },
    { type: 'local', label: 'Near Me', icon: MapPin },
    { type: 'high-paying', label: 'High Paying', icon: DollarSign },
    { type: 'urgent', label: 'Urgent', icon: Clock },
    { type: 'new', label: 'New', icon: Star },
  ];

  const fetchCampaigns = async () => {
    try {
      // Use real Supabase data
      const USE_MOCK_DATA = false;

      if (USE_MOCK_DATA) {
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setCampaigns(mockCampaigns);
        setFilteredCampaigns(mockCampaigns);
      } else {
        // First get creator profile ID to filter applications
        let creatorProfileId: string | null = null;
        if (user?.id) {
          const { data: creatorProfile } = await supabase
            .from('creator_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();
          creatorProfileId = creatorProfile?.id || null;
        }

        const { data, error } = await supabase
          .from('campaigns')
          .select(`
            *,
            restaurant:restaurants(
              id,
              name,
              cuisine_types,
              address,
              city,
              state,
              cover_photo_url
            ),
            applications:campaign_applications(
              id,
              status,
              creator_id
            )
          `)
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Normalize requirements field and filter applications for current user
        const normalizedData = (data || []).map((campaign: any) => {
          // Filter applications to only show current user's applications
          const userApplications = campaign.applications?.filter(
            (app: any) => app.creator_id === creatorProfileId
          ) || [];

          return {
            ...campaign,
            requirements: Array.isArray(campaign.requirements) 
              ? campaign.requirements 
              : (campaign.requirements ? [campaign.requirements] : null),
            applications: userApplications, // Only show current user's applications
          };
        });

        setCampaigns(normalizedData);
        setFilteredCampaigns(normalizedData);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      Alert.alert('Error', 'Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    filterAndSortCampaigns();
  }, [searchQuery, selectedFilter, selectedSort, campaigns]);

  const filterAndSortCampaigns = () => {
    let filtered = [...campaigns];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (campaign) =>
          campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campaign.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campaign.restaurant?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filter
    switch (selectedFilter) {
      case 'local':
        // TODO: Implement location-based filtering
        filtered = filtered.filter((c) => c.restaurant?.city === 'Your City');
        break;
      case 'high-paying':
        filtered = filtered.filter((c) => c.budget_cents >= 50000); // $500+
        break;
      case 'urgent':
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        filtered = filtered.filter((c) => new Date(c.end_date) <= threeDaysFromNow);
        break;
      case 'new':
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filtered = filtered.filter((c) => c.created_at && new Date(c.created_at) >= sevenDaysAgo);
        break;
    }

    // Apply sort
    switch (selectedSort) {
      case 'budget':
        filtered.sort((a, b) => b.budget_cents - a.budget_cents);
        break;
      case 'deadline':
        filtered.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
        break;
      case 'newest':
        filtered.sort((a, b) => {
          const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bDate - aDate;
        });
        break;
      case 'relevance':
      default:
        // Keep original order or implement relevance algorithm
        break;
    }

    setFilteredCampaigns(filtered);
  };

  const handleApplyClick = (campaign: Campaign) => {
    // Show application form modal
    setSelectedCampaign(campaign);
    setShowApplicationForm(true);
    // Reset form fields
    setProposedRate('');
    setCoverLetter('');
    setSelectedDeliverables([]);
  };

  const toggleDeliverable = (type: string) => {
    setSelectedDeliverables(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmitApplication = async () => {
    if (!selectedCampaign || !user) {
      return;
    }

    // Validate form fields (proposed rate is now optional)
    if (!coverLetter || selectedDeliverables.length === 0) {
      Alert.alert('Missing Information', 'Please fill in all required fields: why you are interested, and select at least one deliverable.');
      return;
    }

    // Validate rate is a number if provided (optional field)
    let rateCents: number | null = null;
    if (proposedRate.trim()) {
      const rateValue = parseFloat(proposedRate);
      if (isNaN(rateValue) || rateValue <= 0) {
        Alert.alert('Invalid Rate', 'Please enter a valid rate amount or leave it blank.');
        return;
      }
      rateCents = Math.round(rateValue * 100);
    }

    setApplying(true);
    try {
      // Get creator profile ID for the current user
      const { data: creatorProfile, error: creatorError } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (creatorError || !creatorProfile) {
        Alert.alert('Error', 'Creator profile not found. Please complete your creator profile first.');
        return;
      }

      // Check if already applied
      const { data: existingApp } = await supabase
        .from('campaign_applications')
        .select('id')
        .eq('campaign_id', selectedCampaign.id)
        .eq('creator_id', creatorProfile.id)
        .maybeSingle();

      if (existingApp) {
        Alert.alert('Already Applied', 'You have already applied to this campaign');
        setShowApplicationForm(false);
        fetchCampaigns(); // Refresh to update UI
        return;
      }

      // Format deliverables as a readable string
      const deliverablesText = selectedDeliverables.join(', ');

      // Create application with all required fields
      const { error } = await supabase.from('campaign_applications').insert({
        campaign_id: selectedCampaign.id,
        creator_id: creatorProfile.id,
        status: 'pending',
        proposed_rate_cents: rateCents,
        cover_letter: coverLetter,
        proposed_deliverables: deliverablesText,
        applied_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error creating application:', error);
        throw error;
      }

      Alert.alert(
        'Success!', 
        'Your application has been submitted. You can view it in "My Campaigns".',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowApplicationForm(false);
              setShowCampaignModal(false);
              setProposedRate('');
              setCoverLetter('');
              setSelectedDeliverables([]);
              fetchCampaigns(); // Refresh to update application status
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error applying to campaign:', error);
      Alert.alert('Error', 'Failed to submit application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const renderCampaignCard = (campaign: Campaign) => {
    const daysLeft = Math.ceil(
      (new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const spotsLeft = campaign.max_creators - campaign.selected_creators_count;
    // Check if current user has applied (need to check creator_id matches)
    // For now, check if there are any pending applications - will be filtered by creator_id in query
    const hasApplied = campaign.applications && campaign.applications.length > 0;
    
    // CM-13: Calculate deliverable count
    let deliverableCount = 0;
    if (campaign.deliverable_requirements) {
      try {
        const requirements = typeof campaign.deliverable_requirements === 'string'
          ? JSON.parse(campaign.deliverable_requirements)
          : campaign.deliverable_requirements;
        deliverableCount = requirements?.deliverables?.length || 0;
      } catch (e) {
        // Ignore parsing errors
      }
    }

    return (
      <TouchableOpacity
        key={campaign.id}
        style={styles.campaignCard}
        onPress={() => {
          setSelectedCampaign(campaign);
          setShowCampaignModal(true);
        }}
        activeOpacity={0.7}
      >
        {/* Campaign Image */}
        {campaign.restaurant?.cover_photo_url && (
          <Image
            source={{ uri: campaign.restaurant.cover_photo_url }}
            style={styles.campaignImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.restaurantInfo}>
              {!campaign.restaurant?.cover_photo_url && (
                <View style={styles.restaurantIcon}>
                  <Building size={16} color="#666" />
                </View>
              )}
              <Text style={styles.restaurantName}>{campaign.restaurant?.name}</Text>
            </View>
            {hasApplied && (
              <View style={styles.appliedBadge}>
                <Text style={styles.appliedBadgeText}>Applied</Text>
              </View>
            )}
          </View>

          <Text style={styles.campaignTitle}>{campaign.title}</Text>
          <Text style={styles.campaignDescription} numberOfLines={2}>
            {campaign.description}
          </Text>

          <View style={styles.campaignStats}>
            <View style={styles.statItem}>
              <DollarSign size={14} color="#10B981" />
              <Text style={styles.statText}>
                ${campaign.max_creators > 0 ? ((campaign.budget_cents / campaign.max_creators) / 100).toFixed(0) : (campaign.budget_cents / 100).toFixed(0)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Clock size={14} color="#F59E0B" />
              <Text style={styles.statText}>{daysLeft}d left</Text>
            </View>
            <View style={styles.statItem}>
              <Users size={14} color="#8B5CF6" />
              <Text style={styles.statText}>{spotsLeft} spots</Text>
            </View>
            {/* CM-13: Deliverable count indicator */}
            {deliverableCount > 0 && (
              <View style={styles.statItem}>
                <Target size={14} color="#EC4899" />
                <Text style={styles.statText}>
                  {deliverableCount} deliverable{deliverableCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.campaignTags}>
            {campaign.campaign_type && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{campaign.campaign_type.replace(/_/g, ' ')}</Text>
              </View>
            )}
            {campaign.restaurant?.cuisine_types?.[0] && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{campaign.restaurant.cuisine_types[0]}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <View style={styles.titleIcon}>
              <Sparkles size={16} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.title}>Discover Campaigns</Text>
              <Text style={styles.subtitle}>Find your next collaboration</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            style={styles.filterButton}
          >
            <Filter size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search campaigns or restaurants"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterPills}
          contentContainerStyle={styles.filterPillsContent}
        >
          {filterOptions.map((filter) => {
            const Icon = filter.icon;
            const isSelected = selectedFilter === filter.type;
            return (
              <TouchableOpacity
                key={filter.type}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setSelectedFilter(filter.type)}
              >
                <Icon size={14} color={isSelected ? '#FFF' : '#666'} />
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Campaign List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchCampaigns();
          }} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#F59E0B" style={styles.loader} />
        ) : filteredCampaigns.length > 0 ? (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.resultCount}>
                {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'} available
              </Text>
            </View>
            {filteredCampaigns.map(renderCampaignCard)}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Target size={48} color="#CCC" />
            <Text style={styles.emptyTitle}>No campaigns found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try adjusting your search' : 'Check back later for new opportunities'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Campaign Detail Modal */}
      <Modal
        visible={showCampaignModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCampaignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedCampaign && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Campaign Details</Text>
                  <TouchableOpacity
                    onPress={() => setShowCampaignModal(false)}
                    style={styles.modalClose}
                  >
                    <X size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Campaign Image in Modal */}
                  {selectedCampaign.restaurant?.cover_photo_url && (
                    <Image
                      source={{ uri: selectedCampaign.restaurant.cover_photo_url }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                  )}

                  <View style={styles.modalRestaurant}>
                    {!selectedCampaign.restaurant?.cover_photo_url && (
                      <Building size={20} color="#666" />
                    )}
                    <Text style={styles.modalRestaurantName}>
                      {selectedCampaign.restaurant?.name}
                    </Text>
                  </View>

                  <Text style={styles.modalCampaignTitle}>{selectedCampaign.title}</Text>
                  <Text style={styles.modalDescription}>{selectedCampaign.description}</Text>

                  <View style={styles.modalStats}>
                    <View style={styles.modalStatItem}>
                      <DollarSign size={18} color="#10B981" />
                      <View>
                        <Text style={styles.modalStatLabel}>Budget</Text>
                        <Text style={styles.modalStatValue}>
                          ${selectedCampaign.max_creators > 0 ? ((selectedCampaign.budget_cents / selectedCampaign.max_creators) / 100).toFixed(0) : (selectedCampaign.budget_cents / 100).toFixed(0)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.modalStatItem}>
                      <Calendar size={18} color="#F59E0B" />
                      <View>
                        <Text style={styles.modalStatLabel}>Duration</Text>
                        <Text style={styles.modalStatValue}>
                          {new Date(selectedCampaign.start_date).toLocaleDateString()} -
                          {new Date(selectedCampaign.end_date).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Expected Deliverables Section */}
                  {selectedCampaign.deliverable_requirements && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Expected Deliverables</Text>
                      {(() => {
                        try {
                          const requirements = typeof selectedCampaign.deliverable_requirements === 'string'
                            ? JSON.parse(selectedCampaign.deliverable_requirements)
                            : selectedCampaign.deliverable_requirements;
                          const deliverablesList = requirements?.deliverables || [];
                          
                          if (deliverablesList.length > 0) {
                            return (
                              <View style={{ gap: 12 }}>
                                {deliverablesList.map((deliverable: any, index: number) => (
                                  <View key={index} style={styles.deliverableCard}>
                                    <View style={styles.deliverableCardHeader}>
                                      <Target size={18} color="#FFAD27" />
                                      <Text style={styles.deliverableType}>
                                        {deliverable.quantity || 1}× {deliverable.type || 'Social Media Post'}
                                      </Text>
                                    </View>
                                    {deliverable.description && (
                                      <Text style={styles.deliverableDescription}>
                                        {deliverable.description}
                                      </Text>
                                    )}
                                  </View>
                                ))}
                              </View>
                            );
                          }
                        } catch (e) {
                          console.error('Error parsing deliverable_requirements:', e);
                        }
                        return null;
                      })()}
                    </View>
                  )}

                  {selectedCampaign.requirements && 
                   Array.isArray(selectedCampaign.requirements) && 
                   selectedCampaign.requirements.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Requirements</Text>
                      {selectedCampaign.requirements.map((req, index) => (
                        <View key={index} style={styles.requirementItem}>
                          <Text style={styles.requirementBullet}>•</Text>
                          <Text style={styles.requirementText}>{req}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  {selectedCampaign.applications && selectedCampaign.applications.length > 0 ? (
                    <View style={[styles.applyButton, styles.applyButtonDisabled]}>
                      <Text style={[styles.applyButtonText, { opacity: 0.6 }]}>Already Applied</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.applyButton}
                      onPress={() => {
                        setShowCampaignModal(false);
                        handleApplyClick(selectedCampaign);
                      }}
                    >
                      <Text style={styles.applyButtonText}>Apply Now</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Application Form Modal */}
      <Modal
        visible={showApplicationForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowApplicationForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply to Campaign</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowApplicationForm(false);
                  setProposedRate('');
                  setCoverLetter('');
                  setSelectedDeliverables([]);
                }}
                style={styles.modalClose}
              >
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedCampaign && (
                <>
                  <Text style={styles.modalCampaignTitle}>{selectedCampaign.title}</Text>
                  <Text style={styles.modalDescription}>{selectedCampaign.restaurant?.name}</Text>
                  
                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>Proposed Rate ($)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g., 100 (optional)"
                      value={proposedRate}
                      onChangeText={setProposedRate}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#999"
                    />
                    <Text style={styles.formHint}>Enter your proposed rate in dollars (optional)</Text>
                  </View>

                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>Why you are interested *</Text>
                    <TextInput
                      style={[styles.formInput, styles.formTextArea]}
                      placeholder="Tell the restaurant why you're a great fit for this campaign..."
                      value={coverLetter}
                      onChangeText={setCoverLetter}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      placeholderTextColor="#999"
                    />
                    <Text style={styles.formHint}>Explain your experience and why you're interested</Text>
                  </View>

                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>Proposed Deliverables *</Text>
                    {/* Engineering Request: This section now uses button-based selection similar to 
                        app/(tabs)/business/campaigns/create.tsx for consistency. 
                        Future improvement: Extract to shared component for full standardization. */}
                    <View style={styles.deliverablesContainer}>
                      <View style={styles.deliverablesButtonRow}>
                        {DELIVERABLE_TYPES.map((type) => {
                          const isSelected = selectedDeliverables.includes(type);
                          return (
                            <TouchableOpacity
                              key={type}
                              onPress={() => toggleDeliverable(type)}
                              style={[
                                styles.deliverableButton,
                                isSelected && styles.deliverableButtonSelected
                              ]}
                            >
                              <Text style={[
                                styles.deliverableButtonText,
                                isSelected && styles.deliverableButtonTextSelected
                              ]}>
                                {type}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                    <Text style={styles.formHint}>Select the types of content you'll create for this campaign</Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  (!coverLetter || selectedDeliverables.length === 0 || applying) && styles.applyButtonDisabled
                ]}
                onPress={handleSubmitApplication}
                disabled={!coverLetter || selectedDeliverables.length === 0 || applying}
              >
                {applying ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.applyButtonText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFF',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF8E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  subtitle: {
    fontSize: 12,
    color: '#8C8C8C',
    marginTop: 2,
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#000',
  },
  filterPills: {
    paddingBottom: 16,
  },
  filterPillsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFF',
  },
  filterPillActive: {
    backgroundColor: '#262626',
    borderColor: '#262626',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#262626',
  },
  filterPillTextActive: {
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 16,
  },
  loader: {
    marginTop: 50,
  },
  resultHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
  },
  campaignCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  campaignImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F7F7F7',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restaurantIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  appliedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  appliedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  campaignTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  campaignDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  campaignStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#262626',
  },
  campaignTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#F7F7F7',
  },
  modalRestaurant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalRestaurantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  modalCampaignTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  modalStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#8C8C8C',
  },
  modalStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  modalSection: {
    marginTop: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  requirementBullet: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  deliverableCard: {
    backgroundColor: '#FFFAF2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE8CC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deliverableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  deliverableType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    flex: 1,
  },
  deliverableDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginTop: 4,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  applyButton: {
    backgroundColor: '#262626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#262626',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#FFF',
  },
  formTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: 12,
    color: '#8C8C8C',
    marginTop: 4,
  },
  deliverablesContainer: {
    marginBottom: 8,
  },
  deliverablesButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deliverableButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    backgroundColor: 'transparent',
  },
  deliverableButtonSelected: {
    borderColor: '#FFAD27',
    backgroundColor: '#FFAD2715',
  },
  deliverableButtonText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666',
  },
  deliverableButtonTextSelected: {
    fontWeight: '600',
    color: '#FFAD27',
  },
});