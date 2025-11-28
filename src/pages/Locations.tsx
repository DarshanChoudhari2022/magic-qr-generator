import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, LogOut, Plus, Trash2, Edit2, MapPin } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  google_review_url: string;
  category?: string;
  created_at: string;
}

const Locations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    google_review_url: "",
    category: ""
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadLocations(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const loadLocations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error loading locations:", error);
      toast({ title: "Error", description: "Failed to load locations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingId) {
        const { error } = await supabase
          .from("locations")
          .update(formData)
          .eq("id", editingId)
          .eq("owner_id", user.id);
        if (error) throw error;
        toast({ title: "Success", description: "Location updated" });
      } else {
        const { error } = await supabase
          .from("locations")
          .insert([{ ...formData, owner_id: user.id }]);
        if (error) throw error;
        toast({ title: "Success", description: "Location created" });
      }
      resetForm();
      await loadLocations(user.id);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Operation failed", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", id)
        .eq("owner_id", user.id);
      if (error) throw error;
      toast({ title: "Success", description: "Location deleted" });
      await loadLocations(user.id);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", address: "", city: "", country: "", google_review_url: "", category: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (location: Location) => {
    setFormData({
      name: location.name,
      address: location.address || "",
      city: location.city || "",
      country: location.country || "",
      google_review_url: location.google_review_url,
      category: location.category || ""
    });
    setEditingId(location.id);
    setShowForm(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">ReviewBoost AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">My Locations</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">My Business Locations</h2>
            <p className="text-muted-foreground">Manage your branch locations and Google review links</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8 max-w-2xl">
            <CardHeader>
              <CardTitle>{editingId ? "Edit Location" : "Add New Location"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Business Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g. Main Branch"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g. Retail Store"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
                <div>
                  <Label>Google Review URL *</Label>
                  <Input
                    type="url"
                    value={formData.google_review_url}
                    onChange={(e) => setFormData({ ...formData, google_review_url: e.target.value })}
                    required
                    placeholder="https://g.page/business/review"
                  />
                </div>
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                    {editingId ? "Update Location" : "Create Location"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {locations.length === 0 ? (
          <Card className="border-dashed text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No locations yet</h3>
            <p className="text-muted-foreground mb-6">Add your first business location to get started</p>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add First Location
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <Card key={location.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex-1">{location.name}</span>
                  </CardTitle>
                  <CardDescription>{location.category || "Business"}</CardDescription>
                </CardHeader>
                <CardContent>
                  {location.city && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {location.city}, {location.country}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mb-4 break-all">
                    {location.google_review_url}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(location)}
                      className="flex-1"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(location.id)}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Locations;
