import { Request, Response } from 'express';
import User from '../models/User';
import { JWTUtils } from '../utils/jwt';
import { emailService } from '../utils/email';
import { config } from '../config/environment';
import {
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  EmailVerificationRequest,
  OTPVerificationRequest,
  SendOTPRequest,
  RefreshTokenRequest,
  UserSafeProfile,
} from '../types/auth';
import { ApiResponse } from '../types';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        role,
        preferredLanguage,
        timezone,
      }: RegisterRequest = req.body;

      // Validation
      if (!firstName || !lastName || !email || !password) {
        res.status(400).json({
          success: false,
          message: 'All required fields must be provided',
          error: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      if (password !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'Passwords do not match',
          error: 'PASSWORD_MISMATCH',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
          error: 'PASSWORD_TOO_SHORT',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists',
          error: 'USER_ALREADY_EXISTS',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      // Create new user
      const user = new User({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password,
        role: role || 'student',
        preferredLanguage: preferredLanguage || 'en',
        timezone: timezone || 'UTC',
        registrationIP: req.ip,
      });

      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Send welcome email with verification
      await emailService.sendWelcomeEmail(user.email, user.firstName, verificationToken);
      if (!user._id) {
        throw new Error('User ID is missing');
      }

      // Generate tokens
      const tokens = JWTUtils.generateTokenPair(user._id.toString(), user.email, user.role);

      // Convert to safe profile
      const userProfile: UserSafeProfile = {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        assessmentProgress: user.assessmentProgress,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      const response: ApiResponse<LoginResponse> = {
        success: true,
        message: 'User registered successfully. Please check your email to verify your account.',
        data: {
          user: userProfile,
          tokens,
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      res.status(201).json(response);
    } catch (error: any) {
      console.error('❌ Registration error:', error);

      // Handle mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => ({
          field: err.path,
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: 'VALIDATION_ERROR',
          data: { errors: validationErrors },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: 'REGISTRATION_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, rememberMe }: LoginRequest = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
          error: 'MISSING_CREDENTIALS',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      // Find user with password field
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      // Check if account is locked
      if (user.isAccountLocked()) {
        res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to too many failed login attempts',
          error: 'ACCOUNT_LOCKED',
          data: {
            lockUntil: user.lockUntil,
          },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      // Check if account is active
      if (!user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.',
          error: 'ACCOUNT_DEACTIVATED',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        // Increment login attempts
        await user.incLoginAttempts();

        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Update last login
      user.lastLogin = new Date();
      user.lastLoginIP = req.ip;
      await user.save();

      if (!user._id) {
        throw new Error('User ID is missing');
      }

      // Generate tokens
      const tokens = JWTUtils.generateTokenPair(user._id.toString(), user.email, user.role);

      if (rememberMe) {
        res.cookie('jwt', tokens.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 1000 * 60 * 60 * 24 * 1,
        });
      }

      // Convert to safe profile
      const userProfile: UserSafeProfile = {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        assessmentProgress: user.assessmentProgress,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      const response: ApiResponse<LoginResponse> = {
        success: true,
        message: 'Login successful',
        data: {
          user: userProfile,
          tokens,
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: 'LOGIN_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required',
          error: 'MISSING_REFRESH_TOKEN',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      // Verify and refresh token
      const newTokens = JWTUtils.refreshAccessToken(refreshToken);

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens: newTokens },
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('❌ Token refresh error:', error);

      const statusCode = error.code === 'REFRESH_TOKEN_EXPIRED' ? 401 : 403;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Token refresh failed',
        error: error.code || 'TOKEN_REFRESH_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  }

  /**
   * Logout user (client-side token invalidation)
   */
  static async logout(_req: Request, res: Response): Promise<void> {
    // Note: With JWTs, logout is typically handled client-side by removing tokens
    // Server-side logout would require token blacklisting, which we can implement later if needed

    const response: ApiResponse = {
      success: true,
      message: 'Logout successful',
      data: {
        note: 'Please remove tokens from client storage',
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    res.status(200).json(response);
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      if (!user._id) {
        throw new Error('User ID is missing');
      }

      const userProfile: UserSafeProfile = {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        profilePicture: user.profilePicture,
        assessmentProgress: user.assessmentProgress,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      const response: ApiResponse<UserSafeProfile> = {
        success: true,
        message: 'Profile retrieved successfully',
        data: userProfile,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile',
        error: 'PROFILE_RETRIEVAL_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const updates: UpdateProfileRequest = req.body;
      const allowedUpdates = [
        'firstName',
        'lastName',
        'preferredLanguage',
        'timezone',
        'profilePicture',
      ];
      const actualUpdates = Object.keys(updates).filter(key => allowedUpdates.includes(key));

      if (actualUpdates.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update',
          error: 'NO_VALID_UPDATES',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      // Apply updates
      actualUpdates.forEach(update => {
        (user as any)[update] = (updates as any)[update];
      });

      await user.save();

      if (!user._id) {
        throw new Error('User ID is missing');
      }

      const userProfile: UserSafeProfile = {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        profilePicture: user.profilePicture,
        assessmentProgress: user.assessmentProgress,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      const response: ApiResponse<UserSafeProfile> = {
        success: true,
        message: 'Profile updated successfully',
        data: userProfile,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('❌ Update profile error:', error);

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => ({
          field: err.path,
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: 'VALIDATION_ERROR',
          data: { errors: validationErrors },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Profile update failed',
        error: 'PROFILE_UPDATE_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      if (user.isEmailVerified) {
        res.status(400).json({
          success: false,
          message: 'Email is already verified',
          error: 'EMAIL_ALREADY_VERIFIED',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      await emailService.sendEmailVerification(user.email, user.firstName, verificationToken);

      const response: ApiResponse = {
        success: true,
        message: 'Verification email sent successfully',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Send email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email',
        error: 'EMAIL_VERIFICATION_SEND_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token }: EmailVerificationRequest = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Verification token is required',
          error: 'MISSING_TOKEN',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() },
      });

      if (!user) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token',
          error: 'INVALID_TOKEN',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      const response: ApiResponse = {
        success: true,
        message: 'Email verified successfully',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Email verification failed',
        error: 'EMAIL_VERIFICATION_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  }

  /**
   * Forgot password
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email }: ForgotPasswordRequest = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        res.status(200).json({
          success: true,
          message: 'If the email exists, a password reset link has been sent',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const resetToken = user.generatePasswordResetToken();
      await user.save();

      await emailService.sendPasswordResetEmail(user.email, user.firstName, resetToken);

      const response: ApiResponse = {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset request failed',
        error: 'FORGOT_PASSWORD_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword, confirmPassword }: ResetPasswordRequest = req.body;

      if (!token || !newPassword || !confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'Token, new password, and confirmation are required',
          error: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'Passwords do not match',
          error: 'PASSWORD_MISMATCH',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
          error: 'PASSWORD_TOO_SHORT',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      });

      if (!user) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
          error: 'INVALID_TOKEN',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      // Reset login attempts if any
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      await user.save();

      const response: ApiResponse = {
        success: true,
        message: 'Password reset successfully',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset failed',
        error: 'RESET_PASSWORD_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  }

  /**
   * Change password (authenticated user)
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const { currentPassword, newPassword, confirmPassword }: ChangePasswordRequest = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password, new password, and confirmation are required',
          error: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'New passwords do not match',
          error: 'PASSWORD_MISMATCH',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long',
          error: 'PASSWORD_TOO_SHORT',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const user = await User.findById(req.user.id).select('+password');
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
          error: 'INVALID_CURRENT_PASSWORD',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      user.password = newPassword;
      await user.save();

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Password change failed',
        error: 'CHANGE_PASSWORD_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  }

  /**
   * Send OTP
   */
  static async sendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, action }: SendOTPRequest = req.body;

      if (!email || !action) {
        res.status(400).json({
          success: false,
          message: 'Email and action are required',
          error: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const user = await User.findByEmail(email);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const otp = user.generateOTP();
      await user.save();

      await emailService.sendOTPEmail(user.email, user.firstName, otp, action);

      const response: ApiResponse = {
        success: true,
        message: 'OTP sent successfully',
        data: {
          expiresIn: `${config.OTP_EXPIRE_TIME} minutes`,
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP',
        error: 'SEND_OTP_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, action }: OTPVerificationRequest = req.body;

      if (!email || !otp || !action) {
        res.status(400).json({
          success: false,
          message: 'Email, OTP, and action are required',
          error: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const user = await User.findByEmail(email);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      const isOTPValid = user.verifyOTP(otp);
      if (!isOTPValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP',
          error: 'INVALID_OTP',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });
        return;
      }

      user.clearOTP();
      await user.save();

      const response: ApiResponse = {
        success: true,
        message: 'OTP verified successfully',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP',
        error: 'VERIFY_OTP_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  }
}

export default AuthController;
