'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Star, ExternalLink, Loader2, Copy, Check } from 'lucide-react';
import { aiReviewService } from '@/services/aiReviewServiceV2';

const ReviewLanding = () => {
 const { campaignId } = useParams();
 const navigate = useNavigate();
 const { toast } = useToast();
 
 const [campaign, setCampaign] = useState(null);
 const [location, setLocation] = useState(null);
 const [loading, setLoading] = useState(true);
 const [generating, setGenerating] = useState(false);
 const [copiedIndex, setCopiedIndex] = useState(null);
 const [currentReview, setCurrentReview] = useState('');
 const [reviewsLoading, setReviewsLoading] = useState(false);
 const [reviewIndex, setReviewIndex] = useState(0);
 const [reviewPool, setReviewPool] = useState([]);
 
 const campaignCacheRef = useRef(new Map());

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
 .select('*')
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
 console.log('[ReviewLanding] Campaign loaded:', campaignData);
 setCampaign(campaignData);
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
 await generateAndCacheReviews(campaignData, campaignId);
 supabase
 .from('scan_events')
 .insert([{
 campaign_id: campaignId,
 event_type: 'scan',
 device_type: /Mobile|Android|iPhone/.test(navigator.userAgent) ? 'mobile' : 'desktop',
 timestamp: new Date().toISOString(),
 }])
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

 const hashReview = (review: string): string => {
 return review.toLowerCase().trim().slice(0, 50);
 };

 const generateAndCacheReviews = async (campaignData: any, campaignKey: string) => {
 try {
 setReviewsLoading(true);
 console.log('[ReviewLanding] Generating reviews for campaign:', campaignKey);
 const businessName = campaignData?.name || location?.name || 'Our Business';
 const businessCategory = campaignData?.category || location?.category || 'service';
 
 if (!campaignCacheRef.current.has(campaignKey)) {
 campaignCacheRef.current.set(campaignKey, new Set());
 }
 const campaignCache = campaignCacheRef.current.get(campaignKey);
 
 const generatedReviews = await aiReviewService.generateReviews({
 businessName,
 businessCategory,
 numberOfReviews: 15,
 tone: 'professional',
 language: 'English',
 });

 console.log('[ReviewLanding] Generated', generatedReviews.length, 'reviews');
 
 const newReviews = generatedReviews.filter(review => {
 const hash = hashReview(review);
 return !campaignCache.has(hash);
 });

 if (newReviews.length > 0) {
 setReviewPool(prevPool => [...prevPool, ...newReviews]);
 newReviews.forEach(review => {
 campaignCache.add(hashReview(review));
 });
 
 if (!currentReview) {
 setCurrentReview(newReviews[0]);
 setReviewIndex(0);
 }
 } else if (generatedReviews.length > 0 && !currentReview) {
 setCurrentReview(generatedReviews[0]);
 }

 toast({
 title: 'Review Generated',
 description: 'New AI-powered suggestion ready!',
 });
 } catch (error) {
 console.error('[ReviewLanding] Error:', error);
 toast({
 title: 'Note',
 description: 'Using fallback reviews.',
 variant: 'default',
 });
 } finally {
 setReviewsLoading(false);
 }
 };

 const handleCopyToClipboard = (text: string) => {
 navigator.clipboard
 .writeText(text)
 .then(() => {
 setCopiedIndex(0);
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

 const handleNextSuggestion = async () => {
 if (!campaign || !campaignId) return;
 
 if (reviewIndex + 1 >= reviewPool.length) {
 console.log('[ReviewLanding] Pool exhausted, generating new batch');
 await generateAndCacheReviews(campaign, campaignId);
 if (reviewIndex + 1 < reviewPool.length) {
 setCurrentReview(reviewPool[reviewIndex + 1]);
 setReviewIndex(reviewIndex + 1);
 }
 } else {
 const nextIndex = reviewIndex + 1;
 if (nextIndex < reviewPool.length) {
 setCurrentReview(reviewPool[nextIndex]);
 setReviewIndex(nextIndex);
 toast({
 title: 'Next Review',
 description: 'Showing next AI-powered suggestion',
 });
 }
 }
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
 .insert([{
 campaign_id: campaignId,
 converted: true,
 timestamp: new Date().toISOString(),
 }])
 .catch((err) => {
 console.error('Error recording conversion:', err);
 });
 window.open(googleReviewUrl, '_blank');
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

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
 <div className="flex flex-col items-center">
 <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
 <p className="text-gray-600">Loading campaign...</p>
 </div>
 </div>
 );
 }

 if (!campaign) {
 return (
 <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
 <Card className="w-full max-w-md">
 <CardHeader>
 <CardTitle>Campaign Not Found</CardTitle>
 <CardDescription>This review campaign is no longer available</CardDescription>
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
 const logoUrl = location?.logo_url;

 return (
 <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
 <div className="max-w-md mx-auto">
 <Card className="mt-8 shadow-lg">
 <CardHeader className="text-center">
 {logoUrl && (
 <div className="flex justify-center mb-4">
 <img src={logoUrl} alt={businessName} className="h-16 w-16 rounded-lg object-cover" />
 </div>
 )}
 <CardTitle className="text-2xl">Help Us Improve!</CardTitle>
 <CardDescription className="text-base mt-2">
 <span className="font-semibold text-gray-800">{businessName}</span>
 <p className="mt-1">Share your experience on Google</p>
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-6">
 <Card className="bg-indigo-50 border-indigo-200">
 <CardHeader>
 <CardTitle className="text-base flex items-center gap-2">
 Suggested Review
 {reviewsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <p className="text-sm text-gray-700 mb-4">{currentReview}</p>
 <div className="flex gap-2">
 <Button
 onClick={() => handleCopyToClipboard(currentReview)}
 variant="outline"
 className="flex-1 flex items-center gap-2"
 disabled={reviewsLoading || !currentReview}
 >
 {copiedIndex === 0 ? (
 <>
 <Check className="h-4 w-4" />
 Copied!
 </>
 ) : (
 <>
 <Copy className="h-4 w-4" />
 Copy
 </>
 )}
 </Button>
 <Button
 onClick={handleNextSuggestion}
 variant="outline"
 className="flex-1"
 disabled={reviewsLoading}
 >
 Next
 </Button>
 </div>
 </CardContent>
 </Card>
 <Button
 onClick={handleOpenGoogleReview}
 disabled={generating}
 className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
 >
 {generating ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin" />
 Processing...
 </>
 ) : (
 <>
 <ExternalLink className="h-4 w-4" />
 Leave Review on Google
 </>
 )}
 </Button>
 <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm text-gray-700">
 <div className="flex items-start gap-2">
 <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
 <span>AI-powered, SEO-optimized review suggestions</span>
 </div>
 <div className="flex items-start gap-2">
 <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
 <span>Takes just 30 seconds to leave a review</span>
 </div>
 <div className="flex items-start gap-2">
 <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
 <span>Your review helps us serve you better</span>
 </div>
 </div>
 </CardContent>
 </Card>
 <div className="text-center mt-8 text-gray-600">
 <p className="text-sm font-semibold">Powered by</p>
 <p className="text-lg font-bold text-indigo-600">SMART CONNECT QR</p>
 <p className="text-xs text-gray-500 mt-1">AI-Powered Review Collection Platform</p>
 </div>
 </div>
 </div>
 );
};

export default ReviewLanding;
