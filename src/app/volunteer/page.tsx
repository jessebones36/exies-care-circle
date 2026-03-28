"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ── Placeholder data ──────────────────────────────────────────────────────────
const THIS_WEEK_VISITS = [
  {
    id: "1",
    day: "Sunday",
    date: "Mar 30",
    time: "2:00 PM",
    volunteerName: "Sarah M.",
    isRecurring: true,
    cancelled: false,
    bringingMeal: true,
    bringingGroceries: false,
    foodItems: [
      { item: "Chicken soup", quantity: "1 pot" },
      { item: "Cornbread", quantity: "6 pieces" },
    ],
  },
  {
    id: "2",
    day: "Tuesday",
    date: "Apr 1",
    time: "10:00 AM",
    volunteerName: "James R.",
    isRecurring: false,
    cancelled: false,
    bringingMeal: false,
    bringingGroceries: true,
    foodItems: [
      { item: "Milk", quantity: "1 gallon" },
      { item: "Bread", quantity: "1 loaf" },
      { item: "Eggs", quantity: "1 dozen" },
    ],
  },
  {
    id: "3",
    day: "Thursday",
    date: "Apr 3",
    time: "3:00 PM",
    volunteerName: "Linda K.",
    isRecurring: true,
    cancelled: true,
    bringingMeal: false,
    bringingGroceries: false,
    foodItems: [],
  },
];

const PANTRY_ITEMS = [
  { id: "1", item: "Canned soup", quantity: "3 cans", location: "pantry" as const },
  { id: "2", item: "Oatmeal", quantity: "1 box", location: "pantry" as const },
  { id: "3", item: "Orange juice", quantity: "½ jug", location: "fridge" as const },
  { id: "4", item: "Leftovers", quantity: "2 containers", location: "fridge" as const },
  { id: "5", item: "Frozen meals", quantity: "4 meals", location: "freezer" as const },
];

type PantryTab = "pantry" | "fridge" | "freezer";
type MainTab = "schedule" | "pantry" | "messages";

type ExieMessage = { id: string; message: string; created_at: string };
// ─────────────────────────────────────────────────────────────────────────────

