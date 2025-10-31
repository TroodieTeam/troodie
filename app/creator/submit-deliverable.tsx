import { CreatorHeader } from '@/components/creator/CreatorHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, Link } from 'lucide-react-native';
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
  const [formData, setFormData] = useState({
    platform: 'instagram',
    postUrl: '',
    notes: '',
  });

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
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
    } catch (error) {
      console.error('Error loading campaign:', error);
      Alert.alert('Error', 'Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.postUrl.trim()) {
      Alert.alert('Error', 'Please enter your post URL');
      return;
    }

    setSubmitting(true);
    try {
      // Get creator profile ID
      const { data: creatorProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user?.id)
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

      // Get campaign application for this creator
      const { data: applicationData } = await supabase
        .from('campaign_applications')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('creator_id', creatorProfile.id)
        .eq('status', 'accepted')
        .single();

      if (!applicationData) {
        throw new Error('Campaign application not found or not accepted');
      }

      // Submit deliverable
      const deliverableData = {
        campaign_application_id: applicationData.id,
        campaign_id: campaignId,
        creator_id: creatorProfile.id,
        restaurant_id: campaignData.restaurant_id,
        social_platform: formData.platform,
        platform_post_url: formData.postUrl,
        caption: formData.notes,
        content_type: 'post',
        content_url: formData.postUrl, // Use post URL as content URL
        status: 'pending_review',
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('campaign_deliverables')
        .insert(deliverableData);

      if (error) throw error;

      Alert.alert(
        'Success!',
        'Your deliverable has been submitted and is under review. You\'ll be notified within 72 hours.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting deliverable:', error);
      Alert.alert('Error', 'Failed to submit deliverable. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['left', 'right']}>
      <CreatorHeader
        title="Submit Deliverable"
        onBack={() => router.back()}
      />

      <ScrollView style={{ flex: 1, padding: 16 }}>
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

        {/* Submission Form */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#F3F4F6',
          padding: 16,
          marginBottom: 24,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#000000',
            marginBottom: 16,
          }}>
            Submit Your Content
          </Text>

          {/* Platform Selection */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '500',
              color: '#000000',
              marginBottom: 8,
            }}>
              Platform
            </Text>
            <View style={{
              flexDirection: 'row',
              gap: 12,
            }}>
              {['instagram', 'tiktok', 'youtube'].map((platform) => (
                <TouchableOpacity
                  key={platform}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: formData.platform === platform ? '#10B981' : '#E5E5E5',
                    backgroundColor: formData.platform === platform ? '#10B98110' : '#FFFFFF',
                    alignItems: 'center',
                  }}
                  onPress={() => setFormData(prev => ({ ...prev, platform }))}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: formData.platform === platform ? '#10B981' : '#737373',
                    textTransform: 'capitalize',
                  }}>
                    {platform}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
              borderColor: '#E5E5E5',
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
                value={formData.postUrl}
                onChangeText={(text) => setFormData(prev => ({ ...prev, postUrl: text }))}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Notes */}
          <View style={{ marginBottom: 24 }}>
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
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#10B981',
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 24,
          }}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#FFFFFF',
            }}>
              Submit Deliverable
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
