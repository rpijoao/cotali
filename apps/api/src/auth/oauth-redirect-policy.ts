export const OAUTH_REDIRECT_FIELDS = [
  'callbackURL',
  'errorCallbackURL',
  'newUserCallbackURL',
] as const;

export type OAuthRedirectField = (typeof OAUTH_REDIRECT_FIELDS)[number];

export type OAuthRedirectValidation =
  { valid: true } | { valid: false; field: OAuthRedirectField };

export function validateOAuthRedirects(
  body: unknown,
  trustedOrigins: readonly string[],
): OAuthRedirectValidation {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: true };
  }

  for (const field of OAUTH_REDIRECT_FIELDS) {
    const value = (body as Record<string, unknown>)[field];
    if (value === undefined) continue;
    if (
      typeof value !== 'string' ||
      !isTrustedOAuthURL(value, trustedOrigins)
    ) {
      return { valid: false, field };
    }
  }

  return { valid: true };
}

function isTrustedOAuthURL(
  value: string,
  trustedOrigins: readonly string[],
): boolean {
  if (isSafeRelativeURL(value)) return true;

  return trustedOrigins.some((pattern) => matchesOriginPattern(value, pattern));
}

function matchesOriginPattern(value: string, pattern: string): boolean {
  if (pattern.includes('*') || pattern.includes('?')) {
    return wildcardMatch(value, pattern);
  }

  const valueHTTPOrigin = readHTTPOrigin(value);
  const patternHTTPOrigin = readHTTPOrigin(pattern);
  if (valueHTTPOrigin || patternHTTPOrigin) {
    return Boolean(
      valueHTTPOrigin &&
      patternHTTPOrigin &&
      valueHTTPOrigin === patternHTTPOrigin,
    );
  }

  const parsedValue = parseCustomSchemeOrigin(value);
  const parsedPattern = parseCustomSchemeOrigin(pattern);
  if (!parsedValue || !parsedPattern) return false;
  if (parsedValue.scheme !== parsedPattern.scheme) return false;
  if (
    parsedPattern.authority &&
    parsedValue.authority !== parsedPattern.authority
  ) {
    return false;
  }
  if (!parsedPattern.path) return true;
  return (
    parsedValue.path === parsedPattern.path ||
    parsedValue.path.startsWith(`${parsedPattern.path}/`)
  );
}

function readHTTPOrigin(value: string): string | undefined {
  if (!/^https?:\/\//i.test(value)) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return undefined;
  }
}

function parseCustomSchemeOrigin(value: string): {
  scheme: string;
  authority: string;
  path: string;
} | null {
  const match = /^([a-z][a-z\d+.-]*):\/\/([^/?#]*)(\/[^?#]*)?$/i.exec(value);
  if (!match) return null;
  return {
    scheme: match[1]!.toLowerCase(),
    authority: match[2]!.toLowerCase(),
    path: normalizePath(match[3] ?? ''),
  };
}

function normalizePath(path: string): string {
  const segments: string[] = [];
  for (const segment of path.split('/')) {
    if (segment === '..') segments.pop();
    else if (segment !== '' && segment !== '.') segments.push(segment);
  }
  return segments.length ? `/${segments.join('/')}` : '';
}

function wildcardMatch(value: string, pattern: string): boolean {
  const expression = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${expression}$`, 'i').test(value);
}

function isSafeRelativeURL(value: string): boolean {
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    containsControlCharacter(value)
  ) {
    return false;
  }

  const pathEnd = value.search(/[?#]/);
  const path = pathEnd === -1 ? value : value.slice(0, pathEnd);
  if (/%2[fF]|%5[cC]/.test(path)) return false;

  try {
    return (
      new URL(value, 'https://cotali.invalid').origin ===
      'https://cotali.invalid'
    );
  } catch {
    return false;
  }
}

function containsControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if ((code >= 0 && code <= 31) || (code >= 127 && code <= 159)) {
      return true;
    }
  }
  return false;
}
