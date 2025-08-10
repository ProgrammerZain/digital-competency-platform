// Base API Response Interface
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
  version: string;
}

// Pagination Interface
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// User Roles Enum
export enum UserRole {
  ADMIN = 'admin',
  STUDENT = 'student',
  SUPERVISOR = 'supervisor',
}

// Assessment Levels Enum (A1 → C2)
export enum AssessmentLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

// Assessment Steps Enum
export enum AssessmentStep {
  STEP_1 = 1, // A1 & A2
  STEP_2 = 2, // B1 & B2
  STEP_3 = 3, // C1 & C2
}

// Assessment Status Enum
export enum AssessmentStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

// Certificate Status Enum
export enum CertificateStatus {
  PENDING = 'pending',
  ISSUED = 'issued',
  REVOKED = 'revoked',
}

// Digital Competencies (22 total)
export enum DigitalCompetency {
  // Information Literacy
  INFORMATION_SEARCH = 'information_search',
  INFORMATION_EVALUATION = 'information_evaluation',
  DATA_MANAGEMENT = 'data_management',

  // Communication & Collaboration
  DIGITAL_COMMUNICATION = 'digital_communication',
  ONLINE_COLLABORATION = 'online_collaboration',
  SOCIAL_MEDIA_LITERACY = 'social_media_literacy',

  // Content Creation
  CONTENT_DEVELOPMENT = 'content_development',
  MULTIMEDIA_EDITING = 'multimedia_editing',
  COPYRIGHT_LICENSING = 'copyright_licensing',

  // Safety & Security
  DEVICE_PROTECTION = 'device_protection',
  PERSONAL_DATA_PROTECTION = 'personal_data_protection',
  PRIVACY_MANAGEMENT = 'privacy_management',
  HEALTH_WELLBEING = 'health_wellbeing',
  ENVIRONMENTAL_PROTECTION = 'environmental_protection',

  // Problem Solving
  TECHNICAL_TROUBLESHOOTING = 'technical_troubleshooting',
  IDENTIFYING_NEEDS = 'identifying_needs',
  CREATIVE_USE_OF_TECHNOLOGY = 'creative_use_of_technology',
  IDENTIFYING_GAPS = 'identifying_gaps',

  // Software Proficiency
  OPERATING_SYSTEMS = 'operating_systems',
  OFFICE_PRODUCTIVITY = 'office_productivity',
  WEB_BROWSERS = 'web_browsers',
  MOBILE_APPLICATIONS = 'mobile_applications',
}

// Question Types
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SCENARIO = 'scenario',
  PRACTICAL = 'practical',
}

// Base MongoDB Document Interface
export interface BaseDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Error Types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  errors?: ValidationError[];
}

// JWT Payload Interface
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// OTP Interface
export interface OTPData {
  code: string;
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
}

// File Upload Interface
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

// Request Extensions
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

// Common Query Filters
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface ScoreRangeFilter {
  minScore?: number;
  maxScore?: number;
}

// Export all types
export * from './auth';
export * from './assessment';
export * from './mongoose';
