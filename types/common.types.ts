/**
 * Common Type Definitions
 * 
 * Replaces 'any' types with proper TypeScript types across the codebase
 * 
 * @module types/common.types
 */

/**
 * JSON-serializable value types
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * JSON object type
 */
export type JSONObject = { [key: string]: JSONValue };

/**
 * JSON array type
 */
export type JSONArray = JSONValue[];

/**
 * Generic metadata object
 */
export type Metadata = Record<string, JSONValue>;

/**
 * Generic parameters object for JSON-RPC and similar protocols
 */
export type Params = Record<string, JSONValue>;

/**
 * Generic result type for operations that can succeed or fail
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Database row type (generic)
 */
export type DatabaseRow = Record<string, unknown>;

/**
 * Async function type
 */
export type AsyncFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> = (
  ...args: TArgs
) => Promise<TReturn>;

/**
 * Callback function type
 */
export type Callback<TArgs extends unknown[] = unknown[], TReturn = void> = (
  ...args: TArgs
) => TReturn;

/**
 * Event handler type
 */
export type EventHandler<TEvent = unknown> = (event: TEvent) => void | Promise<void>;

/**
 * Constructor type
 */
export type Constructor<T = object> = new (...args: unknown[]) => T;

/**
 * Partial deep - makes all properties optional recursively
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Required deep - makes all properties required recursively
 */
export type DeepRequired<T> = T extends object
  ? {
      [P in keyof T]-?: DeepRequired<T[P]>;
    }
  : T;

/**
 * Mutable - removes readonly modifiers
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Type guard for checking if value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for checking if value is a JSON object
 */
export function isJSONObject(value: unknown): value is JSONObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if value is a JSON array
 */
export function isJSONArray(value: unknown): value is JSONArray {
  return Array.isArray(value);
}

/**
 * Type guard for checking if value is a JSON value
 */
export function isJSONValue(value: unknown): value is JSONValue {
  if (value === null) return true;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJSONValue);
  if (type === 'object') {
    return Object.values(value as object).every(isJSONValue);
  }
  return false;
}
