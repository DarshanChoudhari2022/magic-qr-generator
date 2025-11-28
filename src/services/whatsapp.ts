import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppNotification {
  phoneNumber: string;
  message: string;
  businessName: string;
  reviewRating?: number;
  reviewText?: string;
}

export interface WhatsAppConfig {
  enabled: boolean;
  phoneNumber: string;
  notifyOnNewReview: boolean;
  notifyOnLowRating: boolean;
  lowRatingThreshold: number;
}

// Send WhatsApp notification via Supabase Edge Function
export async function sendWhatsAppNotification(
  notification: WhatsAppNotification
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'whatsapp-notification',
      {
        body: notification,
      }
    );

    if (error) {
      console.error('Error sending WhatsApp notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Notify on new review
export async function notifyNewReview(
  businessName: string,
  phoneNumber: string,
  rating: number,
  reviewText: string
): Promise<void> {
  const message = `🎉 New ${rating}-star review for ${businessName}!\n\n"${reviewText}"\n\nView and reply: [Dashboard Link]`;

  await sendWhatsAppNotification({
    phoneNumber,
    message,
    businessName,
    reviewRating: rating,
    reviewText,
  });
}

// Get WhatsApp config for user
export async function getWhatsAppConfig(
  userId: string
): Promise<WhatsAppConfig | null> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      enabled: data.enabled,
      phoneNumber: data.phone_number,
      notifyOnNewReview: data.notify_on_new_review,
      notifyOnLowRating: data.notify_on_low_rating,
      lowRatingThreshold: data.low_rating_threshold,
    };
  } catch (error) {
    console.error('Error fetching WhatsApp config:', error);
    return null;
  }
}

// Update WhatsApp config for user
export async function updateWhatsAppConfig(
  userId: string,
  config: Partial<WhatsAppConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('whatsapp_config')
      .upsert({
        user_id: userId,
        enabled: config.enabled,
        phone_number: config.phoneNumber,
        notify_on_new_review: config.notifyOnNewReview,
        notify_on_low_rating: config.notifyOnLowRating,
        low_rating_threshold: config.lowRatingThreshold,
      });

    if (error) {
      console.error('Error updating WhatsApp config:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating WhatsApp config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Format Indian phone number (e.g., +919876543210)
export function formatIndianPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If starts with 91, assume it has country code
  if (digits.startsWith('91') && digits.length === 12) {
    return `+${digits}`;
  }

  // If 10 digits, add +91
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return `+${digits}`;
}
