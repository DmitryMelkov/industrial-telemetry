export function decimalToInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numeric = Number(value);
  return Number.isNaN(numeric) ? String(value) : String(numeric);
}

export function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }

  const numeric = Number(trimmed);
  if (Number.isNaN(numeric)) {
    throw new Error(`Некорректное число: ${raw}`);
  }

  return numeric;
}
