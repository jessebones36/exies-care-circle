import { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import type { FoodItem, Volunteer, Visit } from '@/types/database'

// Initialized lazily inside the handler so it doesn't run at build time

type VisitRow = Visit & { volunteer: Volunteer; food_items: FoodItem[] }

export async function GET(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  // Verify Vercel cron secret when deployed
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // --- Calculate this week's Monday and Sunday ---
  const today = new Date()
  const dow = today.getDay() // 0 = Sun, 1 = Mon, …
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const mondayStr = toDateStr(monday)
  const sundayStr = toDateStr(sunday)

  // --- Fetch visits ---
  const [{ data: oneTime }, { data: recurring }] = await Promise.all([
    supabase
      .from('visits')
      .select('*, volunteer:volunteers(*), food_items(*)')
      .eq('is_recurring', false)
      .eq('cancelled', false)
      .gte('visit_date', mondayStr)
      .lte('visit_date', sundayStr),
    supabase
      .from('visits')
      .select('*, volunteer:volunteers(*), food_items(*)')
      .eq('is_recurring', true)
      .eq('cancelled', false),
  ])

  const allVisits = [...(oneTime ?? []), ...(recurring ?? [])] as VisitRow[]

  // --- Group by volunteer ---
  const byVolunteer = new Map<string, { volunteer: Volunteer; visits: VisitRow[] }>()

  for (const visit of allVisits) {
    const vol = visit.volunteer
    if (!vol?.email) continue
    if (!byVolunteer.has(vol.id)) {
      byVolunteer.set(vol.id, { volunteer: vol, visits: [] })
    }
    byVolunteer.get(vol.id)!.visits.push(visit)
  }

  // --- Send one email per volunteer ---
  let sent = 0
  const errors: string[] = []

  for (const { volunteer, visits } of byVolunteer.values()) {
    // Sort visits by their actual date/day this week
    const sorted = visits.slice().sort((a, b) => {
      return visitDate(a, monday).getTime() - visitDate(b, monday).getTime()
    })

    const visitCards = sorted.map((v) => buildVisitCard(v, monday)).join('')

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: volunteer.email!,
      subject: "Your visits this week – Exie's Care Circle",
      html: buildEmail(volunteer.name, mondayStr, sundayStr, visitCards),
    })

    if (error) {
      errors.push(`${volunteer.email}: ${error.message}`)
    } else {
      sent++
    }
  }

  return Response.json({
    sent,
    week: `${mondayStr} to ${sundayStr}`,
    ...(errors.length ? { errors } : {}),
  })
}

// --- Helpers ---

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

/** Returns the actual Date for a visit within the given week's Monday. */
function visitDate(visit: VisitRow, monday: Date): Date {
  if (!visit.is_recurring) {
    return new Date(visit.visit_date + 'T00:00:00')
  }
  // recurrence_day: 0=Sun, 1=Mon, … 6=Sat
  const daysFromMonday = visit.recurrence_day === 0 ? 6 : visit.recurrence_day! - 1
  const d = new Date(monday)
  d.setDate(monday.getDate() + daysFromMonday)
  return d
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function buildVisitCard(visit: VisitRow, monday: Date): string {
  const date = visitDate(visit, monday)
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const timeStr = formatTime(visit.visit_time)

  const bringing: string[] = []
  if (visit.bringing_meal) bringing.push('a meal')
  if (visit.bringing_groceries) bringing.push('groceries')

  const itemsList =
    visit.food_items?.length
      ? `<ul style="margin:6px 0 0;padding-left:20px;color:#6b5740;">
          ${visit.food_items
            .map(
              (fi) =>
                `<li>${fi.item_name}${fi.quantity ? ` — ${fi.quantity}` : ''}</li>`
            )
            .join('')}
        </ul>`
      : ''

  return `
    <div style="margin-bottom:14px;padding:14px 16px;background:#fdf8f3;border-radius:8px;border-left:4px solid #e8a87c;">
      <div style="font-weight:bold;font-size:16px;">${dayName}, ${dateStr}</div>
      <div style="color:#6b5740;margin-top:2px;">${timeStr}${bringing.length ? ` · Bringing ${bringing.join(' & ')}` : ''}</div>
      ${itemsList}
    </div>`
}

function buildEmail(
  name: string,
  mondayStr: string,
  sundayStr: string,
  visitCards: string
): string {
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2d2416;">
      <div style="background:#e8a87c;padding:24px 28px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;color:#fff;font-size:22px;">Exie's Care Circle</h1>
        <p style="margin:4px 0 0;color:#fff;opacity:0.9;font-size:14px;">Weekly Visit Reminder</p>
      </div>
      <div style="padding:28px;background:#fff;border-radius:0 0 12px 12px;border:1px solid #f0e6d8;border-top:none;">
        <p style="margin-top:0;">Hi ${name},</p>
        <p>Here ${visitCards.split('border-left').length - 1 === 1 ? "is your visit" : "are your visits"} scheduled for this week (${mondayStr} – ${sundayStr}):</p>
        ${visitCards}
        <p style="margin-bottom:0;color:#6b5740;font-size:14px;">
          Thank you so much for the time and care you give to Exie. It means the world!
        </p>
      </div>
    </div>`
}
