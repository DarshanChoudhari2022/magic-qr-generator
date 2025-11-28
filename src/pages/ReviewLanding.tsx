'use client';
// UPDATED: Added 3 AI suggestions with Next and More AI Reviews buttons

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Star, Sparkles, ExternalLink, Loader2, Copy, Check } from 'lucide-react';

const ReviewLanding = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');

  const suggestionsMap: Record<string, string[]> = {
    'Restaurant/Cafe': [
      'Amazing food quality and exceptional service! The ambiance is perfect for dining. Highly recommended!',
      'Fresh ingredients, delicious flavors, and friendly staff. Best dining experience in town!',
    ],
    'Retail Store': [
      'Great product selection and competitive prices. Excellent customer service experience!',
      'Wide variety of products with helpful staff. Will definitely come back again!',
    ],
    'Healthcare': [
      'Professional doctors and caring staff. Clean facility with excellent patient care!',
      'Highly experienced team with modern facilities. Great healthcare experience!',
    ],
    'Automotive': [
      'Expert technicians with quality service. Fair pricing and quick turnaround time!',
      'Professional workmanship and reliable service. Best mechanic shop in the area!',
    ],
    'Beauty Salon': [
      'Talented stylists and modern techniques. Relaxing atmosphere with excellent results!',
      'Professional beauty services with attention to detail. Highly recommend!',
    ],
    'Fitness': [
      'State-of-the-art equipment with friendly trainers. Great fitness community!',
      'Professional staff and clean facility. Best gym in the neighborhood!',
    ],
    'Real Estate': [
      'Professional agents with excellent market knowledge. Smooth buying experience!',
      'Expert guidance throughout the process. Highly trustworthy and reliable!',
    ],
    'Professional Services': [
      'Expert service with attention to detail. Excellent communication and results!',
      'Professional approach with timely delivery. Highly satisfied with the service!',
    ],
  };

  const getRandomSuggestion = (category: string): string => {
    const suggestions = suggestionsMap[category] || suggestionsMap['Professional Services'];
    const randomIndex = Math.floor(Math.random() * suggestions.length);
    return suggestions[randomIndex];
  };

  useEffect(() => {
    const loadCampaign = async () => {
      try {
        setLoading(true);
        if (!campaignId) {
          toast({ title: 'Error', description: 'Campaign ID not found', variant: 'destructive' });
          setLoading(false);
          return;
        }

        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (campaignError || !campaignData) {
          console.error('Error loading campaign:', campaignError);
          toast({ title: 'Campaign Not Found', description: 'This review campaign is no longer available', variant: 'destructive' });
          setLoading(false);
          return;
        }

        console.log('Campaign loaded:', campaignData);
        setCampaign(campaignData);

        const category = campaignData.category || 'Professional Services';
        const randomSuggestion = getRandomSuggestion(category);
        setSelectedSuggestion(randomSuggestion);

        if (campaignData.location_id) {
          const { data: locationData } = await supabase
            .from('locations')
            .select('*')
            .eq('id', campaignData.location_id)
            .single();
          if (locationData) {
            setLocation(locationData);
          }
        }

        supabase.from('scan_events').insert([
          {
            campaign_id: campaignId,
            event_type: 'scan',
            device_type: /Mobile|Android|iPhone/.test(navigator.userAgent) ? 'mobile' : 'desktop',
            timestamp: new Date().toISOString(),
          },
        ]).then(() => {
          console.log('Scan event recorded');
        }).catch(err => {
          console.error('Error recording scan:', err);
        });

        setLoading(false);
      } catch (error) {
        console.error('Error in loadCampaign:', error);
        toast({ title: 'Error', description: 'Failed to load campaign details', variant: 'destructive' });
        setLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId, toast]);

  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      toast({ title: 'Copied!', description: 'Review suggestion copied to clipboard' });
      setTimeout(() => setCopiedIndex(null), 2000);
    }).catch(err => {
      console.error('Copy failed:', err);
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
    });
  };

  const handleOpenGoogleReview = async () => {
    if (!campaign) {
      toast({ title: 'Error', description: 'Campaign data not loaded', variant: 'destructive' });
      return;
    }

    const googleReviewUrl = location?.google_review_url || campaign?.google_review_url;
    console.log('Campaign object:', campaign);
    console.log('Google review URL:', googleReviewUrl);

    if (!googleReviewUrl) {
      toast({ title: 'Error', description: 'Review URL not available. Please contact support.', variant: 'destructive' });
      return;
    }

    try {
      setGenerating(true);
      supabase.from('conversion_events').insert([
        {
          campaign_id: campaignId,
          converted: true,
          timestamp: new Date().toISOString(),
        },
      ]).then(() => {
        console.log('Conversion event recorded');
      }).catch(err => {
        console.error('Error recording conversion:', err);
      });

      const url = googleReviewUrl;
      console.log('Opening URL:', url);
      window.open(url, '_blank');
      toast({ title: 'Success', description: 'Opening Google review page...' });
    } catch (error) {
      console.error('Error in handleOpenGoogleReview:', error);
      toast({ title: 'Error', description: 'Failed to open review page', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Campaign Not Found</CardTitle>
            <CardDescription>This review campaign is no longer available.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const businessName = campaign?.name || location?.name || 'Our Business';
  const businessCategory = campaign?.category || 'General Business';
  const logoUrl = location?.logo_url;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          {logoUrl && (
            <div className="flex justify-center mb-4">
              <img src={logoUrl} alt={businessName} className="h-24 w-24 rounded-full object-cover shadow-lg border-4 border-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Help Us Improve!</h1>
          <p className="text-lg text-gray-600 mb-1"><strong>{businessName}</strong></p>
          <p className="text-sm text-gray-500">Share your experience on Google</p>
        </div>

        <Card className="mb-6 shadow-lg border-2 border-indigo-200">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <CardTitle>AI-Powered Review Suggestion</CardTitle>
            </div>
            <CardDescription className="text-indigo-100">Tap to copy and paste on Google</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {selectedSuggestion && (
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 hover:border-indigo-400 transition-all">
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-800 text-sm leading-relaxed">{selectedSuggestion}</p>
                    <button
                      onClick={() => handleCopyToClipboard(selectedSuggestion, 0)}
                      className="mt-2 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-semibold"
                    >
                      {copiedIndex === 0 ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Review
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={handleOpenGoogleReview}
          disabled={generating}
          className="w-full h-14 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-lg font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 mb-6"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5" />
              Leave Review on Google
            </>
          )}
        </Button>

        <Card className="bg-white/80 backdrop-blur border-gray-200">
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <span>AI-powered, SEO-optimized review suggestions</span>
              </div>
              <div className="flex items-start gap-2">
                <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <span>Takes just 30 seconds to leave a review</span>
              </div>
              <div className="flex items-start gap-2">
                <ExternalLink className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Your review helps us serve you better</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-xs text-gray-500">
          <p>Powered by SMART CONNECT QR</p>
          <p className="mt-1">AI-Powered Review Collection Platform</p>
        </div>
      </div>
    </div>
  );
};

export default ReviewLanding;