export default function VolunteerPage() {
  const [mainTab, setMainTab] = useState<MainTab>("schedule");
  const [pantryTab, setPantryTab] = useState<PantryTab>("pantry");
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [exieMessages, setExieMessages] = useState<ExieMessage[]>([]);

  const filteredPantry = PANTRY_ITEMS.filter((i) => i.location === pantryTab);
  const latestMessage = exieMessages[0] ?? null;

  useEffect(() => {
    supabase
      .from("exie_requests")
      .select("id, message, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setExieMessages(data);
      });
  }, []);

  async function clearMessage(id: string) {
    const { error } = await supabase
      .from("exie_requests")
      .delete()
      .eq("id", id);
    if (!error) {
      setExieMessages((prev) => prev.filter((m) => m.id !== id));
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-screen bg-[#fdf8f3] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#f0e8dc] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-[#6b5740] text-sm">
            ← Home
          </Link>
          <h1 className="text-lg font-bold text-[#2d2416]">Volunteer Hub</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Tab bar */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm mb-5">
          <button
            onClick={() => setMainTab("schedule")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mainTab === "schedule" ? "bg-[#7aab8a] text-white" : "text-[#6b5740]"
            }`}
          >
            📅 Schedule
          </button>
          <button
            onClick={() => setMainTab("pantry")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mainTab === "pantry" ? "bg-[#7aab8a] text-white" : "text-[#6b5740]"
            }`}
          >
            🥫 Pantry
          </button>
          <button
            onClick={() => setMainTab("messages")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors relative ${
              mainTab === "messages" ? "bg-[#7aab8a] text-white" : "text-[#6b5740]"
            }`}
          >
            💬 Exie
            {exieMessages.length > 0 && mainTab !== "messages" && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#e8a87c] rounded-full" />
            )}
          </button>
        </div>

        {/* ── Schedule Tab ──────────────────────────────────────────────────── */}
        {mainTab === "schedule" && (
          <div className="flex flex-col gap-4">
            {/* Latest message banner */}
            {latestMessage && (
              <div className="bg-[#fde8d5] border border-[#f0d0b0] rounded-2xl px-4 py-3">
                <p className="text-xs font-semibold text-[#c98659] mb-1">
                  💬 Exie is requesting
                </p>
                <p className="text-[#2d2416] text-sm">{latestMessage.message}</p>
              </div>
            )}

            {/* Sign up CTA */}
            <Link
              href="/volunteer/sign-up"
              className="w-full bg-[#7aab8a] hover:bg-[#699978] active:bg-[#598768] text-white text-center text-base font-semibold py-4 rounded-2xl shadow-sm transition-colors"
            >
              + Sign up for a visit
            </Link>

            <h2 className="text-base font-semibold text-[#6b5740]">
              This week&apos;s visits
            </h2>

            {THIS_WEEK_VISITS.map((visit) => (
              <div
                key={visit.id}
                className={`bg-white rounded-2xl shadow-sm border ${
                  visit.cancelled ? "border-red-100 opacity-60" : "border-[#f0e8dc]"
                }`}
              >
                <button
                  className="w-full text-left p-4"
                  onClick={() =>
                    setExpandedVisit(expandedVisit === visit.id ? null : visit.id)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#2d2416]">
                          {visit.volunteerName}
                        </span>
                        {visit.isRecurring && (
                          <span className="text-xs text-[#b0a090] bg-[#f5efe8] px-2 py-0.5 rounded-full">
                            weekly
                          </span>
                        )}
                        {visit.cancelled && (
                          <span className="text-xs text-red-400 bg-red-50 px-2 py-0.5 rounded-full">
                            cancelled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#6b5740] mt-0.5">
                        {visit.day}, {visit.date} · {visit.time}
                      </p>
                    </div>
                    <div className="flex gap-1 items-center">
                      {visit.bringingMeal && <span title="Bringing meal">🍽</span>}
                      {visit.bringingGroceries && <span title="Bringing groceries">🛒</span>}
                      <span className="text-[#b0a090] text-xs ml-1">
                        {expandedVisit === visit.id ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>
                </button>

                {expandedVisit === visit.id && (
                  <div className="px-4 pb-4 border-t border-[#f0e8dc] pt-3">
                    {visit.foodItems.length > 0 ? (
                      <>
                        <p className="text-xs font-semibold text-[#6b5740] uppercase tracking-wide mb-2">
                          Bringing
                        </p>
                        <ul className="flex flex-col gap-1.5">
                          {visit.foodItems.map((fi, i) => (
                            <li key={i} className="flex justify-between text-sm text-[#2d2416]">
                              <span>{fi.item}</span>
                              <span className="text-[#b0a090]">{fi.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-sm text-[#b0a090]">No food items listed.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Pantry Tab ────────────────────────────────────────────────────── */}
        {mainTab === "pantry" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#6b5740]">
              What Exie already has — check before bringing more!
            </p>

            <div className="flex bg-white rounded-xl p-1 shadow-sm">
              {(["pantry", "fridge", "freezer"] as PantryTab[]).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setPantryTab(loc)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                    pantryTab === loc ? "bg-[#e8a87c] text-white" : "text-[#6b5740]"
                  }`}
                >
                  {loc === "pantry" ? "🥫" : loc === "fridge" ? "🧊" : "❄️"} {loc}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#f0e8dc] divide-y divide-[#f0e8dc]">
              {filteredPantry.length === 0 ? (
                <p className="p-4 text-sm text-[#b0a090] text-center">
                  Nothing logged here yet.
                </p>
              ) : (
                filteredPantry.map((item) => (
                  <div key={item.id} className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-[#2d2416]">{item.item}</span>
                    <span className="text-sm text-[#b0a090]">{item.quantity}</span>
                  </div>
                ))
              )}
            </div>

            <button className="w-full bg-[#e8a87c] hover:bg-[#d9976a] text-white text-base font-semibold py-4 rounded-2xl shadow-sm transition-colors">
              + Add item
            </button>
          </div>
        )}

        {/* ── Messages Tab ──────────────────────────────────────────────────── */}
        {mainTab === "messages" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#6b5740]">
              Requests from Exie — clear them once handled.
            </p>

            {exieMessages.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-[#b0a090] shadow-sm border border-[#f0e8dc]">
                No messages from Exie yet.
              </div>
            ) : (
              exieMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-white rounded-2xl shadow-sm border border-[#f0e8dc] px-4 py-4 flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <p className="text-[#2d2416] text-base">{msg.message}</p>
                    <p className="text-xs text-[#b0a090] mt-1">{formatTime(msg.created_at)}</p>
                  </div>
                  <button
                    onClick={() => clearMessage(msg.id)}
                    className="text-[#b0a090] hover:text-red-400 transition-colors text-sm font-medium shrink-0 mt-0.5"
                  >
                    Clear
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
