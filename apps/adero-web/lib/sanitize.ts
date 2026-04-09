export function sanitizeString(input: string): string {
  return input.replaceAll("\u0000", "").trim().slice(0, 10_000);
}

export function sanitizeSearchParams(
  params: Record<string, string | undefined>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== "string") {
      continue;
    }

    sanitized[key] = sanitizeString(value);
  }

  return sanitized;
}
