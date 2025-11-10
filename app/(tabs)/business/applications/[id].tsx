import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft,
  Star,
  Users,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  ExternalLink,
  Camera,
  Video,
  Instagram,
  Youtube,
} from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ApplicationDetail {
  id: string;
  campaign: {
    id: string;
    title: string;
    description: string;
    budget: number;
    deadline: string;
  };
  creator: {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
    bio: string;
    rating: number;
    follower_count: number;
    completed_campaigns: number;
    response_rate: number;
    avg_delivery_time: string;
    social_links: {
      instagram?: string;
      youtube?: string;
      tiktok?: string;
    };
  };
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  applied_at: string;
  proposal: string;
  proposed_rate: number;
  estimated_reach: number;
  estimated_engagement: number;
  deliverables: {
    type: string;
    description: string;
    quantity: number;
  }[];
  portfolio_samples: {
    id: string;
    url: string;
    type: 'image' | 'video';
    caption: string;
    engagement: {
      likes: number;
      comments: number;
    };
  }[];
  timeline: string;
  additional_notes: string;
}

export default function ApplicationDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    loadApplicationDetail();
  }, [id]);

  const loadApplicationDetail = async () => {
    try {
      // Mock data for detailed application view
      const mockApplication: ApplicationDetail = {
        id: id as string,
        campaign: {
          id: 'camp-1',
          title: 'Summer Menu Launch Campaign',
          description: 'Showcase our new summer menu featuring fresh, seasonal ingredients',
          budget: 1000,
          deadline: '2024-02-15T00:00:00Z',
        },
        creator: {
          id: 'creator-1',
          name: 'Sarah Johnson',
          username: '@foodie_sarah',
          avatar_url: 'https://via.placeholder.com/100',
          bio: 'NYC food enthusiast sharing the best eats around the city. Passionate about discovering hidden gems and seasonal cuisine.',
          rating: 4.9,
          follower_count: 12500,
          completed_campaigns: 15,
          response_rate: 98,
          avg_delivery_time: '2 days',
          social_links: {
            instagram: 'https://instagram.com/foodie_sarah',
            youtube: 'https://youtube.com/foodiesarah',
          },
        },
        status: 'pending',
        applied_at: '2024-01-15T10:30:00Z',
        proposal: 'I am extremely excited about the opportunity to showcase your summer menu! As a NYC-based food content creator with over 12K engaged followers, I specialize in creating vibrant, mouth-watering content that truly captures the essence of seasonal dining.\n\nWhat sets me apart:\n• Expert in natural light photography that makes food look irresistible\n• Strong engagement rates (4.8% average) with an audience that actively seeks restaurant recommendations\n• Experience with similar seasonal menu launches for 3 other NYC restaurants\n• Comprehensive content strategy including feed posts, stories, and highlight features\n\nI would love to create content that not only showcases your dishes but tells the story behind your seasonal ingredients and culinary vision.',
        proposed_rate: 350,
        estimated_reach: 8500,
        estimated_engagement: 400,
        deliverables: [
          {
            type: 'Instagram Posts',
            description: 'High-quality photos of 3-4 signature summer dishes',
            quantity: 4,
          },
          {
            type: 'Instagram Stories',
            description: 'Behind-the-scenes content and dining experience',
            quantity: 6,
          },
          {
            type: 'Instagram Reel',
            description: 'Short-form video highlighting menu favorites',
            quantity: 1,
          },
        ],
        portfolio_samples: [
          {
            id: '1',
            url: 'https://via.placeholder.com/300x300',
            type: 'image',
            caption: 'Summer pasta perfection at @restaurantname - the burst cherry tomatoes and fresh basil made this dish absolutely divine! 🍅✨',
            engagement: { likes: 420, comments: 32 },
          },
          {
            id: '2',
            url: 'https://via.placeholder.com/300x300',
            type: 'video',
            caption: 'Watch me try the most amazing seasonal tasting menu! Every dish was a work of art 🎨',
            engagement: { likes: 680, comments: 45 },
          },
          {
            id: '3',
            url: 'https://via.placeholder.com/300x300',
            type: 'image',
            caption: 'This colorful summer salad was the perfect start to an incredible meal! Love restaurants that prioritize fresh, local ingredients 🥗',
            engagement: { likes: 290, comments: 18 },
          },
          {
            id: '4',
            url: 'https://via.placeholder.com/300x300',
            type: 'image',
            caption: 'Nothing beats a perfectly crafted summer cocktail on the patio! 🍹 The mixology here is truly exceptional.',
            engagement: { likes: 355, comments: 28 },
          },
        ],
        timeline: 'Content will be created within 3 days of dining experience and posted according to your preferred schedule. Stories will go live same-day for maximum freshness and engagement.',
        additional_notes: 'I am flexible with posting times and happy to incorporate specific hashtags or mentions as needed. I also provide all high-resolution photos for your restaurant to use on your own social channels.',
      };

      setApplication(mockApplication);
    } catch (error) {
      console.error('Failed to load application detail:', error);
      Alert.alert('Error', 'Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (action: 'accept' | 'reject') => {
    if (!application) return;

    Alert.alert(
      `${action === 'accept' ? 'Accept' : 'Reject'} Application`,
      `Are you sure you want to ${action} ${application.creator.name}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'accept' ? 'Accept' : 'Reject',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setApplication({
                ...application,
                status: action === 'accept' ? 'accepted' : 'rejected',
              });
              
              Alert.alert(
                'Success',
                `Application ${action === 'accept' ? 'accepted' : 'rejected'} successfully`,
                [
                  { text: 'OK', onPress: () => router.back() },
                ]
              );
            } catch (error) {
              console.error('Failed to update application:', error);
              Alert.alert('Error', 'Failed to update application');
            }
          },
        },
      ]
    );
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    setSendingMessage(true);
    try {
      // Simulate sending message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Message Sent', 'Your message has been sent to the creator.');
      setMessageText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const openSocialLink = (url: string) => {
    Linking.openURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'completed': return '#8B5CF6';
      default: return DS.colors.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} color="#F59E0B" />;
      case 'accepted': return <CheckCircle size={16} color="#10B981" />;
      case 'rejected': return <XCircle size={16} color="#EF4444" />;
      case 'completed': return <Star size={16} color="#8B5CF6" fill="#8B5CF6" />;
      default: return <Clock size={16} color={DS.colors.textLight} />;
    }
  };

  if (loading || !application) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={DS.colors.primary} />
        </View>
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
        }}>Application Details</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {getStatusIcon(application.status)}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Campaign Info */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          margin: DS.spacing.md,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: DS.colors.primary,
            marginBottom: DS.spacing.xs,
          }}>{application.campaign.title}</Text>
          
          <Text style={{
            fontSize: 14,
            color: DS.colors.text,
            lineHeight: 18,
            marginBottom: DS.spacing.sm,
          }}>{application.campaign.description}</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DollarSign size={14} color={DS.colors.textLight} />
              <Text style={{ fontSize: 12, color: DS.colors.text, marginLeft: 2 }}>
                ${application.campaign.budget} budget
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Calendar size={14} color={DS.colors.textLight} />
              <Text style={{ fontSize: 12, color: DS.colors.text, marginLeft: 2 }}>
                Due {new Date(application.campaign.deadline).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Creator Profile */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          marginHorizontal: DS.spacing.md,
          marginBottom: DS.spacing.md,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: DS.spacing.sm }}>
            <Image
              source={{ uri: application.creator.avatar_url }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: DS.colors.border,
              }}
            />
            
            <View style={{ flex: 1, marginLeft: DS.spacing.sm }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text }}>
                {application.creator.name}
              </Text>
              <Text style={{ fontSize: 14, color: DS.colors.textLight, marginBottom: 4 }}>
                {application.creator.username}
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Star size={12} color="#FFB800" fill="#FFB800" />
                <Text style={{ fontSize: 12, fontWeight: '500', color: DS.colors.text, marginLeft: 2 }}>
                  {application.creator.rating} rating
                </Text>
              </View>
            </View>

            {/* Social Links */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {application.creator.social_links.instagram && (
                <TouchableOpacity
                  onPress={() => openSocialLink(application.creator.social_links.instagram!)}
                  style={{
                    backgroundColor: DS.colors.background,
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  <Instagram size={16} color="#E4405F" />
                </TouchableOpacity>
              )}
              {application.creator.social_links.youtube && (
                <TouchableOpacity
                  onPress={() => openSocialLink(application.creator.social_links.youtube!)}
                  style={{
                    backgroundColor: DS.colors.background,
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  <Youtube size={16} color="#FF0000" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={{
            fontSize: 14,
            color: DS.colors.text,
            lineHeight: 18,
            marginBottom: DS.spacing.sm,
          }}>{application.creator.bio}</Text>

          {/* Creator Stats */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            paddingTop: DS.spacing.sm,
            borderTopWidth: 1,
            borderTopColor: DS.colors.border,
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>
                {application.creator.follower_count.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 10, color: DS.colors.textLight }}>Followers</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>
                {application.creator.completed_campaigns}
              </Text>
              <Text style={{ fontSize: 10, color: DS.colors.textLight }}>Campaigns</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>
                {application.creator.response_rate}%
              </Text>
              <Text style={{ fontSize: 10, color: DS.colors.textLight }}>Response</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>
                {application.creator.avg_delivery_time}
              </Text>
              <Text style={{ fontSize: 10, color: DS.colors.textLight }}>Avg Delivery</Text>
            </View>
          </View>
        </View>

        {/* Application Details */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          marginHorizontal: DS.spacing.md,
          marginBottom: DS.spacing.md,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: DS.colors.text,
            marginBottom: DS.spacing.sm,
          }}>Proposal</Text>

          <Text style={{
            fontSize: 14,
            color: DS.colors.text,
            lineHeight: 20,
            marginBottom: DS.spacing.md,
          }}>{application.proposal}</Text>

          {/* Key Metrics */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            backgroundColor: DS.colors.background,
            padding: DS.spacing.sm,
            borderRadius: DS.borderRadius.sm,
            marginBottom: DS.spacing.md,
          }}>
            <View style={{ alignItems: 'center' }}>
              <DollarSign size={16} color={DS.colors.primary} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginTop: 4 }}>
                ${application.proposed_rate}
              </Text>
              <Text style={{ fontSize: 10, color: DS.colors.textLight }}>Proposed Rate</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Users size={16} color={DS.colors.primary} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginTop: 4 }}>
                {application.estimated_reach.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 10, color: DS.colors.textLight }}>Est. Reach</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <MessageCircle size={16} color={DS.colors.primary} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginTop: 4 }}>
                {application.estimated_engagement}
              </Text>
              <Text style={{ fontSize: 10, color: DS.colors.textLight }}>Est. Engagement</Text>
            </View>
          </View>

          {/* Deliverables */}
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: DS.colors.text,
            marginBottom: DS.spacing.xs,
          }}>Deliverables</Text>

          {application.deliverables.map((deliverable, index) => (
            <View key={index} style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: DS.colors.background,
              padding: DS.spacing.sm,
              borderRadius: DS.borderRadius.sm,
              marginBottom: DS.spacing.xs,
            }}>
              <View style={{
                backgroundColor: DS.colors.primary,
                width: 20,
                height: 20,
                borderRadius: 10,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: DS.spacing.sm,
              }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                  {deliverable.quantity}
                </Text>
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: DS.colors.text }}>
                  {deliverable.type}
                </Text>
                <Text style={{ fontSize: 10, color: DS.colors.textLight }}>
                  {deliverable.description}
                </Text>
              </View>
            </View>
          ))}

          {/* Timeline */}
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: DS.colors.text,
            marginTop: DS.spacing.sm,
            marginBottom: DS.spacing.xs,
          }}>Timeline</Text>
          
          <Text style={{
            fontSize: 12,
            color: DS.colors.text,
            backgroundColor: DS.colors.background,
            padding: DS.spacing.sm,
            borderRadius: DS.borderRadius.sm,
            marginBottom: DS.spacing.sm,
          }}>{application.timeline}</Text>

          {/* Additional Notes */}
          {application.additional_notes && (
            <>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: DS.colors.text,
                marginBottom: DS.spacing.xs,
              }}>Additional Notes</Text>
              
              <Text style={{
                fontSize: 12,
                color: DS.colors.text,
                backgroundColor: DS.colors.background,
                padding: DS.spacing.sm,
                borderRadius: DS.borderRadius.sm,
              }}>{application.additional_notes}</Text>
            </>
          )}
        </View>

        {/* Portfolio Samples */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          marginHorizontal: DS.spacing.md,
          marginBottom: DS.spacing.md,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: DS.colors.text,
            marginBottom: DS.spacing.sm,
          }}>Portfolio Samples</Text>

          {application.portfolio_samples.map((sample) => (
            <View key={sample.id} style={{ marginBottom: DS.spacing.md }}>
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: sample.url }}
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: DS.borderRadius.sm,
                    backgroundColor: DS.colors.border,
                  }}
                />
                {sample.type === 'video' && (
                  <View style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    borderRadius: 16,
                    padding: 4,
                  }}>
                    <Video size={16} color="white" />
                  </View>
                )}
              </View>
              
              <Text style={{
                fontSize: 12,
                color: DS.colors.text,
                marginTop: DS.spacing.xs,
                lineHeight: 16,
              }}>{sample.caption}</Text>
              
              <View style={{
                flexDirection: 'row',
                marginTop: DS.spacing.xs,
                gap: DS.spacing.sm,
              }}>
                <Text style={{ fontSize: 10, color: DS.colors.textLight }}>
                  ❤️ {sample.engagement.likes.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 10, color: DS.colors.textLight }}>
                  💬 {sample.engagement.comments}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Message Creator */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          marginHorizontal: DS.spacing.md,
          marginBottom: DS.spacing.md,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: DS.colors.text,
            marginBottom: DS.spacing.sm,
          }}>Send Message</Text>

          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Ask a question or provide additional details..."
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
              marginBottom: DS.spacing.sm,
            }}
          />

          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sendingMessage}
            style={{
              backgroundColor: messageText.trim() ? DS.colors.primary : DS.colors.border,
              padding: DS.spacing.sm,
              borderRadius: DS.borderRadius.sm,
              alignItems: 'center',
            }}
          >
            {sendingMessage ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                Send Message
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      {application.status === 'pending' && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: DS.colors.backgroundWhite,
          borderTopWidth: 1,
          borderTopColor: DS.colors.border,
          padding: DS.spacing.md,
          flexDirection: 'row',
          gap: DS.spacing.sm,
        }}>
          <TouchableOpacity
            onPress={() => handleApplicationAction('reject')}
            style={{
              flex: 1,
              backgroundColor: '#FEE2E2',
              padding: DS.spacing.md,
              borderRadius: DS.borderRadius.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#DC2626', fontSize: 14, fontWeight: '600' }}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleApplicationAction('accept')}
            style={{
              flex: 1,
              backgroundColor: DS.colors.primary,
              padding: DS.spacing.md,
              borderRadius: DS.borderRadius.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>Accept Application</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}