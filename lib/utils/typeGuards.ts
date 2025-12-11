/**
 * Type Guards and Type Utilities
 * 
 * Production-grade type safety utilities for runtime validation and type narrowing.
 * These utilities bridge the gap between TypeScript's compile-time types and
 * runtime data validation, ensuring type safety throughout the application.
 * 
 * @module lib/utils/typeGuards
 */

import { z } from 'zod';

/**
 * JSONValue type representing all valid JSON-serializable values
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * Type guard for checking if a value is a valid database row with required fields
 * 
 * @template T - The expected row type
 * @param value - The value to check
 * @param requiredFields - Array of field names that must be present
 * @returns True if value is an object containing all required fields
 * 
 * @example
 * ```typescript
 * const data = await supabase.from('users').select('*').single();
 * if (isDatabaseRow<UserRow>(data, ['id', 'email'])) {
 *   // data is now typed as UserRow
 *   console.log(data.id, data.email);
 * }
 * ```
 */
export function isDatabaseRow<T extends Record<string, unknown>>(
  value: unknown,
  requiredFields: (keyof T)[]
): value is T {
  if (!value || typeof value !== 'object') return false;
  return requiredFields.every(field => field in value);
}

/**
 * Safely parse unknown database result using Zod schema
 * 
 * @template T - The expected parsed type
 * @param data - The unknown data from database
 * @param schema - Zod schema to validate against
 * @returns Parsed data or null if validation fails
 * 
 * @example
 * ```typescript
 * const UserSchema = z.object({ id: z.string(), email: z.string() });
 * const result = parseDbResult(dbData, UserSchema);
 * if (result) {
 *   // result is typed as { id: string; email: string }
 *   console.log(result.email);
 * }
 * ```
 */
export function parseDbResult<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Database result parsing failed:', {
        errors: error.errors,
        data: JSON.stringify(data, null, 2)
      });
    } else {
      console.error('Unexpected error parsing database result:', error);
    }
    return null;
  }
}

/**
 * Parse array of database results, filtering out invalid entries
 * 
 * @template T - The expected parsed type
 * @param data - Array of unknown data from database
 * @param schema - Zod schema to validate against
 * @returns Array of successfully parsed items
 * 
 * @example
 * ```typescript
 * const users = parseDbResults(dbData, UserSchema);
 * // users is typed as User[], with invalid entries filtered out
 * ```
 */
export function parseDbResults<T>(
  data: unknown[],
  schema: z.ZodSchema<T>
): T[] {
  return data
    .map(item => parseDbResult(item, schema))
    .filter((item): item is T => item !== null);
}

/**
 * Type guard for JSONValue compatibility
 * 
 * Recursively checks if a value can be safely serialized to JSON.
 * This is useful for ensuring data can be stored in JSONB columns
 * or sent over the wire.
 * 
 * @param value - The value to check
 * @returns True if value is JSON-serializable
 * 
 * @example
 * ```typescript
 * const data = { name: 'test', date: new Date() };
 * if (isJSONValue(data)) {
 *   // Safe to store in JSONB column
 *   await supabase.from('table').insert({ metadata: data });
 * }
 * ```
 */
export function isJSONValue(value: unknown): value is JSONValue {
  if (value === null) return true;
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  
  if (Array.isArray(value)) {
    return value.every(isJSONValue);
  }
  
  if (typeof value === 'object') {
    return Object.values(value).every(isJSONValue);
  }
  
  return false;
}

/**
 * Convert complex object to JSONValue safely
 * 
 * Uses JSON.stringify/parse round-trip to ensure the result is
 * a valid JSONValue. This removes non-serializable properties
 * like functions, undefined values, and circular references.
 * 
 * @param value - The value to convert
 * @returns JSONValue representation or null if conversion fails
 * 
 * @example
 * ```typescript
 * const obj = { name: 'test', fn: () => {}, date: new Date() };
 * const json = toJSONValue(obj);
 * // json = { name: 'test', date: '2024-01-01T00:00:00.000Z' }
 * ```
 */
export function toJSONValue(value: unknown): JSONValue | null {
  try {
    const json = JSON.stringify(value);
    return JSON.parse(json) as JSONValue;
  } catch (error) {
    console.error('Failed to convert to JSONValue:', {
      error,
      value: String(value).substring(0, 100)
    });
    return null;
  }
}

/**
 * Type guard for checking if a validation result is successful
 * 
 * @template T - The expected data type
 * @param result - Validation result to check
 * @returns True if result indicates success
 */
export function isValidationSuccess<T>(
  result: { success: boolean; data?: T; error?: unknown }
): result is { success: true; data: T } {
  return result.success === true && 'data' in result;
}

/**
 * Type guard for checking if a validation result is a failure
 * 
 * @param result - Validation result to check
 * @returns True if result indicates failure
 */
export function isValidationFailure(
  result: { success: boolean; data?: unknown; error?: unknown }
): result is { success: false; error: unknown } {
  return result.success === false && 'error' in result;
}

/**
 * Type guard for checking if a value is a non-null object
 * 
 * @param value - The value to check
 * @returns True if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if a value is a string
 * 
 * @param value - The value to check
 * @returns True if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for checking if a value is a number
 * 
 * @param value - The value to check
 * @returns True if value is a number and not NaN
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Safely access nested property with type safety
 * 
 * @template T - The expected return type
 * @param obj - The object to access
 * @param path - Dot-separated path to property
 * @param defaultValue - Default value if property doesn't exist
 * @returns The property value or default
 * 
 * @example
 * ```typescript
 * const value = safeGet<string>(obj, 'user.profile.name', 'Unknown');
 * ```
 */
export function safeGet<T>(
  obj: unknown,
  path: string,
  defaultValue: T
): T {
  if (!isObject(obj)) return defaultValue;
  
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (!isObject(current) || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current as T;
}

/**
 * Assert that a value is defined (not null or undefined)
 * 
 * @template T - The value type
 * @param value - The value to check
 * @param message - Error message if assertion fails
 * @returns The value, typed as non-nullable
 * @throws Error if value is null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value must be defined'
): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

/**
 * Type guard for checking if an error is an Error instance
 * 
 * @param error - The error to check
 * @returns True if error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Convert unknown error to Error instance
 * 
 * @param error - The error to convert
 * @returns Error instance
 */
export function toError(error: unknown): Error {
  if (isError(error)) return error;
  if (isString(error)) return new Error(error);
  return new Error(String(error));
}
