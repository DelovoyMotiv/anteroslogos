/**
 * Common Form Helper Utilities
 * Extracted from duplicated patterns across React forms
 */

import React from 'react';

/**
 * Common form field props
 */
export interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
}

/**
 * Standard form field component
 */
export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  autoComplete,
}: FormFieldProps): React.ReactElement {
  return (
    <div className="form-field">
      <label htmlFor={name} className="form-label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        required={required}
        className={`form-input ${error ? 'border-red-500' : 'border-gray-300'}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <p id={`${name}-error`} className="form-error text-red-500 text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Form validation state
 */
export interface FormValidationState {
  [key: string]: string | undefined;
}

/**
 * Common email validation
 */
export function validateEmail(email: string): string | undefined {
  if (!email) {
    return 'Email is required';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email address';
  }
  
  return undefined;
}

/**
 * Common password validation
 */
export function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'Password is required';
  }
  
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  
  return undefined;
}

/**
 * Confirm password validation
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): string | undefined {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  
  return undefined;
}

/**
 * Form submission button component
 */
export interface FormSubmitButtonProps {
  loading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function FormSubmitButton({
  loading,
  disabled = false,
  children,
  loadingText = 'Loading...',
}: FormSubmitButtonProps): React.ReactElement {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`form-submit-button ${loading || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? loadingText : children}
    </button>
  );
}

/**
 * Form error message component
 */
export interface FormErrorMessageProps {
  message?: string;
}

export function FormErrorMessage({ message }: FormErrorMessageProps): React.ReactElement | null {
  if (!message) return null;
  
  return (
    <div className="form-error-message bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded" role="alert">
      <p>{message}</p>
    </div>
  );
}

/**
 * Form success message component
 */
export interface FormSuccessMessageProps {
  message?: string;
}

export function FormSuccessMessage({ message }: FormSuccessMessageProps): React.ReactElement | null {
  if (!message) return null;
  
  return (
    <div className="form-success-message bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded" role="alert">
      <p>{message}</p>
    </div>
  );
}

/**
 * Hook for form state management
 */
export function useFormState<T extends Record<string, string>>(
  initialState: T
): {
  values: T;
  errors: FormValidationState;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setError: (field: keyof T, error: string | undefined) => void;
  setErrors: (errors: FormValidationState) => void;
  resetForm: () => void;
} {
  const [values, setValues] = React.useState<T>(initialState);
  const [errors, setErrorsState] = React.useState<FormValidationState>({});

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // @ts-expect-error - React setState functional update type inference
    setValues(prev => ({ ...prev, [name]: value } as T));
    // Clear error when user starts typing
    // @ts-expect-error - React setState functional update type inference
    setErrorsState(prev => ({ ...prev, [name]: undefined }));
  }, []);

  const setError = React.useCallback((field: keyof T, error: string | undefined) => {
    // @ts-expect-error - React setState functional update type inference
    setErrorsState(prev => ({ ...prev, [field as string]: error }));
  }, []);

  const setErrors = React.useCallback((newErrors: FormValidationState) => {
    setErrorsState(newErrors);
  }, []);

  const resetForm = React.useCallback(() => {
    setValues(initialState);
    setErrorsState({});
  }, [initialState]);

  return {
    values,
    errors,
    handleChange,
    setError,
    setErrors,
    resetForm,
  };
}
