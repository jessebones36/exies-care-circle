"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EditVisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [form, setForm] = useState({
    date: "",
    time: "",
    isRecurring: false,
    bringingMeal: false,
    bringingGroceries: false,
  });
  const [foodItems, setFoodItems] = useState<{ item: string; quantity: string }[]>([]);
  const [newItem, setNewItem] = useState({ item: "", quantity: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const showFoodSection = form.bringingMeal || form.bringingGroceries;

  useEffect(() => {
    supabase
      .from("visits")
      .select("visit_date, visit_time, is_recurring, bringing_meal, bringing_groceries, food_items(item_name, quantity)")
      .eq("id", id)
      .single()
      .then(({ data: raw }) => {
        const data = raw as unknown as {
          visit_date: string;
          visit_time: string;
          is_recurring: boolean;
          bringing_meal: boolean;
          bringing_groceries: boolean;
          food_items: { item_name: string; quantity: string | null }[];
        } | null;
        if (data) {
          setForm({
            date: data.visit_date,
            time: data.visit_time.slice(0, 5),
            isRecurring: data.is_recurring,
            bringingMeal: data.bringing_meal,
            bringingGroceries: data.bringing_groceries,
          });
          setFoodItems(
            data.food_items.map((fi) => ({
              item: fi.item_name,
              quantity: fi.quantity ?? "",
            }))
          );
        }
        setLoading(false);
      });
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function addFoodItem() {
    if (!newItem.item.trim()) return;
    setFoodItems((prev) => [...prev, { ...newItem }]);
    setNewItem({ item: "", quantity: "" });
  }

  function removeFoodItem(index: number) {
    setFoodItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    // 1. Update visit
    const { error: visitError } = await supabase
      .from("visits")
      .update({
        visit_date: form.date,
        visit_time: form.time,
        is_recurring: form.isRecurring,
        recurrence_day: form.isRecurring ? new Date(form.date + "T00:00:00").getDay() : null,
        bringing_meal: form.bringingMeal,
        bringing_groceries: form.bringingGroceries,
      })
      .eq("id", id);

    if (visitError) {
      console.error("Failed to update visit:", visitError);
      setSubmitting(false);
      return;
    }

    // 2. Replace food items: delete existing, insert new
    await supabase.from("food_items").delete().eq("visit_id", id);

    if (foodItems.length > 0) {
      const { error: foodError } = await supabase.from("food_items").insert(
        foodItems.map((fi) => ({
          visit_id: id,
          item_name: fi.item.trim(),
          quantity: fi.quantity.trim() || null,
        }))
      );
      if (foodError) console.error("Failed to save food items:", foodError);
    }

    setSubmitting(false);
    router.push("/volunteer");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fdf8f3] flex items-center justify-center">
        <p className="text-[#b0a090]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fdf8f3] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#f0e8dc] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/volunteer" className="text-[#6b5740] text-sm">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-[#2d2416]">Edit Visit</h1>
          <div className="w-12" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 pt-6 flex flex-col gap-6">
        {/* Date & time */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[#6b5740] uppercase tracking-wide">
            Visit details
          </h2>
          <div className="flex gap-3">
            <input
              required
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="flex-1 bg-white border border-[#e8ddd0] rounded-xl px-4 py-3 text-[#2d2416] focus:outline-none focus:border-[#e8a87c]"
            />
            <input
              required
              type="time"
              name="time"
              value={form.time}
              onChange={handleChange}
              className="flex-1 bg-white border border-[#e8ddd0] rounded-xl px-4 py-3 text-[#2d2416] focus:outline-none focus:border-[#e8a87c]"
            />
          </div>

          <label className="flex items-center justify-between bg-white border border-[#e8ddd0] rounded-xl px-4 py-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[#2d2416]">Repeat weekly</p>
              <p className="text-xs text-[#b0a090]">Same day &amp; time every week</p>
            </div>
            <input
              type="checkbox"
              name="isRecurring"
              checked={form.isRecurring}
              onChange={handleChange}
              className="w-5 h-5 accent-[#7aab8a]"
            />
          </label>
        </section>

        {/* What are you bringing? */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[#6b5740] uppercase tracking-wide">
            What are you bringing?
          </h2>
          <label className="flex items-center justify-between bg-white border border-[#e8ddd0] rounded-xl px-4 py-3 cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="text-xl">🍽</span>
              <p className="text-sm font-medium text-[#2d2416]">A meal</p>
            </div>
            <input
              type="checkbox"
              name="bringingMeal"
              checked={form.bringingMeal}
              onChange={handleChange}
              className="w-5 h-5 accent-[#e8a87c]"
            />
          </label>
          <label className="flex items-center justify-between bg-white border border-[#e8ddd0] rounded-xl px-4 py-3 cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="text-xl">🛒</span>
              <p className="text-sm font-medium text-[#2d2416]">Groceries</p>
            </div>
            <input
              type="checkbox"
              name="bringingGroceries"
              checked={form.bringingGroceries}
              onChange={handleChange}
              className="w-5 h-5 accent-[#e8a87c]"
            />
          </label>
        </section>

        {/* Food items */}
        {showFoodSection && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-[#6b5740] uppercase tracking-wide">
              Specific items
            </h2>
            <p className="text-xs text-[#b0a090] -mt-1">
              List what you're bringing so others don't duplicate.
            </p>

            {foodItems.map((fi, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-white border border-[#e8ddd0] rounded-xl px-4 py-3"
              >
                <div>
                  <span className="text-sm text-[#2d2416]">{fi.item}</span>
                  {fi.quantity && (
                    <span className="text-xs text-[#b0a090] ml-2">{fi.quantity}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeFoodItem(i)}
                  className="text-red-300 hover:text-red-500 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Item name"
                value={newItem.item}
                onChange={(e) => setNewItem((p) => ({ ...p, item: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFoodItem())}
                className="flex-[2] bg-white border border-[#e8ddd0] rounded-xl px-3 py-2.5 text-sm text-[#2d2416] placeholder:text-[#b0a090] focus:outline-none focus:border-[#e8a87c]"
              />
              <input
                type="text"
                placeholder="Qty"
                value={newItem.quantity}
                onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFoodItem())}
                className="flex-1 bg-white border border-[#e8ddd0] rounded-xl px-3 py-2.5 text-sm text-[#2d2416] placeholder:text-[#b0a090] focus:outline-none focus:border-[#e8a87c]"
              />
              <button
                type="button"
                onClick={addFoodItem}
                className="bg-[#e8a87c] text-white rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                Add
              </button>
            </div>
          </section>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#7aab8a] hover:bg-[#699978] disabled:opacity-60 text-white text-base font-semibold py-4 rounded-2xl shadow-sm transition-colors"
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </main>
  );
}
