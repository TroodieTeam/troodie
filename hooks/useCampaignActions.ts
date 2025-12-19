import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { withdrawInvitation } from '@/services/campaignInvitationService';
import { approveDeliverable, rejectDeliverable, requestChanges } from '@/services/deliverableReviewService';
import { createCampaignPaymentIntent, getCampaignPaymentStatus } from '@/services/paymentService';
import { canRateApplication, rateCreator } from '@/services/ratingService';
import { CampaignApplication, CampaignDeliverable, CampaignDetail } from '@/types/campaign';
import { useStripe } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Alert } from 'react-native';

export function useCampaignActions(
  campaign: CampaignDetail | null,
  reloadData: () => Promise<void>,
  setDeliverables: React.Dispatch<React.SetStateAction<CampaignDeliverable[]>>,
  setApplications: React.Dispatch<React.SetStateAction<CampaignApplication[]>>
) {
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Rating modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const handleDeliverableStatusChange = async (deliverableId: string, status: string, feedback?: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      if (status === 'approved') {
        const result = await approveDeliverable({
          deliverable_id: deliverableId,
          reviewer_id: user.id,
          feedback: feedback,
        });

        if (result.error) throw result.error;

        setDeliverables(prev => prev.map(d => 
          d.id === deliverableId 
            ? { ...d, status: 'approved' as any, reviewed_at: new Date().toISOString(), reviewer_id: user.id, restaurant_feedback: feedback }
            : d
        ));

        Alert.alert('Success', 'Deliverable approved! Payment will be processed.');
      } else if (status === 'rejected') {
        const result = await rejectDeliverable({
          deliverable_id: deliverableId,
          reviewer_id: user.id,
          feedback: feedback || 'Deliverable rejected',
        });

        if (result.error) throw result.error;

        setDeliverables(prev => prev.map(d => 
          d.id === deliverableId 
            ? { ...d, status: 'rejected' as any, reviewed_at: new Date().toISOString(), reviewer_id: user.id, restaurant_feedback: feedback }
            : d
        ));

        Alert.alert('Success', 'Deliverable rejected');
      } else if (status === 'revision_requested' || status === 'needs_revision') {
        const result = await requestChanges({
          deliverable_id: deliverableId,
          reviewer_id: user.id,
          feedback: feedback || 'Please revise this deliverable',
          changes_required: [],
        });

        if (result.error) throw result.error;

        setDeliverables(prev => prev.map(d => 
          d.id === deliverableId 
            ? { ...d, status: 'revision_requested' as any, reviewed_at: new Date().toISOString(), reviewer_id: user.id, restaurant_feedback: feedback }
            : d
        ));

        Alert.alert('Success', 'Revision requested');
      } else {
        const { error } = await supabase
          .from('campaign_deliverables')
          .update({
            status,
            reviewed_at: new Date().toISOString(),
            reviewer_id: user.id,
            restaurant_feedback: feedback,
          })
          .eq('id', deliverableId);

        if (error) throw error;

        setDeliverables(prev => prev.map(d => 
          d.id === deliverableId 
            ? { ...d, status: status as any, reviewed_at: new Date().toISOString(), reviewer_id: user.id, restaurant_feedback: feedback }
            : d
        ));

        Alert.alert('Success', `Deliverable status updated to ${status}`);
      }
    } catch (error) {
      console.error('Failed to update deliverable status:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update deliverable status');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'active' && campaign?.status === 'pending') {
      await handleResumeCampaign();
      return;
    }

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaign?.id);

      if (error) throw error;
      
      Alert.alert('Success', `Campaign ${newStatus}`);
      reloadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update campaign status');
    }
  };

  const handleResumeCampaign = async () => {
    if (!campaign || !user?.id || processingPayment) {
      return;
    }

    try {
      setProcessingPayment(true);
      if (!initPaymentSheet || !presentPaymentSheet) {
        Alert.alert('Error', 'Payment not available');
        return;
      }

      const paymentStatus = await getCampaignPaymentStatus(campaign.id);
      
      if (paymentStatus.isCharged && paymentStatus.campaign?.payment_status === 'paid') {
        const { error } = await supabase
          .from('campaigns')
          .update({ status: 'active' })
          .eq('id', campaign.id);

        if (error) throw error;
        Alert.alert('Campaign Activated', 'Your campaign is now active!');
        reloadData();
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        Alert.alert('Error', 'Please sign in again.');
        return;
      }

      const paymentResult = await createCampaignPaymentIntent(
        campaign.id,
        user.id,
        campaign.budget_cents
      );

      if (!paymentResult.success || !paymentResult.paymentIntentId) {
        Alert.alert('Error', paymentResult.error || 'Failed to create payment intent');
        return;
      }

      if (paymentResult.clientSecret) {
        let returnURL: string;
        try {
          const baseURL = Linking.createURL('');
          returnURL = (baseURL && baseURL.includes('://')) 
            ? (baseURL.split('://')[1]?.length > 0 ? baseURL : `${baseURL}payment-return`)
            : 'troodie://payment-return';
        } catch (error) {
          returnURL = 'troodie://payment-return';
        }

        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'Troodie',
          paymentIntentClientSecret: paymentResult.clientSecret,
          returnURL,
        });

        if (initError) {
          Alert.alert('Error', initError.message);
          return;
        }

        const { error: paymentError } = await presentPaymentSheet();

        if (paymentError) {
          if (paymentError.code !== 'Canceled') {
            Alert.alert('Payment Failed', paymentError.message);
          }
          return;
        }

        let attempts = 0;
        const maxAttempts = 20;
        let paymentConfirmed = false;

        while (attempts < maxAttempts && !paymentConfirmed) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
          const updatedStatus = await getCampaignPaymentStatus(campaign.id);
          
          if (updatedStatus.isCharged && updatedStatus.campaign?.payment_status === 'paid') {
            paymentConfirmed = true;
            break;
          }
        }

        if (paymentConfirmed) {
          const { error: updateError } = await supabase
            .from('campaigns')
            .update({ status: 'active' })
            .eq('id', campaign.id);

          if (updateError) {
            Alert.alert('Error', 'Payment successful but failed to activate campaign');
          } else {
            Alert.alert('Success', 'Campaign activated!');
            reloadData();
          }
        } else {
          const finalCheck = await getCampaignPaymentStatus(campaign.id);
          if (finalCheck.payment?.status === 'succeeded' && finalCheck.campaign?.payment_status !== 'paid') {
            await supabase.from('campaigns').update({
              payment_status: 'paid',
              paid_at: finalCheck.payment.paid_at || new Date().toISOString(),
              status: 'active',
            }).eq('id', campaign.id);
            Alert.alert('Success', 'Campaign activated!');
            reloadData();
            return;
          }
          Alert.alert('Processing', 'Payment processing. Refresh shortly.');
        }
      } else {
        Alert.alert('Processing', 'Payment initiated.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleApplicationAction = async (applicationId: string, action: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('campaign_applications')
        .update({ 
          status: action,
          reviewed_at: new Date().toISOString(),
          reviewer_id: user?.id
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      setApplications(prev => prev.map(app => 
        app.id === applicationId 
          ? { ...app, status: action, reviewed_at: new Date().toISOString(), reviewer_id: user?.id }
          : app
      ));
      
      Alert.alert('Success', `Application ${action}`);
      reloadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update application');
    }
  };

  const handleOpenRatingModal = async (applicationId: string) => {
    const { canRate, alreadyRated, error } = await canRateApplication(applicationId);
    if (!canRate) {
      Alert.alert(
        alreadyRated ? 'Already Rated' : 'Cannot Rate',
        alreadyRated ? 'You have already rated this creator.' : (error || 'Cannot rate yet.')
      );
      return;
    }
    setSelectedApplicationId(applicationId);
    setRating(5);
    setRatingComment('');
    setRatingModalVisible(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedApplicationId) return;
    
    setSubmittingRating(true);
    try {
      const result = await rateCreator({
        applicationId: selectedApplicationId,
        rating,
        comment: ratingComment || undefined,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to submit rating');
        return;
      }

      Alert.alert('Success', 'Rating submitted successfully');
      setRatingModalVisible(false);
      setSelectedApplicationId(null);
      setRating(5);
      setRatingComment('');
      reloadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleWithdrawInvitation = async (invitationId: string) => {
    Alert.alert(
      'Withdraw Invitation',
      'Are you sure you want to withdraw this invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await withdrawInvitation(invitationId);
              if (error) {
                Alert.alert('Error', error.message);
                return;
              }
              Alert.alert('Success', 'Invitation withdrawn');
              reloadData();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  return {
    processingPayment,
    ratingModalVisible,
    rating,
    setRating,
    ratingComment,
    setRatingComment,
    submittingRating,
    setRatingModalVisible,
    handleDeliverableStatusChange,
    handleStatusChange,
    handleApplicationAction,
    handleOpenRatingModal,
    handleSubmitRating,
    handleWithdrawInvitation,
    handleResumeCampaign
  };
}
