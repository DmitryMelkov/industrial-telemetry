export interface SiteLineCodeNameInput {
  code?: string | null;
  name?: string | null;
}

export interface SiteLineCodeName {
  code: string;
  name: string;
}

export interface SiteLineCodeNamePatch {
  code?: string;
  name?: string;
}

/** Trim + require non-empty code/name for create. Returns null if invalid. */
export function parseCreateCodeName(input: SiteLineCodeNameInput): SiteLineCodeName | null {
  const code = typeof input.code === 'string' ? input.code.trim() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!code || !name) {
    return null;
  }
  return { code, name };
}

/** Trim optional fields for PATCH. Empty object if nothing to update; null if invalid empty string. */
export function parsePatchCodeName(input: SiteLineCodeNameInput): SiteLineCodeNamePatch | null {
  const patch: SiteLineCodeNamePatch = {};

  if (input.code !== undefined && input.code !== null) {
    if (typeof input.code !== 'string') {
      return null;
    }
    const code = input.code.trim();
    if (!code) {
      return null;
    }
    patch.code = code;
  }

  if (input.name !== undefined && input.name !== null) {
    if (typeof input.name !== 'string') {
      return null;
    }
    const name = input.name.trim();
    if (!name) {
      return null;
    }
    patch.name = name;
  }

  return patch;
}
