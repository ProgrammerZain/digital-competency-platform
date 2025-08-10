import { Request, Response, NextFunction } from 'express';

// Validation error interface
interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Name validation
export const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 50 && /^[a-zA-Z\s'-]+$/.test(name);
};

// Registration validation middleware
export const validateRegistration = (req: Request, res: Response, next: NextFunction): void => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;
  const errors: ValidationError[] = [];

  // Validate first name
  if (!firstName) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  } else if (!validateName(firstName)) {
    errors.push({
      field: 'firstName',
      message:
        'First name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes',
      value: firstName,
    });
  }

  // Validate last name
  if (!lastName) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  } else if (!validateName(lastName)) {
    errors.push({
      field: 'lastName',
      message:
        'Last name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes',
      value: lastName,
    });
  }

  // Validate email
  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(email)) {
    errors.push({
      field: 'email',
      message: 'Please provide a valid email address',
      value: email,
    });
  }

  // Validate password
  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      passwordValidation.errors.forEach(error => {
        errors.push({ field: 'password', message: error });
      });
    }
  }

  // Validate password confirmation
  if (!confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Password confirmation is required' });
  } else if (password !== confirmPassword) {
    errors.push({
      field: 'confirmPassword',
      message: 'Password confirmation does not match password',
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      data: { errors },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
    return;
  }

  next();
};

// Login validation middleware
export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { email, password } = req.body;
  const errors: ValidationError[] = [];

  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(email)) {
    errors.push({
      field: 'email',
      message: 'Please provide a valid email address',
      value: email,
    });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      data: { errors },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
    return;
  }

  next();
};

// Change password validation middleware
export const validateChangePassword = (req: Request, res: Response, next: NextFunction): void => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const errors: ValidationError[] = [];

  if (!currentPassword) {
    errors.push({ field: 'currentPassword', message: 'Current password is required' });
  }

  if (!newPassword) {
    errors.push({ field: 'newPassword', message: 'New password is required' });
  } else {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      passwordValidation.errors.forEach(error => {
        errors.push({ field: 'newPassword', message: error });
      });
    }
  }

  if (!confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Password confirmation is required' });
  } else if (newPassword !== confirmPassword) {
    errors.push({
      field: 'confirmPassword',
      message: 'Password confirmation does not match new password',
    });
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push({
      field: 'newPassword',
      message: 'New password must be different from current password',
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      data: { errors },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
    return;
  }

  next();
};

// Reset password validation middleware
export const validateResetPassword = (req: Request, res: Response, next: NextFunction): void => {
  const { token, newPassword, confirmPassword } = req.body;
  const errors: ValidationError[] = [];

  if (!token) {
    errors.push({ field: 'token', message: 'Reset token is required' });
  }

  if (!newPassword) {
    errors.push({ field: 'newPassword', message: 'New password is required' });
  } else {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      passwordValidation.errors.forEach(error => {
        errors.push({ field: 'newPassword', message: error });
      });
    }
  }

  if (!confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Password confirmation is required' });
  } else if (newPassword !== confirmPassword) {
    errors.push({
      field: 'confirmPassword',
      message: 'Password confirmation does not match new password',
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      data: { errors },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
    return;
  }

  next();
};

// Profile update validation middleware
export const validateProfileUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const { firstName, lastName, preferredLanguage, timezone } = req.body;
  const errors: ValidationError[] = [];

  if (firstName !== undefined && !validateName(firstName)) {
    errors.push({
      field: 'firstName',
      message:
        'First name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes',
      value: firstName,
    });
  }

  if (lastName !== undefined && !validateName(lastName)) {
    errors.push({
      field: 'lastName',
      message:
        'Last name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes',
      value: lastName,
    });
  }

  if (preferredLanguage !== undefined && typeof preferredLanguage !== 'string') {
    errors.push({
      field: 'preferredLanguage',
      message: 'Preferred language must be a string',
      value: preferredLanguage,
    });
  }

  if (timezone !== undefined && typeof timezone !== 'string') {
    errors.push({
      field: 'timezone',
      message: 'Timezone must be a string',
      value: timezone,
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      data: { errors },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
    return;
  }

  next();
};

// OTP validation middleware
export const validateOTP = (req: Request, res: Response, next: NextFunction): void => {
  const { email, otp, action } = req.body;
  const errors: ValidationError[] = [];

  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(email)) {
    errors.push({
      field: 'email',
      message: 'Please provide a valid email address',
      value: email,
    });
  }

  if (!otp) {
    errors.push({ field: 'otp', message: 'OTP is required' });
  } else if (!/^\d{6}$/.test(otp)) {
    errors.push({
      field: 'otp',
      message: 'OTP must be a 6-digit number',
      value: otp,
    });
  }

  if (!action) {
    errors.push({ field: 'action', message: 'Action is required' });
  } else if (!['login', 'registration', 'password_reset', 'email_change'].includes(action)) {
    errors.push({
      field: 'action',
      message: 'Invalid action type',
      value: action,
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      data: { errors },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
    return;
  }

  next();
};

// Generic email validation middleware
export const validateEmailField = (req: Request, res: Response, next: NextFunction): void => {
  const { email } = req.body;
  const errors: ValidationError[] = [];

  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(email)) {
    errors.push({
      field: 'email',
      message: 'Please provide a valid email address',
      value: email,
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      data: { errors },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
    return;
  }

  next();
};

export default {
  validateEmail,
  validatePassword,
  validateName,
  validateRegistration,
  validateLogin,
  validateChangePassword,
  validateResetPassword,
  validateProfileUpdate,
  validateOTP,
  validateEmailField,
};
