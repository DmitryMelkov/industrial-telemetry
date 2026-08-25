/** Палитра серий как в alarta.pl `CHART_PALETTE.ordinal`. */
export const CHART_SERIES_COLORS = [
  '#1E88E5',
  '#E53935',
  '#FB8C00',
  '#36A2EB',
  '#FF5733',
  '#4caf50',
  '#ffc107',
  '#9C27B0',
] as const;

export const getChartSeriesColor = (index: number): string =>
  CHART_SERIES_COLORS[
    ((index % CHART_SERIES_COLORS.length) + CHART_SERIES_COLORS.length) % CHART_SERIES_COLORS.length
  ];
