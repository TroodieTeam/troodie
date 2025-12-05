import { CreatorHeader } from '@/components/creator/CreatorHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    getRequiredDeliverables,
    getSubmissionProgress,
    submitMultipleDeliverables,
    validateSocialMediaUrl,
} from '@/services/deliverableSubmissionService';
import type { DeliverablePlatform } from '@/types/deliverableRequirements';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, Link, Plus, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Campaign {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  payout_per_creator: number;
  deadline: Date;
}

export default function SubmitDeliverable() {
  const router = useRouter();
  const { campaignId } = useLocalSearchParams();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showExpectedDeliverables, setShowExpectedDeliverables] = useState(true); // Default to expanded
  const [requiredDeliverables, setRequiredDeliverables] = useState<any[]>([]);
  const [progress, setProgress] = useState<{
    submitted: number;
    required: number;
    percentage: number;
    complete: boolean;
    deliverables: Array<{
      index: number;
      status: string;
      submitted_at?: string;
      platform?: string;
    }>;
  } | null>(null);
  const [campaignApplicationId, setCampaignApplicationId] = useState<string | null>(null);
  
  // Multi-deliverable form state
  interface DeliverableFormData {
    url: string;
    platform: DeliverablePlatform | null;
    caption: string;
    notes: string;
    isValidating: boolean;
    urlError: string | null;
    urlWarning: string | null;
  }
  
  const [deliverables, setDeliverables] = useState<DeliverableFormData[]>([
    { url: '', platform: null, caption: '', notes: '', isValidating: false, urlError: null, urlWarning: null }
  ]);

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId]);

  const loadCampaign = async () => {
    if (!user?.id || !campaignId) return;

    try {
      setLoading(true);

      // Get creator profile ID
      const { data: creatorProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creatorProfile) {
        Alert.alert('Error', 'Creator profile not found');
        router.back();
        return;
      }

      // Load campaign data
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      
      const campaignData = {
        id: data.id,
        title: data.title,
        description: data.description,
        requirements: data.requirements || [],
        deliverables: [],
        payout_per_creator: data.budget_cents / data.max_creators / 100,
        deadline: new Date(data.end_date),
      };
      
      setCampaign(campaignData);

      // Get campaign application
      const { data: application } = await supabase
        .from('campaign_applications')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('creator_id', creatorProfile.id)
        .eq('status', 'accepted')
        .single();

      if (application) {
        setCampaignApplicationId(application.id);

        // Load required deliverables
        const { data: required, error: reqError } = await getRequiredDeliverables(campaignId as string);
        if (reqError) {
          console.error('Error loading required deliverables:', reqError);
          setRequiredDeliverables([]);
        } else if (required && required.deliverables && required.deliverables.length > 0) {
          console.log('Loaded required deliverables:', required.deliverables.length);
          setRequiredDeliverables(required.deliverables);
        } else {
          setRequiredDeliverables([]);
        }

        // Load progress
        const { data: progressData, error: progError } = await getSubmissionProgress(
          application.id,
          campaignId as string
        );
        if (progError) {
          console.error('Error loading progress:', progError);
        } else if (progressData) {
          setProgress(progressData);
        }
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      Alert.alert('Error', 'Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  // Validate URL when it changes
  useEffect(() => {
    deliverables.forEach((deliverable, index) => {
      if (deliverable.url.trim().length > 10) {
        const timer = setTimeout(() => {
          validateDeliverableUrl(index);
        }, 500);
        return () => clearTimeout(timer);
      }
    });
  }, [deliverables.map(d => d.url).join(',')]);

  const validateDeliverableUrl = (index: number) => {
    const deliverable = deliverables[index];
    if (!deliverable.url.trim()) {
      updateDeliverable(index, {
        isValidating: false,
        urlError: null,
        urlWarning: null,
        platform: null
      });
      return;
    }

    updateDeliverable(index, { isValidating: true });
    
    setTimeout(() => {
      const validation = validateSocialMediaUrl(deliverable.url);
      updateDeliverable(index, {
        isValidating: false,
        urlError: validation.error || null,
        urlWarning: validation.warning || null,
        platform: validation.platform || null
      });
    }, 500);
  };

  const updateDeliverable = (index: number, updates: Partial<DeliverableFormData>) => {
    const updated = [...deliverables];
    updated[index] = { ...updated[index], ...updates };
    setDeliverables(updated);
  };

  const addDeliverable = () => {
    setDeliverables([
      ...deliverables,
      { url: '', platform: null, caption: '', notes: '', isValidating: false, urlError: null, urlWarning: null }
    ]);
  };

  const removeDeliverable = (index: number) => {
    if (deliverables.length > 1) {
      setDeliverables(deliverables.filter((_, i) => i !== index));
    } else {
      Alert.alert('Cannot Remove', 'You must have at least one deliverable');
    }
  };

  const handleSubmit = async () => {
    if (!user?.id || !campaignId || !campaignApplicationId) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    // Validate all deliverables
    const validDeliverables = deliverables.filter((d, index) => {
      if (!d.url.trim()) {
        Alert.alert('Missing URL', `Please enter a URL for deliverable ${index + 1}`);
        return false;
      }
      if (d.urlError) {
        Alert.alert('Invalid URL', `Deliverable ${index + 1}: ${d.urlError}`);
        return false;
      }
      if (!d.platform) {
        Alert.alert('Invalid URL', `Could not detect platform for deliverable ${index + 1}`);
        return false;
      }
      return true;
    });

    if (validDeliverables.length === 0) {
      Alert.alert('Error', 'Please add at least one valid deliverable');
      return;
    }

    setSubmitting(true);
    try {
      // Get creator profile ID
      const { data: creatorProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creatorProfile) {
        throw new Error('Creator profile not found');
      }

      // Get campaign application and restaurant info
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('restaurant_id')
        .eq('id', campaignId)
        .single();

      if (!campaignData) {
        throw new Error('Campaign not found');
      }

      // Prepare submissions
      const submissions = validDeliverables.map(d => ({
        campaign_application_id: campaignApplicationId,
        campaign_id: campaignId as string,
        creator_id: creatorProfile.id,
        restaurant_id: campaignData.restaurant_id,
        platform: d.platform!,
        post_url: d.url.trim(),
        caption: d.caption,
        notes_to_restaurant: d.notes,
        engagement_metrics: {},
      }));

      // Submit all deliverables
      const { data: results, errors } = await submitMultipleDeliverables(submissions);

      if (errors && errors.length > 0) {
        const errorMessages = errors.map(e => `Deliverable ${e.index + 1}: ${e.error.message}`).join('\n');
        Alert.alert('Partial Success', `Some deliverables failed to submit:\n\n${errorMessages}`);
        return;
      }

      if (!results || results.length === 0) {
        Alert.alert('Error', 'Failed to submit deliverables. Please try again.');
        return;
      }

      // Success message matching E2E guide
      const successMessage = `All ${results.length} deliverable${results.length !== 1 ? 's' : ''} submitted successfully.`;
      
      Alert.alert(
        'Success!',
        successMessage,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting deliverables:', error);
      Alert.alert('Error', 'Failed to submit deliverables. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if can submit
  const canSubmit = deliverables.length > 0 && 
    deliverables.every(d => d.url.trim() && !d.urlError && d.platform);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['left', 'right']}>
        <CreatorHeader
          title="Submit Deliverable"
          onBack={() => router.back()}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={{ marginTop: 16, fontSize: 16 }}>Loading campaign details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['left', 'right']}>
        <CreatorHeader
          title="Submit Deliverable"
          onBack={() => router.back()}
        />
        <View style={{ padding: 16 }}>
          <Text>Campaign not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate progress display values
  const submittedCount = progress?.submitted || 0;
  const requiredCount = progress?.required || requiredDeliverables.length || 0;
  const progressPercentage = progress?.percentage !== undefined 
    ? progress.percentage 
    : (requiredCount > 0 ? Math.round((submittedCount / requiredCount) * 100) : 0);
  const showProgressSection = (progress !== null) || (requiredDeliverables.length > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['left', 'right']}>
      <CreatorHeader
        title="Submit Deliverable"
        onBack={() => router.back()}
      />

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Progress Section */}
        {showProgressSection && requiredCount > 0 && (
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E5E5E5',
            padding: 16,
            marginBottom: 16,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#000000',
              }}>
                Deliverable Progress
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#737373',
              }}>
                {submittedCount} of {requiredCount} submitted ({progressPercentage}%)
              </Text>
            </View>
            <View style={{
              height: 8,
              backgroundColor: '#F3F4F6',
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 8,
            }}>
              <View style={{
                height: '100%',
                backgroundColor: '#10B981',
                borderRadius: 4,
                width: `${progressPercentage}%`,
              }} />
            </View>
            {progress?.complete && (
              <Text style={{
                fontSize: 13,
                color: '#10B981',
                fontWeight: '600',
              }}>
                ✓ All deliverables submitted
              </Text>
            )}
          </View>
        )}

        {/* Campaign Info - Collapsible */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#F3F4F6',
          marginBottom: 16,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
            }}
            onPress={() => setShowDetails(!showDetails)}
          >
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#000000',
                marginBottom: 4,
              }}>
                {campaign.title}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#10B981',
                fontWeight: '500',
              }}>
                ${campaign.payout_per_creator} payout • Due: {campaign.deadline.toLocaleDateString()}
              </Text>
            </View>
            {showDetails ? (
              <ChevronUp size={20} color="#737373" />
            ) : (
              <ChevronDown size={20} color="#737373" />
            )}
          </TouchableOpacity>
          
          {showDetails && (
            <View style={{
              paddingHorizontal: 16,
              paddingBottom: 16,
              borderTopWidth: 1,
              borderTopColor: '#F3F4F6',
            }}>
              <Text style={{
                fontSize: 14,
                color: '#737373',
                lineHeight: 20,
                marginTop: 12,
              }}>
                {campaign.description}
              </Text>
            </View>
          )}
        </View>

        {/* Expected Deliverables Section - Collapsible */}
        {requiredDeliverables.length > 0 && (
          <View style={{
            backgroundColor: '#FFFAF2',
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#FFAD27',
            marginBottom: 16,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
              }}
              onPress={() => setShowExpectedDeliverables(!showExpectedDeliverables)}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#000000',
              }}>
                Expected Deliverables ({requiredDeliverables.length})
              </Text>
              {showExpectedDeliverables ? (
                <ChevronUp size={20} color="#737373" />
              ) : (
                <ChevronDown size={20} color="#737373" />
              )}
            </TouchableOpacity>
            
            {showExpectedDeliverables && (
              <View style={{
                paddingHorizontal: 16,
                paddingBottom: 16,
                borderTopWidth: 1,
                borderTopColor: '#FFE4B5',
              }}>
                {requiredDeliverables.map((req, index) => {
                  const deliverableProgress = progress?.deliverables?.find((d: any) => d.index === req.index);
                  // Only show as submitted if status is NOT 'pending' (meaning it's been actually submitted)
                  const isSubmitted = deliverableProgress && deliverableProgress.status !== 'pending';
                  return (
                    <View key={index} style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      marginTop: index > 0 ? 12 : 0,
                      marginBottom: index < requiredDeliverables.length - 1 ? 12 : 0,
                    }}>
                      <Text style={{
                        fontSize: 14,
                        color: isSubmitted ? '#10B981' : '#9CA3AF',
                        marginRight: 8,
                        marginTop: 2,
                      }}>
                        {isSubmitted ? '✓' : '○'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#000000',
                          marginBottom: 4,
                        }}>
                          Deliverable {req.index}: {req.content_type || req.platform || 'Social Media Post'}
                        </Text>
                        {req.description && (
                          <Text style={{
                            fontSize: 13,
                            color: '#737373',
                            marginBottom: 4,
                          }}>
                            {req.description}
                          </Text>
                        )}
                        {isSubmitted && deliverableProgress && (
                          <Text style={{
                            fontSize: 12,
                            color: '#10B981',
                            fontWeight: '500',
                          }}>
                            Status: {deliverableProgress.status === 'pending_review' || deliverableProgress.status === 'pending' ? 'Pending Review' : 
                                     deliverableProgress.status === 'approved' || deliverableProgress.status === 'auto_approved' ? 'Approved' :
                                     deliverableProgress.status === 'rejected' ? 'Rejected' :
                                     deliverableProgress.status === 'needs_revision' || deliverableProgress.status === 'revision_requested' ? 'Needs Revision' :
                                     deliverableProgress.status}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Requirements - Collapsible */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#F3F4F6',
          marginBottom: 16,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
            }}
            onPress={() => setShowRequirements(!showRequirements)}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#000000',
            }}>
              Requirements ({campaign.requirements.length})
            </Text>
            {showRequirements ? (
              <ChevronUp size={20} color="#737373" />
            ) : (
              <ChevronDown size={20} color="#737373" />
            )}
          </TouchableOpacity>
          
          {showRequirements && (
            <View style={{
              paddingHorizontal: 16,
              paddingBottom: 16,
              borderTopWidth: 1,
              borderTopColor: '#F3F4F6',
            }}>
              {campaign.requirements.map((req, index) => (
                <View key={index} style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  marginTop: 12,
                }}>
                  <Text style={{
                    fontSize: 14,
                    color: '#10B981',
                    marginRight: 8,
                    marginTop: 2,
                  }}>
                    ✓
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#737373',
                    flex: 1,
                    lineHeight: 20,
                  }}>
                    {req}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Deliverable Forms */}
        {deliverables.map((deliverable, index) => (
          <View key={index} style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#F3F4F6',
            padding: 16,
            marginBottom: 16,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#000000',
              }}>
                Deliverable {index + 1}
              </Text>
              {deliverables.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeDeliverable(index)}
                  style={{
                    padding: 4,
                  }}
                >
                  <X size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            {/* Post URL */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#000000',
                marginBottom: 8,
              }}>
                Post URL *
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: deliverable.urlError ? '#EF4444' : '#E5E5E5',
                borderRadius: 8,
                paddingHorizontal: 12,
              }}>
                <Link size={16} color="#737373" />
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingLeft: 8,
                    fontSize: 14,
                  }}
                  placeholder="https://instagram.com/p/your-post-id"
                  value={deliverable.url}
                  onChangeText={(text) => updateDeliverable(index, { url: text })}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {deliverable.isValidating && (
                  <ActivityIndicator size="small" color="#FFAD27" />
                )}
                {!deliverable.isValidating && deliverable.platform && !deliverable.urlError && (
                  <Text style={{ color: '#10B981', fontSize: 12, marginLeft: 8 }}>
                    ✓ {deliverable.platform.charAt(0).toUpperCase() + deliverable.platform.slice(1)}
                  </Text>
                )}
              </View>
              {deliverable.urlError && (
                <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                  {deliverable.urlError}
                </Text>
              )}
              {deliverable.urlWarning && !deliverable.urlError && (
                <Text style={{ color: '#F59E0B', fontSize: 12, marginTop: 4 }}>
                  {deliverable.urlWarning}
                </Text>
              )}
              {deliverable.platform && !deliverable.urlError && (
                <Text style={{ color: '#10B981', fontSize: 12, marginTop: 4 }}>
                  Platform detected: {deliverable.platform.charAt(0).toUpperCase() + deliverable.platform.slice(1)}
                </Text>
              )}
            </View>

            {/* Caption */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#000000',
                marginBottom: 8,
              }}>
                Caption (Optional)
              </Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#E5E5E5',
                borderRadius: 8,
                paddingHorizontal: 12,
              }}>
                <TextInput
                  style={{
                    paddingVertical: 12,
                    fontSize: 14,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Paste your post caption here..."
                  value={deliverable.caption}
                  onChangeText={(text) => updateDeliverable(index, { caption: text })}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Notes */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#000000',
                marginBottom: 8,
              }}>
                Additional Notes (Optional)
              </Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#E5E5E5',
                borderRadius: 8,
                paddingHorizontal: 12,
              }}>
                <TextInput
                  style={{
                    paddingVertical: 12,
                    fontSize: 14,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Any additional information about your content..."
                  value={deliverable.notes}
                  onChangeText={(text) => updateDeliverable(index, { notes: text })}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Add Another Deliverable Button - Show after each form except the last */}
            {index === deliverables.length - 1 && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#FFAD27',
                  backgroundColor: '#FFFAF2',
                  marginTop: 8,
                }}
                onPress={addDeliverable}
              >
                <Plus size={20} color="#FFAD27" />
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#FFAD27',
                  marginLeft: 8,
                }}>
                  Add Another Deliverable
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Review Section */}
        {deliverables.length > 0 && deliverables.some(d => d.url.trim() && d.platform) && (
          <View style={{
            backgroundColor: '#F0F9FF',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#0EA5E9',
            padding: 16,
            marginBottom: 16,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#0C4A6E',
              marginBottom: 12,
            }}>
              Review Your Deliverables ({deliverables.filter(d => d.url.trim() && d.platform).length})
            </Text>
            {deliverables.map((deliverable, index) => {
              if (!deliverable.url.trim() || !deliverable.platform) return null;
              return (
                <View key={index} style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                  paddingBottom: 8,
                  borderBottomWidth: index < deliverables.length - 1 ? 1 : 0,
                  borderBottomColor: '#E0F2FE',
                }}>
                  <Text style={{
                    fontSize: 14,
                    color: '#0C4A6E',
                    marginRight: 8,
                    fontWeight: '600',
                  }}>
                    {index + 1}.
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 14,
                      color: '#0C4A6E',
                      fontWeight: '500',
                    }}>
                      {deliverable.platform.charAt(0).toUpperCase() + deliverable.platform.slice(1)} Post
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: '#64748B',
                      marginTop: 2,
                    }} numberOfLines={1}>
                      {deliverable.url}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={{
            backgroundColor: canSubmit ? '#10B981' : '#9CA3AF',
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 24,
            flexDirection: 'row',
            justifyContent: 'center',
          }}
          onPress={handleSubmit}
          disabled={submitting || !canSubmit}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#FFFFFF',
            }}>
              Submit {deliverables.filter(d => d.url.trim() && d.platform).length} Deliverable{deliverables.filter(d => d.url.trim() && d.platform).length !== 1 ? 's' : ''}
            </Text>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={{
          backgroundColor: '#F0F9FF',
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#0EA5E9',
        }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#0C4A6E',
            marginBottom: 8,
          }}>
            What happens next?
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#0C4A6E',
            lineHeight: 20,
          }}>
            • Your content will be reviewed within 72 hours{'\n'}
            • You'll receive a notification once reviewed{'\n'}
            • Payment will be processed upon approval{'\n'}
            • You can track status in "My Campaigns"
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
