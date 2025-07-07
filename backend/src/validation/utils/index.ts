import { z } from 'zod';

// Utility functions for validation

/**
 * Create a conditional schema based on a condition
 */
export const conditionalSchema = <T extends z.ZodTypeAny>(
  condition: boolean,
  schema: T,
  fallback?: z.ZodTypeAny
): T | z.ZodOptional<T> | typeof fallback => {
  if (condition) {
    return schema;
  }
  return fallback || schema.optional();
};

/**
 * Create a schema that validates one of multiple types
 */
export const oneOfSchema = <T extends readonly [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]>(
  schemas: T
): z.ZodUnion<T> => {
  return z.union(schemas);
};

/**
 * Create a schema for array with min/max length validation
 */
export const arraySchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
  minLength = 0,
  maxLength = 100
): z.ZodArray<T> => {
  return z.array(itemSchema).min(minLength).max(maxLength);
};

/**
 * Create a strict object schema that doesn't allow extra properties
 */
export const strictObjectSchema = <T extends z.ZodRawShape>(
  shape: T
): z.ZodObject<T, 'strict'> => {
  return z.object(shape).strict();
};

/**
 * Create a schema for optional nullable values
 */
export const optionalNullable = <T extends z.ZodTypeAny>(
  schema: T
): z.ZodOptional<z.ZodNullable<T>> => {
  return schema.nullable().optional();
};

/**
 * Create a schema for string that trims whitespace
 */
export const trimmedString = (minLength = 0, maxLength = 255): z.ZodString => {
  return z.string()
    .trim()
    .min(minLength, `Must be at least ${minLength} characters`)
    .max(maxLength, `Must be at most ${maxLength} characters`);
};

/**
 * Create a schema for email validation with custom domain restrictions
 */
export const emailSchema = (allowedDomains?: string[]): z.ZodString | z.ZodEffects<z.ZodString, string, string> => {
  let schema = z.string().email('Invalid email format');
  
  if (allowedDomains && allowedDomains.length > 0) {
    return schema.refine(
      email => allowedDomains.some(domain => email.endsWith(`@${domain}`)),
      `Email must be from allowed domains: ${allowedDomains.join(', ')}`
    );
  }
  
  return schema;
};

/**
 * Create a schema for URLs with protocol restrictions
 */
export const urlSchema = (
  allowedProtocols: string[] = ['http', 'https']
): z.ZodEffects<z.ZodString, string, string> => {
  return z.string().url('Invalid URL format').refine(
    url => allowedProtocols.some(protocol => url.startsWith(`${protocol}://`)),
    `URL must use one of these protocols: ${allowedProtocols.join(', ')}`
  );
};

/**
 * Create a schema for phone numbers (international format)
 */
export const phoneSchema = (): z.ZodString => {
  return z.string().regex(
    /^\+[1-9]\d{1,14}$/,
    'Phone number must be in international format (+1234567890)'
  );
};

/**
 * Create a schema for timestamps that accepts multiple formats
 */
export const timestampSchema = (): z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodDate]>, Date, string | number | Date> => {
  return z.union([
    z.string().datetime('Invalid datetime string'),
    z.number().int('Timestamp must be an integer').positive('Timestamp must be positive'),
    z.date()
  ]).transform(val => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    if (typeof val === 'number') {
      return new Date(val * 1000); // Assume Unix timestamp in seconds
    }
    return val;
  });
};

/**
 * Create a schema for file size validation
 */
export const fileSizeSchema = (maxSizeMB = 10): z.ZodNumber => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return z.number()
    .min(1, 'File size must be greater than 0')
    .max(maxSizeBytes, `File size cannot exceed ${maxSizeMB}MB`);
};

/**
 * Create a schema for coordinate validation (latitude/longitude)
 */
export const coordinateSchema = (): z.ZodObject<{
  latitude: z.ZodNumber;
  longitude: z.ZodNumber;
}> => {
  return z.object({
    latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
    longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180')
  });
};

/**
 * Create a schema for color hex codes
 */
export const hexColorSchema = (): z.ZodString => {
  return z.string().regex(
    /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
    'Color must be a valid hex code (#rgb or #rrggbb)'
  );
};

/**
 * Create a schema for semantic version strings
 */
export const semverSchema = (): z.ZodString => {
  return z.string().regex(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/,
    'Version must follow semantic versioning format (e.g., 1.0.0, 1.0.0-alpha.1)'
  );
};

/**
 * Create a password strength validation schema
 */
export const strongPasswordSchema = (
  minLength = 8,
  requireUppercase = true,
  requireLowercase = true,
  requireNumbers = true,
  requireSymbols = true
): z.ZodString => {
  let schema = z.string().min(minLength, `Password must be at least ${minLength} characters`);
  
  if (requireUppercase) {
    schema = schema.regex(/[A-Z]/, 'Password must contain at least one uppercase letter');
  }
  
  if (requireLowercase) {
    schema = schema.regex(/[a-z]/, 'Password must contain at least one lowercase letter');
  }
  
  if (requireNumbers) {
    schema = schema.regex(/\d/, 'Password must contain at least one number');
  }
  
  if (requireSymbols) {
    schema = schema.regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character');
  }
  
  return schema;
};

/**
 * Validate environment variables using a schema
 */
export const validateEnvironment = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.infer<z.ZodObject<T>> => {
  try {
    return schema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`- ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Create a rate limiting validation schema
 */
export const createRateLimitSchema = (
  maxRequests = 100,
  windowMinutes = 15
): z.ZodObject<{
  requests: z.ZodNumber;
  window: z.ZodNumber;
}> => {
  return z.object({
    requests: z.number().max(maxRequests, `Too many requests. Maximum ${maxRequests} requests allowed.`),
    window: z.number().max(windowMinutes * 60 * 1000, `Window too large. Maximum ${windowMinutes} minutes allowed.`)
  });
};