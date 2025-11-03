/**
 * Request Validation Utilities
 * Schema validation for request bodies with zero dependencies
 * Uses only Deno built-in APIs
 */

import type { Context, Middleware } from "./context.ts";
import { ConsoleStyler } from "../utils/console-styler/mod.ts";

/**
 * Validation error with field-specific details
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown,
    public rule: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validation rule types
 */
export type ValidationRule =
  | { type: "required" }
  | { type: "string"; minLength?: number; maxLength?: number; pattern?: RegExp }
  | { type: "number"; min?: number; max?: number; integer?: boolean }
  | { type: "boolean" }
  | {
    type: "array";
    items?: ValidationSchema;
    minItems?: number;
    maxItems?: number;
  }
  | { type: "object"; properties?: Record<string, ValidationSchema> }
  | { type: "email" }
  | { type: "url" }
  | { type: "enum"; values: unknown[] }
  | { type: "custom"; validate: (value: unknown) => boolean | string };

/**
 * Validation schema for a field
 */
export interface ValidationSchema {
  rules: ValidationRule[];
  optional?: boolean;
  default?: unknown;
}

/**
 * Schema definition for validation
 */
export type Schema = Record<string, ValidationSchema>;

/**
 * Validate a value against a single rule
 */
function validateRule(
  field: string,
  value: unknown,
  rule: ValidationRule,
): void {
  switch (rule.type) {
    case "required":
      if (value === undefined || value === null || value === "") {
        throw new ValidationError(
          `Field "${field}" is required`,
          field,
          value,
          "required",
        );
      }
      break;

    case "string":
      if (typeof value !== "string") {
        throw new ValidationError(
          `Field "${field}" must be a string`,
          field,
          value,
          "string",
        );
      }
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        throw new ValidationError(
          `Field "${field}" must be at least ${rule.minLength} characters`,
          field,
          value,
          "minLength",
        );
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        throw new ValidationError(
          `Field "${field}" must be at most ${rule.maxLength} characters`,
          field,
          value,
          "maxLength",
        );
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        throw new ValidationError(
          `Field "${field}" does not match required pattern`,
          field,
          value,
          "pattern",
        );
      }
      break;

    case "number":
      if (typeof value !== "number" || isNaN(value)) {
        throw new ValidationError(
          `Field "${field}" must be a number`,
          field,
          value,
          "number",
        );
      }
      if (rule.integer && !Number.isInteger(value)) {
        throw new ValidationError(
          `Field "${field}" must be an integer`,
          field,
          value,
          "integer",
        );
      }
      if (rule.min !== undefined && value < rule.min) {
        throw new ValidationError(
          `Field "${field}" must be at least ${rule.min}`,
          field,
          value,
          "min",
        );
      }
      if (rule.max !== undefined && value > rule.max) {
        throw new ValidationError(
          `Field "${field}" must be at most ${rule.max}`,
          field,
          value,
          "max",
        );
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        throw new ValidationError(
          `Field "${field}" must be a boolean`,
          field,
          value,
          "boolean",
        );
      }
      break;

    case "array":
      if (!Array.isArray(value)) {
        throw new ValidationError(
          `Field "${field}" must be an array`,
          field,
          value,
          "array",
        );
      }
      if (rule.minItems !== undefined && value.length < rule.minItems) {
        throw new ValidationError(
          `Field "${field}" must have at least ${rule.minItems} items`,
          field,
          value,
          "minItems",
        );
      }
      if (rule.maxItems !== undefined && value.length > rule.maxItems) {
        throw new ValidationError(
          `Field "${field}" must have at most ${rule.maxItems} items`,
          field,
          value,
          "maxItems",
        );
      }
      if (rule.items) {
        value.forEach((item, index) => {
          validateValue(`${field}[${index}]`, item, rule.items!);
        });
      }
      break;

    case "object":
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new ValidationError(
          `Field "${field}" must be an object`,
          field,
          value,
          "object",
        );
      }
      if (rule.properties) {
        for (const [key, schema] of Object.entries(rule.properties)) {
          const nestedValue = (value as Record<string, unknown>)[key];
          validateValue(`${field}.${key}`, nestedValue, schema);
        }
      }
      break;

    case "email":
      if (typeof value !== "string") {
        throw new ValidationError(
          `Field "${field}" must be a string`,
          field,
          value,
          "email",
        );
      }
      // Simple email regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new ValidationError(
          `Field "${field}" must be a valid email address`,
          field,
          value,
          "email",
        );
      }
      break;

    case "url":
      if (typeof value !== "string") {
        throw new ValidationError(
          `Field "${field}" must be a string`,
          field,
          value,
          "url",
        );
      }
      try {
        new URL(value);
      } catch {
        throw new ValidationError(
          `Field "${field}" must be a valid URL`,
          field,
          value,
          "url",
        );
      }
      break;

    case "enum":
      if (!rule.values.includes(value)) {
        throw new ValidationError(
          `Field "${field}" must be one of: ${rule.values.join(", ")}`,
          field,
          value,
          "enum",
        );
      }
      break;

    case "custom":
      const result = rule.validate(value);
      if (result !== true) {
        const message = typeof result === "string"
          ? result
          : `Field "${field}" failed custom validation`;
        throw new ValidationError(message, field, value, "custom");
      }
      break;
  }
}

