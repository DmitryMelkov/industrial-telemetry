import { buildAlertsListQuery, matchesAlertFilters, resolveAlertsPeriod } from './alerts-query';

describe('alerts-query', () => {
  const now = Date.parse('2026-08-25T12:00:00.000Z');

  it('resolves period presets to openedAt bounds', () => {
    expect(resolveAlertsPeriod('all', now)).toEqual({});
    expect(resolveAlertsPeriod('1h', now)).toEqual({
      from: '2026-08-25T11:00:00.000Z',
      to: '2026-08-25T12:00:00.000Z',
    });
    expect(resolveAlertsPeriod('24h', now).from).toBe('2026-08-24T12:00:00.000Z');
  });

  it('builds list query without all-filters', () => {
    expect(
      buildAlertsListQuery({
        siteId: 'site-1',
        status: 'all',
        severity: 'all',
        period: 'all',
      }),
    ).toEqual({ siteId: 'site-1' });
  });

  it('builds list query with status, severity and period', () => {
    expect(
      buildAlertsListQuery({
        siteId: 'site-1',
        status: 'open',
        severity: 'critical',
        period: '1h',
        now,
      }),
    ).toEqual({
      siteId: 'site-1',
      status: 'open',
      severity: 'critical',
      from: '2026-08-25T11:00:00.000Z',
      to: '2026-08-25T12:00:00.000Z',
    });
  });

  it('matches journal filters for in-place updates', () => {
    expect(matchesAlertFilters({ status: 'open', severity: 'warning' }, 'open', 'all')).toBe(true);
    expect(matchesAlertFilters({ status: 'acked', severity: 'warning' }, 'open', 'all')).toBe(
      false,
    );
    expect(matchesAlertFilters({ status: 'open', severity: 'warning' }, 'all', 'critical')).toBe(
      false,
    );
  });
});
