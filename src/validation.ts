export function assertObject(
  obj: unknown,
  path: string
): asserts obj is Record<string, unknown> {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    throw new Error(
      `Invalid ${path}: expected object, got ${detailedTypeOf(obj)}`
    );
  }
}

export function assertNumber(
  obj: unknown,
  path: string
): asserts obj is number {
  if (typeof obj !== "number") {
    throw new Error(
      `Invalid ${path}: expected number, got ${detailedTypeOf(obj)}`
    );
  }
}

export function assertString(
  obj: unknown,
  path: string
): asserts obj is string {
  if (typeof obj !== "string") {
    throw new Error(
      `Invalid ${path}: expected string, got ${detailedTypeOf(obj)}`
    );
  }
}

export function assertBoolean(
  obj: unknown,
  path: string
): asserts obj is boolean {
  if (typeof obj !== "boolean") {
    throw new Error(
      `Invalid ${path}: expected boolean, got ${detailedTypeOf(obj)}`
    );
  }
}

export function detailedTypeOf(obj: unknown): string {
  if (Array.isArray(obj)) return "array";
  else if (obj === null) return "null";
  else return typeof obj;
}
