function weekdayNumber(day: string) {
  const normalized = day.trim().toLocaleLowerCase("vi");
  if (normalized === "cn" || normalized === "chủ nhật") return 0;
  const match = normalized.match(/(?:thứ\s*)?([2-8])/);
  return match ? (Number(match[1]) - 1) % 7 : null;
}

function timeInMinutes(value: string) {
  const match = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function isOutsideBusinessHours(schedule: string, timeZone: string, date = new Date()) {
  const intervals = schedule.split(/[\n;,]+/).flatMap((line) => {
    const match = line.match(/((?:thứ\s*)?(?:[2-8]|cn|chủ nhật))(?:\s*-\s*((?:thứ\s*)?(?:[2-8]|cn|chủ nhật)))?\s*:\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i);
    if (!match) return [];
    const startDay = weekdayNumber(match[1]);
    const endDay = weekdayNumber(match[2] ?? match[1]);
    const startMinute = timeInMinutes(match[3]);
    const endMinute = timeInMinutes(match[4]);
    if (startDay === null || endDay === null || startMinute === null || endMinute === null || startMinute === endMinute) return [];
    const days: number[] = [];
    for (let day = startDay, count = 0; count < 7; day = (day + 1) % 7, count += 1) {
      days.push(day);
      if (day === endDay) break;
    }
    return [{ days, startMinute, endMinute }];
  });
  if (!intervals.length) return false;

  let weekday: string;
  let hour: number;
  let minute: number;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    weekday = values.weekday;
    hour = Number(values.hour);
    minute = Number(values.minute);
  } catch {
    return false;
  }
  const day = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[weekday];
  if (day === undefined) return false;
  const currentMinute = hour * 60 + minute;
  const isOpen = intervals.some(({ days, startMinute, endMinute }) => {
    if (endMinute > startMinute) return days.includes(day) && currentMinute >= startMinute && currentMinute < endMinute;
    return (days.includes(day) && currentMinute >= startMinute) || (days.includes((day + 6) % 7) && currentMinute < endMinute);
  });
  return !isOpen;
}
