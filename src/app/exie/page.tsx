"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Placeholder visit data — will be replaced with Supabase queries
const WEEK_VISITS = [
  {
    id: "1",
    day: "Sunday",
    date: "Mar 30",
    time: "2:00 PM",
    volunteerName: "Sarah M.",
    bringingMeal: true,
    bringingGroceries: false,
  },
  {
    id: "2",
    day: "Tuesday",
    date: "Apr 1",
    time: "10:00 AM",
    volunteerName: "James R.",
    bringingMeal: false,
    bringingGroceries: true,
  },
  {
    id: "3",
    day: "Thursday",
    date: "Apr 3",
    time: "3:00 PM",
    volunteerName: "Linda K.",
    bringingMeal: false,
    bringingGroceries: false,
  },
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ExiePage() {
  const today = new Date();
  const dayIndex = today.getDay();

  const [currentRequest, setCurrentRequest] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase
      .from("exie_requests")
      .select("message")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setCurrentRequest(data[0].message);
      });
  }, []);

  async function sendRequest() {
    if (!message.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("exie_requests")
      .insert({ message: message.trim() });
    if (!error) {
      setCurrentRequest(message.trim());
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }
    setSending(false);
  }

  return (
    <main className="min-h-screen bg-[#fdf8f3] px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-[#6b5740] text-sm">
          ← Home
        </Link>
        <h1 className="text-2xl font-bold text-[#2d2416]">My Week</h1>
        <div className="w-12" />
      </div>

      {/* Day strip */}
      <div className="flex justify-between mb-8 bg-white rounded-2xl p-3 shadow-sm">
        {DAYS_OF_WEEK.map((day, i) => {
          const isToday = i === dayIndex;
          const hasVisit = WEEK_VISITS.some((v) =>
            v.day.startsWith(
              ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i].slice(0, 3)
            )
          );
          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className={`text-xs font-medium ${isToday ? "text-[#e8a87c]" : "text-[#6b5740]"}`}>
                {day}
              </span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${isToday
                    ? "bg-[#e8a87c] text-white"
                    : hasVisit
                    ? "bg-[#fde8d5] text-[#c98659]"
                    : "text-[#b0a090]"
                  }`}
              >
                {hasVisit ? "♥" : "·"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visits */}
      <div className="flex flex-col gap-4 mb-8">
        <h2 className="text-lg font-semibold text-[#6b5740]">
          Visitors this week
        </h2>
        {WEEK_VISITS.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-[#b0a090] shadow-sm">
            No visits scheduled yet this week.
          </div>
        ) : (
          WEEK_VISITS.map((visit) => (
            <div
              key={visit.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-[#f0e8dc]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-[#2d2416]">
                    {visit.volunteerName}
                  </p>
                  <p className="text-lg text-[#6b5740] mt-1">
                    {visit.day}, {visit.date}
                  </p>
                  <p className="text-xl font-semibold text-[#e8a87c] mt-1">
                    {visit.time}
                  </p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {visit.bringingMeal && (
                    <span className="bg-[#fde8d5] text-[#c98659] text-sm font-medium px-3 py-1 rounded-full">
                      🍽 Meal
                    </span>
                  )}
                  {visit.bringingGroceries && (
                    <span className="bg-[#e8f5ee] text-[#5a9470] text-sm font-medium px-3 py-1 rounded-full">
                      🛒 Groceries
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message my volunteers */}
      <div className="flex flex-col gap-3 mb-8">
        <h2 className="text-lg font-semibold text-[#6b5740]">
          Message my volunteers 💬
        </h2>

        {sent && (
          <div className="bg-[#e8f5ee] border border-[#b8ddc8] rounded-2xl px-4 py-3">
            <p className="text-sm font-semibold text-[#5a9470]">
              ✓ Your volunteers can see your message!
            </p>
          </div>
        )}

        {currentRequest && !sent && (
          <div className="bg-[#fde8d5] border border-[#f0d0b0] rounded-2xl px-4 py-3">
            <p className="text-xs font-semibold text-[#c98659] mb-1">Your current request</p>
            <p className="text-[#2d2416] text-base">{currentRequest}</p>
          </div>
        )}

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type any request for your volunteers… e.g. Could someone bring me a burger from Super Duper? 🍔"
          rows={3}
          className="w-full bg-white border border-[#e8ddd0] rounded-2xl px-4 py-3 text-[#2d2416] placeholder:text-[#b0a090] focus:outline-none focus:border-[#e8a87c] resize-none text-base"
        />

        <button
          onClick={sendRequest}
          disabled={sending || !message.trim()}
          className="w-full bg-[#e8a87c] hover:bg-[#d9976a] disabled:opacity-50 text-white text-base font-semibold py-4 rounded-2xl shadow-sm transition-colors"
        >
          {sent ? "Sent! 🌸" : sending ? "Sending…" : "Send to my volunteers"}
        </button>
      </div>

      {/* Footer note */}
      <p className="text-center text-[#b0a090] text-sm mt-8">
        We love you, Exie 🌸
      </p>
    </main>
  );
}
