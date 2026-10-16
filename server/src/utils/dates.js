// Converts a Date or date string to a Date at 00:00:00 UTC (date-only value).
export const toDateOnly = (value) => {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// Today's date as a date-only value (UTC midnight).
export const todayDateOnly = () => toDateOnly(new Date());