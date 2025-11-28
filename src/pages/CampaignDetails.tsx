import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, QrCode, TrendingUp, Eye, MousePointerClick, Sparkles, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { BrandedQRCard } from '@/components/BrandedQRCard';

const CampaignDetails = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>({
    scans: 0,
    views: 0,
    ai_suggestions: 0,
    click_review: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaignData();
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      // Load campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Load location
      if (campaignData?.location_id) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('*')
          .eq('id', campaignData.location_id)
          .single();
        if (locationData) {
          setLocation(locationData);
        }
      }

      // Load analytics
      const { data: scanEventsData } = await supabase
        .from('scan_events')
        .select('id')
        .eq('campaign_id', campaignId);
      
      const { data: conversionEventsData } = await supabase
        .from('conversion_events')
        .select('id')
        .eq('campaign_id', campaignId);
      
      setAnalytics({
        scans: scanEventsData?.length || 0,
        views: scanEventsData?.length || 0,
        ai_suggestions: 0,
        click_review: conversionEventsData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('campaign-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${campaign.name}-qr-code.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const reviewUrl = `${window.location.origin}/review/${campaignId}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Campaign Not Found</h1>
          <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const businessName = campaign?.name || location?.name || 'Business';
  const googleReviewUrl = location?.google_review_url || campaign?.google_review_url;
  const logoUrl = location?.logo_url;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{campaign?.name}</h1>
            <p className="text-muted-foreground">
              Status: <span className="capitalize font-medium">{campaign?.status}</span>
            </p>
          </div>

          {/* Analytics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">QR Scans</CardTitle>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.scans}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.views}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Suggestions</CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.ai_suggestions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Review Clicks</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.click_review}</div>
              </CardContent>
            </Card>
          </div>

          {/* QR Code Card */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
                <CardDescription>
                  Customers scan this to leave reviews
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <BrandedQRCard
                  value={reviewUrl}
                  businessName={businessName}
                  logoUrl1={logoUrl}
                  theme="lightBlue"
                  size={250}
                />
                <Button onClick={() => window.open(reviewUrl, '_blank')} variant="outline"
                  className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview Landing Page
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
                <CardDescription>
                  Configuration and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {googleReviewUrl && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Google Review URL</h4>
                    <a
                      href={googleReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {googleReviewUrl}
                    </a>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Review Landing URL</h4>
                  <p className="text-sm break-all">{reviewUrl}</p>
                </div>
                {location && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Location</h4>
                    <p className="text-sm">{location.name}</p>
                    {location.address && <p className="text-xs text-gray-500">{location.address}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Stats</CardTitle>
              <CardDescription>
                Overview of campaign performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Scans</span>
                  <span className="text-lg font-bold">{analytics.scans}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Review Clicks</span>
                  <span className="text-lg font-bold">{analytics.click_review}</span>
                </div>
                {analytics.scans > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Conversion Rate</span>
                    <span className="text-lg font-bold">
                      {((analytics.click_review / analytics.scans) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CampaignDetails;