/**
 * Validate a value against a schema
 */
function validateValue(
  field: string,
  value: unknown,
  schema: ValidationSchema,
): unknown {
  // Handle optional fields
  if (value === undefined || value === null) {
    if (schema.optional) {
      return schema.default !== undefined ? schema.default : value;
    }
  }

  // Apply all rules
  for (const rule of schema.rules) {
    validateRule(field, value, rule);
  }

  return value;
}

/**
 * Validate an object against a schema
 */
export function validate(
  data: unknown,
  schema: Schema,
): Record<string, unknown> {
  if (typeof data !== "object" || data === null) {
    throw new ValidationError(
      "Data must be an object",
      "root",
      data,
      "object",
    );
  }

  const validated: Record<string, unknown> = {};
  const dataObj = data as Record<string, unknown>;

  // Validate each field in schema
  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = dataObj[field];
    validated[field] = validateValue(field, value, fieldSchema);
  }

  return validated;
}

/**
 * Validation middleware
 * Validates ctx.state.body against a schema
 *
 * @param schema - Validation schema
 * @param options - Validation options
 */
export function validator(
  schema: Schema,
  options: {
    stripUnknown?: boolean;
  } = {},
): Middleware {
  return async (ctx: Context, next) => {
    try {
      const body = ctx.state.body;

      if (!body) {
        ConsoleStyler.logWarning("No body to validate", {
          method: ctx.request.method,
          path: ctx.url.pathname,
        });
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Request body is required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Validate the body
      const validated = validate(body, schema);

      // Strip unknown fields if requested
      if (options.stripUnknown) {
        ctx.state.body = validated;
      } else {
        // Merge validated with original to keep unknown fields
        ctx.state.body = { ...body, ...validated };
      }

      ConsoleStyler.logDebug("Validation passed", {
        fields: Object.keys(validated).length,
      });

      return await next();
    } catch (error) {
      if (error instanceof ValidationError) {
        ConsoleStyler.logWarning("Validation failed", {
          field: error.field,
          rule: error.rule,
          message: error.message,
        });

        return new Response(
          JSON.stringify({
            error: "Validation Error",
            message: error.message,
            field: error.field,
            rule: error.rule,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Re-throw non-validation errors
      throw error;
    }
  };
}

/**
 * Helper to create a required string field
 */
export function requiredString(
  options: { minLength?: number; maxLength?: number; pattern?: RegExp } = {},
): ValidationSchema {
  return {
    rules: [
      { type: "required" },
      { type: "string", ...options },
    ],
  };
}

/**
 * Helper to create an optional string field
 */
export function optionalString(
  options: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    default?: string;
  } = {},
): ValidationSchema {
  const { default: defaultValue, ...ruleOptions } = options;
  return {
    rules: [{ type: "string", ...ruleOptions }],
    optional: true,
    default: defaultValue,
  };
}

/**
 * Helper to create a required number field
 */
export function requiredNumber(
  options: { min?: number; max?: number; integer?: boolean } = {},
): ValidationSchema {
  return {
    rules: [
      { type: "required" },
      { type: "number", ...options },
    ],
  };
}

/**
 * Helper to create an optional number field
 */
export function optionalNumber(
  options: { min?: number; max?: number; integer?: boolean; default?: number } =
    {},
): ValidationSchema {
  const { default: defaultValue, ...ruleOptions } = options;
  return {
    rules: [{ type: "number", ...ruleOptions }],
    optional: true,
    default: defaultValue,
  };
}

/**
 * Helper to create a required boolean field
 */
export function requiredBoolean(): ValidationSchema {
  return {
    rules: [
      { type: "required" },
      { type: "boolean" },
    ],
  };
}

/**
 * Helper to create an optional boolean field
 */
export function optionalBoolean(defaultValue?: boolean): ValidationSchema {
  return {
    rules: [{ type: "boolean" }],
    optional: true,
    default: defaultValue,
  };
}

/**
 * Helper to create a required email field
 */
export function requiredEmail(): ValidationSchema {
  return {
    rules: [
      { type: "required" },
      { type: "email" },
    ],
  };
}

/**
 * Helper to create a required URL field
 */
export function requiredUrl(): ValidationSchema {
  return {
    rules: [
      { type: "required" },
      { type: "url" },
    ],
  };
}

/**
 * Helper to create an enum field
 */
export function requiredEnum(values: unknown[]): ValidationSchema {
  return {
    rules: [
      { type: "required" },
      { type: "enum", values },
    ],
  };
}

/**
 * Helper to create a required array field
 */
export function requiredArray(
  options: { items?: ValidationSchema; minItems?: number; maxItems?: number } =
    {},
): ValidationSchema {
  return {
    rules: [
      { type: "required" },
      { type: "array", ...options },
    ],
  };
}
