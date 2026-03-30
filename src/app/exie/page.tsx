"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const ADJECTIVES = [
  "thrilled",
  "excited",
  "delighted",
  "overjoyed",
  "so happy",
  "ecstatic",
  "over the moon",
  "absolutely thrilled",
  "beyond excited",
  "so excited",
];

type Visit = {
  id: string;
  visit_date: string;
  visit_time: string;
  notes: string | null;
  bringing_meal: boolean;
  bringing_groceries: boolean;
  volunteers: { name: string } | null;
  food_items: { item_name: string; quantity: string | null }[];
};

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function parseGuest(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/^Guest:\s*(.+)/i);
  return match ? match[1].trim() : null;
}

export default function ExiePage() {
  const [visit, setVisit] = useState<Visit | null | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const adjective = useMemo(
    () => ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)],
    []
  );

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    supabase
      .from("visits")
      .select("id, visit_date, visit_time, notes, bringing_meal, bringing_groceries, volunteers(name), food_items(item_name, quantity)")
      .eq("cancelled", false)
      .gte("visit_date", todayStr)
      .order("visit_date")
      .order("visit_time")
      .limit(1)
      .single()
      .then(({ data }) => setVisit(data as unknown as Visit ?? null));
  }, []);

  async function sendRequest() {
    if (!message.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("exie_requests")
      .insert({ message: message.trim() });
    if (!error) {
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }
    setSending(false);
  }

  const volunteerName = visit?.volunteers?.name ?? null;
  const guestName = visit ? parseGuest(visit.notes) : null;
  const time = visit ? formatTime(visit.visit_time) : null;
  const foodItems = visit?.food_items ?? [];
  const hasFoodItems = foodItems.length > 0 || visit?.bringing_meal || visit?.bringing_groceries;

  // Build the greeting sentence
  let greeting = "";
  if (volunteerName && time) {
    const who = guestName
      ? `${volunteerName} & ${guestName}`
      : volunteerName;
    const verb = guestName ? "are" : "is";
    greeting = `${who} ${verb} ${adjective} to see you at ${time}`;
  }

  return (
    <main className="min-h-screen bg-[#fdf8f3] flex flex-col">
      {/* Toast */}
      {sent && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#5a9470] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg whitespace-nowrap">
          ✓ Your volunteers can see your message!
        </div>
      )}

      {/* Header */}
      <div className="bg-white h-[60px] flex items-center justify-center relative shrink-0 sticky top-0 z-10">
        <Link href="/" className="absolute left-[17px] text-[#6b5740] text-[14px]">
          ← Home
        </Link>
        <h1
          className="text-[20px] font-bold text-[#2d2416]"
          style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif" }}
        >
          Today's Guest
        </h1>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 gap-12 p-6 pb-[300px] overflow-y-auto">

        {/* Loading */}
        {visit === undefined && (
          <div className="bg-white rounded-[16px] p-[14px] flex items-center justify-center h-32">
            <p className="text-[#b0a090] text-[17px]" style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif" }}>
              Loading…
            </p>
          </div>
        )}

        {/* No visit */}
        {visit === null && (
          <div className="bg-white rounded-[16px] p-[14px] text-center">
            <p
              className="text-[27px] text-[#2d2416]"
              style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif" }}
            >
              No visits scheduled yet 🌸
            </p>
          </div>
        )}

        {/* Visit card */}
        {visit && (
          <div className="bg-white rounded-[16px] p-[14px] flex flex-col gap-3">
            {/* Greeting sentence */}
            <p
              className="text-[27px] text-[#2d2416] text-center leading-snug"
              style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif" }}
            >
              {greeting}
            </p>

            {/* Divider + food — only when there's something to show */}
            {hasFoodItems && (
              <>
                <div className="h-px bg-[#f0e8dc]" />
                <div className="flex flex-col gap-4 py-2">
                  <p
                    className="text-[27px] text-[#988b7e] text-center"
                    style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif" }}
                  >
                    They are bringing…
                  </p>
                  {foodItems.map((fi, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-[17px] font-medium text-[#2d2416]"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      <span>{fi.item_name}</span>
                      <span className="text-[#b0a090]">{fi.quantity}</span>
                    </div>
                  ))}
                  {visit.bringing_meal && foodItems.length === 0 && (
                    <p className="text-[17px] font-medium text-[#2d2416]" style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}>
                      A meal 🍽
                    </p>
                  )}
                  {visit.bringing_groceries && foodItems.length === 0 && (
                    <p className="text-[17px] font-medium text-[#2d2416]" style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}>
                      Groceries 🛒
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom — gradient + message box + send button */}
      <div
        className="fixed bottom-0 left-0 right-0 flex flex-col gap-[14px] p-6 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(253,248,243,0) 0%, #fdf8f3 21%)" }}
      >
        <p
          className="text-[24px] text-[#6b5740] pointer-events-auto"
          style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif" }}
        >
          Would you like to send a message?
        </p>

        <div className="w-full pb-[4px] pointer-events-auto">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here!"
            className="w-full h-[120px] bg-white border border-[#e8a87c] rounded-[16px] p-[14px] resize-none focus:outline-none
              text-[18pt] text-[#2d2416] placeholder:text-[#e8a87c] placeholder:font-semibold"
            style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif" }}
          />
        </div>

        <button
          onClick={sendRequest}
          disabled={sending || !message.trim()}
          className="w-full h-16 flex items-center justify-center bg-[#7aab8a] hover:bg-[#699978] disabled:opacity-50 text-white text-[18px] font-bold rounded-[16px] shadow-[0px_0px_14px_0px_#cfc7bf] transition-colors pointer-events-auto"
          style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
        >
          {sending ? "Sending…" : sent ? "Sent! 🌸" : "Send the message"}
        </button>
      </div>
    </main>
  );
}
