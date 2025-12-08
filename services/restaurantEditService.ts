/**
 * Restaurant Edit Service
 *
 * Handles editing restaurant details for claimed restaurants including:
 * - Description and About Us
 * - Parking information
 * - Special deals
 * - Hours of operation
 * - Cover photo and menu images
 */

import { supabase } from '@/lib/supabase';

export interface RestaurantEditableFields {
  description?: string;
  aboutUs?: string;
  parkingType?: 'free_lot' | 'paid_lot' | 'valet' | 'street' | 'validation' | 'none';
  parkingNotes?: string;
  specialDeals?: SpecialDeal[];
  customHours?: WeeklyHours;
  coverPhotoUrl?: string;
}

export interface SpecialDeal {
  id: string;
  title: string;
  description: string;
  validDays?: string[]; // ['monday', 'tuesday', etc.]
  isTroodieDeal?: boolean;
  expiresAt?: string;
}

export interface WeeklyHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open: string; // "09:00"
  close: string; // "22:00"
  closed?: boolean;
}

const VALIDATION_RULES = {
  description: { maxLength: 500 },
  aboutUs: { maxLength: 1000 },
  parkingNotes: { maxLength: 200 },
  dealTitle: { maxLength: 100 },
  dealDescription: { maxLength: 300 },
};

/**
 * Validate restaurant fields
 */
export function validateRestaurantFields(
  fields: RestaurantEditableFields
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (fields.description && fields.description.length > VALIDATION_RULES.description.maxLength) {
    errors.description = `Description must be under ${VALIDATION_RULES.description.maxLength} characters`;
  }

  if (fields.aboutUs && fields.aboutUs.length > VALIDATION_RULES.aboutUs.maxLength) {
    errors.aboutUs = `About Us must be under ${VALIDATION_RULES.aboutUs.maxLength} characters`;
  }

  if (fields.parkingNotes && fields.parkingNotes.length > VALIDATION_RULES.parkingNotes.maxLength) {
    errors.parkingNotes = `Parking notes must be under ${VALIDATION_RULES.parkingNotes.maxLength} characters`;
  }

  if (fields.specialDeals) {
    fields.specialDeals.forEach((deal, index) => {
      if (deal.title && deal.title.length > VALIDATION_RULES.dealTitle.maxLength) {
        errors[`deal_${index}_title`] = 'Deal title too long';
      }
      if (deal.description && deal.description.length > VALIDATION_RULES.dealDescription.maxLength) {
        errors[`deal_${index}_description`] = 'Deal description too long';
      }
    });
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Update restaurant details
 */
export async function updateRestaurantDetails(
  restaurantId: string,
  updates: RestaurantEditableFields
): Promise<{ success: boolean; data?: any; error?: string }> {
  // Validate
  const validation = validateRestaurantFields(updates);
  if (!validation.valid) {
    return {
      success: false,
      error: Object.values(validation.errors)[0],
    };
  }

  try {
    // Transform to snake_case for database
    const dbUpdates: any = {};
    
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.aboutUs !== undefined) dbUpdates.about_us = updates.aboutUs;
    if (updates.parkingType !== undefined) dbUpdates.parking_type = updates.parkingType;
    if (updates.parkingNotes !== undefined) dbUpdates.parking_notes = updates.parkingNotes;
    if (updates.specialDeals !== undefined) dbUpdates.special_deals = updates.specialDeals;
    if (updates.customHours !== undefined) dbUpdates.custom_hours = updates.customHours;
    if (updates.coverPhotoUrl !== undefined) dbUpdates.cover_photo_url = updates.coverPhotoUrl;

    const { data, error } = await supabase.rpc('update_restaurant_details', {
      p_restaurant_id: restaurantId,
      p_updates: dbUpdates,
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Update restaurant error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update restaurant',
    };
  }
}

/**
 * Get restaurant editable fields
 */
export async function getRestaurantEditableFields(
  restaurantId: string
): Promise<{ data: RestaurantEditableFields | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        custom_description,
        about_us,
        parking_type,
        parking_notes,
        special_deals,
        custom_hours,
        cover_photo_url,
        menu_images
      `)
      .eq('id', restaurantId)
      .single();

    if (error) throw error;

    return {
      data: {
        description: data.custom_description || undefined,
        aboutUs: data.about_us || undefined,
        parkingType: data.parking_type as any,
        parkingNotes: data.parking_notes || undefined,
        specialDeals: (data.special_deals as SpecialDeal[]) || undefined,
        customHours: data.custom_hours as WeeklyHours | undefined,
        coverPhotoUrl: data.cover_photo_url || undefined,
      },
    };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

