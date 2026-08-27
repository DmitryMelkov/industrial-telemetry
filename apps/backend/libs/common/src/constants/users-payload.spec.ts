import {
  MIN_PASSWORD_LENGTH,
  parseCreateUser,
  parsePatchUser,
  parseUserRole,
} from './users-payload';

describe('users-payload', () => {
  it('parses create with trimmed lowercase email', () => {
    expect(
      parseCreateUser({
        email: ' Op2@Telemetry.Local ',
        password: 'password1',
        role: 'operator',
      }),
    ).toEqual({
      email: 'op2@telemetry.local',
      password: 'password1',
      role: 'operator',
    });
  });

  it('rejects create when email/password/role invalid', () => {
    expect(parseCreateUser({ email: 'bad', password: 'password1', role: 'operator' })).toBeNull();
    expect(
      parseCreateUser({
        email: 'a@b.co',
        password: 'short',
        role: 'operator',
      }),
    ).toBeNull();
    expect(
      parseCreateUser({
        email: 'a@b.co',
        password: 'password1',
        role: 'super',
      }),
    ).toBeNull();
    expect(parseCreateUser({})).toBeNull();
  });

  it('parses patch with only provided fields', () => {
    expect(parsePatchUser({ role: 'admin' })).toEqual({ role: 'admin' });
    expect(parsePatchUser({ email: ' New@X.io ' })).toEqual({ email: 'new@x.io' });
    expect(parsePatchUser({ password: 'password1' })).toEqual({ password: 'password1' });
    expect(parsePatchUser({})).toEqual({});
  });

  it('rejects patch blank or short password and bad role/email', () => {
    expect(parsePatchUser({ password: '' })).toBeNull();
    expect(parsePatchUser({ password: 'x'.repeat(MIN_PASSWORD_LENGTH - 1) })).toBeNull();
    expect(parsePatchUser({ email: '  ' })).toBeNull();
    expect(parsePatchUser({ role: 'root' })).toBeNull();
  });

  it('parses role enum', () => {
    expect(parseUserRole('operator')).toBe('operator');
    expect(parseUserRole('admin')).toBe('admin');
    expect(parseUserRole('other')).toBeNull();
  });
});
