import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sparkles, QrCode } from "lucide-react";
import { z } from "zod";
import type { User } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const CATEGORIES = [
  'Restaurant/Cafe',
  'Retail Store',
  'Healthcare',
  'Automotive',
  'Real Estate',
  'Professional Services',
  'Fitness',
  'Beauty Salon',
  'General Business',
];

const campaignSchema = z.object({
  campaignName: z.string().min(3, "Campaign name must be at least 3 characters"),
  googleReviewUrl: z.string().url("Please enter a valid Google review URL"),
  customMessage: z.string().max(500, "Message must be less than 500 characters").optional(),
  businessCategory: z.string().min(1, "Please select a business category"),
  theme: z.enum(['lightBlue', 'darkNavy', 'blackGold', 'whiteBlue']).default('lightBlue'),
  logoUrl: z.string().optional(),
});

const CreateCampaign = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [theme, setTheme] = useState("lightBlue");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          navigate("/auth");
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError('Authentication failed');
      }
    };
    checkAuth();
  }, [navigate]);

  const uploadLogoToStorage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('qr-logos')
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('qr-logos')
        .getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        title: "Error",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validated = campaignSchema.parse({
        campaignName,
        googleReviewUrl,
        customMessage: customMessage || undefined,
        businessCategory,
        theme,
      });

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Upload logo if provided
      let logoUrl: string | null = null;
      if (logoFile) {
        logoUrl = await uploadLogoToStorage(logoFile);
      }

      // Generate location ID client-side to avoid schema cache issues
      const locationId = uuidv4();
      const shortCode = uuidv4().substring(0, 8).toUpperCase();

      // Create location first without trying to get the response
      const { error: locationError } = await supabase
        .from('locations')
        .insert([{
          id: locationId,
          owner_id: user.id,
          name: validated.campaignName,
          category: validated.businessCategory,
          google_review_url: validated.googleReviewUrl,
          logo_url: logoUrl,
        }]);

      if (locationError) {
        console.error('Location creation error:', locationError);
        throw locationError;
      }

      // Create campaign with the location ID
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .insert([{
          location_id: locationId,
          owner_id: user.id,
          name: validated.campaignName,
          short_code: shortCode,
          status: 'active',
          category: validated.businessCategory,
          theme_color: validated.theme,
        }])
        .select('id')
        .single();

      if (campaignError) {
        console.error('Campaign creation error:', campaignError);
        throw campaignError;
      }

      if (!campaignData || !campaignData.id) {
        throw new Error('Failed to create campaign');
      }

      console.log('Campaign created successfully:', campaignData.id);
      toast({
        title: "Success!",
        description: "Campaign created successfully.",
        variant: "default",
      });

      setTimeout(() => {
        navigate(`/campaign/${campaignData.id}`);
      }, 1000);
    } catch (error: any) {
      console.error('Complete error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      toast({
        title: "Error",
        description: `Failed to create campaign: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-red-500">{error}</p>
          <Button onClick={() => navigate('/auth')} className="mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <QrCode className="h-6 w-6" />
              <div>
                <CardTitle className="text-2xl">Create QR Campaign</CardTitle>
                <CardDescription className="text-blue-100">
                  Set up your AI-powered Google review collection campaign
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="campaignName">Campaign Name</Label>
                <Input
                  id="campaignName"
                  placeholder="e.g., Surajit Auto Garage - Counter 1"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="businessCategory">Business Category</Label>
                <select
                  id="businessCategory"
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select your business type...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="border border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
                <Label htmlFor="logoFile">Business Logo (Optional)</Label>
                <div className="mt-4">
                  <Input
                    id="logoFile"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setLogoFile(e.target.files[0]);
                      }
                    }}
                    disabled={uploadingLogo}
                  />
                  <p className="text-sm text-gray-600 mt-2">Or enter logo URL below (max 5MB)</p>
                </div>
              </div>
              <div>
                <Label htmlFor="theme">QR Card Theme</Label>
                <select
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lightBlue">💙 Light Blue</option>
                  <option value="darkNavy">🌊 Dark Navy</option>
                  <option value="blackGold">🏆 Black Gold</option>
                  <option value="whiteBlue">✨ White Blue</option>
                </select>
              </div>
              <div>
                <Label htmlFor="googleReviewUrl">Google Review Link *</Label>
                <Input
                  id="googleReviewUrl"
                  type="url"
                  placeholder="https://g.page/business-name/review"
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrl(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customMessage">Custom Message (Optional)</Label>
                <Textarea
                  id="customMessage"
                  placeholder="Add a custom message to appear on the QR card..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  maxLength={500}
                />
                <p className="text-sm text-gray-500 mt-2">
                  {customMessage.length}/500 characters
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                      Creating Campaign...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Create Campaign
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateCampaign;
