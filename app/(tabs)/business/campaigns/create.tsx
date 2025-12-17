import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { createCampaignPaymentIntent, getCampaignPaymentStatus } from '@/services/paymentService';
import { checkAccountStatus, getOnboardingLink } from '@/services/stripeService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStripe } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  Shield,
  Target,
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
  // Removed in CM-12: target_audience, content_type, posting_schedule, brand_guidelines
}

interface Deliverable {
  id: string;
  type: string;
  description: string;
  quantity: number;
}

// Removed CONTENT_TYPES in CM-12

const DELIVERABLE_TYPES = [
  'Instagram Post',
  'Instagram Story',
  'Instagram Reel',
  'TikTok Video',
  'YouTube Video',
  'Blog Article',
  'Troodie Review',
];

export default function CreateCampaign() {
  const router = useRouter();
  const params = useLocalSearchParams<{ stripeRefresh?: string; accountType?: string }>();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4; // Added payment step
  const [stripeAccountStatus, setStripeAccountStatus] = useState<{
    checking: boolean;
    hasAccount: boolean;
    onboardingCompleted: boolean;
    onboardingLink: string | null;
    accountId?: string;
  }>({
    checking: false, // Start as false, will be set to true when check starts
    hasAccount: false,
    onboardingCompleted: false,
    onboardingLink: null,
    accountId: undefined,
  });

  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    requirements: [],
    deliverables: [],
    // Removed in CM-12: target_audience, content_type, posting_schedule, brand_guidelines
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
    loadRestaurantData();
  }, [user?.id]);

  // Handle deep link redirect from Stripe onboarding
  useEffect(() => {
    console.log('[Create Campaign] Params changed:', { stripeRefresh: params.stripeRefresh, userId: user?.id });
    
    if (params.stripeRefresh === 'true' && user?.id) {
      console.log('[Create Campaign] ✅ Stripe onboarding redirect detected! Refreshing account status from Stripe API...');
      // Navigate to payment step immediately
      setCurrentStep(4);
      
      // Manually refresh account status from Stripe API (webhook might not have fired yet)
      const refreshFromStripe = async () => {
        try {
          // Ensure we have a valid session before calling
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !sessionData?.session) {
            console.error('[Create Campaign] No valid session:', sessionError);
            Alert.alert('Authentication Error', 'Please sign in again');
            return;
          }

          console.log('[Create Campaign] Calling stripe-refresh-account-status Edge Function...');
          const { data, error } = await supabase.functions.invoke('stripe-refresh-account-status', {
            body: {
              accountType: 'business',
            },
          });

          if (error || !data?.success) {
            console.error('[Create Campaign] ❌ Failed to refresh from Stripe:', error || data?.error);
            // Fall back to regular check
            setTimeout(() => {
              console.log('[Create Campaign] Falling back to regular checkStripeAccount...');
              checkStripeAccount();
            }, 1000);
            return;
          }

          console.log('[Create Campaign] ✅ Account status refreshed from Stripe:', data);
          
          // Update local state with refreshed status
          setStripeAccountStatus({
            checking: false,
            hasAccount: true,
            onboardingCompleted: data.onboardingCompleted || false,
            onboardingLink: null,
            accountId: undefined,
          });

          // If still not completed, get account ID and fetch onboarding link
          if (!data.onboardingCompleted) {
            console.log('[Create Campaign] Account not completed yet, fetching onboarding link...');
            // Get account ID from database first
            const accountResult = await checkAccountStatus(user.id, 'business');
            if (accountResult.success && accountResult.accountId) {
              const linkResult = await getOnboardingLink(
                accountResult.accountId,
                user.id,
                'business'
              );
              if (linkResult.success && linkResult.onboardingLink) {
                setStripeAccountStatus((prev) => ({
                  ...prev,
                  accountId: accountResult.accountId,
                  onboardingLink: linkResult.onboardingLink || null,
                }));
              }
            }
          } else {
            console.log('[Create Campaign] 🎉 Onboarding completed! UI should update now.');
          }
        } catch (refreshError) {
          console.error('[Create Campaign] ❌ Error refreshing from Stripe:', refreshError);
          // Fall back to regular check
          setTimeout(() => {
            console.log('[Create Campaign] Falling back to regular checkStripeAccount after error...');
            checkStripeAccount();
          }, 1000);
        }
      };

      // Small delay to ensure step 4 is set, then refresh
      setTimeout(() => {
        refreshFromStripe();
      }, 500);
    }
  }, [params.stripeRefresh, user?.id]);

  useEffect(() => {
    console.log('[Payment Step] useEffect triggered', { currentStep, userId: user?.id, checking: stripeAccountStatus.checking });
    if (currentStep === 4 && user?.id) {
      // Reset checking state when entering step 4 (safety measure for stuck state)
      if (stripeAccountStatus.checking) {
        console.log('[Payment Step] Resetting stuck checking state before new check');
        setStripeAccountStatus((prev) => ({ ...prev, checking: false }));
      }
      
      // Small delay to ensure state reset is applied
      const timer = setTimeout(() => {
        console.log('[Payment Step] Calling checkStripeAccount from useEffect');
        checkStripeAccount();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, user?.id]);

  const loadRestaurantData = async () => {
    setLoadingState('loading');
    setErrorMessage(null);

    try {
      if (!user?.id) {
        setLoadingState('error');
        setErrorMessage('Please sign in to create a campaign');
        return;
      }

      // Fetch business profile with restaurant
      const { data: profile, error: profileError } = await supabase
        .from('business_profiles')
        .select(`
          id,
          restaurant_id,
          verification_status,
          restaurants (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No rows returned - no business profile
          setLoadingState('no_profile');
          setErrorMessage('Please complete your business setup to create campaigns');
          return;
        }
        throw profileError;
      }

      if (!profile.restaurant_id || !profile.restaurants) {
        setLoadingState('no_restaurant');
        setErrorMessage('Please claim a restaurant before creating campaigns');
        return;
      }

      if (profile.verification_status !== 'verified') {
        setLoadingState('error');
        setErrorMessage('Your restaurant claim is pending verification');
        return;
      }

      // Successfully loaded
      setRestaurantData({
        id: profile.restaurants.id,
        name: profile.restaurants.name,
      });
      setLoadingState('loaded');
    } catch (error: any) {
      console.error('Failed to load restaurant data:', error);
      setLoadingState('error');
      setErrorMessage('Failed to load restaurant data. Please try again.');
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

  // Removed toggleContentType in CM-12 - content_type field removed

  const checkStripeAccount = async () => {
    console.log('[Payment Step] checkStripeAccount called', { userId: user?.id, currentChecking: stripeAccountStatus.checking });
    
    if (!user?.id) {
      console.log('[Payment Step] No user ID, aborting');
      setStripeAccountStatus((prev) => ({ ...prev, checking: false }));
      return;
    }

    // Prevent multiple simultaneous checks
    if (stripeAccountStatus.checking) {
      console.log('[Payment Step] Already checking, skipping duplicate call');
      return;
    }

    console.log('[Payment Step] Starting account status check...');
    setStripeAccountStatus((prev) => ({ ...prev, checking: true }));
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('[Payment Step] Timeout: Account check took too long, resetting state');
      setStripeAccountStatus((prev) => ({ ...prev, checking: false }));
    }, 10000); // 10 second timeout

    try {
      console.log('[Payment Step] Calling checkAccountStatus...');
      const result = await checkAccountStatus(user.id, 'business');
      console.log('[Payment Step] checkAccountStatus result:', { 
        success: result.success, 
        accountId: result.accountId, 
        onboardingCompleted: result.onboardingCompleted,
        error: result.error 
      });
      
      clearTimeout(timeoutId);
      
      const hasAccount = result.success && !!result.accountId;
      const onboardingCompleted = result.onboardingCompleted || false;
      
      console.log('[Payment Step] Setting account status:', { hasAccount, onboardingCompleted });
      setStripeAccountStatus({
        checking: false,
        hasAccount,
        onboardingCompleted,
        onboardingLink: null,
        accountId: result.accountId,
      });

      // If account exists but not completed, get onboarding link
      if (hasAccount && !onboardingCompleted && result.accountId) {
        console.log('[Payment Step] Account exists but not completed, fetching onboarding link...');
        try {
          const linkResult = await getOnboardingLink(result.accountId, user.id, 'business');
          console.log('[Payment Step] getOnboardingLink result:', { 
            success: linkResult.success, 
            hasLink: !!linkResult.onboardingLink,
            error: linkResult.error 
          });
          
          if (linkResult.success && linkResult.onboardingLink) {
            setStripeAccountStatus((prev) => ({
              ...prev,
              onboardingLink: linkResult.onboardingLink || null,
            }));
          }
        } catch (linkError) {
          console.error('[Payment Step] Error getting onboarding link:', linkError);
          // Don't fail the whole check if link fetch fails
        }
      }
      
      console.log('[Payment Step] Account check completed successfully');
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[Payment Step] Error checking Stripe account:', error);
      console.error('[Payment Step] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Always reset checking state on error
      setStripeAccountStatus((prev) => ({ 
        ...prev, 
        checking: false,
        hasAccount: false,
        onboardingCompleted: false,
      }));
      
      // Show user-friendly error
      Alert.alert(
        'Payment Account Check Failed',
        'Unable to verify payment account status. Please try again or connect your account manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleConnectStripe = async () => {
    if (!user?.id || !user?.email) {
      Alert.alert('Error', 'User information is missing');
      return;
    }

    setLoading(true);
    try {
      let link: string | null = stripeAccountStatus.onboardingLink;

      // If no link, need to create account via Edge Function
      if (!link) {
        // Call Edge Function to create Stripe account
        const { data, error } = await supabase.functions.invoke('stripe-create-account', {
          body: {
            userId: user.id,
            accountType: 'business',
            email: user.email,
          },
        });

        if (error || !data?.success) {
          Alert.alert('Error', data?.error || error?.message || 'Failed to create payment account');
          return;
        }

        link = data.onboardingLink;
      }

      if (link) {
        const canOpen = await Linking.canOpenURL(link);
        if (canOpen) {
          await Linking.openURL(link);
          // Note: User will return via redirect URL, we'll check status again
        } else {
          Alert.alert('Error', 'Cannot open Stripe link');
        }
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      Alert.alert('Error', 'Failed to connect payment account');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.title.trim() !== '' && formData.description.trim() !== '';
      case 2:
        return formData.budget !== '' && formData.deadline !== '';
      case 3:
        return formData.deliverables.length > 0; // CM-12: Requirements are optional
      case 4:
        return stripeAccountStatus.onboardingCompleted && !stripeAccountStatus.checking;
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
    console.log('[Campaign Submit] Starting campaign creation flow');
    
    // Validate before submission
    if (!restaurantData?.id) {
      console.error('[Campaign Submit] ❌ Restaurant data missing');
      Alert.alert('Error', 'Restaurant data is missing. Please refresh and try again.');
      return;
    }

    if (!validateStep(currentStep)) {
      console.error('[Campaign Submit] ❌ Validation failed for step:', currentStep);
      Alert.alert('Incomplete', 'Please fill in all required fields.');
      return;
    }

    // Additional validation for deadline
    if (!formData.deadline || formData.deadline.trim() === '') {
      console.error('[Campaign Submit] ❌ Deadline missing');
      Alert.alert('Missing Deadline', 'Please select a campaign deadline before creating the campaign.');
      setCurrentStep(2); // Navigate back to step 2 where deadline is set
      return;
    }

    // Validate payment account is ready
    if (!stripeAccountStatus.onboardingCompleted) {
      console.error('[Campaign Submit] ❌ Stripe account not completed');
      Alert.alert('Payment Account Required', 'Please complete your payment account setup before creating a campaign.');
      return;
    }

    setLoading(true);
    let campaignId: string | null = null;
    
    try {
      if (!user?.id || !restaurantData?.id) {
        throw new Error('Missing user or restaurant information');
      }

      // Convert budget to cents
      const budgetCents = Math.round(parseFloat(formData.budget) * 100);
      console.log('[Campaign Submit] Budget:', { dollars: formData.budget, cents: budgetCents });
      
      // Prepare deliverable_requirements as JSONB (CM-12: Simplified)
      // Expand deliverables based on quantity - each quantity becomes a separate deliverable
      const expandedDeliverables = formData.deliverables.flatMap((deliverable) => {
        // Create array of deliverables based on quantity
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
      
      // Re-index deliverables sequentially across all types
      const reindexedDeliverables = expandedDeliverables.map((deliverable, index) => ({
        ...deliverable,
        index: index + 1,
      }));
      
      const deliverableRequirements = {
        deliverables: reindexedDeliverables,
        // Removed in CM-12: target_audience, content_type, posting_schedule, brand_guidelines
      };

      console.log('[Campaign Submit] Creating campaign record...');
      
      // Parse and format end_date properly
      // formData.deadline is a date-only string (YYYY-MM-DD) from the date picker
      // Validation already checked deadline exists, but double-check here
      if (!formData.deadline || formData.deadline.trim() === '') {
        console.error('[Campaign Submit] ❌ Deadline is empty after validation!');
        Alert.alert('Error', 'Campaign deadline is required. Please go back and select a deadline.');
        setCurrentStep(2);
        return;
      }

      // Parse the date-only string and convert to ISO string
      // Since it's date-only, we'll set it to end of day UTC for consistency
      const [year, month, day] = formData.deadline.split('-').map(Number);
      const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      const endDateValue = endDate.toISOString();
      
      console.log('[Campaign Submit] End date:', {
        input: formData.deadline,
        parsed: endDateValue,
      });
      
      // Create campaign with 'pending' status - will be activated after payment via webhook
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          restaurant_id: restaurantData.id,
          owner_id: user.id,
          title: formData.title,
          description: formData.description,
          requirements: formData.requirements.length > 0 ? formData.requirements : null,
          budget_cents: budgetCents,
          end_date: endDateValue, // Fixed: was 'deadline', should be 'end_date'
          status: 'pending', // Campaign requires payment before activation (webhook will set to 'active')
          payment_status: 'pending',
          deliverable_requirements: deliverableRequirements,
        })
        .select('id')
        .single();

      if (campaignError || !campaignData) {
        console.error('[Campaign Submit] ❌ Campaign creation failed:', campaignError);
        throw campaignError || new Error('Failed to create campaign');
      }

      campaignId = campaignData.id;
      console.log('[Campaign Submit] ✅ Campaign created:', campaignId);

      // Ensure we have a valid session before calling Edge Function
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        console.error('[Campaign Submit] ❌ No valid session:', sessionError);
        
        // Rollback: Delete campaign if session is invalid
        await supabase.from('campaigns').delete().eq('id', campaignId);
        console.log('[Campaign Submit] Rolled back campaign creation due to session error');
        
        Alert.alert('Authentication Error', 'Please sign in again');
        return;
      }

      console.log('[Campaign Submit] ✅ Session validated');

      // Create payment intent for the campaign
      console.log('[Campaign Submit] Creating payment intent...', {
        campaignId,
        businessId: user.id,
        amountCents: budgetCents,
      });

      const paymentResult = await createCampaignPaymentIntent(
        campaignId,
        user.id!,
        budgetCents
      );

      if (!paymentResult.success || !paymentResult.paymentIntentId) {
        console.error('[Campaign Submit] ❌ Payment intent creation failed:', paymentResult.error);
        
        // Rollback: Delete campaign if payment intent creation fails
        await supabase.from('campaigns').delete().eq('id', campaignId);
        console.log('[Campaign Submit] Rolled back campaign creation due to payment failure');
        
        Alert.alert(
          'Payment Setup Failed',
          paymentResult.error || 'Failed to create payment intent. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('[Campaign Submit] ✅ Payment intent created:', {
        paymentIntentId: paymentResult.paymentIntentId,
        clientSecret: paymentResult.clientSecret ? 'present' : 'missing',
      });

      // Present Stripe Payment Sheet to collect payment
      if (paymentResult.clientSecret) {
        console.log('[Campaign Submit] Initializing Payment Sheet...');
        
        // Initialize Payment Sheet
        // Get proper returnURL for Stripe redirects - must match urlScheme in StripeProvider
        // Stripe requires a path component, so we use '/payment-return' or similar
        let returnURL: string;
        try {
          // Use the same method as StripeProvider in _layout.tsx
          // For Expo dev: Linking.createURL('/--/') returns exp://.../--/
          // For production: Linking.createURL('') returns troodie://
          // We need to add a path component for Stripe
          const baseURL = Linking.createURL('');
          if (baseURL && baseURL.includes('://')) {
            // If it already has a path, use it; otherwise add one
            if (baseURL.split('://')[1] && baseURL.split('://')[1].length > 0) {
              returnURL = baseURL;
            } else {
              // Add path component for Stripe redirect
              returnURL = `${baseURL}payment-return`;
            }
          } else {
            // Fallback: construct manually
            returnURL = 'troodie://payment-return';
          }
        } catch (error) {
          console.error('[Campaign Submit] Error creating returnURL:', error);
          // Fallback to app scheme with path
          returnURL = 'troodie://payment-return';
        }

        console.log('[Campaign Submit] Using returnURL:', returnURL);

        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'Troodie',
          paymentIntentClientSecret: paymentResult.clientSecret,
          returnURL,
        });

        if (initError) {
          console.error('[Campaign Submit] ❌ Payment Sheet initialization failed:', initError);
          Alert.alert(
            'Payment Setup Error',
            initError.message || 'Failed to initialize payment. Please try again.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Don't delete campaign - let them retry payment
                  router.replace('/business/campaigns');
                },
              },
            ]
          );
          return;
        }

        console.log('[Campaign Submit] ✅ Payment Sheet initialized, presenting...');

        // Present Payment Sheet
        const { error: paymentError } = await presentPaymentSheet();

        if (paymentError) {
          console.error('[Campaign Submit] ❌ Payment failed:', paymentError);
          
          // Handle user cancellation vs actual error
          if (paymentError.code === 'Canceled') {
            Alert.alert(
              'Payment Cancelled',
              'Your campaign has been created but payment was cancelled. You can complete payment later.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/business/campaigns'),
                },
              ]
            );
          } else {
            Alert.alert(
              'Payment Failed',
              paymentError.message || 'Payment could not be processed. Please try again.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/business/campaigns'),
                },
              ]
            );
          }
          // Campaign stays in 'pending' status - they can retry payment later
          return;
        }

        // Payment successful! Wait for webhook confirmation
        console.log('[Campaign Submit] ✅ Payment successful! Waiting for webhook confirmation...', {
          paymentIntentId: paymentResult.paymentIntentId,
          campaignId: campaignId,
        });
        
        // Poll for payment confirmation (webhook may take a moment)
        let attempts = 0;
        const maxAttempts = 20; // Increased to 20 seconds (webhooks can take 5-15 seconds)
        let paymentConfirmed = false;

        while (attempts < maxAttempts && !paymentConfirmed) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          attempts++;
          
          console.log(`[Campaign Submit] Polling attempt ${attempts}/${maxAttempts}...`);
          const updatedStatus = await getCampaignPaymentStatus(campaignId);
          
          console.log('[Campaign Submit] Payment status check:', {
            attempt: attempts,
            paymentIntentId: paymentResult.paymentIntentId,
            campaignId: campaignId,
            verificationStatus: updatedStatus.verificationStatus,
            isCharged: updatedStatus.isCharged,
            paymentStatus: updatedStatus.campaign?.payment_status,
            paymentRecordStatus: updatedStatus.payment?.status,
            paymentRecordIntentId: updatedStatus.payment?.stripe_payment_intent_id,
            campaignIntentId: updatedStatus.campaign?.payment_intent_id,
            hasPayment: !!updatedStatus.payment,
            hasCampaign: !!updatedStatus.campaign,
            error: updatedStatus.error,
          });
          
          if (updatedStatus.isCharged && updatedStatus.campaign?.payment_status === 'paid') {
            console.log('[Campaign Submit] ✅ Payment confirmed via webhook!');
            paymentConfirmed = true;
            break;
          }
          
          // Also check if payment record shows succeeded (webhook might have updated payment but not campaign yet)
          if (updatedStatus.payment?.status === 'succeeded' && updatedStatus.campaign?.payment_status !== 'paid') {
            console.log('[Campaign Submit] ⚠️ Payment record shows succeeded but campaign not updated yet. Webhook may still be processing...');
          }
        }

        if (paymentConfirmed) {
          // Campaign should already be active from webhook, but ensure it's set
          const { error: updateError } = await supabase
            .from('campaigns')
            .update({ status: 'active' })
            .eq('id', campaignId);

          if (updateError) {
            console.error('[Campaign Submit] ❌ Failed to activate campaign:', updateError);
            Alert.alert(
              'Payment Successful',
              'Payment was successful, but there was an error activating your campaign. Please refresh the page.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/business/campaigns'),
                },
              ]
            );
          } else {
            console.log('[Campaign Submit] ✅ Campaign activated successfully');
            Alert.alert(
              'Payment Successful',
              'Your campaign is now active! Creators can now apply.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/business/campaigns'),
                },
              ]
            );
          }
        } else {
          // Payment processed but webhook hasn't confirmed yet
          // Check one more time if payment record exists with succeeded status
          const finalCheck = await getCampaignPaymentStatus(campaignId);
          console.log('[Campaign Submit] Final status check after polling:', {
            paymentStatus: finalCheck.payment?.status,
            campaignPaymentStatus: finalCheck.campaign?.payment_status,
            isCharged: finalCheck.isCharged,
          });
          
          // If payment record shows succeeded but campaign isn't paid, manually update it
          if (finalCheck.payment?.status === 'succeeded' && finalCheck.campaign?.payment_status !== 'paid') {
            console.log('[Campaign Submit] ⚠️ Payment succeeded but campaign not updated. Manually updating...');
            const { error: manualUpdateError } = await supabase
              .from('campaigns')
              .update({
                payment_status: 'paid',
                paid_at: finalCheck.payment.paid_at || new Date().toISOString(),
                status: 'active',
              })
              .eq('id', campaignId);
            
            if (!manualUpdateError) {
              console.log('[Campaign Submit] ✅ Manually activated campaign after payment confirmation');
              Alert.alert(
                'Payment Successful',
                'Your campaign is now active! Creators can now apply.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/business/campaigns'),
                  },
                ]
              );
              return;
            }
          }
          
          Alert.alert(
            'Payment Processing',
            'Your payment is being processed. The campaign will be activated automatically once payment is confirmed. You can refresh the campaigns list in a moment.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/business/campaigns'),
              },
            ]
          );
        }
      } else {
        // Fallback if no clientSecret (shouldn't happen, but handle gracefully)
        console.warn('[Campaign Submit] ⚠️ No clientSecret returned');
        Alert.alert(
          'Campaign Created',
          'Your campaign has been created. Payment processing will begin shortly.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/business/campaigns'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('[Campaign Submit] ❌ Error in campaign creation flow:', error);
      
      // Cleanup: Delete campaign if it was created but payment failed
      if (campaignId) {
        console.log('[Campaign Submit] Cleaning up campaign:', campaignId);
        await supabase.from('campaigns').delete().eq('id', campaignId);
      }
      
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
          {step < 4 && (
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

      {/* Removed Brand Guidelines in CM-12 - now included in description placeholder */}
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

      {/* Removed Posting Schedule in CM-12 */}
    </View>
  );

  const renderStep3 = () => {
    const isAddButtonDisabled = !newDeliverable.type || !newDeliverable.description.trim();
    const isAddRequirementDisabled = !newRequirement.trim();
    
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
      </View>
    );
  };

  const renderStep4 = () => {
    if (stripeAccountStatus.checking) {
      return (
        <View style={{ alignItems: 'center', padding: DS.spacing.xl }}>
          <ActivityIndicator size="large" color={DS.colors.primary} />
          <Text style={{ marginTop: DS.spacing.md, color: DS.colors.text }}>
            Checking payment account...
          </Text>
          <TouchableOpacity
            onPress={() => {
              console.log('[Payment Step] Manual refresh triggered by user');
              setStripeAccountStatus((prev) => ({ ...prev, checking: false }));
              setTimeout(() => checkStripeAccount(), 100);
            }}
            style={{
              marginTop: DS.spacing.lg,
              padding: DS.spacing.sm,
            }}
          >
            <Text style={{ color: DS.colors.primaryOrange, fontSize: 14 }}>
              Taking too long? Tap to refresh
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (stripeAccountStatus.onboardingCompleted) {
      return (
        <View>
          <View
            style={{
              backgroundColor: '#F0FDF4',
              padding: DS.spacing.xl,
              borderRadius: DS.borderRadius.lg,
              alignItems: 'center',
              marginBottom: DS.spacing.lg,
            }}
          >
            <CheckCircle size={64} color={DS.colors.success} style={{ marginBottom: DS.spacing.md }} />
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: DS.colors.text,
                marginBottom: DS.spacing.sm,
                textAlign: 'center',
              }}
            >
              Payment Account Connected
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: DS.colors.text,
                textAlign: 'center',
                opacity: 0.8,
              }}
            >
              Your payment account is set up and ready. You can now create paid campaigns.
            </Text>
          </View>

          <View style={{
            backgroundColor: DS.colors.surface,
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.sm,
            borderWidth: 1,
            borderColor: DS.colors.border,
          }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: DS.colors.textDark,
              marginBottom: DS.spacing.sm,
            }}>Campaign Budget</Text>
            <Text style={{
              fontSize: 24,
              fontWeight: '700',
              color: DS.colors.text,
            }}>
              ${(parseFloat(formData.budget) || 0).toFixed(2)}
            </Text>
            <Text style={{
              fontSize: 12,
              color: DS.colors.text,
              marginTop: DS.spacing.xs,
              opacity: 0.7,
            }}>
              This amount will be charged when you publish the campaign.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: DS.colors.text,
          marginBottom: DS.spacing.md,
        }}>Payment Setup</Text>

        <View style={{ marginBottom: DS.spacing.lg }}>
          <CreditCard size={48} color={DS.colors.primary} style={{ marginBottom: DS.spacing.md }} />
          <Text
            style={{
              fontSize: 16,
              color: DS.colors.text,
              lineHeight: 24,
              marginBottom: DS.spacing.md,
            }}
          >
            To create paid campaigns, you need to connect a payment account. This allows you to pay creators for their work.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: '#F0F9FF',
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.md,
            marginBottom: DS.spacing.lg,
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}
        >
          <Shield size={20} color="#0284C7" style={{ marginRight: DS.spacing.sm, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#0284C7', fontWeight: '600', marginBottom: DS.spacing.xs }}>
              Secure & Fast
            </Text>
            <Text style={{ color: '#0284C7', fontSize: 12 }}>
              Stripe handles all payment processing securely. Your payment details are encrypted and never stored on our servers.
            </Text>
          </View>
        </View>

        <View style={{ marginBottom: DS.spacing.lg }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: DS.colors.text,
              marginBottom: DS.spacing.sm,
            }}
          >
            What you'll need:
          </Text>
          <View style={{ marginLeft: DS.spacing.sm }}>
            <Text style={{ color: DS.colors.text, marginBottom: DS.spacing.xs, fontSize: 14 }}>
              • Business bank account information
            </Text>
            <Text style={{ color: DS.colors.text, marginBottom: DS.spacing.xs, fontSize: 14 }}>
              • Business tax ID (EIN) or SSN
            </Text>
            <Text style={{ color: DS.colors.text, fontSize: 14 }}>
              • Business information for verification
            </Text>
          </View>
        </View>

        {/* Show checking state */}
        {stripeAccountStatus.checking && (
          <View style={{
            backgroundColor: DS.colors.surface,
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.md,
            alignItems: 'center',
            marginBottom: DS.spacing.md,
            flexDirection: 'row',
            justifyContent: 'center',
          }}>
            <ActivityIndicator color={DS.colors.primary} style={{ marginRight: DS.spacing.sm }} />
            <Text style={{ color: DS.colors.text, fontSize: 14 }}>
              Checking payment account status...
            </Text>
          </View>
        )}

        {/* Show success state */}
        {!stripeAccountStatus.checking && stripeAccountStatus.hasAccount && stripeAccountStatus.onboardingCompleted && (
          <View style={{
            backgroundColor: '#F0FDF4',
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.md,
            alignItems: 'center',
            marginBottom: DS.spacing.md,
            flexDirection: 'row',
            justifyContent: 'center',
          }}>
            <CheckCircle size={20} color="#22C55E" style={{ marginRight: DS.spacing.sm }} />
            <Text style={{ color: '#22C55E', fontWeight: '600', fontSize: 14 }}>
              Payment account connected successfully!
            </Text>
          </View>
        )}

        {/* Show connect button if not completed */}
        {!stripeAccountStatus.onboardingCompleted && (
          <TouchableOpacity
            onPress={handleConnectStripe}
            disabled={loading || stripeAccountStatus.checking}
            style={{
              backgroundColor: DS.colors.primaryOrange,
              padding: DS.spacing.md,
              borderRadius: DS.borderRadius.md,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              marginBottom: DS.spacing.md,
              opacity: (loading || stripeAccountStatus.checking) ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <CreditCard size={20} color="white" style={{ marginRight: DS.spacing.sm }} />
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                  Connect Payment Account
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Manual refresh button - always show for debugging */}
        <TouchableOpacity
          onPress={async () => {
            console.log('[Create Campaign] Manual refresh from Stripe API triggered');
            setStripeAccountStatus((prev) => ({ ...prev, checking: true }));
            try {
              // Ensure we have a valid session before calling
              const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
              if (sessionError || !sessionData?.session) {
                console.error('[Create Campaign] No valid session:', sessionError);
                Alert.alert('Authentication Error', 'Please sign in again');
                setStripeAccountStatus((prev) => ({ ...prev, checking: false }));
                return;
              }

              const { data, error } = await supabase.functions.invoke('stripe-refresh-account-status', {
                body: { accountType: 'business' },
              });
              if (error || !data?.success) {
                console.error('[Create Campaign] Refresh failed:', error || data?.error);
                Alert.alert('Refresh Failed', error?.message || data?.error || 'Could not refresh status');
                setStripeAccountStatus((prev) => ({ ...prev, checking: false }));
                return;
              }
              console.log('[Create Campaign] Refresh success:', data);
              setStripeAccountStatus({
                checking: false,
                hasAccount: true,
                onboardingCompleted: data.onboardingCompleted || false,
                onboardingLink: null,
              });
              if (data.onboardingCompleted) {
                Alert.alert('Success', 'Payment account is now connected!');
              } else {
                Alert.alert('Info', 'Onboarding still in progress. Please complete it on Stripe.');
              }
            } catch (err) {
              console.error('[Create Campaign] Refresh error:', err);
              Alert.alert('Error', 'Failed to refresh account status');
              setStripeAccountStatus((prev) => ({ ...prev, checking: false }));
            }
          }}
          style={{
            backgroundColor: DS.colors.surface,
            padding: DS.spacing.sm,
            borderRadius: DS.borderRadius.sm,
            alignItems: 'center',
            marginTop: DS.spacing.sm,
            borderWidth: 1,
            borderColor: DS.colors.border,
          }}
        >
          <Text style={{ color: DS.colors.text, fontSize: 12 }}>
            🔄 Refresh Status from Stripe API
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 12,
            color: DS.colors.text,
            textAlign: 'center',
            opacity: 0.7,
            marginTop: DS.spacing.md,
          }}
        >
          By connecting your account, you agree to Stripe's Terms of Service
        </Text>
      </View>
    );
  };

  // Render loading state
  if (loadingState === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={DS.colors.primary} />
        <Text style={{ marginTop: DS.spacing.md, color: DS.colors.text }}>Loading restaurant data...</Text>
      </SafeAreaView>
    );
  }

  // Render error states
  if (loadingState === 'no_profile') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background, justifyContent: 'center', alignItems: 'center', padding: DS.spacing.lg }}>
        <Target size={48} color={DS.colors.warning || '#F59E0B'} />
        <Text style={{ fontSize: 20, fontWeight: '600', color: DS.colors.text, marginTop: DS.spacing.md, marginBottom: DS.spacing.sm }}>Business Setup Required</Text>
        <Text style={{ fontSize: 14, color: DS.colors.textLight, textAlign: 'center', marginBottom: DS.spacing.lg }}>{errorMessage}</Text>
        <TouchableOpacity
          style={{ backgroundColor: DS.colors.primary, paddingHorizontal: DS.spacing.lg, paddingVertical: DS.spacing.sm, borderRadius: DS.borderRadius.md, marginBottom: DS.spacing.sm }}
          onPress={() => router.push('/business/setup')}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Complete Setup</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: DS.colors.textLight, marginTop: DS.spacing.sm }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loadingState === 'no_restaurant') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background, justifyContent: 'center', alignItems: 'center', padding: DS.spacing.lg }}>
        <Target size={48} color={DS.colors.warning || '#F59E0B'} />
        <Text style={{ fontSize: 20, fontWeight: '600', color: DS.colors.text, marginTop: DS.spacing.md, marginBottom: DS.spacing.sm }}>No Restaurant Linked</Text>
        <Text style={{ fontSize: 14, color: DS.colors.textLight, textAlign: 'center', marginBottom: DS.spacing.lg }}>{errorMessage}</Text>
        <TouchableOpacity
          style={{ backgroundColor: DS.colors.primary, paddingHorizontal: DS.spacing.lg, paddingVertical: DS.spacing.sm, borderRadius: DS.borderRadius.md, marginBottom: DS.spacing.sm }}
          onPress={() => router.push('/restaurant/claim')}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Claim Restaurant</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: DS.colors.textLight, marginTop: DS.spacing.sm }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loadingState === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background, justifyContent: 'center', alignItems: 'center', padding: DS.spacing.lg }}>
        <X size={48} color={DS.colors.error || '#EF4444'} />
        <Text style={{ fontSize: 20, fontWeight: '600', color: DS.colors.text, marginTop: DS.spacing.md, marginBottom: DS.spacing.sm }}>Something Went Wrong</Text>
        <Text style={{ fontSize: 14, color: DS.colors.textLight, textAlign: 'center', marginBottom: DS.spacing.lg }}>{errorMessage}</Text>
        <TouchableOpacity
          style={{ backgroundColor: DS.colors.primary, paddingHorizontal: DS.spacing.lg, paddingVertical: DS.spacing.sm, borderRadius: DS.borderRadius.md, marginBottom: DS.spacing.sm }}
          onPress={loadRestaurantData}
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
        }}>Create Campaign</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Restaurant Header */}
      {restaurantData && (
        <View style={{ backgroundColor: DS.colors.backgroundWhite, padding: DS.spacing.md, borderBottomWidth: 1, borderBottomColor: DS.colors.border }}>
          <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>Creating campaign for:</Text>
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
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                color: 'white', 
                fontWeight: '700' 
              }}>
                {currentStep === totalSteps ? 'Create Campaign' : 'Next'}
              </Text>
              {currentStep === totalSteps && !stripeAccountStatus.onboardingCompleted && (
                <Text style={{
                  fontSize: 11,
                  color: '#FFE5E5',
                  marginTop: 4,
                  textAlign: 'center',
                  fontWeight: '500',
                }}>
                  Payment account required
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}