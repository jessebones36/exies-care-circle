"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Location = "pantry" | "fridge" | "freezer";

type PantryEntry = {
  key: string; // local key for React list
  item: string;
  quantity: string;
  location: Location;
  fromVisit: boolean; // preloaded from visit vs. manually added
};

const LOCATION_LABELS: Record<Location, string> = {
  pantry: "🥫 Pantry",
  fridge: "🧊 Fridge",
  freezer: "❄️ Freezer",
};

let nextKey = 0;
function makeKey() {
  return String(nextKey++);
}

export default function AddPantryItemPage() {
  const router = useRouter();

  const [entries, setEntries] = useState<PantryEntry[]>([]);
  const [newItem, setNewItem] = useState({ item: "", quantity: "", location: "pantry" as Location });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [visitInfo, setVisitInfo] = useState<string | null>(null);

  // Fetch most recent past or today visit with food items
  useEffect(() => {
    async function load() {
      const todayStr = new Date().toISOString().split("T")[0];

      const { data } = await supabase
        .from("visits")
        .select("id, visit_date, volunteers(name), food_items(item_name, quantity)")
        .eq("cancelled", false)
        .lte("visit_date", todayStr)
        .order("visit_date", { ascending: false })
        .order("visit_time", { ascending: false })
        .limit(5); // grab a few to find one with food items

      if (data) {
        // Find the most recent visit that has food items
        const visitWithFood = (data as unknown as {
          id: string;
          visit_date: string;
          volunteers: { name: string } | null;
          food_items: { item_name: string; quantity: string | null }[];
        }[]).find((v) => v.food_items.length > 0);

        if (visitWithFood) {
          const [y, m, d] = visitWithFood.visit_date.split("-").map(Number);
          const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          const name = visitWithFood.volunteers?.name ?? "A volunteer";
          setVisitInfo(`${name}'s visit on ${dateLabel}`);

          setEntries(
            visitWithFood.food_items.map((fi) => ({
              key: makeKey(),
              item: fi.item_name,
              quantity: fi.quantity ?? "",
              location: "pantry" as Location,
              fromVisit: true,
            }))
          );
        }
      }

      setLoading(false);
    }

    load();
  }, []);

  function updateEntry(key: string, patch: Partial<PantryEntry>) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  }

  function removeEntry(key: string) {
    setEntries((prev) => prev.filter((e) => e.key !== key));
  }

  function addNewItem() {
    if (!newItem.item.trim()) return;
    setEntries((prev) => [
      ...prev,
      { key: makeKey(), item: newItem.item.trim(), quantity: newItem.quantity.trim(), location: newItem.location, fromVisit: false },
    ]);
    setNewItem({ item: "", quantity: "", location: "pantry" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (entries.length === 0) return;

    setSubmitting(true);

    const { error } = await supabase.from("pantry_items").insert(
      entries.map((entry) => ({
        item_name: entry.item,
        quantity: entry.quantity || null,
        location: entry.location,
        last_updated: new Date().toISOString(),
      }))
    );

    if (error) {
      console.error("Failed to save pantry items:", error);
      setSubmitting(false);
      return;
    }

    localStorage.setItem("volunteerTab", "pantry");
    router.push("/volunteer");
  }

  return (
    <main className="min-h-screen bg-[#fdf8f3] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#f0e8dc] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/volunteer" className="text-[#6b5740] text-sm">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-[#2d2416]">Add to Pantry</h1>
          <div className="w-12" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 pt-6 flex flex-col gap-6">

        {loading ? (
          <div className="bg-white rounded-[16px] p-6 text-center text-[#b0a090] border border-[#f0e8dc]">
            Loading…
          </div>
        ) : (
          <>
            {/* Preloaded items from visit */}
            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-semibold text-[#6b5740] uppercase tracking-wide">
                  Items to add
                </h2>
                {visitInfo && (
                  <p className="text-xs text-[#b0a090]">
                    Preloaded from {visitInfo} — remove anything you didn't bring.
                  </p>
                )}
              </div>

              {entries.length === 0 && (
                <p className="text-sm text-[#b0a090] text-center py-3">
                  No items yet — add some below.
                </p>
              )}

              {entries.map((entry) => (
                <div
                  key={entry.key}
                  className="bg-white border border-[#e8ddd0] rounded-xl overflow-hidden"
                >
                  {/* Item name + quantity row */}
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                    <input
                      type="text"
                      value={entry.item}
                      onChange={(e) => updateEntry(entry.key, { item: e.target.value })}
                      placeholder="Item name"
                      className="flex-[2] text-sm text-[#2d2416] placeholder:text-[#b0a090] focus:outline-none bg-transparent"
                    />
                    <span className="text-[#e8ddd0]">·</span>
                    <input
                      type="text"
                      value={entry.quantity}
                      onChange={(e) => updateEntry(entry.key, { quantity: e.target.value })}
                      placeholder="Qty"
                      className="flex-1 text-sm text-[#b0a090] placeholder:text-[#b0a090] focus:outline-none bg-transparent text-right"
                    />
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.key)}
                      className="ml-1 text-[#d0c8c0] hover:text-[#f93e14] text-xl leading-none transition-colors shrink-0"
                    >
                      ×
                    </button>
                  </div>

                  {/* Location selector */}
                  <div className="flex border-t border-[#f0e8dc]">
                    {(["pantry", "fridge", "freezer"] as Location[]).map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => updateEntry(entry.key, { location: loc })}
                        className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                          entry.location === loc
                            ? "bg-[#f5efe8] text-[#e8a87c]"
                            : "text-[#b0a090] hover:bg-[#fdf8f3]"
                        }`}
                      >
                        {LOCATION_LABELS[loc]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* Add a new item */}
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[#6b5740] uppercase tracking-wide">
                Add another item
              </h2>

              <div className="bg-white border border-[#e8ddd0] rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={newItem.item}
                    onChange={(e) => setNewItem((p) => ({ ...p, item: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNewItem())}
                    className="flex-[2] text-sm text-[#2d2416] placeholder:text-[#b0a090] focus:outline-none bg-transparent"
                  />
                  <span className="text-[#e8ddd0]">·</span>
                  <input
                    type="text"
                    placeholder="Qty"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNewItem())}
                    className="flex-1 text-sm text-[#b0a090] placeholder:text-[#b0a090] focus:outline-none bg-transparent text-right"
                  />
                </div>
                <div className="flex border-t border-[#f0e8dc]">
                  {(["pantry", "fridge", "freezer"] as Location[]).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setNewItem((p) => ({ ...p, location: loc }))}
                      className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                        newItem.location === loc
                          ? "bg-[#f5efe8] text-[#e8a87c]"
                          : "text-[#b0a090] hover:bg-[#fdf8f3]"
                      }`}
                    >
                      {LOCATION_LABELS[loc]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={addNewItem}
                disabled={!newItem.item.trim()}
                className="w-full py-3 border border-dashed border-[#e8a87c] rounded-xl text-sm font-semibold text-[#e8a87c] hover:bg-[#fdf0e6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                + Add item
              </button>
            </section>
          </>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || loading || entries.length === 0}
          className="w-full bg-[#e8a87c] hover:bg-[#d9976a] disabled:opacity-60 text-white text-base font-semibold py-4 rounded-2xl shadow-sm transition-colors"
        >
          {submitting ? "Saving…" : `Save ${entries.length > 0 ? entries.length : ""} item${entries.length === 1 ? "" : "s"} to pantry`}
        </button>
      </form>
    </main>
  );
}
