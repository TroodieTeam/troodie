// Stripe types - client-safe, no Stripe SDK import

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
