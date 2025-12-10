import Stripe from 'stripe';
import config from './config';

// Initialize Stripe client
// Note: Stripe secret key should be stored server-side only
// For client-side operations, use Stripe.js or React Native Stripe SDK
// This file is for server-side operations (Edge Functions)

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY || config.stripeSecretKey;
    
    if (!secretKey) {
      throw new Error('Stripe secret key is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  return stripeInstance;
}

// Platform fee percentage (10%)
export const PLATFORM_FEE_PERCENT = 10;

// Calculate platform fee in cents
export function calculatePlatformFee(amountCents: number): number {
  return Math.round(amountCents * PLATFORM_FEE_PERCENT / 100);
}

// Calculate creator payout amount (after platform fee)
export function calculateCreatorPayout(amountCents: number): number {
  return amountCents - calculatePlatformFee(amountCents);
}

// Stripe Connect account types
export type StripeAccountType = 'business' | 'creator';

// Stripe account status
export type StripeAccountStatus = 
  | 'pending'
  | 'restricted'
  | 'enabled'
  | 'disabled';

// Payment intent status
export type PaymentIntentStatus = 
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded';

// Transfer status
export type TransferStatus = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'canceled';
