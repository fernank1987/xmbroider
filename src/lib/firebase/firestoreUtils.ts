type RemoveUndefinedDeepOptions = {
  /** Dot-separated path used for development warnings. */
  path?: string;
};

/**
 * Removes undefined values recursively so Firestore setDoc/updateDoc payloads are valid.
 * Preserves null, false, 0, empty strings, arrays (minus undefined entries), Dates,
 * and Firestore FieldValue sentinels (e.g. serverTimestamp).
 */
export function removeUndefinedDeep<T>(value: T, options: RemoveUndefinedDeepOptions = {}): T {
  const result = sanitizeValue(value, options.path ?? "root");
  if (process.env.NODE_ENV === "development" && result.removedPaths.length > 0) {
    console.warn(
      "[firestore] Removed undefined field(s) before write:",
      result.removedPaths.join(", "),
    );
  }
  return result.value as T;
}

/** @deprecated Use removeUndefinedDeep */
export function sanitizeFirestoreData<T>(value: T): T {
  return removeUndefinedDeep(value);
}

function isFirestoreFieldValue(value: object): boolean {
  return "_methodName" in value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !isFirestoreFieldValue(value)
  );
}

function sanitizeValue(
  value: unknown,
  path: string,
): { value: unknown; removedPaths: string[] } {
  if (value === undefined) {
    return { value: undefined, removedPaths: [path] };
  }

  if (value === null || typeof value !== "object") {
    return { value, removedPaths: [] };
  }

  if (value instanceof Date) {
    return { value, removedPaths: [] };
  }

  if (Array.isArray(value)) {
    const removedPaths: string[] = [];
    const sanitizedItems: unknown[] = [];

    value.forEach((item, index) => {
      const result = sanitizeValue(item, `${path}[${index}]`);
      if (result.value === undefined) {
        removedPaths.push(...result.removedPaths, `${path}[${index}]`);
        return;
      }
      removedPaths.push(...result.removedPaths);
      sanitizedItems.push(result.value);
    });

    return { value: sanitizedItems, removedPaths };
  }

  if (isFirestoreFieldValue(value)) {
    return { value, removedPaths: [] };
  }

  if (!isPlainObject(value)) {
    return { value, removedPaths: [] };
  }

  const result: Record<string, unknown> = {};
  const removedPaths: string[] = [];

  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path === "root" ? key : `${path}.${key}`;
    const sanitized = sanitizeValue(nestedValue, nestedPath);
    if (sanitized.value === undefined) {
      removedPaths.push(...sanitized.removedPaths, nestedPath);
      continue;
    }
    removedPaths.push(...sanitized.removedPaths);
    result[key] = sanitized.value;
  }

  return { value: result, removedPaths };
}
