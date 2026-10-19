export function meetingDate(value: string | null) {
  if (!value) return "No scheduled time";
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + "Z";
  return new Date(normalized).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export const shortDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
