import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft,
  Calendar,
  DollarSign,
  Target,
  Users,
  Plus,
  X,
  CheckCircle,
} from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface CampaignFormData {
  title: string;
  description: string;
  budget: string;
  deadline: string;
  requirements: string[];
  deliverables: Deliverable[];
  target_audience: string;
  content_type: string[];
  posting_schedule: string;
  brand_guidelines: string;
}

interface Deliverable {
  id: string;
  type: string;
  description: string;
  quantity: number;
}

const CONTENT_TYPES = [
  'Photo Posts',
  'Video Content',
  'Reels/Stories',
  'Blog Reviews',
  'Live Streaming',
];

const DELIVERABLE_TYPES = [
  'Instagram Post',
  'Instagram Story',
  'Instagram Reel',
  'TikTok Video',
  'YouTube Video',
  'Blog Article',
  'Google Review',
];

export default function CreateCampaign() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    requirements: [],
    deliverables: [],
    target_audience: '',
    content_type: [],
    posting_schedule: '',
    brand_guidelines: '',
  });

  const [newRequirement, setNewRequirement] = useState('');
  const [newDeliverable, setNewDeliverable] = useState({
    type: '',
    description: '',
    quantity: 1,
  });

  useEffect(() => {
    loadRestaurantData();
  }, []);

  const loadRestaurantData = async () => {
    try {
      if (!user?.id) return;

      const { data: profile, error } = await supabase
        .from('business_profiles')
        .select(`
          restaurants (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setRestaurantData(profile?.restaurants);
    } catch (error) {
      console.error('Failed to load restaurant data:', error);
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

  const toggleContentType = (type: string) => {
    const updatedTypes = formData.content_type.includes(type)
      ? formData.content_type.filter(t => t !== type)
      : [...formData.content_type, type];
    
    setFormData({ ...formData, content_type: updatedTypes });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.title.trim() !== '' && formData.description.trim() !== '';
      case 2:
        return formData.budget !== '' && formData.deadline !== '';
      case 3:
        return formData.deliverables.length > 0;
      case 4:
        return formData.content_type.length > 0;
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
    setLoading(true);
    try {
      if (!user?.id || !restaurantData?.id) return;

      const { error } = await supabase
        .from('campaigns')
        .insert({
          restaurant_id: restaurantData.id,
          creator_id: user.id,
          title: formData.title,
          description: formData.description,
          requirements: formData.requirements,
          budget: parseFloat(formData.budget),
          deadline: new Date(formData.deadline).toISOString(),
          status: 'active',
          campaign_data: {
            target_audience: formData.target_audience,
            content_type: formData.content_type,
            posting_schedule: formData.posting_schedule,
            brand_guidelines: formData.brand_guidelines,
            deliverables: formData.deliverables,
          },
        });

      if (error) throw error;

      Alert.alert(
        'Success',
        'Campaign created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/business/campaigns'),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to create campaign:', error);
      Alert.alert('Error', 'Failed to create campaign. Please try again.');
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
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: step <= currentStep ? DS.colors.primary : DS.colors.border,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {step < currentStep ? (
              <CheckCircle size={20} color="white" />
            ) : (
              <Text style={{
                color: step <= currentStep ? 'white' : DS.colors.textLight,
                fontWeight: '600',
              }}>{step}</Text>
            )}
          </View>
          {step < 4 && (
            <View style={{
              width: 40,
              height: 2,
              backgroundColor: step < currentStep ? DS.colors.primary : DS.colors.border,
              marginHorizontal: DS.spacing.xs,
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
          placeholder="Describe what you want creators to showcase..."
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

      <View>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: DS.colors.text,
          marginBottom: DS.spacing.xs,
        }}>Brand Guidelines</Text>
        <TextInput
          value={formData.brand_guidelines}
          onChangeText={(text) => setFormData({ ...formData, brand_guidelines: text })}
          placeholder="Any specific requirements for photos, hashtags, mentions..."
          multiline
          numberOfLines={3}
          style={{
            borderWidth: 1,
            borderColor: DS.colors.border,
            borderRadius: DS.borderRadius.sm,
            padding: DS.spacing.sm,
            fontSize: 14,
            color: DS.colors.text,
            textAlignVertical: 'top',
            minHeight: 80,
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
        <TextInput
          value={formData.deadline}
          onChangeText={(text) => setFormData({ ...formData, deadline: text })}
          placeholder="YYYY-MM-DD"
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
        <Calendar 
          size={16} 
          color={DS.colors.textLight}
          style={{
            position: 'absolute',
            left: DS.spacing.sm,
            top: 36,
          }}
        />
      </View>

      <View>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: DS.colors.text,
          marginBottom: DS.spacing.xs,
        }}>Posting Schedule</Text>
        <TextInput
          value={formData.posting_schedule}
          onChangeText={(text) => setFormData({ ...formData, posting_schedule: text })}
          placeholder="e.g., Post within 3 days of visit"
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
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={{
        fontSize: 18,
        fontWeight: '600',
        color: DS.colors.text,
        marginBottom: DS.spacing.md,
      }}>Deliverables</Text>

      {/* Add New Deliverable */}
      <View style={{
        backgroundColor: DS.colors.background,
        padding: DS.spacing.md,
        borderRadius: DS.borderRadius.sm,
        marginBottom: DS.spacing.md,
      }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: DS.colors.text,
          marginBottom: DS.spacing.sm,
        }}>Add Deliverable</Text>

        <View style={{ marginBottom: DS.spacing.sm }}>
          <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DELIVERABLE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setNewDeliverable({ ...newDeliverable, type })}
                style={{
                  paddingHorizontal: DS.spacing.sm,
                  paddingVertical: DS.spacing.xs,
                  borderRadius: DS.borderRadius.xs,
                  borderWidth: 1,
                  borderColor: newDeliverable.type === type ? DS.colors.primary : DS.colors.border,
                  backgroundColor: newDeliverable.type === type ? DS.colors.primary + '20' : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 12,
                  color: newDeliverable.type === type ? DS.colors.primary : DS.colors.textLight,
                }}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: DS.spacing.sm }}>
          <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>Description</Text>
          <TextInput
            value={newDeliverable.description}
            onChangeText={(text) => setNewDeliverable({ ...newDeliverable, description: text })}
            placeholder="Describe the deliverable..."
            style={{
              borderWidth: 1,
              borderColor: DS.colors.border,
              borderRadius: DS.borderRadius.sm,
              padding: DS.spacing.xs,
              fontSize: 12,
            }}
          />
        </View>

        <View style={{ marginBottom: DS.spacing.sm }}>
          <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>Quantity</Text>
          <TextInput
            value={newDeliverable.quantity.toString()}
            onChangeText={(text) => setNewDeliverable({ ...newDeliverable, quantity: parseInt(text) || 1 })}
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor: DS.colors.border,
              borderRadius: DS.borderRadius.sm,
              padding: DS.spacing.xs,
              fontSize: 12,
              width: 80,
            }}
          />
        </View>

        <TouchableOpacity
          onPress={addDeliverable}
          style={{
            backgroundColor: DS.colors.primary,
            padding: DS.spacing.xs,
            borderRadius: DS.borderRadius.sm,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Add Deliverable</Text>
        </TouchableOpacity>
      </View>

      {/* Current Deliverables */}
      {formData.deliverables.map((deliverable) => (
        <View key={deliverable.id} style={{
          backgroundColor: DS.colors.backgroundWhite,
          padding: DS.spacing.sm,
          borderRadius: DS.borderRadius.sm,
          marginBottom: DS.spacing.sm,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: DS.colors.text }}>
              {deliverable.type} ({deliverable.quantity}x)
            </Text>
            <Text style={{ fontSize: 12, color: DS.colors.textLight, marginTop: 2 }}>
              {deliverable.description}
            </Text>
          </View>
          <TouchableOpacity onPress={() => removeDeliverable(deliverable.id)}>
            <X size={16} color={DS.colors.textLight} />
          </TouchableOpacity>
        </View>
      ))}

      {formData.deliverables.length === 0 && (
        <Text style={{ fontSize: 12, color: DS.colors.textLight, textAlign: 'center' }}>
          No deliverables added yet
        </Text>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={{
        fontSize: 18,
        fontWeight: '600',
        color: DS.colors.text,
        marginBottom: DS.spacing.md,
      }}>Content & Audience</Text>

      <View style={{ marginBottom: DS.spacing.md }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: DS.colors.text,
          marginBottom: DS.spacing.xs,
        }}>Preferred Content Types *</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CONTENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => toggleContentType(type)}
              style={{
                paddingHorizontal: DS.spacing.sm,
                paddingVertical: DS.spacing.xs,
                borderRadius: DS.borderRadius.xs,
                borderWidth: 1,
                borderColor: formData.content_type.includes(type) ? DS.colors.primary : DS.colors.border,
                backgroundColor: formData.content_type.includes(type) ? DS.colors.primary + '20' : 'transparent',
              }}
            >
              <Text style={{
                fontSize: 12,
                color: formData.content_type.includes(type) ? DS.colors.primary : DS.colors.textLight,
              }}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ marginBottom: DS.spacing.md }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: DS.colors.text,
          marginBottom: DS.spacing.xs,
        }}>Target Audience</Text>
        <TextInput
          value={formData.target_audience}
          onChangeText={(text) => setFormData({ ...formData, target_audience: text })}
          placeholder="e.g., Food enthusiasts in NYC aged 25-40"
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

      {/* Requirements */}
      <View>
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: DS.colors.text,
          marginBottom: DS.spacing.xs,
        }}>Additional Requirements</Text>

        <View style={{ flexDirection: 'row', marginBottom: DS.spacing.sm }}>
          <TextInput
            value={newRequirement}
            onChangeText={setNewRequirement}
            placeholder="Add a requirement..."
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: DS.colors.border,
              borderRadius: DS.borderRadius.sm,
              padding: DS.spacing.sm,
              fontSize: 14,
              marginRight: DS.spacing.xs,
            }}
          />
          <TouchableOpacity
            onPress={addRequirement}
            style={{
              backgroundColor: DS.colors.primary,
              padding: DS.spacing.sm,
              borderRadius: DS.borderRadius.sm,
              justifyContent: 'center',
            }}
          >
            <Plus size={16} color="white" />
          </TouchableOpacity>
        </View>

        {formData.requirements.map((requirement, index) => (
          <View key={index} style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: DS.colors.backgroundWhite,
            padding: DS.spacing.xs,
            borderRadius: DS.borderRadius.sm,
            marginBottom: DS.spacing.xs,
          }}>
            <Text style={{ flex: 1, fontSize: 12, color: DS.colors.text }}>
              • {requirement}
            </Text>
            <TouchableOpacity onPress={() => removeRequirement(index)}>
              <X size={14} color={DS.colors.textLight} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

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
        }}>Create Campaign</Text>
        <View style={{ width: 24 }} />
      </View>

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
          {currentStep === 4 && renderStep4()}
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
            backgroundColor: validateStep(currentStep) ? DS.colors.primary : DS.colors.border,
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.sm,
            alignItems: 'center',
            marginLeft: currentStep > 1 ? DS.spacing.xs : 0,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={{ 
              color: 'white', 
              fontWeight: '600' 
            }}>
              {currentStep === totalSteps ? 'Create Campaign' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}