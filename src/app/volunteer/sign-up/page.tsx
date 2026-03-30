"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Generate time slots 7 AM – 9 PM in 30-min increments
function generateTimeSlots(): { label: string; value: string }[] {
  const slots: { label: string; value: string }[] = [];
  for (let h = 7; h <= 21; h++) {
    for (const m of [0, 30]) {
      if (h === 21 && m === 30) break;
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${m === 0 ? "00" : "30"} ${ampm}`;
      const value = `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`;
      slots.push({ label, value });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeDisplay(timeStr: string): string {
  return TIME_SLOTS.find((s) => s.value === timeStr)?.label ?? timeStr;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const inputClass =
  "w-full bg-white border border-[#e8ddd0] rounded-[12px] h-[48px] px-[14px] text-[14px] text-[#2d2416] placeholder:text-[#988b7e] focus:outline-none focus:border-[#e8a87c] transition-colors";

const sectionHeaderClass =
  "text-[11px] font-semibold text-[#6b5740] uppercase tracking-wide";

export default function SignUpPage() {
  const router = useRouter();
  const calendarRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    guestName: "",
    date: "",
    time: "",
    isRecurring: false,
  });
  const [foodItems, setFoodItems] = useState<{ item: string; quantity: string }[]>([]);
  const [newItem, setNewItem] = useState({ item: "", quantity: "" });
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");

  const [takenDates, setTakenDates] = useState<Set<string>>(new Set());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Fetch taken dates
  useEffect(() => {
    async function fetchTakenDates() {
      const todayStr = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("visits")
        .select("visit_date")
        .eq("cancelled", false)
        .gte("visit_date", todayStr);
      if (data) {
        setTakenDates(new Set(data.map((v: { visit_date: string }) => v.visit_date)));
      }
    }
    fetchTakenDates();
  }, []);

  // Close pickers on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) {
        setTimeOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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

    if (!form.name.trim() || !form.date || !form.time) {
      setValidationError(
        !form.name.trim() ? "Please enter your name."
          : !form.date ? "Please select a visit date."
          : "Please select a visit time."
      );
      return;
    }
    setValidationError("");
    setSubmitting(true);

    const { data: volunteerData, error: volunteerError } = await supabase
      .from("volunteers")
      .insert({ name: form.name.trim(), phone: form.phone.trim() || null, email: null })
      .select("id")
      .single();

    if (volunteerError || !volunteerData) {
      console.error("Failed to save volunteer:", volunteerError);
      setSubmitting(false);
      return;
    }

    const { data: visitData, error: visitError } = await supabase
      .from("visits")
      .insert({
        volunteer_id: (volunteerData as unknown as { id: string }).id,
        visit_date: form.date,
        visit_time: form.time,
        is_recurring: form.isRecurring,
        recurrence_day: form.isRecurring ? new Date(form.date + "T00:00:00").getDay() : null,
        bringing_meal: foodItems.length > 0,
        bringing_groceries: false,
        notes: form.guestName.trim() ? `Guest: ${form.guestName.trim()}` : null,
        cancelled: false,
        cancelled_at: null,
      })
      .select("id")
      .single();

    if (visitError || !visitData) {
      console.error("Failed to save visit:", visitError);
      setSubmitting(false);
      return;
    }

    if (foodItems.length > 0) {
      const { error: foodError } = await supabase.from("food_items").insert(
        foodItems.map((fi) => ({
          visit_id: (visitData as unknown as { id: string }).id,
          item_name: fi.item.trim(),
          quantity: fi.quantity.trim() || null,
        }))
      );
      if (foodError) console.error("Failed to save food items:", foodError);
    }

    setSubmitting(false);
    router.push("/volunteer");
  }

  // Calendar computed values
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const calYear = calendarMonth.getFullYear();
  const calMonth = calendarMonth.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const monthLabel = calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const canGoPrev =
    calYear > today.getFullYear() ||
    (calYear === today.getFullYear() && calMonth > today.getMonth());

  return (
    <main className="min-h-screen bg-[#fdf8f3] pb-[170px]">
      {/* Header */}
      <div className="bg-white h-[60px] flex items-center justify-center relative shrink-0 sticky top-0 z-10">
        <Link href="/volunteer" className="absolute left-[17px] text-[#6b5740] text-[14px]">
          ← Home
        </Link>
        <h1
          className="text-[20px] font-bold text-[#2d2416]"
          style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif" }}
        >
          Volunteer Hub
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-6 pt-6 flex flex-col gap-6">

        {/* Scripture */}
        <p
          className="text-center text-[#dca987] leading-[24px]"
          style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif", fontSize: "17.5px", fontWeight: 500 }}
        >
          The one showing favor to the lowly is lending to Jehovah, And He will repay him for what he does. —Proverbs 19:17
        </p>

        {/* Your info */}
        <section className="flex flex-col gap-[10px]">
          <p className={sectionHeaderClass}>Your Info</p>
          <input
            type="text"
            name="name"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange}
            className={inputClass}
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone number (optional)"
            value={form.phone}
            onChange={handleChange}
            className={inputClass}
          />
          <input
            type="text"
            name="guestName"
            placeholder="Guest (optional)"
            value={form.guestName}
            onChange={handleChange}
            className={inputClass}
          />
        </section>

        {/* Visit details */}
        <section className="flex flex-col gap-[10px]">
          <p className={sectionHeaderClass}>Visit Details</p>

          {validationError && (
            <p className="text-sm text-red-500">{validationError}</p>
          )}

          {/* Date picker */}
          <div ref={calendarRef} className="relative">
            <button
              type="button"
              onClick={() => { setCalendarOpen((v) => !v); setTimeOpen(false); }}
              className={`w-full bg-white border rounded-[12px] h-[48px] px-[14px] text-[14px] text-left flex items-center justify-between transition-colors focus:outline-none ${
                calendarOpen ? "border-[#e8a87c]" : "border-[#e8ddd0]"
              }`}
            >
              <span className={form.date ? "text-[#2d2416]" : "text-[#988b7e]"}>
                {form.date ? formatDateDisplay(form.date) : "Select a date"}
              </span>
              <svg className="w-5 h-5 text-[#988b7e] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
                <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" />
                <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
              </svg>
            </button>

            {calendarOpen && (
              <div className="absolute z-20 mt-2 left-0 right-0 bg-white border border-[#e8ddd0] rounded-2xl shadow-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <button type="button" onClick={() => setCalendarMonth(new Date(calYear, calMonth - 1, 1))} disabled={!canGoPrev}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6b5740] hover:bg-[#f0e8dc] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    ‹
                  </button>
                  <span className="text-sm font-semibold text-[#2d2416]">{monthLabel}</span>
                  <button type="button" onClick={() => setCalendarMonth(new Date(calYear, calMonth + 1, 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6b5740] hover:bg-[#f0e8dc] transition-colors">
                    ›
                  </button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="text-center text-xs text-[#b0a090] py-1 font-medium">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1">
                  {Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`pad-${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = toDateStr(calYear, calMonth, day);
                    const isPast = dateStr < todayStr;
                    const isTaken = takenDates.has(dateStr);
                    const isSelected = form.date === dateStr;
                    const isDisabled = isPast || isTaken;
                    return (
                      <div key={day} className="flex items-center justify-center">
                        <button type="button" disabled={isDisabled}
                          onClick={() => { setForm((prev) => ({ ...prev, date: dateStr })); setCalendarOpen(false); }}
                          className={[
                            "w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors",
                            isSelected ? "bg-[#7aab8a] text-white font-semibold"
                              : isTaken ? "text-[#c8bdb4] line-through cursor-not-allowed"
                              : isPast ? "text-[#d8d0c8] cursor-not-allowed"
                              : "text-[#2d2416] hover:bg-[#f0e8dc] cursor-pointer",
                          ].join(" ")}
                          title={isTaken ? "Already scheduled" : undefined}
                        >
                          {day}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#f0e8dc]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#7aab8a]" />
                    <span className="text-xs text-[#b0a090]">Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#c8bdb4] line-through">15</span>
                    <span className="text-xs text-[#b0a090]">Taken</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Time picker */}
          <div ref={timeRef} className="relative">
            <button type="button"
              onClick={() => { setTimeOpen((v) => !v); setCalendarOpen(false); }}
              className={`w-full bg-white border rounded-[12px] h-[48px] px-[14px] text-[14px] text-left flex items-center justify-between transition-colors focus:outline-none ${
                timeOpen ? "border-[#e8a87c]" : "border-[#e8ddd0]"
              }`}
            >
              <span className={form.time ? "text-[#2d2416]" : "text-[#988b7e]"}>
                {form.time ? formatTimeDisplay(form.time) : "Select a time"}
              </span>
              <svg className="w-5 h-5 text-[#988b7e] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <polyline points="12 7 12 12 15 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {timeOpen && (
              <div className="absolute z-20 mt-2 left-0 right-0 bg-white border border-[#e8ddd0] rounded-2xl shadow-xl max-h-52 overflow-y-auto">
                {TIME_SLOTS.map((slot) => (
                  <button key={slot.value} type="button"
                    onClick={() => { setForm((prev) => ({ ...prev, time: slot.value })); setTimeOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                      form.time === slot.value ? "text-[#7aab8a] font-semibold bg-[#f0f8f4]" : "text-[#2d2416] hover:bg-[#f8f3ee]"
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recurring toggle */}
          <label className="flex items-center justify-between bg-white border border-[#e8ddd0] rounded-[12px] h-[48px] px-[14px] cursor-pointer">
            <span className="text-[14px] text-[#988b7e]">Same day and time every week?</span>
            <input
              type="checkbox"
              name="isRecurring"
              checked={form.isRecurring}
              onChange={handleChange}
              className="w-5 h-5 accent-[#7aab8a]"
            />
          </label>
        </section>

        {/* Would you like to bring something? */}
        <section className="flex flex-col gap-[10px]">
          <p className={sectionHeaderClass}>Would you like to bring something?</p>

          {/* Added items */}
          {foodItems.map((fi, i) => (
            <div key={i} className="w-full bg-white border border-[#e8ddd0] rounded-[12px] h-[48px] px-[14px] flex items-center justify-between">
              <span className="text-[14px] text-[#2d2416]">
                {fi.item}{fi.quantity ? ` • ${fi.quantity}` : ""}
              </span>
              <button
                type="button"
                onClick={() => removeFoodItem(i)}
                className="text-[#b0a090] hover:text-[#f93e14] transition-colors w-6 h-6 flex items-center justify-center shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add row */}
          <div className="grid gap-[10px]" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)" }}>
            <input
              type="text"
              placeholder="Item name"
              value={newItem.item}
              onChange={(e) => setNewItem((p) => ({ ...p, item: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFoodItem())}
              className="bg-white border border-[#e8ddd0] rounded-[12px] h-[48px] px-[14px] text-[14px] text-[#2d2416] placeholder:text-[#988b7e] focus:outline-none focus:border-[#e8a87c] transition-colors"
            />
            <input
              type="text"
              placeholder="Qty"
              value={newItem.quantity}
              onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFoodItem())}
              className="bg-white border border-[#e8ddd0] rounded-[12px] h-[48px] px-[14px] text-[14px] text-[#2d2416] placeholder:text-[#988b7e] focus:outline-none focus:border-[#e8a87c] transition-colors"
            />
            <button
              type="button"
              onClick={addFoodItem}
              className="bg-[#e8a87c] hover:bg-[#d9976a] text-white rounded-[12px] h-[48px] text-[13px] font-semibold transition-colors"
            >
              Add
            </button>
          </div>
        </section>
      </form>

      {/* Bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 h-[170px] flex flex-col items-center justify-end p-6 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(253,248,243,0) 0%, #fdf8f3 45%)" }}
      >
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full max-w-lg h-16 flex items-center justify-center bg-[#7aab8a] hover:bg-[#699978] disabled:opacity-60 text-white text-[18px] font-bold rounded-[16px] shadow-[0px_0px_14px_0px_#cfc7bf] transition-colors pointer-events-auto"
          style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
        >
          {submitting ? "Saving…" : "Confirm Visit"}
        </button>
      </div>
    </main>
  );
}
