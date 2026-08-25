import { SEED_IDS } from './seed-ids';
import { sampleSensorValue, SEED_SENSORS, type SeedSensorSpec } from './seed-sensors';

const t101 = SEED_SENSORS.find((sensor) => sensor.sensorId === SEED_IDS.sensors.t101);
const p201 = SEED_SENSORS.find((sensor) => sensor.sensorId === SEED_IDS.sensors.p201);

if (!t101 || !p201) {
  throw new Error('SEED_SENSORS must include T-101 and P-201');
}

const midRng = () => 0.5;

describe('sampleSensorValue', () => {
  it('uses base ± noise when there is no excursion', () => {
    expect(sampleSensorValue(p201, 0, midRng)).toBe(p201.baseValue);
    expect(sampleSensorValue(p201, 10_000, midRng)).toBe(p201.baseValue);
  });

  it('holds T-101 above warning for the full hold window from process start', () => {
    const excursion = t101.excursion;
    expect(excursion).toBeDefined();
    if (!excursion) {
      return;
    }

    const atStart = sampleSensorValue(t101, 0, midRng);
    const nearEnd = sampleSensorValue(t101, excursion.holdMs - 1, midRng);
    const afterHold = sampleSensorValue(t101, excursion.holdMs, midRng);

    expect(atStart).toBe(excursion.warningValue);
    expect(nearEnd).toBe(excursion.warningValue);
    expect(afterHold).toBe(t101.baseValue);
    expect(atStart).toBeGreaterThan(90);
    expect(atStart).toBeLessThan(100);
  });

  it('uses critical on every Nth cycle and warning otherwise', () => {
    const excursion = t101.excursion;
    expect(excursion).toBeDefined();
    if (!excursion) {
      return;
    }

    const cycle0 = sampleSensorValue(t101, 1_000, midRng);
    const cycle1 = sampleSensorValue(t101, excursion.periodMs + 1_000, midRng);
    const cycle2 = sampleSensorValue(t101, excursion.periodMs * 2 + 1_000, midRng);

    expect(cycle0).toBe(excursion.warningValue);
    expect(cycle1).toBe(excursion.warningValue);
    expect(cycle2).toBe(excursion.criticalValue);
    expect(cycle2).toBeGreaterThan(100);
  });

  it('returns to base between excursions long enough for hysteresis', () => {
    const excursion = t101.excursion;
    expect(excursion).toBeDefined();
    if (!excursion) {
      return;
    }

    const gapMs = excursion.periodMs - excursion.holdMs;
    expect(gapMs).toBeGreaterThan(20_000);

    const midGap = sampleSensorValue(t101, excursion.holdMs + 5_000, midRng);
    expect(midGap).toBe(t101.baseValue);
  });

  it('does not apply seed excursion to an admin-created spec', () => {
    const adminSensor: SeedSensorSpec = {
      sensorId: 'admin-created',
      siteId: SEED_IDS.site,
      lineId: SEED_IDS.lineA,
      metric: 'temperature',
      unit: '°C',
      baseValue: 75,
      noise: 8,
    };

    expect(sampleSensorValue(adminSensor, 0, midRng)).toBe(75);
  });
});
