const horizontalWhitespacePattern = /[^\S\r\n]+/g;

export function sanitizeString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return sanitizeTextValue(value);
}

export function sanitizeOptionalString(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }

  const sanitizedValue = sanitizeString(value);
  if (typeof sanitizedValue !== 'string') {
    return sanitizedValue;
  }

  return sanitizedValue.length > 0 ? sanitizedValue : undefined;
}

export function normalizeEmail(value: unknown): unknown {
  const sanitizedValue = sanitizeString(value);

  return typeof sanitizedValue === 'string' ? sanitizedValue.toLowerCase() : sanitizedValue;
}

export function sanitizeTextValue(value: string): string {
  return removeUnsafeControlCharacters(value)
    .replace(/\r\n?/g, '\n')
    .replace(horizontalWhitespacePattern, ' ')
    .trim();
}

export function truncateSanitizedText(value: string, maxLength: number): string {
  const sanitizedValue = sanitizeTextValue(value);

  return sanitizedValue.length <= maxLength ? sanitizedValue : sanitizedValue.slice(0, maxLength).trim();
}

function removeUnsafeControlCharacters(value: string): string {
  return [...value]
    .filter((character) => {
      const codePoint = character.codePointAt(0);

      return (
        codePoint !== undefined &&
        (codePoint === 9 || codePoint === 10 || codePoint === 13 || (codePoint >= 32 && codePoint !== 127))
      );
    })
    .join('');
}
