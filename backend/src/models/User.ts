import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserProfile, UserRole, OTPData } from '../types';
import { config } from '../config/environment';

// Extend the UserProfile interface with Mongoose Document
export interface IUser extends Omit<UserProfile, '_id'>, Document {
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePasswordResetToken(): string;
  generateEmailVerificationToken(): string;
  isAccountLocked(): boolean;
  incLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  generateOTP(): string;
  verifyOTP(candidateOTP: string): boolean;
  clearOTP(): void;

  // Virtual properties
  fullName: string;
  isLocked: boolean;
}

// OTP Schema
const OTPSchema = new Schema<OTPData>(
  {
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Assessment Progress Schema
const AssessmentProgressSchema = new Schema(
  {
    currentStep: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
    },
    highestLevelAchieved: {
      type: String,
      enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
      default: 'A1',
    },
    lastAssessmentDate: {
      type: Date,
    },
    totalAssessmentsTaken: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

// User Schema
const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STUDENT,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    profilePicture: {
      type: String,
      default: null,
    },

    // Security fields
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    // OTP for verification
    otp: {
      type: OTPSchema,
      default: null,
    },

    // Assessment Progress
    assessmentProgress: {
      type: AssessmentProgressSchema,
      default: () => ({
        currentStep: 1,
        highestLevelAchieved: 'A1',
        totalAssessmentsTaken: 0,
      }),
    },

    // Metadata
    registrationIP: {
      type: String,
    },
    lastLoginIP: {
      type: String,
    },
    preferredLanguage: {
      type: String,
      default: 'en',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ isEmailVerified: 1 });
UserSchema.index({ createdAt: 1 });
UserSchema.index({ lastLogin: 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
UserSchema.virtual('isLocked').get(function (this: IUser) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function (this: IUser, next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, config.BCRYPT_SALT_ROUNDS);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
UserSchema.methods.isAccountLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Method to increment login attempts
UserSchema.methods.incLoginAttempts = async function (): Promise<void> {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates: any = { $inc: { loginAttempts: 1 } };

  // If we've reached max attempts and it's not locked already, lock the account
  if (this.loginAttempts + 1 >= config.MAX_LOGIN_ATTEMPTS && !this.isAccountLocked()) {
    updates.$set = {
      lockUntil: new Date(Date.now() + config.LOCKOUT_DURATION * 60 * 1000), // Convert minutes to ms
    };
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

// Method to generate password reset token
UserSchema.methods.generatePasswordResetToken = function (): string {
  const token =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  return token;
};

// Method to generate email verification token
UserSchema.methods.generateEmailVerificationToken = function (): string {
  const token =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  this.emailVerificationToken = token;
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return token;
};

// Method to generate OTP
UserSchema.methods.generateOTP = function (): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + config.OTP_EXPIRE_TIME * 60 * 1000), // Convert minutes to ms
    attempts: 0,
    isUsed: false,
  };

  return otp;
};

// Method to verify OTP
UserSchema.methods.verifyOTP = function (candidateOTP: string): boolean {
  if (!this.otp || this.otp.isUsed || this.otp.expiresAt < new Date()) {
    return false;
  }

  this.otp.attempts += 1;

  if (this.otp.attempts > 5) {
    this.otp.isUsed = true;
    return false;
  }

  if (this.otp.code === candidateOTP) {
    this.otp.isUsed = true;
    return true;
  }

  return false;
};

// Method to clear OTP
UserSchema.methods.clearOTP = function (): void {
  this.otp = undefined;
};

// Static method to find by email
UserSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
UserSchema.statics.findActiveUsers = function () {
  return this.find({ isActive: true });
};

// Static method to find verified users
UserSchema.statics.findVerifiedUsers = function () {
  return this.find({ isEmailVerified: true });
};

// Interface for static methods
interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findActiveUsers(): Promise<IUser[]>;
  findVerifiedUsers(): Promise<IUser[]>;
}

// Create and export the model
const User = mongoose.model<IUser, IUserModel>('User', UserSchema);

export default User;
