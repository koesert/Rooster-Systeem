import { useState, useCallback } from "react";
import { ValidationManager, ValidationRules } from "@/utils/validation";

interface UseValidationOptions {
  // Fields that should be validated
  fields: string[];
  // Custom validation rules (optional)
  customRules?: ValidationRules;
  // Whether to validate on change (default: true)
  validateOnChange?: boolean;
}

interface UseValidationReturn {
  // Current field errors
  fieldErrors: Record<string, string>;
  // Set field errors manually
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  // Validate entire form
  validateForm: (formData: Record<string, any>) => boolean;
  // Validate single field
  validateField: (
    fieldName: string,
    value: any,
    formData?: Record<string, any>
  ) => string | null;
  // Handle input change with validation
  handleInputChange: (
    fieldName: string,
    value: any,
    formData: Record<string, any>,
    setFormData: React.Dispatch<React.SetStateAction<any>>
  ) => void;
  // Clear specific field error
  clearFieldError: (fieldName: string) => void;
  // Clear all errors
  clearAllErrors: () => void;
  // Check if form has any errors
  hasErrors: boolean;
}

export const useValidation = (
  options: UseValidationOptions
): UseValidationReturn => {
  const { fields, customRules, validateOnChange = true } = options;

  // Initialize validation manager
  const validationManager = new ValidationManager(customRules);

  // Field errors state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Validate entire form
  const validateForm = useCallback(
    (formData: Record<string, any>): boolean => {
      const result = validationManager.validateForm(formData, fields);
      setFieldErrors(result.errors);
      return result.isValid;
    },
    [validationManager, fields]
  );

  // Validate single field
  const validateField = useCallback(
    (
      fieldName: string,
      value: any,
      formData: Record<string, any> = {}
    ): string | null => {
      return validationManager.validateField(fieldName, value, formData);
    },
    [validationManager]
  );

  // Handle input change with validation
  const handleInputChange = useCallback(
    (
      fieldName: string,
      value: any,
      formData: Record<string, any>,
      setFormData: React.Dispatch<React.SetStateAction<any>>
    ) => {
      // Update form data
      setFormData((prev: any) => ({ ...prev, [fieldName]: value }));

      // Clear field error when user starts typing
      if (fieldErrors[fieldName]) {
        setFieldErrors((prev) => ({ ...prev, [fieldName]: "" }));
      }

      // Validate on change if enabled
      if (validateOnChange && fields.includes(fieldName)) {
        const updatedFormData = { ...formData, [fieldName]: value };
        const error = validationManager.validateField(
          fieldName,
          value,
          updatedFormData
        );

        if (error) {
          setFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
        }
      }
    },
    [fieldErrors, validateOnChange, fields, validationManager]
  );

  // Clear specific field error
  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors((prev) => ({ ...prev, [fieldName]: "" }));
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  // Check if form has any errors
  const hasErrors = Object.values(fieldErrors).some((error) => error !== "");

  return {
    fieldErrors,
    setFieldErrors,
    validateForm,
    validateField,
    handleInputChange,
    clearFieldError,
    clearAllErrors,
    hasErrors,
  };
};

// Predefined validation configurations for common forms
export const ValidationConfigs = {
  // Profile edit form
  profileEdit: {
    fields: [
      "firstName",
      "lastName",
      "username",
      "passwordOptional",
      "confirmPassword",
      "birthDate",
      "hireDate",
    ],
  },

  // Employee create form
  employeeCreate: {
    fields: [
      "firstName",
      "lastName",
      "username",
      "password",
      "birthDate",
      "hireDate",
    ],
  },

  // Employee edit form
  employeeEdit: {
    fields: [
      "firstName",
      "lastName",
      "username",
      "passwordOptional",
      "confirmPassword",
      "birthDate",
      "hireDate",
    ],
  },

  // Shift create/edit form
  shiftEdit: {
    fields: ["employeeId", "startTime", "endTime", "notes"],
  },

  // Time off request form
  timeoffCreate: {
    fields: ["reason", "startDate", "endDate"],
  },
};
