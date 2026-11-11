export const CURRENT_STUDENT_ID = "S001";

export function formatSlot(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return time;

  const hour = Number(match[1]);
  if (hour < 0 || hour > 23) return time;
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "pm" : "am"}`;
}

export function oneRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
