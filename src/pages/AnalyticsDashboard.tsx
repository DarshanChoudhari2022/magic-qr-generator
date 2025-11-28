import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsStats, Review } from '@/types/database.types';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { TrendingUp, TrendingDown, Users, Star, Clock, Filter } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch campaigns for the user
      const { data: campaigns } = await supabase
        .from('review_campaigns')
        .select('id')
        .eq('user_id', user.id);

      if (!campaigns || campaigns.length === 0) return;

      const campaignIds = campaigns.map(c => c.id);

      // Fetch reviews
      let reviewsQuery = supabase
        .from('reviews')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false });

      if (dateRange?.from) {
        reviewsQuery = reviewsQuery.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        reviewsQuery = reviewsQuery.lte('created_at', dateRange.to.toISOString());
      }

      const { data: reviewsData } = await reviewsQuery;
      setReviews(reviewsData || []);

      // Calculate analytics stats
      const totalReviews = reviewsData?.length || 0;
      const qrReviews = reviewsData?.filter(r => r.source === 'qr').length || 0;
      const nfcReviews = reviewsData?.filter(r => r.source === 'nfc').length || 0;
      
      // Get conversion rate from database function
      const { data: conversionData } = await supabase
        .rpc('get_conversion_rate', { p_campaign_id: campaignIds[0] });

      const avgRating = reviewsData && reviewsData.length > 0
        ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
        : 0;

      const avgTimeToReview = reviewsData && reviewsData.length > 0
        ? reviewsData
            .filter(r => r.time_to_review_seconds)
            .reduce((sum, r) => sum + (r.time_to_review_seconds || 0), 0) / 
          reviewsData.filter(r => r.time_to_review_seconds).length
        : 0;

      // Calculate drop-off stages
      const dropOffStages = reviewsData
        ?.filter(r => r.drop_off_stage)
        .reduce((acc, r) => {
          const stage = r.drop_off_stage || 'unknown';
          acc[stage] = (acc[stage] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const dropOffArray = Object.entries(dropOffStages || {}).map(([stage, count]) => ({
        stage,
        count,
      }));

      setStats({
        totalScans: conversionData?.total_scans || qrReviews + nfcReviews,
        totalReviews,
        conversionRate: conversionData?.conversion_rate || 0,
        averageRating: avgRating,
        qrScans: qrReviews,
        nfcTaps: nfcReviews,
        averageTimeToReview: avgTimeToReview,
        dropOffStages: dropOffArray,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const sourceData = [
    { name: 'QR Code', value: stats?.qrScans || 0 },
    { name: 'NFC Card', value: stats?.nfcTaps || 0 },
  ];

  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating: `${rating} Star`,
    count: reviews.filter(r => r.rating === rating).length,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Analytics</h1>
          <p className="text-muted-foreground">Track your review performance and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalScans || 0}</div>
            <p className="text-xs text-muted-foreground">
              QR: {stats?.qrScans || 0} | NFC: {stats?.nfcTaps || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversionRate.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalReviews || 0} reviews from {stats?.totalScans || 0} scans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageRating.toFixed(1) || 0}</div>
            <p className="text-xs text-muted-foreground">Out of 5.0 stars</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time to Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((stats?.averageTimeToReview || 0) / 60)}m
            </div>
            <p className="text-xs text-muted-foreground">Average response time</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Review Source Distribution</CardTitle>
            <CardDescription>QR Code vs NFC Card scans</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
            <CardDescription>Breakdown of review ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ratingDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Drop-off Analysis */}
      {stats?.dropOffStages && stats.dropOffStages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Drop-off Analysis</CardTitle>
            <CardDescription>Where users abandon the review process</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.dropOffStages}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#FF8042" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
