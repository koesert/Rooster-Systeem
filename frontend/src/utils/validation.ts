export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any, formData?: any) => string | null;
  message?: string;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Security utility functions
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>"/\\&]/g, "") // Remove potential XSS characters
    .replace(/['";]/g, ""); // Remove SQL injection characters
};

const containsDangerousPatterns = (input: string): boolean => {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /sql/i,
    /union/i,
    /select/i,
    /insert/i,
    /update/i,
    /delete/i,
    /drop/i,
    /exec/i,
    /script/i,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(input));
};

export class ValidationManager {
  private rules: ValidationRules = {};

  // Predefined validation rules for common fields
  static readonly COMMON_RULES = {
    // Name validation
    firstName: [
      { required: true, message: "Voornaam is verplicht" },
      { maxLength: 50, message: "Voornaam mag maximaal 50 tekens bevatten" },
      {
        custom: (value: string) => {
          if (value && !value.trim()) return "Voornaam mag niet leeg zijn";
          return null;
        },
      },
    ],

    lastName: [
      { required: true, message: "Achternaam is verplicht" },
      { maxLength: 50, message: "Achternaam mag maximaal 50 tekens bevatten" },
      {
        custom: (value: string) => {
          if (value && !value.trim()) return "Achternaam mag niet leeg zijn";
          return null;
        },
      },
    ],

    // Secure username validation
    username: [
      { required: true, message: "Gebruikersnaam is verplicht" },
      {
        minLength: 5,
        message: "Gebruikersnaam moet minimaal 5 tekens bevatten",
      },
      {
        maxLength: 30,
        message: "Gebruikersnaam mag maximaal 30 tekens bevatten",
      },
      {
        pattern: /^[a-zA-Z0-9._-]+$/,
        message:
          "Gebruikersnaam mag alleen letters, cijfers, punten, underscores en streepjes bevatten",
      },
      {
        custom: (value: string) => {
          if (!value) return null;

          // Trim and check for empty
          const trimmed = value.trim();
          if (!trimmed) return "Gebruikersnaam mag niet leeg zijn";

          // Check for dangerous patterns
          if (containsDangerousPatterns(value)) {
            return "Gebruikersnaam bevat niet toegestane tekens";
          }

          // Must start with letter or number
          if (!/^[a-zA-Z0-9]/.test(trimmed)) {
            return "Gebruikersnaam moet beginnen met een letter of cijfer";
          }

          // Must end with letter or number
          if (!/[a-zA-Z0-9]$/.test(trimmed)) {
            return "Gebruikersnaam moet eindigen met een letter of cijfer";
          }

          // No consecutive special characters
          if (/[._-]{2,}/.test(trimmed)) {
            return "Gebruikersnaam mag geen opeenvolgende speciale tekens bevatten";
          }

          return null;
        },
      },
    ],

    // Password validation
    password: [
      { required: true, message: "Wachtwoord is verplicht" },
      { minLength: 6, message: "Wachtwoord moet minimaal 6 tekens bevatten" },
      {
        pattern: /(?=.*[A-Z])/,
        message: "Wachtwoord moet minimaal 1 hoofdletter bevatten",
      },
      {
        pattern: /(?=.*\d)/,
        message: "Wachtwoord moet minimaal 1 cijfer bevatten",
      },
    ],

    // Optional password (for updates)
    passwordOptional: [
      { minLength: 6, message: "Wachtwoord moet minimaal 6 tekens bevatten" },
      {
        pattern: /(?=.*[A-Z])/,
        message: "Wachtwoord moet minimaal 1 hoofdletter bevatten",
      },
      {
        pattern: /(?=.*\d)/,
        message: "Wachtwoord moet minimaal 1 cijfer bevatten",
      },
    ],

    // Password confirmation
    confirmPassword: [
      {
        custom: (value: string, formData: any) => {
          if (formData.password && formData.password !== value) {
            return "Wachtwoorden komen niet overeen";
          }
          return null;
        },
      },
    ],

    // Date validation
    birthDate: [
      { required: true, message: "Geboortedatum is verplicht" },
      {
        custom: (value: string) => {
          if (!value) return null;

          const birthDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (birthDate > today) {
            return "Geboortedatum kan niet in de toekomst liggen";
          }

          // Calculate age
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();

          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ) {
            age--;
          }

          if (age > 100) {
            return "Controleer de geboortedatum";
          }

          return null;
        },
      },
    ],

    hireDate: [
      { required: true, message: "Datum in dienst is verplicht" },
      {
        custom: (value: string) => {
          if (!value) return null;

          const hireDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (hireDate > today) {
            return "Datum in dienst kan niet in de toekomst liggen";
          }

          return null;
        },
      },
    ],

    // Time off date validation
    startDate: [
      { required: true, message: "Startdatum is verplicht" },
      {
        custom: (value: string, formData: any) => {
          if (!value) return null;

          const startDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Check minimum 2 weeks in advance (only for non-managers)
          if (!formData.isManager) {
            const minStartDate = new Date(
              today.getTime() + 14 * 24 * 60 * 60 * 1000
            );
            if (startDate < minStartDate) {
              return "Vrij moet minimaal 2 weken van tevoren worden aangevraagd";
            }
          }

          return null;
        },
      },
    ],

    endDate: [
      { required: true, message: "Einddatum is verplicht" },
      {
        custom: (value: string, formData: any) => {
          if (!value || !formData.startDate) return null;

          const startDate = new Date(formData.startDate);
          const endDate = new Date(value);

          if (endDate < startDate) {
            return "Einddatum moet na of gelijk aan startdatum zijn";
          }

          return null;
        },
      },
    ],

