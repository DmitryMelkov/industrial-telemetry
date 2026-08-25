import { ChartThreshold } from './charts-range';
import { colorWithAlpha, resolveThresholdZones, resolveVisibleThresholds } from './threshold-zones';

describe('resolveVisibleThresholds', () => {
  const thresholds: ChartThreshold[] = [{ severity: 'warning', minValue: 60, maxValue: 90 }];

  it('should keep thresholds only for a single series', () => {
    expect(resolveVisibleThresholds(1, thresholds)).toEqual(thresholds);
    expect(resolveVisibleThresholds(0, thresholds)).toEqual([]);
    expect(resolveVisibleThresholds(2, thresholds)).toEqual([]);
  });
});

describe('resolveThresholdZones', () => {
  const warningBoth: ChartThreshold = { severity: 'warning', minValue: 60, maxValue: 90 };
  const criticalBoth: ChartThreshold = { severity: 'critical', minValue: 50, maxValue: 100 };

  it('should return empty when thresholds are empty', () => {
    expect(resolveThresholdZones([], 0, 100)).toEqual([]);
  });

  it('should return empty when scale is invalid', () => {
    expect(resolveThresholdZones([warningBoth], 10, 10)).toEqual([]);
    expect(resolveThresholdZones([warningBoth], Number.NaN, 100)).toEqual([]);
  });

  it('should paint warning+critical bands and leave the normal corridor empty', () => {
    expect(resolveThresholdZones([warningBoth, criticalBoth], 40, 110)).toEqual([
      { kind: 'critical', yMin: 40, yMax: 50 },
      { kind: 'warning', yMin: 50, yMax: 60 },
      { kind: 'warning', yMin: 90, yMax: 100 },
      { kind: 'critical', yMin: 100, yMax: 110 },
    ]);
  });

  it('should fill outward from a single max bound to the scale edge', () => {
    expect(
      resolveThresholdZones([{ severity: 'warning', minValue: null, maxValue: 90 }], 70, 100),
    ).toEqual([{ kind: 'warning', yMin: 90, yMax: 100 }]);
  });

  it('should fill outward from a single min bound to the scale edge', () => {
    expect(
      resolveThresholdZones([{ severity: 'critical', minValue: 50, maxValue: null }], 40, 80),
    ).toEqual([{ kind: 'critical', yMin: 40, yMax: 50 }]);
  });

  it('should use warning tint between warning max and critical max', () => {
    expect(
      resolveThresholdZones(
        [
          { severity: 'warning', minValue: null, maxValue: 80 },
          { severity: 'critical', minValue: null, maxValue: 95 },
        ],
        60,
        110,
      ),
    ).toEqual([
      { kind: 'warning', yMin: 80, yMax: 95 },
      { kind: 'critical', yMin: 95, yMax: 110 },
    ]);
  });

  it('should prefer critical when both severities are violated', () => {
    expect(
      resolveThresholdZones(
        [
          { severity: 'warning', minValue: 20, maxValue: null },
          { severity: 'critical', minValue: 20, maxValue: null },
        ],
        0,
        50,
      ),
    ).toEqual([{ kind: 'critical', yMin: 0, yMax: 20 }]);
  });

  it('should ignore bounds outside the current y-scale', () => {
    expect(resolveThresholdZones([warningBoth, criticalBoth], 65, 85)).toEqual([]);
  });

  it('should return empty zones when the visible scale sits inside the normal corridor', () => {
    expect(resolveThresholdZones([warningBoth, criticalBoth], 70, 80)).toEqual([]);
  });
});

describe('colorWithAlpha', () => {
  it('should convert hex and rgb into rgba', () => {
    expect(colorWithAlpha('#ff4d4f', 0.12)).toBe('rgba(255, 77, 79, 0.12)');
    expect(colorWithAlpha('rgb(250, 173, 20)', 0.1)).toBe('rgba(250, 173, 20, 0.1)');
  });
});
