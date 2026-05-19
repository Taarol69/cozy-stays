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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Room = Database["public"]["Tables"]["rooms"]["Row"];
type Hotel = Database["public"]["Tables"]["hotels"]["Row"];

export const Route = createFileRoute("/admin/rooms")({ component: AdminRooms });

const empty = {
  hotel_id: "", name: "", room_type: "Standard", description: "",
  price_per_night: 100, capacity: 2, beds: 1, size_sqm: 0,
  images: "", amenities: "", quantity: 1,
};

function AdminRooms() {
  const [rooms, setRooms] = useState<(Room & { hotels: { name: string } | null })[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState(empty);

  async function load() {
    const { data } = await supabase
      .from("rooms")
      .select("*, hotels(name)")
      .order("created_at", { ascending: false });
    setRooms((data as any) ?? []);
    const { data: h } = await supabase.from("hotels").select("*").order("name");
    setHotels(h ?? []);
  }
  useEffect(() => { load(); }, []);

  function startNew() {
    setEditing(null);
    setForm({ ...empty, hotel_id: hotels[0]?.id ?? "" });
    setOpen(true);
  }
  function startEdit(r: Room) {
    setEditing(r);
    setForm({
      hotel_id: r.hotel_id, name: r.name, room_type: r.room_type,
      description: r.description ?? "", price_per_night: Number(r.price_per_night),
      capacity: r.capacity, beds: r.beds, size_sqm: r.size_sqm ?? 0,
      images: (r.images ?? []).join(", "), amenities: (r.amenities ?? []).join(", "),
      quantity: r.quantity,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.hotel_id) return toast.error("Pick a hotel");
    const payload = {
      hotel_id: form.hotel_id,
      name: form.name,
      room_type: form.room_type,
      description: form.description || null,
      price_per_night: Number(form.price_per_night),
      capacity: Number(form.capacity),
      beds: Number(form.beds),
      size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
      images: form.images.split(",").map((s) => s.trim()).filter(Boolean),
      amenities: form.amenities.split(",").map((s) => s.trim()).filter(Boolean),
      quantity: Number(form.quantity),
    };
    const { error } = editing
      ? await supabase.from("rooms").update(payload).eq("id", editing.id)
      : await supabase.from("rooms").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Room updated" : "Room created");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this room?")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Rooms</h1>
          <p className="text-muted-foreground">{rooms.length} total</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} disabled={hotels.length === 0} className="bg-gold text-gold-foreground hover:bg-gold/90">
              <Plus className="mr-2 h-4 w-4" /> Add room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} room</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div>
                <Label>Hotel</Label>
                <Select value={form.hotel_id} onValueChange={(v) => setForm({ ...form, hotel_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick a hotel" /></SelectTrigger>
                  <SelectContent>
                    {hotels.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Room type</Label><Input value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })} /></div>
                <div><Label>Price / night ($)</Label><Input type="number" min={0} value={form.price_per_night} onChange={(e) => setForm({ ...form, price_per_night: Number(e.target.value) })} /></div>
                <div><Label>Capacity</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
                <div><Label>Beds</Label><Input type="number" min={1} value={form.beds} onChange={(e) => setForm({ ...form, beds: Number(e.target.value) })} /></div>
                <div><Label>Size (m²)</Label><Input type="number" min={0} value={form.size_sqm} onChange={(e) => setForm({ ...form, size_sqm: Number(e.target.value) })} /></div>
                <div><Label>Quantity</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Image URLs (comma separated)</Label><Textarea rows={2} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} /></div>
              <div><Label>Amenities (comma separated)</Label><Input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} /></div>
              <DialogFooter>
                <Button type="submit" className="bg-gold text-gold-foreground hover:bg-gold/90">
                  {editing ? "Save changes" : "Create room"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 space-y-3">
        {hotels.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
            Add a hotel first before creating rooms.
          </div>
        )}
        {rooms.map((r) => (
          <Card key={r.id} className="flex items-center gap-4 p-4">
            <img
              src={r.images?.[0] || "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=200&q=80"}
              alt=""
              className="h-16 w-24 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{r.name}</div>
              <div className="text-xs text-muted-foreground">
                {r.hotels?.name} · {r.room_type} · ${Number(r.price_per_night).toFixed(0)}/night · {r.capacity} guests
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
