export const APP_TIME_ZONE = "America/Sao_Paulo";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const DATE_TIME_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

const APP_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function getAppDateTimeParts(date: Date): DateParts {
  const values = new Map(
    DATE_TIME_PARTS_FORMATTER
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: values.get("year") ?? date.getUTCFullYear(),
    month: values.get("month") ?? date.getUTCMonth() + 1,
    day: values.get("day") ?? date.getUTCDate(),
    hour: values.get("hour") ?? date.getUTCHours(),
    minute: values.get("minute") ?? date.getUTCMinutes(),
    second: values.get("second") ?? date.getUTCSeconds()
  };
}

function getTimeZoneOffsetMs(date: Date): number {
  const parts = getAppDateTimeParts(date);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return localAsUtc - date.getTime();
}

function isUtcDateOnly(date: Date): boolean {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

function getDateOnlyAwareParts(reference: Date): Pick<DateParts, "year" | "month" | "day"> {
  if (isUtcDateOnly(reference)) {
    return {
      year: reference.getUTCFullYear(),
      month: reference.getUTCMonth() + 1,
      day: reference.getUTCDate()
    };
  }

  return getAppDateTimeParts(reference);
}

function zonedLocalDateTimeToUtc(params: DateParts & { millisecond?: number }): Date {
  const localAsUtc = Date.UTC(
    params.year,
    params.month - 1,
    params.day,
    params.hour,
    params.minute,
    params.second,
    params.millisecond ?? 0
  );
  let result = new Date(localAsUtc - getTimeZoneOffsetMs(new Date(localAsUtc)));
  result = new Date(localAsUtc - getTimeZoneOffsetMs(result));

  return result;
}

export function getAppNow(): Date {
  return new Date();
}

export function getAppHour(date: Date = getAppNow()): number {
  return getAppDateTimeParts(date).hour;
}

export function createAppDateOnly(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

export function parseAppDateInput(value: string): Date | null {
  const [year, month, day] = value.split("-").map((item) => Number(item));

  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const parsed = createAppDateOnly(year, month, day);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function formatAppDateInput(date: Date): string {
  const parts = getDateOnlyAwareParts(date);
  const year = parts.year;
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatAppDate(date: Date): string {
  const parts = getDateOnlyAwareParts(date);
  const day = String(parts.day).padStart(2, "0");
  const month = String(parts.month).padStart(2, "0");

  return `${day}/${month}/${parts.year}`;
}

export function formatAppDateTime(date: Date): string {
  return APP_DATE_TIME_FORMATTER.format(date).replace(",", "");
}

export function getAppDate(reference: Date = getAppNow()): Date {
  const parts = getAppDateTimeParts(reference);
  return createAppDateOnly(parts.year, parts.month, parts.day);
}

export function getStartOfAppDay(reference: Date = getAppNow()): Date {
  const parts = getDateOnlyAwareParts(reference);
  return zonedLocalDateTimeToUtc({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0
  });
}

export function getEndOfAppDay(reference: Date = getAppNow()): Date {
  const parts = getDateOnlyAwareParts(reference);
  return zonedLocalDateTimeToUtc({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999
  });
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getAppMonthYear(date: Date): { mes: number; ano: number } {
  const parts = getDateOnlyAwareParts(date);

  return {
    mes: parts.month,
    ano: parts.year
  };
}

export function getAppMonthDateRange(mes: number, ano: number): { start: Date; end: Date } {
  return {
    start: createAppDateOnly(ano, mes, 1),
    end: createAppDateOnly(ano, mes + 1, 0)
  };
}

export function getAppWeekDateRange(referenceDate: Date = getAppNow()): {
  start: Date;
  end: Date;
} {
  const dateOnly = isUtcDateOnly(referenceDate)
    ? referenceDate
    : getAppDate(referenceDate);
  const dayOfWeek = dateOnly.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = addDays(dateOnly, diffToMonday);

  return {
    start,
    end: addDays(start, 6)
  };
}

export function getAppYearDateRange(ano: number): { start: Date; end: Date } {
  return {
    start: createAppDateOnly(ano, 1, 1),
    end: createAppDateOnly(ano, 12, 31)
  };
}
