import { z } from 'zod';

// Common validation schemas
export const validationSchemas = {
  // Email validation
  email: z.string().email('Invalid email address'),

  // URL validation
  url: z.string().url('Invalid URL format').or(z.literal('')),

  // Required string
  requiredString: z.string().min(1, 'This field is required'),

  // Optional string
  optionalString: z.string().optional(),

  // Positive number
  positiveNumber: z.number().positive('Must be a positive number'),

  // API key format
  apiKey: z.string().min(10, 'API key must be at least 10 characters'),

  // Cron expression (basic validation)
  cronExpression: z
    .string()
    .regex(
      /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
      'Invalid cron expression format'
    )
    .or(z.literal('')),

  // Name validation (2-100 characters)
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),

  // Description validation
  description: z.string().max(500, 'Description too long (max 500 characters)').optional(),

  // Port number
  port: z.number().int().min(1).max(65535, 'Invalid port number'),

  // IP address
  ipAddress: z.string().regex(
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    'Invalid IP address format'
  ),
};

// Evidence Collection validation schema
export const evidenceCollectionSchema = z.object({
  name: validationSchemas.name,
  description: validationSchemas.description,
  type: z.enum(['api', 'cloud', 'database'], {
    message: 'Please select a collection type',
  }),
  endpoint: validationSchemas.url.refine((val) => val !== '', 'API endpoint is required'),
  apiKey: validationSchemas.apiKey,
  frequency: z.enum(['daily', 'weekly', 'monthly'], {
    message: 'Please select a frequency',
  }),
  enabled: z.boolean().default(true),
});

// Monitoring Rule validation schema
export const monitoringRuleSchema = z.object({
  name: validationSchemas.name,
  description: validationSchemas.description,
  category: z.enum(['security', 'compliance', 'access', 'data', 'network'], {
    message: 'Please select a category',
  }),
  query: validationSchemas.requiredString.min(5, 'Query must be at least 5 characters'),
  severity: z.enum(['low', 'medium', 'high', 'critical'], {
    message: 'Please select severity level',
  }),
  threshold: z.string().optional(),
  enabled: z.boolean().default(true),
});

// Control Test Script validation schema
export const controlTestSchema = z.object({
  name: validationSchemas.name,
  description: validationSchemas.description,
  controlId: validationSchemas.requiredString,
  testType: z.enum(['automated', 'manual', 'hybrid'], {
    message: 'Please select test type',
  }),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly'], {
    message: 'Please select frequency',
  }),
  script: validationSchemas.requiredString.min(10, 'Test script must be at least 10 characters'),
});

// Task validation schema
export const taskSchema = z.object({
  title: validationSchemas.name,
  description: validationSchemas.description,
  assignee: validationSchemas.requiredString,
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    message: 'Please select priority',
  }),
  dueDate: z.string().refine((date) => new Date(date) > new Date(), 'Due date must be in the future'),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
});

// Workflow validation schema
export const workflowSchema = z.object({
  name: validationSchemas.name,
  description: validationSchemas.description,
  type: z.enum(['approval', 'notification', 'automation'], {
    message: 'Please select workflow type',
  }),
  approvers: z.array(z.string()).min(1, 'At least one approver is required'),
  conditions: z.string().optional(),
  enabled: z.boolean().default(true),
});

// Helper function to validate form data
export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, data: null, errors };
    }
    return { success: false, data: null, errors: { _form: 'Validation failed' } };
  }
};

// Helper to get field error
export const getFieldError = (errors: Record<string, string>, fieldName: string): string | undefined => {
  return errors[fieldName];
};
