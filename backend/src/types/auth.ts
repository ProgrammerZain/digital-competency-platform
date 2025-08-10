import { BaseDocument, UserRole, OTPData } from './index';

// User Profile Interface
export interface UserProfile extends BaseDocument {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  profilePicture?: string;

  // Security fields
  loginAttempts: number;
  lockUntil?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;

  // OTP for two-factor authentication
  otp?: OTPData;

  // Assessment Progress
  assessmentProgress?: {
    currentStep: number;
    highestLevelAchieved: string;
    lastAssessmentDate?: Date;
    totalAssessmentsTaken: number;
  };

  // Metadata
  registrationIP?: string;
  lastLoginIP?: string;
  preferredLanguage?: string;
  timezone?: string;
}

// Registration Request
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: UserRole;
  preferredLanguage?: string;
  timezone?: string;
}

// Login Request
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Login Response
export interface LoginResponse {
  user: UserSafeProfile;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// User Safe Profile (without sensitive data)
export interface UserSafeProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  profilePicture?: string;
  assessmentProgress?: {
    currentStep: number;
    highestLevelAchieved: string;
    lastAssessmentDate?: Date;
    totalAssessmentsTaken: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Forgot Password Request
export interface ForgotPasswordRequest {
  email: string;
}

// Reset Password Request
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// Change Password Request
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Update Profile Request
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  preferredLanguage?: string;
  timezone?: string;
  profilePicture?: string;
}

// Email Verification Request
export interface EmailVerificationRequest {
  token: string;
}

// OTP Verification Request
export interface OTPVerificationRequest {
  email: string;
  otp: string;
  action: 'login' | 'registration' | 'password_reset' | 'email_change';
}

// Send OTP Request
export interface SendOTPRequest {
  email: string;
  action: 'login' | 'registration' | 'password_reset' | 'email_change';
  method: 'email' | 'sms';
  phoneNumber?: string;
}

// Refresh Token Request
export interface RefreshTokenRequest {
  refreshToken: string;
}

// JWT Token Payload
export interface JWTTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Account Lock Information
export interface AccountLockInfo {
  isLocked: boolean;
  lockUntil?: Date;
  remainingAttempts: number;
  lockReason?: string;
}

// User Activity Log
export interface UserActivity {
  userId: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// Social Login (if needed later)
export interface SocialLoginRequest {
  provider: 'google' | 'facebook' | 'linkedin';
  accessToken: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
}

// Admin User Management
export interface AdminUserQuery {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  isEmailVerified?: boolean;
  registrationDateFrom?: Date;
  registrationDateTo?: Date;
  lastLoginFrom?: Date;
  lastLoginTo?: Date;
}

export interface BulkUserAction {
  userIds: string[];
  action: 'activate' | 'deactivate' | 'delete' | 'verify_email' | 'reset_password';
  reason?: string;
}

// Two-Factor Authentication
export interface TwoFactorSetupRequest {
  method: 'email' | 'sms';
  phoneNumber?: string;
}

export interface TwoFactorVerificationRequest {
  userId: string;
  code: string;
  method: 'email' | 'sms';
}

// Session Management
export interface UserSession {
  userId: string;
  sessionId: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    device: string;
    os: string;
    browser: string;
  };
  isActive: boolean;
  lastActivity: Date;
  expiresAt: Date;
  createdAt: Date;
}

// Password Policy
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number; // Number of previous passwords to prevent reuse
}

// Account Statistics
export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  usersRegisteredToday: number;
  usersRegisteredThisWeek: number;
  usersRegisteredThisMonth: number;
  usersByRole: Record<UserRole, number>;
}
