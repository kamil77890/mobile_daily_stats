export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, delta: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}

export function lastNDayKeys(n: number, from = new Date()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

export function monthMatrix(anchor: Date): { key: string; inMonth: boolean }[][] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startWeekday = (first.getDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startWeekday);
  const rows: { key: string; inMonth: boolean }[][] = [];
  let cursor = new Date(gridStart);
  for (let r = 0; r < 6; r++) {
    const row: { key: string; inMonth: boolean }[] = [];
    for (let c = 0; c < 7; c++) {
      row.push({
        key: dayKey(cursor),
        inMonth: cursor.getMonth() === anchor.getMonth(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    rows.push(row);
  }
  return rows;
}
