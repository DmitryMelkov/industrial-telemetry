import { parseCreateCodeName, parsePatchCodeName } from './sites-payload';

describe('sites-payload', () => {
  it('parses create code/name with trim', () => {
    expect(parseCreateCodeName({ code: ' DEMO2 ', name: ' Demo Plant 2 ' })).toEqual({
      code: 'DEMO2',
      name: 'Demo Plant 2',
    });
  });

  it('rejects create when code or name is empty', () => {
    expect(parseCreateCodeName({ code: '', name: 'x' })).toBeNull();
    expect(parseCreateCodeName({ code: 'x', name: '  ' })).toBeNull();
    expect(parseCreateCodeName({})).toBeNull();
  });

  it('parses patch with only provided fields', () => {
    expect(parsePatchCodeName({ name: ' New ' })).toEqual({ name: 'New' });
    expect(parsePatchCodeName({ code: 'A1' })).toEqual({ code: 'A1' });
    expect(parsePatchCodeName({})).toEqual({});
  });

  it('rejects patch blank strings', () => {
    expect(parsePatchCodeName({ code: '  ' })).toBeNull();
    expect(parsePatchCodeName({ name: '' })).toBeNull();
  });
});
