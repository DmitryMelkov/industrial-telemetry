export const USER_ROLES = ['operator', 'admin'] as const;
export type UserRoleValue = (typeof USER_ROLES)[number];

export const MIN_PASSWORD_LENGTH = 8;

export interface CreateUserInput {
  email?: string | null;
  password?: string | null;
  role?: string | null;
}

export interface PatchUserInput {
  email?: string | null;
  password?: string | null;
  role?: string | null;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: UserRoleValue;
}

export interface PatchUserPayload {
  email?: string;
  password?: string;
  role?: UserRoleValue;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseUserRole(value: unknown): UserRoleValue | null {
  if (typeof value !== 'string') {
    return null;
  }
  return (USER_ROLES as readonly string[]).includes(value) ? (value as UserRoleValue) : null;
}

export function parseEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const email = value.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return null;
  }
  return email;
}

export function parsePassword(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return null;
  }
  return value;
}

/** Returns null if invalid. */
export function parseCreateUser(input: CreateUserInput): CreateUserPayload | null {
  const email = parseEmail(input.email);
  const password = parsePassword(input.password);
  const role = parseUserRole(input.role);
  if (!email || !password || !role) {
    return null;
  }
  return { email, password, role };
}

/**
 * Optional fields for PATCH. Empty object if nothing to update.
 * Null if a provided field is invalid. Empty password string → null.
 */
export function parsePatchUser(input: PatchUserInput): PatchUserPayload | null {
  const patch: PatchUserPayload = {};

  if (input.email !== undefined && input.email !== null) {
    const email = parseEmail(input.email);
    if (!email) {
      return null;
    }
    patch.email = email;
  }

  if (input.password !== undefined && input.password !== null) {
    if (typeof input.password !== 'string' || input.password.length === 0) {
      return null;
    }
    const password = parsePassword(input.password);
    if (!password) {
      return null;
    }
    patch.password = password;
  }

  if (input.role !== undefined && input.role !== null) {
    const role = parseUserRole(input.role);
    if (!role) {
      return null;
    }
    patch.role = role;
  }

  return patch;
}
