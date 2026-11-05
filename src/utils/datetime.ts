/**
 * Pure date/time helpers for the reservation pickers.
 *
 * Month and weekday names are spelled out here rather than pulled from `Intl`
 * so the calendar and time wheel read identically on web, iOS and Android.
 */

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAYS_MIN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Last millisecond of `date` — the inclusive end of a day-range filter. */
export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

/** One cell of the month grid. */
export type CalendarDay = {
  key: string;
  date: Date;
  label: number;
  /** False for the leading/trailing days that belong to the neighbouring month. */
  inMonth: boolean;
  isToday: boolean;
  /** Before the selectable floor or after the ceiling — rendered greyed out and inert. */
  outOfRange: boolean;
};

/**
 * Builds a whole number of weeks for `month`, padded with the neighbouring
 * months' days so every row has seven cells. Trailing empty weeks are trimmed.
 *
 * `minDate` is the earliest selectable day, defaulting to `today` — a booking
 * can never be placed in the past, but a history search reaches back, so that
 * floor is a parameter rather than baked in. `maxDate`, when given, is the
 * latest selectable day (a booking's 90-day horizon).
 */
export function buildMonthGrid(month: Date, today: Date, minDate?: Date, maxDate?: Date): CalendarDay[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leading = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((leading + daysInMonth) / 7) * 7;
  const floor = startOfDay(minDate ?? today).getTime();
  const ceiling = maxDate ? startOfDay(maxDate).getTime() : Infinity;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(year, monthIndex, index + 1 - leading);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      date,
      label: date.getDate(),
      inMonth: date.getMonth() === monthIndex && date.getFullYear() === year,
      isToday: isSameDay(date, today),
      outOfRange: date.getTime() < floor || date.getTime() > ceiling,
    };
  });
}

/** "Fri, 22 Aug 2026" */
export function formatFullDate(date: Date): string {
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** "08/05/2026" — the compact form used in the ride history table. */
export function formatSlashDate(date: Date): string {
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()}`;
}

/** "3:00 pm" — the clock line under a pickup date. */
export function formatClockTime(date: Date): string {
  const hours24 = date.getHours();
  const hour = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hour}:${pad2(date.getMinutes())} ${hours24 >= 12 ? 'pm' : 'am'}`;
}

/** "August 2026" — the calendar header. */
export function formatMonthTitle(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * "Today" / "Tomorrow" / "In 5 days" — always distinct from the formatted
 * date, so it can sit under one as a caption without repeating it.
 */
export function formatDayDistance(date: Date, today: Date): string {
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.round((startOfDay(date).getTime() - startOfDay(today).getTime()) / dayMs);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return days > 0 ? `In ${days} days` : `${Math.abs(days)} days ago`;
}

/** "Today" / "Tomorrow" / "Fri, 22 Aug 2026" */
export function formatRelativeDate(date: Date, today: Date): string {
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, addDays(today, 1))) return 'Tomorrow';
  return formatFullDate(date);
}

export type Meridiem = 'AM' | 'PM';

export type TimeValue = {
  /** 1–12, twelve-hour clock. */
  hour: number;
  minute: number;
  meridiem: Meridiem;
};

/** Wheel columns. Minutes step by five — reservations are not booked to the second. */
export const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
export const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => i * 5);
export const MERIDIEM_OPTIONS: readonly Meridiem[] = ['AM', 'PM'];

/** "02:30 PM" */
export function formatTime(time: TimeValue): string {
  return `${pad2(time.hour)}:${pad2(time.minute)} ${time.meridiem}`;
}

export function timeEquals(a: TimeValue, b: TimeValue): boolean {
  return a.hour === b.hour && a.minute === b.minute && a.meridiem === b.meridiem;
}

function toTimeValue(date: Date): TimeValue {
  const hours24 = date.getHours();
  const meridiem: Meridiem = hours24 >= 12 ? 'PM' : 'AM';
  const hour = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return { hour, minute: date.getMinutes(), meridiem };
}

/** Rounds `from` up to the next five-minute mark — the default pickup slot. */
export function nextSlot(from: Date, stepMinutes = 5): TimeValue {
  const rounded = new Date(from.getTime());
  rounded.setSeconds(0, 0);
  rounded.setMinutes(Math.ceil((rounded.getMinutes() + 1) / stepMinutes) * stepMinutes);
  return toTimeValue(rounded);
}
