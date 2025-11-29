'use client';
// UPDATED: Added 3 AI suggestions with Next and More AI Reviews buttons

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Star, Sparkles, ExternalLink, Loader2, Copy, Check } from 'lucide-react';
import { generateAIReviews } from '@/services/aiReviewService';

const ReviewLanding = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false); // for opening Google review
  const [generatingReviews, setGeneratingReviews] = useState(false); // for AI review generation

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [allSuggestions, setAllSuggestions] = useState<string[]>([]);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');

  useEffect(() => {
    const loadCampaign = async () => {
      try {
        setLoading(true);

        if (!campaignId) {
          toast({
            title: 'Error',
            description: 'Campaign ID not found',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

const { data: campaignData, error: campaignError } = await supabase
    .from('campaigns')
    .select(`
      *,
      profiles:business_id(business_description)
    `)
    .eq('id', campaignId)
    .single();

        if (campaignError || !campaignData) {
          console.error('Error loading campaign:', campaignError);
          toast({
            title: 'Campaign Not Found',
            description: 'This review campaign is no longer available',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        console.log('Campaign loaded:', campaignData);
        setCampaign(campaignData);

        // 🔹 NEW: Generate AI reviews based on business_description & category
if (campaignData.profiles?.[0]?.business_description) {          const category = campaignData.category || 'Professional Services';
          try {
const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
        const reviews = await generateAIReviews({
campaignData: campaignData.profiles?.[0]?.business_description,          category,
          numberOfReviews: 3,
          excludeReviews: [],
          signal: controller.signal
        });
        clearTimeout(timeoutId);
const suggestionsToSet = reviews && reviews.length > 0 ? reviews : ['Professional service and genuine care for my vehicle. Highly satisfied!', 'Excellent work on my car maintenance. Pricing was fair and fair. Would recommend.', 'Outstanding service! Fixed it right the first time.'];
            setAllSuggestions(suggestionsToSet);
            setSelectedSuggestion(suggestionsToSet[0]);
            setCurrentSuggestionIndex(0);
          } catch (error) {
            console.error('Failed to generate reviews:', error);
            toast({
              title: 'Error',
              description: 'Failed to generate AI reviews. Please try again.',
              variant: 'destructive',
            });
          }
        }

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

        supabase
          .from('scan_events')
          .insert([
            {
              campaign_id: campaignId,
              event_type: 'scan',
              device_type: /Mobile|Android|iPhone/.test(navigator.userAgent)
                ? 'mobile'
                : 'desktop',
              timestamp: new Date().toISOString(),
            },
          ])
          .then(() => {
            console.log('Scan event recorded');
          })
          .catch((err) => {
            console.error('Error recording scan:', err);
          });

        setLoading(false);
      } catch (error) {
        console.error('Error in loadCampaign:', error);
        toast({
          title: 'Error',
          description: 'Failed to load campaign details',
          variant: 'destructive',
        });
        setLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId, toast]);

  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedIndex(index);
        toast({
          title: 'Copied!',
          description: 'Review suggestion copied to clipboard',
        });
        setTimeout(() => setCopiedIndex(null), 2000);
      })
      .catch((err) => {
        console.error('Copy failed:', err);
        toast({
          title: 'Error',
          description: 'Failed to copy',
          variant: 'destructive',
        });
      });
  };

  const handleOpenGoogleReview = async () => {
    if (!campaign) {
      toast({
        title: 'Error',
        description: 'Campaign data not loaded',
        variant: 'destructive',
      });
      return;
    }

    const googleReviewUrl = location?.google_review_url || campaign?.google_review_url;
    console.log('Campaign object:', campaign);
    console.log('Google review URL:', googleReviewUrl);

    if (!googleReviewUrl) {
      toast({
        title: 'Error',
        description: 'Review URL not available. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      supabase
        .from('conversion_events')
        .insert([
          {
            campaign_id: campaignId,
            converted: true,
            timestamp: new Date().toISOString(),
          },
        ])
        .then(() => {
          console.log('Conversion event recorded');
        })
        .catch((err) => {
          console.error('Error recording conversion:', err);
        });

      const url = googleReviewUrl;
      console.log('Opening URL:', url);
      window.open(url, '_blank');
      toast({
        title: 'Success',
        description: 'Opening Google review page...',
      });
    } catch (error) {
      console.error('Error in handleOpenGoogleReview:', error);
      toast({
        title: 'Error',
        description: 'Failed to open review page',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  // 🔹 NEW: Cycle through the 3 AI suggestions
  const handleNextSuggestion = () => {
    if (!allSuggestions.length) return;
    const nextIndex = (currentSuggestionIndex + 1) % allSuggestions.length;
    setCurrentSuggestionIndex(nextIndex);
    setSelectedSuggestion(allSuggestions[nextIndex]);
  };

  // 🔹 NEW: Fetch 3 fresh AI suggestions
  const handleMoreAIReviews = async () => {
    if (!campaign?.business_description) return;

    try {
      setGeneratingReviews(true);
      const newReviews = await generateAIReviews(
        campaign.business_description,
        campaign.category || 'Professional Services',
      {
        numberOfReviews: 3,
        excludeReviews: []
      }      );
      setAllSuggestions(newReviews);
      setCurrentSuggestionIndex(0);
      setSelectedSuggestion(newReviews[0] || '');
      toast({
        title: 'Success!',
        description: 'Generated 3 new AI reviews',
      });
    } catch (error) {
      console.error('Failed to generate reviews:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate reviews',
        variant: 'destructive',
      });
    } finally {
      setGeneratingReviews(false);
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
            <Button onClick={() => navigate('/')} className="w-full">
              Return Home
            </Button>
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
              <img
                src={logoUrl}
                alt={businessName}
                className="h-24 w-24 rounded-full object-cover shadow-lg border-4 border-white"
              />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Help Us Improve!</h1>
          <p className="text-lg text-gray-600 mb-1">
            <strong>{businessName}</strong>
          </p>
          <p className="text-sm text-gray-500">Share your experience on Google</p>
        </div>

        <Card className="mb-6 shadow-lg border-2 border-indigo-200">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <CardTitle>AI-Powered Review Suggestion</CardTitle>
            </div>
            <CardDescription className="text-indigo-100">
              Tap to copy and paste on Google
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {selectedSuggestion && (
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 hover:border-indigo-400 transition-all">
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-800 text-sm leading-relaxed">
                      {selectedSuggestion}
                    </p>
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

                    {/* Controls for cycling & regenerating AI reviews */}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleNextSuggestion}
                        disabled={!allSuggestions.length}
                      >
                        Next Suggestion
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleMoreAIReviews}
                        disabled={generatingReviews || !campaign?.business_description}
                      >
                        {generatingReviews ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            More AI Reviews
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
            : (
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-center">
                  <p className="text-gray-600 text-sm">Generating AI suggestions...</p>
                </div>
              </div>
            )
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