    // Shift time validation
    startTime: [
      { required: true, message: "Starttijd is verplicht" },
      {
        custom: (value: string) => {
          if (!value) return null;

          const [hour] = value.split(":").map(Number);
          if (hour < 12) {
            return "Starttijd moet tussen 12:00 en 23:59 liggen";
          }

          return null;
        },
      },
    ],

    endTime: [
      {
        custom: (value: string, formData: any) => {
          if (!value || formData.isOpenEnded) return null;

          const [endHour, endMinute] = value.split(":").map(Number);

          // End time can be 00:00 (midnight) or between 12:01 and 23:59
          if (!(endHour === 0 && endMinute === 0) && endHour < 12) {
            return "Eindtijd moet tussen 12:01 en 00:00 liggen";
          }

          // Check if end time is after start time
          if (formData.startTime) {
            const [startHour, startMinute] = formData.startTime
              .split(":")
              .map(Number);
            const startTotalMinutes = startHour * 60 + startMinute;
            let endTotalMinutes = endHour * 60 + endMinute;

            // Handle midnight (00:00) as end of day
            if (endHour === 0) {
              endTotalMinutes = 24 * 60; // 24:00 in minutes
            }

            const durationMinutes = endTotalMinutes - startTotalMinutes;

            if (durationMinutes <= 0) {
              return "Eindtijd moet na de starttijd liggen";
            } else if (durationMinutes < 15) {
              return "Shift moet minimaal 15 minuten duren";
            } else if (durationMinutes > 12 * 60) {
              return "Shift kan maximaal 12 uur duren";
            }
          }

          return null;
        },
      },
    ],

    // General text fields
    reason: [
      { required: true, message: "Reden is verplicht" },
      { maxLength: 500, message: "Reden mag maximaal 500 tekens bevatten" },
      {
        custom: (value: string) => {
          if (!value) return null;

          // Basic XSS protection for text fields
          if (containsDangerousPatterns(value)) {
            return "Tekst bevat niet toegestane tekens";
          }

          return null;
        },
      },
    ],

    notes: [
      {
        maxLength: 500,
        message: "Notities mogen maximaal 500 tekens bevatten",
      },
      {
        custom: (value: string) => {
          if (!value) return null;

          // Basic XSS protection for text fields
          if (containsDangerousPatterns(value)) {
            return "Tekst bevat niet toegestane tekens";
          }

          return null;
        },
      },
    ],

    // Employee selection
    employeeId: [
      {
        custom: (value: number) => {
          if (!value || value === 0) {
            return "Selecteer een medewerker";
          }
          return null;
        },
      },
    ],
  };

  constructor(customRules: ValidationRules = {}) {
    this.rules = { ...ValidationManager.COMMON_RULES, ...customRules };
  }

  // Add or update validation rules for a field
  setRules(fieldName: string, rules: ValidationRule[]): void {
    this.rules[fieldName] = rules;
  }

  // Get validation rules for a field
  getRules(fieldName: string): ValidationRule[] {
    return this.rules[fieldName] || [];
  }

  // Validate a single field
  validateField(
    fieldName: string,
    value: any,
    formData: any = {}
  ): string | null {
    const fieldRules = this.getRules(fieldName);

    for (const rule of fieldRules) {
      // Required validation
      if (
        rule.required &&
        (!value || (typeof value === "string" && !value.trim()))
      ) {
        return rule.message || `${fieldName} is verplicht`;
      }

      // Skip other validations if field is empty and not required
      if (!value || (typeof value === "string" && !value.trim())) {
        continue;
      }

      // Sanitize string inputs before further validation
      let sanitizedValue = value;
      if (typeof value === "string") {
        sanitizedValue = sanitizeInput(value);
      }

      // Min length validation
      if (
        rule.minLength &&
        typeof sanitizedValue === "string" &&
        sanitizedValue.length < rule.minLength
      ) {
        return (
          rule.message ||
          `${fieldName} moet minimaal ${rule.minLength} tekens bevatten`
        );
      }

      // Max length validation
      if (
        rule.maxLength &&
        typeof sanitizedValue === "string" &&
        sanitizedValue.length > rule.maxLength
      ) {
        return (
          rule.message ||
          `${fieldName} mag maximaal ${rule.maxLength} tekens bevatten`
        );
      }

      // Pattern validation
      if (
        rule.pattern &&
        typeof sanitizedValue === "string" &&
        !rule.pattern.test(sanitizedValue)
      ) {
        return rule.message || `${fieldName} heeft een ongeldig formaat`;
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value, formData);
        if (customError) {
          return customError;
        }
      }
    }

    return null;
  }

  // Validate entire form
  validateForm(
    formData: Record<string, any>,
    fieldsToValidate?: string[]
  ): ValidationResult {
    const errors: Record<string, string> = {};
    const fields = fieldsToValidate || Object.keys(this.rules);

    for (const fieldName of fields) {
      const error = this.validateField(
        fieldName,
        formData[fieldName],
        formData
      );
      if (error) {
        errors[fieldName] = error;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  // Create a validation function for a specific form schema
  createValidator(fieldsToValidate: string[]) {
    return (formData: Record<string, any>): ValidationResult => {
      return this.validateForm(formData, fieldsToValidate);
    };
  }
}
