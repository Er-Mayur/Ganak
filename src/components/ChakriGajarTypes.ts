export type CgScreen =
  | "home" | "createGroup" | "groupDetails" | "scheduleList"
  | "activeSlot" | "cgCounter"
  | "cgCalendar" | "scheduleSummary";

export interface CgGroup {
  id: string;
  name: string;
  code: string;
  created_by: string;
  role: string;
  totalJaap?: number;
  icon?: string;
  /** Event id for today's date, if one exists — used for Home screen green dot navigation */
  todayEventId?: string;
  todayEventDate?: string;
  /** True only when user has an active booking for the current clock hour */
  hasActiveSlotNow?: boolean;
}

export interface CgEvent {
  id: string;
  group_id: string;
  date: string;
}

export interface CgBooking {
  id: string;
  event_id: string;
  group_id: string;
  user_id: string;
  date: string;
  hour: number;
  jaaps: number;
}

export interface CgMember {
  user_id: string;
  role: string;
  display_name: string | null;
}

export const SLOT_LABELS = [
  "12AM–3AM","3AM–6AM","6AM–9AM","9AM–12PM",
  "12PM–3PM","3PM–6PM","6PM–9PM","9PM–12AM",
];

export const SLOT_HOURS = [
  [0,1,2],[3,4,5],[6,7,8],[9,10,11],
  [12,13,14],[15,16,17],[18,19,20],[21,22,23],
];

export const HOUR_LABELS = [
  "12AM","1AM","2AM","3AM","4AM","5AM","6AM","7AM","8AM","9AM","10AM","11AM",
  "12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM","10PM","11PM",
];

export const HOUR_NEXT_LABELS = [
  "1AM","2AM","3AM","4AM","5AM","6AM","7AM","8AM","9AM","10AM","11AM","12PM",
  "1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM","10PM","11PM","12AM",
];

export const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

/** Returns display label for a member — display_name if set, else last 6 chars of user_id */
export const memberLabel = (m: CgMember) =>
  m.display_name?.trim() || `User·${m.user_id.slice(-6)}`;

/**
 * Returns the current Date object adjusted to IST (Asia/Kolkata, UTC+5:30).
 * Use this instead of new Date() for all time comparisons in this feature.
 */
export const getISTNow = (): Date => {
  const utc = new Date();
  // IST = UTC + 5h30m = +19800000 ms
  return new Date(utc.getTime() + utc.getTimezoneOffset() * 60000 + 19800000);
};

/** Format a Date as YYYY-MM-DD string (use with getISTNow() for IST-safe dates) */
export const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Returns true if the given event date + hour is strictly in the past (IST).
 * @param eventDate  YYYY-MM-DD string of the event
 * @param hour       0–23 hour of the slot
 * @param istNow     result of getISTNow() — pass once to avoid repeated calls
 */
export const isPastSlot = (eventDate: string, hour: number, istNow: Date): boolean => {
  const todayIST = toDateStr(istNow);
  if (eventDate < todayIST) return true;          // entire day is past
  if (eventDate > todayIST) return false;         // future date, never past
  return hour < istNow.getHours();                // same day: past if hour already gone
};

