import { resolveSelectedSiteId } from './resolve-selected-site-id';

describe('resolveSelectedSiteId', () => {
  const demo = '11111111-1111-1111-1111-111111111111';
  const other = '22222222-2222-2222-2222-222222222222';

  it('returns null for empty catalog', () => {
    expect(resolveSelectedSiteId([], demo)).toBeNull();
  });

  it('prefers stored id when still present', () => {
    expect(resolveSelectedSiteId([{ id: demo }, { id: other }], other, demo)).toBe(other);
  });

  it('falls back to demo when stored is missing', () => {
    expect(resolveSelectedSiteId([{ id: demo }, { id: other }], 'gone', demo)).toBe(demo);
  });

  it('falls back to first site when demo is absent', () => {
    expect(resolveSelectedSiteId([{ id: other }], null, demo)).toBe(other);
  });
});
