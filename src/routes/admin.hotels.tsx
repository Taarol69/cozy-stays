import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Hotel = Database["public"]["Tables"]["hotels"]["Row"];

export const Route = createFileRoute("/admin/hotels")({ component: AdminHotels });

const empty = {
  name: "", description: "", city: "Kathmandu", country: "Nepal", address: "",
  cover_image: "", images: "", amenities: "", star_rating: 4, price_from: 100,
};

function AdminHotels() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Hotel | null>(null);
  const [form, setForm] = useState(empty);

  async function load() {
    const { data } = await supabase.from("hotels").select("*").order("created_at", { ascending: false });
    setHotels(data ?? []);
  }
  useEffect(() => { load(); }, []);

  function startNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function startEdit(h: Hotel) {
    setEditing(h);
    setForm({
      name: h.name, description: h.description ?? "", city: h.city, country: h.country,
      address: h.address ?? "", cover_image: h.cover_image ?? "",
      images: (h.images ?? []).join(", "), amenities: (h.amenities ?? []).join(", "),
      star_rating: h.star_rating, price_from: Number(h.price_from),
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description || null,
      city: form.city,
      country: form.country,
      address: form.address || null,
      cover_image: form.cover_image || null,
      images: form.images.split(",").map((s) => s.trim()).filter(Boolean),
      amenities: form.amenities.split(",").map((s) => s.trim()).filter(Boolean),
      star_rating: Number(form.star_rating),
      price_from: Number(form.price_from),
    };
    const { error } = editing
      ? await supabase.from("hotels").update(payload).eq("id", editing.id)
      : await supabase.from("hotels").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Hotel updated" : "Hotel created");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this hotel? Rooms will also be deleted.")) return;
    const { error } = await supabase.from("hotels").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Hotel deleted");
    load();
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Hotels</h1>
          <p className="text-muted-foreground">{hotels.length} total</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} className="bg-gold text-gold-foreground hover:bg-gold/90">
              <Plus className="mr-2 h-4 w-4" /> Add hotel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} hotel</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Star rating (1–5)</Label><Input type="number" min={1} max={5} value={form.star_rating} onChange={(e) => setForm({ ...form, star_rating: Number(e.target.value) })} /></div>
                <div><Label>City</Label><Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>Country</Label><Input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Cover image URL</Label><Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} placeholder="https://..." /></div>
                <div className="sm:col-span-2"><Label>Gallery image URLs (comma separated)</Label><Textarea rows={2} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Amenities (comma separated)</Label><Input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="Pool, Spa, Gym, Free WiFi" /></div>
                <div><Label>Starting price ($/night)</Label><Input type="number" min={0} value={form.price_from} onChange={(e) => setForm({ ...form, price_from: Number(e.target.value) })} /></div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-gold text-gold-foreground hover:bg-gold/90">
                  {editing ? "Save changes" : "Create hotel"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 space-y-3">
        {hotels.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
            No hotels yet. Click "Add hotel" to create one.
          </div>
        )}
        {hotels.map((h) => (
          <Card key={h.id} className="flex items-center gap-4 p-4">
            <img
              src={h.cover_image || h.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&q=80"}
              alt=""
              className="h-16 w-24 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{h.name}</div>
              <div className="text-xs text-muted-foreground">{h.city}, {h.country} · {h.star_rating}★ · from ${Number(h.price_from).toFixed(0)}</div>
            </div>
            <Button variant="outline" size="icon" onClick={() => startEdit(h)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => remove(h.id)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
