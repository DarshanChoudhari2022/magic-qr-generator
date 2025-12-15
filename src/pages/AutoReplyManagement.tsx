'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Zap, Check, Copy, Eye } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  auto_reply_enabled?: boolean;
  auto_reply_settings?: {
    tone?: string;
    maxLength?: number;
    includeBusinessName?: boolean;
  };
}

interface Review {
  id: string;
  customer_name: string;
  review_text: string;
  rating: number;
  auto_reply_text?: string;
  auto_reply_sent?: boolean;
  created_at: string;
}

const AutoReplyManagement = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('review_campaigns')
        .select('*')
        .limit(10);

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
          setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reviews',
        variant: 'destructive',
      });
    }
  };

  const toggleAutoReply = async (campaignId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('review_campaigns')
        .update({ auto_reply_enabled: enabled })
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(campaigns.map(c => 
        c.id === campaignId ? { ...c, auto_reply_enabled: enabled } : c
      ));

      toast({
        title: 'Success',
        description: `Auto-reply ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating auto-reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to update auto-reply setting',
        variant: 'destructive',
      });
    }
  };

  const handleSelectCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    loadReviews(campaign.id);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: 'Copied',
      description: 'Auto-reply copied to clipboard',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStarRating = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getSentimentColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating === 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Auto-Reply Management</h1>
          <p className="text-gray-600">Enable AI-powered automatic replies for your reviews</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaigns List */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Your Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {campaigns.length === 0 ? (
                  <p className="text-sm text-gray-500">No campaigns found</p>
                ) : (
                  campaigns.map(campaign => (
                    <button
                      key={campaign.id}
                      onClick={() => handleSelectCampaign(campaign)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedCampaign?.id === campaign.id
                          ? 'bg-indigo-100 border-2 border-indigo-600'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <p className="font-semibold text-sm">{campaign.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {campaign.auto_reply_enabled ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            ✓ Auto-reply ON
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                            Auto-reply OFF
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Campaign Details and Reviews */}
          <div className="lg:col-span-2 space-y-6">
            {selectedCampaign ? (
              <>
                {/* Auto-Reply Toggle */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        <div>
                          <CardTitle>Auto-Reply Settings</CardTitle>
                          <CardDescription>{selectedCampaign.name}</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={selectedCampaign.auto_reply_enabled || false}
                        onCheckedChange={(checked) =>
                          toggleAutoReply(selectedCampaign.id, checked)
                        }
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-700">
                        {selectedCampaign.auto_reply_enabled
                          ? '✓ AI will automatically generate personalized replies to every new review'
                          : 'Enable to start auto-replying to reviews with AI-generated responses'}
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                        <p className="font-semibold text-sm text-blue-900">Features:</p>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>✓ Personalized responses based on rating</li>
                          <li>✓ Sentiment-aware replies</li>
                          <li>✓ Professional and friendly tone</li>
                          <li>✓ Customer name included when available</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reviews List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Reviews</CardTitle>
                    <CardDescription>{reviews.length} reviews</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reviews.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4">No reviews yet</p>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {reviews.map(review => (
                          <div key={review.id} className="border-b pb-4 last:border-b-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-semibold text-sm">{review.customer_name || 'Anonymous'}</p>
                                <p className={`text-sm font-bold ${getSentimentColor(review.rating)}`}>
                                  {getStarRating(review.rating)}
                                </p>
                              </div>
                              {review.auto_reply_sent && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Replied
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mb-3">"{review.review_text || 'No written review'}'"</p>
                            {review.auto_reply_text && (
                              <div className="bg-indigo-50 border border-indigo-200 rounded p-3 space-y-2">
                                <p className="text-xs font-semibold text-indigo-900">AI Reply:</p>
                                <p className="text-sm text-indigo-800">{review.auto_reply_text}</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(review.auto_reply_text!, review.id)}
                                  className="w-full mt-2"
                                >
                                  {copiedId === review.id ? (
                                    <>  <Check className="h-3 w-3 mr-1" /> Copied</>
                                  ) : (
                                    <>  <Copy className="h-3 w-3 mr-1" /> Copy Reply</>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="col-span-2">
                <CardContent className="pt-8 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a campaign to manage auto-replies</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoReplyManagement;
