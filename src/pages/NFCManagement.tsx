import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { NFCCard } from '@/types/database.types';
import { Nfc, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function NFCManagement() {
  const [nfcCards, setNfcCards] = useState<NFCCard[]>([]);
  const [newCardId, setNewCardId] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
    fetchNFCCards();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('review_campaigns')
        .select('id, name')
        .eq('user_id', user.id);

      setCampaigns(data || []);
      if (data && data.length > 0) {
        setSelectedCampaign(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchNFCCards = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userCampaigns } = await supabase
        .from('review_campaigns')
        .select('id')
        .eq('user_id', user.id);

      if (!userCampaigns || userCampaigns.length === 0) return;

      const campaignIds = userCampaigns.map(c => c.id);

      const { data } = await supabase
        .from('nfc_cards')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false });

      setNfcCards(data || []);
    } catch (error) {
      console.error('Error fetching NFC cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    if (!newCardId.trim()) {
      toast.error('Please enter a card ID');
      return;
    }

    if (!selectedCampaign) {
      toast.error('Please select a campaign');
      return;
    }

    try {
      const { error } = await supabase
        .from('nfc_cards')
        .insert({
          campaign_id: selectedCampaign,
          card_id: newCardId.trim(),
          taps_count: 0,
        });

      if (error) throw error;

      toast.success('NFC card added successfully');
      setNewCardId('');
      fetchNFCCards();
    } catch (error: any) {
      console.error('Error adding NFC card:', error);
      toast.error(error.message || 'Failed to add NFC card');
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      const { error } = await supabase
        .from('nfc_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('NFC card deleted');
      fetchNFCCards();
    } catch (error) {
      console.error('Error deleting NFC card:', error);
      toast.error('Failed to delete NFC card');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Nfc className="h-8 w-8" />
          NFC Card Management
        </h1>
        <p className="text-muted-foreground">Manage and track your NFC cards</p>
      </div>

      {/* Add New Card */}
      <Card>
        <CardHeader>
          <CardTitle>Add New NFC Card</CardTitle>
          <CardDescription>Register a new NFC card for tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="card-id">Card ID</Label>
              <Input
                id="card-id"
                placeholder="Enter NFC card ID"
                value={newCardId}
                onChange={(e) => setNewCardId(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="campaign">Campaign</Label>
              <select
                id="campaign"
                className="w-full h-10 px-3 rounded-md border"
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddCard}>
                <Plus className="mr-2 h-4 w-4" />
                Add Card
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NFC Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle>NFC Cards ({nfcCards.length})</CardTitle>
          <CardDescription>View and manage all registered NFC cards</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card ID</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Taps Count</TableHead>
                <TableHead>Last Tapped</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nfcCards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No NFC cards registered yet
                  </TableCell>
                </TableRow>
              ) : (
                nfcCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-mono">{card.card_id}</TableCell>
                    <TableCell>{card.assigned_to || 'Unassigned'}</TableCell>
                    <TableCell>{card.taps_count}</TableCell>
                    <TableCell>
                      {card.last_tapped_at
                        ? new Date(card.last_tapped_at).toLocaleString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
