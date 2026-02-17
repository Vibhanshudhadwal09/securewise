import { useState, useCallback } from 'react';
import { z } from 'zod';
import { validateForm } from '@/utils/validation';

export const useFormValidation = <T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  initialValues: T
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;

      setValues((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      }));

      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (fieldName: string) => {
      setTouched((prev) => ({ ...prev, [fieldName]: true }));

      // Validate single field on blur
      const result = validateForm(schema, values);
      if (!result.success && result.errors[fieldName]) {
        setErrors((prev) => ({ ...prev, [fieldName]: result.errors[fieldName] }));
      }
    },
    [schema, values]
  );

  const handleSubmit = useCallback(
    async (onSubmit: (data: T) => Promise<void>) => {
      setIsSubmitting(true);

      const result = validateForm(schema, values);

      if (!result.success) {
        setErrors(result.errors);
        setIsSubmitting(false);
        return false;
      }

      setErrors({});

      try {
        await onSubmit(result.data);
        setIsSubmitting(false);
        return true;
      } catch (error) {
        setIsSubmitting(false);
        throw error;
      }
    },
    [schema, values]
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const setFieldValue = useCallback((name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    getFieldError: (name: string) => errors[name],
    isFieldTouched: (name: string) => touched[name],
  };
};
