export function fmtMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

/** "Asia/Ho_Chi_Minh" -> "Ho Chi Minh" — city part of any IANA name. */
export function fmtTimezone(tz: string): string {
  const city = tz.split("/").pop() ?? tz;
  return city.replaceAll("_", " ");
}

export function fmtElapsed(now: Date, start: Date): string {
  const totalSeconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export const fmtDay = (value: string) =>
  new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });

export const fmtDayLong = (value: string) =>
  new Date(value).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });

export const fmtClock = (value: string) =>
  new Date(value).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });

export const fmtStamp = (value: string) => new Date(value).toLocaleString();

/** e.g. hours="0", minutes="15" -> 0.25 */
export const toDecimalHours = (hours: string, minutes: string) => {
  const h = Number(hours) || 0;
  const m = Number(minutes) || 0;
  return Math.round((h + m / 60) * 100) / 100;
};

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Current wall-clock time as "HH:MM" for comparing against planned times. */
export const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
