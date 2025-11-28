import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, eventType, metadata } = await req.json();
    console.log('Tracking analytics:', { campaignId, eventType });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract client info from request
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const referrer = req.headers.get('referer') || null;

    // Insert analytics event
    const { error } = await supabase
      .from('campaign_analytics')
      .insert({
        campaign_id: campaignId,
        event_type: eventType,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: referrer,
      });

    if (error) {
      console.error('Error inserting analytics:', error);
      throw error;
    }

    console.log('Analytics tracked successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in track-analytics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to track analytics' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
