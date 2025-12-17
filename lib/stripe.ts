import Stripe from 'stripe';
import config from './config';

// Initialize Stripe client
// Note: Stripe secret key should be stored server-side only
// For client-side operations, use Stripe.js or React Native Stripe SDK
// This file is for server-side operations (Edge Functions) ONLY
// DO NOT import this file in React Native client code

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

// Platform fee removed - creators receive full payment amount
// Keeping these functions for backward compatibility but they return 0 fee / full amount

// Calculate platform fee in cents (always 0)
export function calculatePlatformFee(amountCents: number): number {
  return 0;
}

// Calculate creator payout amount (full amount, no fee deduction)
export function calculateCreatorPayout(amountCents: number): number {
  return amountCents;
}

// Re-export types from stripeTypes.ts for backward compatibility
export type {
    PaymentIntentStatus, StripeAccountStatus, StripeAccountType, TransferStatus
} from './stripeTypes';

