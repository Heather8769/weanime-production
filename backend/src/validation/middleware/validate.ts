import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Generic validation middleware factory
export const validate = (schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      let dataToValidate;
      
      switch (target) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        default:
          dataToValidate = req.body;
      }

      const validatedData = schema.parse(dataToValidate);
      
      // Replace the original data with validated and transformed data
      switch (target) {
        case 'body':
          req.body = validatedData;
          break;
        case 'query':
          req.query = validatedData;
          break;
        case 'params':
          req.params = validatedData;
          break;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: 'received' in err ? err.received : undefined
        }));

        res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: formattedErrors,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Handle unexpected validation errors
      console.error('Unexpected validation error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during validation',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Convenience functions for different validation targets
export const validateBody = (schema: ZodSchema) => validate(schema, 'body');
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');

// Combined validation middleware for multiple targets
export const validateMultiple = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: Array<{ target: string; field: string; message: string; code: string }> = [];

      // Validate body if schema provided
      if (schemas.body) {
        try {
          req.body = schemas.body.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach(err => {
              errors.push({
                target: 'body',
                field: err.path.join('.'),
                message: err.message,
                code: err.code
              });
            });
          }
        }
      }

      // Validate query if schema provided
      if (schemas.query) {
        try {
          req.query = schemas.query.parse(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach(err => {
              errors.push({
                target: 'query',
                field: err.path.join('.'),
                message: err.message,
                code: err.code
              });
            });
          }
        }
      }

      // Validate params if schema provided
      if (schemas.params) {
        try {
          req.params = schemas.params.parse(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach(err => {
              errors.push({
                target: 'params',
                field: err.path.join('.'),
                message: err.message,
                code: err.code
              });
            });
          }
        }
      }

      // If there are validation errors, return them
      if (errors.length > 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Unexpected validation error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during validation',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Validation middleware with custom error handling
export const validateWithCustomError = (
  schema: ZodSchema,
  target: 'body' | 'query' | 'params' = 'body',
  customErrorHandler?: (errors: ZodError['errors'], req: Request, res: Response) => void
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      let dataToValidate;
      
      switch (target) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        default:
          dataToValidate = req.body;
      }

      const validatedData = schema.parse(dataToValidate);
      
      // Replace the original data with validated data
      switch (target) {
        case 'body':
          req.body = validatedData;
          break;
        case 'query':
          req.query = validatedData;
          break;
        case 'params':
          req.params = validatedData;
          break;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        if (customErrorHandler) {
          customErrorHandler(error.errors, req, res);
          return;
        }
        
        // Default error handling
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: formattedErrors,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      console.error('Unexpected validation error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during validation',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Optional validation middleware (doesn't fail if validation fails)
export const validateOptional = (schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      let dataToValidate;
      
      switch (target) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        default:
          dataToValidate = req.body;
      }

      const result = schema.safeParse(dataToValidate);
      
      if (result.success) {
        // Replace with validated data if validation succeeds
        switch (target) {
          case 'body':
            req.body = result.data;
            break;
          case 'query':
            req.query = result.data;
            break;
          case 'params':
            req.params = result.data;
            break;
        }
      } else {
        // Log validation errors but continue with original data
        console.warn('Optional validation failed:', result.error.errors);
      }
      
      next();
    } catch (error) {
      console.error('Unexpected error in optional validation:', error);
      next(); // Continue even if there's an error
    }
  };
};