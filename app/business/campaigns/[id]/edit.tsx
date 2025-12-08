import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  DollarSign,
  Plus,
  X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CampaignFormData {
  title: string;
  description: string;
  budget: string;
  deadline: string;
  requirements: string[];
  deliverables: Deliverable[];
}

interface Deliverable {
  id: string;
  type: string;
  description: string;
  quantity: number;
}

const DELIVERABLE_TYPES = [
  'Instagram Post',
  'Instagram Story',
  'Instagram Reel',
  'TikTok Video',
  'YouTube Video',
  'Blog Article',
  'Troodie Review',
];

export default function EditCampaign() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    requirements: [],
    deliverables: [],
  });

  const [newRequirement, setNewRequirement] = useState('');
  const [newDeliverable, setNewDeliverable] = useState({
    type: '',
    description: '',
    quantity: 1,
  });

  const [loadingState, setLoadingState] = useState<'loading' | 'loaded' | 'error' | 'no_profile' | 'no_restaurant'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    if (id) {
      loadCampaignData();
    }
  }, [id, user?.id]);

  const loadCampaignData = async () => {
    setLoadingCampaign(true);
    setLoadingState('loading');
    setErrorMessage(null);

    try {
      if (!user?.id || !id) {
        setLoadingState('error');
        setErrorMessage('Missing user or campaign ID');
        return;
      }

      // Load campaign data
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          *,
          restaurants (
            id,
            name
          )
        `)
        .eq('id', id)
        .eq('owner_id', user.id)
        .single();

      if (campaignError) {
        if (campaignError.code === 'PGRST116') {
          setLoadingState('error');
          setErrorMessage('Campaign not found or you do not have permission to edit it');
          return;
        }
        throw campaignError;
      }

      if (!campaign) {
        setLoadingState('error');
        setErrorMessage('Campaign not found');
        return;
      }

      // Set restaurant data
      if (campaign.restaurants) {
        setRestaurantData({
          id: campaign.restaurants.id,
          name: campaign.restaurants.name,
        });
      }

      // Parse deliverable_requirements back into form format
      let parsedDeliverables: Deliverable[] = [];
      if (campaign.deliverable_requirements?.deliverables) {
        // Group deliverables by type and description to reconstruct quantity
        const grouped = new Map<string, { type: string; description: string; count: number }>();
        
        campaign.deliverable_requirements.deliverables.forEach((del: any) => {
          const key = `${del.type}|${del.description}`;
          if (grouped.has(key)) {
            grouped.get(key)!.count++;
          } else {
            grouped.set(key, {
              type: del.type,
              description: del.description,
              count: 1,
            });
          }
        });

        parsedDeliverables = Array.from(grouped.values()).map((item, idx) => ({
          id: `existing-${idx}`,
          type: item.type,
          description: item.description,
          quantity: item.count,
        }));
      }

      // Populate form data
      setFormData({
        title: campaign.title || campaign.name || '',
        description: campaign.description || '',
        budget: campaign.budget_cents ? (campaign.budget_cents / 100).toString() : '',
        deadline: campaign.end_date || campaign.deadline || '',
        requirements: Array.isArray(campaign.requirements) ? campaign.requirements : [],
        deliverables: parsedDeliverables,
      });

      setLoadingState('loaded');
    } catch (error: any) {
      console.error('Failed to load campaign:', error);
      setLoadingState('error');
      setErrorMessage('Failed to load campaign data. Please try again.');
    } finally {
      setLoadingCampaign(false);
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData({
        ...formData,
        requirements: [...formData.requirements, newRequirement.trim()],
      });
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    setFormData({
      ...formData,
      requirements: formData.requirements.filter((_, i) => i !== index),
    });
  };

  const addDeliverable = () => {
    if (newDeliverable.type && newDeliverable.description) {
      const deliverable: Deliverable = {
        id: Date.now().toString(),
        type: newDeliverable.type,
        description: newDeliverable.description,
        quantity: newDeliverable.quantity,
      };
      
      setFormData({
        ...formData,
        deliverables: [...formData.deliverables, deliverable],
      });
      
      setNewDeliverable({
        type: '',
        description: '',
        quantity: 1,
      });
    }
  };

  const removeDeliverable = (id: string) => {
    setFormData({
      ...formData,
      deliverables: formData.deliverables.filter(d => d.id !== id),
    });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.title.trim() !== '' && formData.description.trim() !== '';
      case 2:
        return formData.budget !== '' && formData.deadline !== '';
      case 3:
        return formData.deliverables.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    } else {
      Alert.alert('Incomplete', 'Please fill in all required fields for this step.');
    }
  };

  const handleSubmit = async () => {
    if (!restaurantData?.id) {
      Alert.alert('Error', 'Restaurant data is missing. Please refresh and try again.');
      return;
    }

    if (!validateStep(currentStep)) {
      Alert.alert('Incomplete', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      if (!user?.id || !restaurantData?.id || !id) {
        throw new Error('Missing user, restaurant, or campaign information');
      }

      // Convert budget to cents
      const budgetCents = Math.round(parseFloat(formData.budget) * 100);
      
      // Prepare deliverable_requirements as JSONB (CM-12: Simplified)
      const expandedDeliverables = formData.deliverables.flatMap((deliverable) => {
        return Array.from({ length: deliverable.quantity }, (_, index) => ({
          index: index + 1,
          type: deliverable.type,
          description: deliverable.description,
          platform: deliverable.type.toLowerCase().includes('instagram') ? 'instagram' :
                   deliverable.type.toLowerCase().includes('tiktok') ? 'tiktok' :
                   deliverable.type.toLowerCase().includes('youtube') ? 'youtube' :
                   deliverable.type.toLowerCase().includes('facebook') ? 'facebook' :
                   deliverable.type.toLowerCase().includes('twitter') ? 'twitter' : undefined,
          content_type: deliverable.type.toLowerCase().includes('reel') ? 'reel' :
                       deliverable.type.toLowerCase().includes('story') ? 'story' :
                       deliverable.type.toLowerCase().includes('video') ? 'video' :
                       deliverable.type.toLowerCase().includes('article') ? 'article' : 'post',
          required: true,
        }));
      });
      
      const reindexedDeliverables = expandedDeliverables.map((deliverable, index) => ({
        ...deliverable,
        index: index + 1,
      }));
      
      const deliverableRequirements = {
        deliverables: reindexedDeliverables,
      };

      const { error } = await supabase
        .from('campaigns')
        .update({
          title: formData.title,
          description: formData.description,
          requirements: formData.requirements.length > 0 ? formData.requirements : null,
          budget_cents: budgetCents,
          end_date: new Date(formData.deadline).toISOString().split('T')[0],
          deliverable_requirements: deliverableRequirements,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) throw error;

      Alert.alert(
        'Success',
        'Campaign updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace(`/business/campaigns/${id}`),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to update campaign:', error);
      Alert.alert('Error', 'Failed to update campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: DS.spacing.lg,
    }}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: step <= currentStep ? DS.colors.primaryOrange : '#808080',
            borderWidth: step <= currentStep ? 0 : 2,
            borderColor: step <= currentStep ? 'transparent' : '#666666',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {step < currentStep ? (
              <CheckCircle size={20} color="white" />
            ) : (
              <Text style={{
                color: step <= currentStep ? 'white' : '#FFFFFF',
                fontWeight: '700',
                fontSize: 14,
              }}>{step}</Text>
            )}
          </View>
          {step < 3 && (
            <View style={{
              width: 40,
              height: 3,
              backgroundColor: step < currentStep ? DS.colors.primaryOrange : '#808080',
              marginHorizontal: DS.spacing.xs,
              borderRadius: 1,
            }} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text style={{
        fontSize: 18,
        fontWeight: '600',
        color: DS.colors.text,
        marginBottom: DS.spacing.md,
      }}>Campaign Basics</Text>

      <View style={{ marginBottom: DS.spacing.md }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: DS.colors.text,
          marginBottom: DS.spacing.xs,
        }}>Campaign Title *</Text>
        <TextInput
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
          placeholder="e.g., Summer Menu Launch Campaign"
          style={{
            borderWidth: 1,
            borderColor: DS.colors.border,
            borderRadius: DS.borderRadius.sm,
            padding: DS.spacing.sm,
            fontSize: 14,
            color: DS.colors.text,
          }}
        />
      </View>

      <View style={{ marginBottom: DS.spacing.md }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: DS.colors.text,
          marginBottom: DS.spacing.xs,
        }}>Description *</Text>
        <TextInput
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Describe what you want creators to showcase. Include any specific hashtags, mentions, or guidelines..."
          multiline
          numberOfLines={4}
          style={{
            borderWidth: 1,
            borderColor: DS.colors.border,
            borderRadius: DS.borderRadius.sm,
            padding: DS.spacing.sm,
            fontSize: 14,
            color: DS.colors.text,
            textAlignVertical: 'top',
            minHeight: 100,
          }}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={{
        fontSize: 18,
        fontWeight: '600',
        color: DS.colors.text,
        marginBottom: DS.spacing.md,
      }}>Budget & Timeline</Text>

      <View style={{ marginBottom: DS.spacing.md }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: DS.colors.text,
          marginBottom: DS.spacing.xs,
        }}>Campaign Budget *</Text>
        <TextInput
          value={formData.budget}
          onChangeText={(text) => setFormData({ ...formData, budget: text })}
          placeholder="0"
          keyboardType="numeric"
          style={{
            borderWidth: 1,
            borderColor: DS.colors.border,
            borderRadius: DS.borderRadius.sm,
            padding: DS.spacing.sm,
            fontSize: 14,
            color: DS.colors.text,
            paddingLeft: 35,
          }}
        />
        <DollarSign 
          size={16} 
          color={DS.colors.textLight}
          style={{
            position: 'absolute',
            left: DS.spacing.sm,
            top: 36,
          }}
        />
      </View>

      <View style={{ marginBottom: DS.spacing.md }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: DS.colors.text,
          marginBottom: DS.spacing.xs,
        }}>Campaign Deadline *</Text>
        <TouchableOpacity
          onPress={() => {
            const currentDate = formData.deadline ? new Date(formData.deadline) : new Date();
            setTempDate(currentDate);
            setShowDatePicker(true);
          }}
          style={{
            borderWidth: 1,
            borderColor: DS.colors.border,
            borderRadius: DS.borderRadius.sm,
            padding: DS.spacing.sm,
            paddingLeft: 35,
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Text style={{
            fontSize: 14,
            color: formData.deadline ? DS.colors.textDark : DS.colors.textGray,
          }}>
            {formData.deadline || 'YYYY-MM-DD'}
          </Text>
        </TouchableOpacity>
        <Calendar 
          size={16} 
          color={DS.colors.textLight}
          style={{
            position: 'absolute',
            left: DS.spacing.sm,
            top: 36,
            pointerEvents: 'none',
          }}
        />
        {showDatePicker && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              if (Platform.OS === 'android') {
                setShowDatePicker(false);
              }
              if (event.type === 'set' && selectedDate) {
                setTempDate(selectedDate);
                const formattedDate = selectedDate.toISOString().split('T')[0];
                setFormData({ ...formData, deadline: formattedDate });
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                }
              } else if (event.type === 'dismissed') {
                setShowDatePicker(false);
              }
            }}
            minimumDate={new Date()}
          />
        )}
        {Platform.OS === 'ios' && showDatePicker && (
          <View style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            padding: DS.spacing.md,
            backgroundColor: DS.colors.surface,
            borderTopWidth: 1,
            borderTopColor: DS.colors.border,
          }}>
            <TouchableOpacity
              onPress={() => setShowDatePicker(false)}
              style={{
                paddingHorizontal: DS.spacing.lg,
                paddingVertical: DS.spacing.sm,
              }}
            >
              <Text style={{
                color: DS.colors.primaryOrange,
                fontWeight: '600',
                fontSize: 16,
              }}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep3 = () => {
    const isAddButtonDisabled = !newDeliverable.type || !newDeliverable.description.trim();
    
    return (
      <View>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: DS.colors.textDark,
          marginBottom: DS.spacing.md,
        }}>Deliverables & Requirements</Text>

        {/* Add New Deliverable */}
        <View style={{
          backgroundColor: DS.colors.surface,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.sm,
          marginBottom: DS.spacing.md,
          borderWidth: 1,
          borderColor: DS.colors.border,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: DS.colors.textDark,
            marginBottom: DS.spacing.md,
          }}>Add Deliverable</Text>

          <View style={{ marginBottom: DS.spacing.md }}>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '500',
              color: DS.colors.textDark, 
              marginBottom: DS.spacing.xs 
            }}>Type *</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DELIVERABLE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setNewDeliverable({ ...newDeliverable, type })}
                  style={{
                    paddingHorizontal: DS.spacing.sm,
                    paddingVertical: DS.spacing.xs,
                    borderRadius: DS.borderRadius.sm,
                    borderWidth: 2,
                    borderColor: newDeliverable.type === type 
                      ? DS.colors.primaryOrange 
                      : DS.colors.border,
                    backgroundColor: newDeliverable.type === type 
                      ? DS.colors.primaryOrange + '15' 
                      : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: newDeliverable.type === type ? '600' : '400',
                    color: newDeliverable.type === type 
                      ? DS.colors.primaryOrange 
                      : DS.colors.textGray,
                  }}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ marginBottom: DS.spacing.md }}>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '500',
              color: DS.colors.textDark, 
              marginBottom: DS.spacing.xs 
            }}>Description *</Text>
            <TextInput
              value={newDeliverable.description}
              onChangeText={(text) => setNewDeliverable({ ...newDeliverable, description: text })}
              placeholder="Describe the deliverable..."
              placeholderTextColor={DS.colors.textLight}
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: DS.colors.border,
                borderRadius: DS.borderRadius.sm,
                padding: DS.spacing.sm,
                fontSize: 14,
                color: DS.colors.textDark,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
            />
          </View>

          <View style={{ marginBottom: DS.spacing.lg }}>
            <Text style={{ 
              fontSize: 14, 
              fontWeight: '500',
              color: DS.colors.textDark, 
              marginBottom: DS.spacing.xs 
            }}>Quantity</Text>
            <TextInput
              value={newDeliverable.quantity.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 1;
                setNewDeliverable({ ...newDeliverable, quantity: num > 0 ? num : 1 });
              }}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={DS.colors.textLight}
              style={{
                borderWidth: 1,
                borderColor: DS.colors.border,
                borderRadius: DS.borderRadius.sm,
                padding: DS.spacing.sm,
                fontSize: 14,
                color: DS.colors.textDark,
                width: 100,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={addDeliverable}
            disabled={isAddButtonDisabled}
            style={{
              backgroundColor: isAddButtonDisabled 
                ? DS.colors.surfaceLight 
                : DS.colors.primaryOrange,
              paddingVertical: DS.spacing.sm,
              paddingHorizontal: DS.spacing.md,
              borderRadius: DS.borderRadius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isAddButtonDisabled ? 0.6 : 1,
            }}
          >
            <Text style={{ 
              color: isAddButtonDisabled 
                ? DS.colors.textGray 
                : DS.colors.textWhite, 
              fontSize: 14, 
              fontWeight: '600' 
            }}>Add Deliverable</Text>
          </TouchableOpacity>
        </View>

        {/* Current Deliverables */}
        {formData.deliverables.length > 0 && (
          <View style={{ marginBottom: DS.spacing.md }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: DS.colors.textDark,
              marginBottom: DS.spacing.sm,
            }}>Added Deliverables ({formData.deliverables.length})</Text>
            {formData.deliverables.map((deliverable) => (
              <View key={deliverable.id} style={{
                backgroundColor: DS.colors.surface,
                padding: DS.spacing.sm,
                borderRadius: DS.borderRadius.sm,
                marginBottom: DS.spacing.sm,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: DS.colors.border,
              }}>
                <View style={{ flex: 1, marginRight: DS.spacing.sm }}>
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '600', 
                    color: DS.colors.textDark,
                    marginBottom: 2,
                  }}>
                    {deliverable.type} {deliverable.quantity > 1 && `(${deliverable.quantity}x)`}
                  </Text>
                  <Text style={{ 
                    fontSize: 13, 
                    color: DS.colors.textGray, 
                    marginTop: 2,
                  }}>
                    {deliverable.description}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => removeDeliverable(deliverable.id)}
                  style={{
                    padding: DS.spacing.xs,
                  }}
                >
                  <X size={20} color={DS.colors.textGray} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {formData.deliverables.length === 0 && (
          <View style={{
            padding: DS.spacing.lg,
            alignItems: 'center',
            backgroundColor: DS.colors.surfaceLight,
            borderRadius: DS.borderRadius.sm,
            borderWidth: 1,
            borderColor: DS.colors.border,
            borderStyle: 'dashed',
            marginBottom: DS.spacing.lg,
          }}>
            <Text style={{ 
              fontSize: 14, 
              color: DS.colors.textGray, 
              textAlign: 'center' 
            }}>
              No deliverables added yet. Add at least one deliverable to continue.
            </Text>
          </View>
        )}

        {/* Requirements Section */}
        <View style={{
          backgroundColor: DS.colors.surface,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.sm,
          borderWidth: 1,
          borderColor: DS.colors.border,
          marginTop: DS.spacing.md,
        }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: DS.colors.textDark,
            marginBottom: DS.spacing.md,
          }}>Additional Requirements</Text>

          <View style={{ 
            flexDirection: 'row', 
            marginBottom: DS.spacing.md,
            gap: DS.spacing.xs,
          }}>
            <TextInput
              value={newRequirement}
              onChangeText={setNewRequirement}
              placeholder="Add a requirement..."
              placeholderTextColor={DS.colors.textLight}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: DS.colors.border,
                borderRadius: DS.borderRadius.sm,
                padding: DS.spacing.sm,
                fontSize: 14,
                color: DS.colors.textDark,
              }}
              onSubmitEditing={addRequirement}
            />
            <TouchableOpacity
              onPress={addRequirement}
              disabled={!newRequirement.trim()}
              style={{
                backgroundColor: !newRequirement.trim()
                  ? DS.colors.surfaceLight
                  : DS.colors.primaryOrange,
                padding: DS.spacing.sm,
                borderRadius: DS.borderRadius.sm,
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: 44,
                opacity: !newRequirement.trim() ? 0.6 : 1,
              }}
            >
              <Plus 
                size={20} 
                color={!newRequirement.trim() 
                  ? DS.colors.textGray 
                  : DS.colors.textWhite
                } 
              />
            </TouchableOpacity>
          </View>

          {formData.requirements.length > 0 && (
            <View>
              <Text style={{
                fontSize: 13,
                fontWeight: '500',
                color: DS.colors.textGray,
                marginBottom: DS.spacing.sm,
              }}>
                Requirements ({formData.requirements.length})
              </Text>
              {formData.requirements.map((requirement, index) => (
                <View key={index} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: DS.colors.surfaceLight,
                  padding: DS.spacing.sm,
                  borderRadius: DS.borderRadius.sm,
                  marginBottom: DS.spacing.xs,
                  borderWidth: 1,
                  borderColor: DS.colors.border,
                }}>
                  <Text style={{ 
                    flex: 1, 
                    fontSize: 13, 
                    color: DS.colors.textDark,
                    marginRight: DS.spacing.xs,
                  }}>
                    • {requirement}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => removeRequirement(index)}
                    style={{
                      padding: DS.spacing.xs,
                    }}
                  >
                    <X size={16} color={DS.colors.textGray} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {formData.requirements.length === 0 && (
            <Text style={{
              fontSize: 13,
              color: DS.colors.textGray,
              fontStyle: 'italic',
            }}>
              No additional requirements added yet
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Render loading state
  if (loadingCampaign || loadingState === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={DS.colors.primary} />
        <Text style={{ marginTop: DS.spacing.md, color: DS.colors.text }}>Loading campaign...</Text>
      </SafeAreaView>
    );
  }

  // Render error states
  if (loadingState === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background, justifyContent: 'center', alignItems: 'center', padding: DS.spacing.lg }}>
        <X size={48} color={DS.colors.error || '#EF4444'} />
        <Text style={{ fontSize: 20, fontWeight: '600', color: DS.colors.text, marginTop: DS.spacing.md, marginBottom: DS.spacing.sm }}>Something Went Wrong</Text>
        <Text style={{ fontSize: 14, color: DS.colors.textLight, textAlign: 'center', marginBottom: DS.spacing.lg }}>{errorMessage}</Text>
        <TouchableOpacity
          style={{ backgroundColor: DS.colors.primary, paddingHorizontal: DS.spacing.lg, paddingVertical: DS.spacing.sm, borderRadius: DS.borderRadius.md, marginBottom: DS.spacing.sm }}
          onPress={loadCampaignData}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: DS.colors.textLight, marginTop: DS.spacing.sm }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: DS.spacing.md,
        backgroundColor: DS.colors.backgroundWhite,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={DS.colors.text} />
        </TouchableOpacity>
        <Text style={{
          fontSize: 17,
          fontWeight: '600',
          color: DS.colors.text,
        }}>Edit Campaign</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Restaurant Header */}
      {restaurantData && (
        <View style={{ backgroundColor: DS.colors.backgroundWhite, padding: DS.spacing.md, borderBottomWidth: 1, borderBottomColor: DS.colors.border }}>
          <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>Editing campaign for:</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text }}>{restaurantData.name}</Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: DS.spacing.md }}>
        {renderStepIndicator()}
        
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
          marginBottom: DS.spacing.md,
        }}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={{
        flexDirection: 'row',
        padding: DS.spacing.md,
        backgroundColor: DS.colors.backgroundWhite,
        borderTopWidth: 1,
        borderTopColor: DS.colors.border,
      }}>
        {currentStep > 1 && (
          <TouchableOpacity
            onPress={() => setCurrentStep(currentStep - 1)}
            style={{
              flex: 1,
              backgroundColor: DS.colors.background,
              padding: DS.spacing.md,
              borderRadius: DS.borderRadius.sm,
              alignItems: 'center',
              marginRight: DS.spacing.xs,
            }}
          >
            <Text style={{ color: DS.colors.text, fontWeight: '600' }}>Previous</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          onPress={handleNext}
          disabled={!validateStep(currentStep) || loading}
          style={{
            flex: currentStep > 1 ? 1 : 2,
            backgroundColor: validateStep(currentStep) ? DS.colors.primaryOrange : '#808080',
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.sm,
            alignItems: 'center',
            marginLeft: currentStep > 1 ? DS.spacing.xs : 0,
            opacity: validateStep(currentStep) ? 1 : 0.8,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={{ 
              color: 'white', 
              fontWeight: '700' 
            }}>
              {currentStep === totalSteps ? 'Update Campaign' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
