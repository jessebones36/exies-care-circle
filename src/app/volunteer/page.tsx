"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type MainTab = "schedule" | "messages";

type ExieMessage = { id: string; message: string; created_at: string };

type Visit = {
  id: string;
  visit_date: string;
  visit_time: string;
  is_recurring: boolean;
  cancelled: boolean;
  bringing_meal: boolean;
  bringing_groceries: boolean;
  volunteers: { name: string } | null;
  food_items: { item_name: string; quantity: string | null }[];
};

export default function VolunteerPage() {
  const [mainTab, setMainTab] = useState<MainTab>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("volunteerTab") as MainTab | null;
      if (saved) { localStorage.removeItem("volunteerTab"); return saved; }
    }
    return "schedule";
  });
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [thisWeekExpanded, setThisWeekExpanded] = useState(true);
  const [exieMessages, setExieMessages] = useState<ExieMessage[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const latestMessage = exieMessages[0] ?? null;

  function getWeekSunday(d: Date): Date {
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - d.getDay());
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  }

  function toISODate(d: Date): string {
    return d.toISOString().split("T")[0];
  }

  const thisWeekSunday = getWeekSunday(new Date());
  const thisWeekSaturday = new Date(thisWeekSunday);
  thisWeekSaturday.setDate(thisWeekSunday.getDate() + 6);

  const thisWeekVisits = visits.filter((v) => {
    const [y, m, d] = v.visit_date.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date >= thisWeekSunday && date <= thisWeekSaturday;
  });

  const futureWeekMap = new Map<string, Visit[]>();
  visits
    .filter((v) => {
      const [y, m, d] = v.visit_date.split("-").map(Number);
      return new Date(y, m - 1, d) > thisWeekSaturday;
    })
    .forEach((v) => {
      const [y, m, d] = v.visit_date.split("-").map(Number);
      const sunday = getWeekSunday(new Date(y, m - 1, d));
      const key = toISODate(sunday);
      if (!futureWeekMap.has(key)) futureWeekMap.set(key, []);
      futureWeekMap.get(key)!.push(v);
    });

  const futureWeekGroups = Array.from(futureWeekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, weekVisits]) => {
      const [y, m, d] = key.split("-").map(Number);
      const sunday = new Date(y, m - 1, d);
      const sat = new Date(sunday);
      sat.setDate(sunday.getDate() + 6);
      const label = sunday.toLocaleDateString(undefined, { month: "long", day: "numeric" });
      return { key, label, visits: weekVisits };
    });

  function toggleWeek(key: string) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  useEffect(() => {
    const sunday = getWeekSunday(new Date());
    const farFuture = new Date(sunday);
    farFuture.setDate(sunday.getDate() + 7 * 12);
    supabase
      .from("visits")
      .select("id, visit_date, visit_time, is_recurring, cancelled, bringing_meal, bringing_groceries, volunteers(name), food_items(item_name, quantity)")
      .eq("cancelled", false)
      .gte("visit_date", toISODate(sunday))
      .lte("visit_date", toISODate(farFuture))
      .order("visit_date")
      .order("visit_time")
      .then(({ data }) => {
        if (data) setVisits(data as unknown as Visit[]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function fetchMessages() {
      supabase
        .from("exie_requests")
        .select("id, message, created_at")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setExieMessages(data);
        });
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);

    const channel = supabase
      .channel("exie_requests_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "exie_requests" }, (payload) => {
        const newMsg = payload.new as ExieMessage;
        setExieMessages((prev) => [newMsg, ...prev]);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  async function removeVisit(id: string) {
    const { error } = await supabase
      .from("visits")
      .update({ cancelled: true, cancelled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    setVisits((prev) => prev.filter((v) => v.id !== id));
  }

  async function clearMessage(id: string) {
    const { error } = await supabase.from("exie_requests").delete().eq("id", id);
    if (!error) setExieMessages((prev) => prev.filter((m) => m.id !== id));
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function formatVisitDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }

  function formatVisitTime(timeStr: string) {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase();
  }

  const display = (visit: Visit) =>
    `${formatVisitDate(visit.visit_date)} • ${formatVisitTime(visit.visit_time)}`;

  return (
    <main className="min-h-screen bg-[#fdf8f3] flex flex-col">
      {/* Header */}
      <div className="bg-white h-[60px] flex items-center justify-center relative shrink-0 sticky top-0 z-10">
        <Link href="/" className="absolute left-[17px] text-[#6b5740] text-[14px]">
          ← Home
        </Link>
        <h1
          className="text-[20px] text-[#2d2416] font-bold"
          style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif" }}
        >
          Volunteer Hub
        </h1>
      </div>

      {/* Scrollable body */}
      <div className="flex flex-col flex-1 gap-6 p-6 pb-[170px] overflow-y-auto">

        {/* Tab bar */}
        <div className="flex bg-white rounded-[16px] p-[6px] border border-[#efe8e0]">
          {(["schedule", "messages"] as MainTab[]).map((tab) => {
            const labels: Record<MainTab, string> = {
              schedule: "📅  Schedule",
              messages: "💬 Exie Msg",
            };
            const active = mainTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                className={`flex-1 py-3 rounded-[12px] text-[13px] font-semibold transition-colors relative ${
                  active ? "bg-[#7aab8a] text-white" : "text-[#6b5740]"
                }`}
              >
                {labels[tab]}
                {tab === "messages" && exieMessages.length > 0 && !active && (
                  <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-[#e8a87c] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Schedule Tab ─────────────────────────────────────────────────── */}
        {mainTab === "schedule" && (
          <div className="flex flex-col gap-6">
            {/* Exie message banner */}
            {latestMessage && (
              <div className="bg-[#fde8d5] border border-[#f0d0b0] rounded-[16px] p-[14px] flex flex-col gap-[6px]">
                <p className="text-[12px] font-semibold text-[#d6844c]">💬 New message from Exie</p>
                <p className="text-[13px] text-[#2d2416]">{latestMessage.message}</p>
              </div>
            )}

            {/* This week */}
            <div className="flex flex-col gap-3">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setThisWeekExpanded((v) => !v)}
              >
                <h2
                  className="text-[18px] font-extrabold text-[#6b5740]"
                  style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif" }}
                >
                  This week’s visits
                </h2>
                <ChevronIcon up={thisWeekExpanded} />
              </button>

              {thisWeekExpanded && thisWeekVisits.length === 0 ? (
                <div className="bg-white rounded-[16px] p-6 text-center text-[#b0a090] border border-[#f0e8dc]">
                  No visits scheduled this week.
                </div>
              ) : thisWeekExpanded ? (
                thisWeekVisits.map((visit) => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    expanded={expandedVisit === visit.id}
                    onToggle={() => setExpandedVisit(expandedVisit === visit.id ? null : visit.id)}
                    display={display(visit)}
                    onRemove={() => removeVisit(visit.id)}
                  />
                ))
              ) : null}
            </div>

            {/* Future weeks */}
            {futureWeekGroups.map(({ key, label, visits: weekVisits }) => (
              <div key={key} className="flex flex-col gap-3">
                <button
                  onClick={() => toggleWeek(key)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h2
                    className="text-[18px] font-extrabold text-[#6b5740]"
                    style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif" }}
                  >
                    Week of {label}
                  </h2>
                  <span className="text-[#b0a090] text-sm">
                    <ChevronIcon up={expandedWeeks.has(key)} />
                  </span>
                </button>
                {expandedWeeks.has(key) &&
                  weekVisits.map((visit) => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      expanded={expandedVisit === visit.id}
                      onToggle={() => setExpandedVisit(expandedVisit === visit.id ? null : visit.id)}
                      display={display(visit)}
                      onRemove={() => removeVisit(visit.id)}
                    />
                  ))}
              </div>
            ))}
          </div>
        )}

        {/* ── Messages Tab ─────────────────────────────────────────────────── */}
        {mainTab === "messages" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#6b5740]">Requests from Exie — clear them once handled.</p>
            {exieMessages.length === 0 ? (
              <div className="bg-white rounded-[16px] p-6 text-center text-[#b0a090] border border-[#f0e8dc]">
                No messages from Exie yet.
              </div>
            ) : (
              exieMessages.map((msg) => (
                <div key={msg.id} className="bg-white rounded-[16px] border border-[#f0e8dc] px-[14px] py-4 flex items-start justify-between gap-3">
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

      {/* Bottom CTA — gradient fade + floating button */}
      {mainTab === "schedule" && (
        <div className="fixed bottom-0 left-0 right-0 h-[170px] flex flex-col items-center justify-end p-6 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(253,248,243,0) 0%, #fdf8f3 45%)" }}
        >
          <Link
            href="/volunteer/sign-up"
            className="w-full max-w-lg h-16 flex items-center justify-center bg-[#7aab8a] hover:bg-[#699978] text-white text-[18px] font-bold rounded-[16px] shadow-[0px_0px_14px_0px_#cfc7bf] transition-colors pointer-events-auto"
            style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
          >
            Sign up for a visit
          </Link>
        </div>
      )}
    </main>
  );
}

function PantryListItem({
  item,
  revealed,
  onReveal,
  onHide,
  onDelete,
  touchStartX,
}: {
  item: PantryItem;
  revealed: boolean;
  onReveal: () => void;
  onHide: () => void;
  onDelete: () => void;
  touchStartX: React.MutableRefObject<number>;
}) {
  return (
    <div
      className="flex items-center gap-[10px] overflow-hidden"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (delta < -50) onReveal();
        else if (delta > 20) onHide();
      }}
    >
      <div className="flex-1 bg-white rounded-[16px] p-[14px] flex items-center justify-between">
        <span
          className="text-[13px] font-medium text-[#2d2416]"
          style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
        >
          {item.item_name}
        </span>
        {item.quantity && (
          <span
            className="text-[13px] font-medium text-[#b0a090]"
            style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
          >
            {item.quantity}
          </span>
        )}
      </div>
      {revealed && (
        <button
          onClick={onDelete}
          className="w-[44px] h-[44px] shrink-0 flex items-center justify-center bg-[#f93e14] rounded-[16px]"
        >
          <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4H17M7 9V15M11 9V15M2 4L3 17C3 18.1 3.9 19 5 19H13C14.1 19 15 18.1 15 17L16 4M6 4V2C6 1.4 6.4 1 7 1H11C11.6 1 12 1.4 12 2V4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function ChevronIcon({ up = false }: { up?: boolean }) {
  return (
    <span className="flex items-center justify-center w-[44px] h-[44px] shrink-0">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ transform: up ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 0.2s" }}
      >
        <path d="M1 1L9 10L17 1" stroke="#d4845a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}


function VisitCard({
  visit,
  expanded,
  onToggle,
  display,
  onRemove,
}: {
  visit: Visit;
  expanded: boolean;
  onToggle: () => void;
  display: string;
  onRemove: () => Promise<void>;
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(false);

  const name = visit.volunteers?.name ?? "Unknown";

  return (
    <div className={`bg-white rounded-[16px] overflow-hidden ${visit.cancelled ? "opacity-60" : ""}`}>
      {/* Card header row — always visible */}
      <button
        className="w-full flex items-start gap-[10px] p-[14px] text-left"
        onClick={onToggle}
      >
        <div className="flex flex-col gap-[6px] flex-1 min-w-0">
          <p
            className="text-[24px] text-[#2d2416] font-normal leading-none"
            style={{ fontFamily: "var(--font-crimson-pro), Georgia, serif" }}
          >
            {name}
          </p>
          <p
            className="text-[15px] text-[#988b7e] font-medium"
            style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
          >
            {display}
          </p>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="flex flex-col px-[14px] pb-[14px] gap-0">
          {/* Divider */}
          <div className="h-px bg-[#f0e8dc] mb-[14px]" />

          {/* Bringing section */}
          <div className="flex flex-col gap-4 py-[4px]">
            <p className="text-[10px] font-semibold tracking-[0.6px] text-[#a3988b] uppercase">
              Bringing
            </p>
            {visit.food_items.length > 0 ? (
              visit.food_items.map((fi, i) => (
                <div key={i} className="flex justify-between text-[13px] font-medium">
                  <span className="text-[#2d2416]">{fi.item_name}</span>
                  <span className="text-[#b0a090]">{fi.quantity}</span>
                </div>
              ))
            ) : (
              <p className="text-[13px] text-[#b0a090]">No food items listed.</p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-[#f0e8dc] mt-[14px] mb-[10px]" />

          {/* Actions */}
          {!confirmingRemove ? (
            <div className="flex items-center justify-between py-[4px]">
              <Link
                href={`/volunteer/edit/${visit.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[12px] font-bold tracking-[0.12px] text-[#7aab8a] uppercase"
              >
                Edit Visit
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmingRemove(true); }}
                className="text-[12px] font-bold tracking-[0.12px] text-[#f93e14] uppercase"
              >
                Cancel Visit
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 py-[4px]">
              {removeError && (
                <p className="text-xs text-[#f93e14]">Something went wrong — please try again.</p>
              )}
              <p className="text-sm text-[#2d2416]">
                {visit.is_recurring
                  ? "This is a recurring weekly visit — removing it will remove all future occurrences. Continue?"
                  : "Remove this visit from the schedule?"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    setRemoving(true);
                    setRemoveError(false);
                    try {
                      await onRemove();
                    } catch {
                      setRemoveError(true);
                    }
                    setRemoving(false);
                    setConfirmingRemove(false);
                  }}
                  disabled={removing}
                  className="text-sm bg-[#f93e14] hover:bg-red-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {removing ? "Removing…" : "Yes, remove"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmingRemove(false); }}
                  className="text-sm text-[#6b5740] px-3 py-1.5 rounded-lg border border-[#e8ddd0] hover:bg-[#f5efe8] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
