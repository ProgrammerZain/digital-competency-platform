import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvironmentConfig {
  // Server Configuration
  PORT: number;
  NODE_ENV: string;

  // Database Configuration
  MONGODB_URI: string;

  // JWT Configuration
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRE_TIME: string;
  JWT_REFRESH_EXPIRE_TIME: string;

  // Email Configuration
  EMAIL_SERVICE: string;
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_SECURE: boolean;
  EMAIL_USER: string;
  EMAIL_PASS: string;
  EMAIL_FROM_NAME: string;
  EMAIL_FROM_ADDRESS: string;

  // SMS Configuration (Twilio)
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;

  // Security Configuration
  BCRYPT_SALT_ROUNDS: number;
  OTP_EXPIRE_TIME: number;
  MAX_LOGIN_ATTEMPTS: number;
  LOCKOUT_DURATION: number;

  // CORS Configuration
  FRONTEND_URL: string;
  ALLOWED_ORIGINS: string[];

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Assessment Configuration
  DEFAULT_QUESTION_TIME_MINUTES: number;
  MAX_ASSESSMENT_TIME_HOURS: number;
  QUESTIONS_PER_STEP: number;
  TOTAL_COMPETENCIES: number;
}

const getEnvVariable = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not defined`);
  }
  return value;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not defined`);
  }
  return value ? parseInt(value, 10) : (defaultValue as number);
};

const getEnvBoolean = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const config: EnvironmentConfig = {
  // Server Configuration
  PORT: getEnvNumber('PORT', 5000),
  NODE_ENV: getEnvVariable('NODE_ENV', 'development'),

  // Database Configuration
  MONGODB_URI: getEnvVariable('MONGODB_URI'),

  // JWT Configuration
  JWT_SECRET: getEnvVariable('JWT_SECRET'),
  JWT_REFRESH_SECRET: getEnvVariable('JWT_REFRESH_SECRET'),
  JWT_EXPIRE_TIME: getEnvVariable('JWT_EXPIRE_TIME', '15m'),
  JWT_REFRESH_EXPIRE_TIME: getEnvVariable('JWT_REFRESH_EXPIRE_TIME', '7d'),

  // Email Configuration
  EMAIL_SERVICE: getEnvVariable('EMAIL_SERVICE', 'gmail'),
  EMAIL_HOST: getEnvVariable('EMAIL_HOST', 'smtp.gmail.com'),
  EMAIL_PORT: getEnvNumber('EMAIL_PORT', 587),
  EMAIL_SECURE: getEnvBoolean('EMAIL_SECURE', false),
  EMAIL_USER: getEnvVariable('EMAIL_USER'),
  EMAIL_PASS: getEnvVariable('EMAIL_PASS'),
  EMAIL_FROM_NAME: getEnvVariable('EMAIL_FROM_NAME', 'Digital Competency Platform'),
  EMAIL_FROM_ADDRESS: getEnvVariable('EMAIL_FROM_ADDRESS'),

  // SMS Configuration
  TWILIO_ACCOUNT_SID: getEnvVariable('TWILIO_ACCOUNT_SID'),
  TWILIO_AUTH_TOKEN: getEnvVariable('TWILIO_AUTH_TOKEN'),
  TWILIO_PHONE_NUMBER: getEnvVariable('TWILIO_PHONE_NUMBER'),

  // Security Configuration
  BCRYPT_SALT_ROUNDS: getEnvNumber('BCRYPT_SALT_ROUNDS', 12),
  OTP_EXPIRE_TIME: getEnvNumber('OTP_EXPIRE_TIME', 10),
  MAX_LOGIN_ATTEMPTS: getEnvNumber('MAX_LOGIN_ATTEMPTS', 5),
  LOCKOUT_DURATION: getEnvNumber('LOCKOUT_DURATION', 30),

  // CORS Configuration
  FRONTEND_URL: getEnvVariable('FRONTEND_URL', 'http://localhost:3000'),
  ALLOWED_ORIGINS: getEnvVariable('ALLOWED_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim()),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),

  // Assessment Configuration
  DEFAULT_QUESTION_TIME_MINUTES: getEnvNumber('DEFAULT_QUESTION_TIME_MINUTES', 1),
  MAX_ASSESSMENT_TIME_HOURS: getEnvNumber('MAX_ASSESSMENT_TIME_HOURS', 2),
  QUESTIONS_PER_STEP: getEnvNumber('QUESTIONS_PER_STEP', 44),
  TOTAL_COMPETENCIES: getEnvNumber('TOTAL_COMPETENCIES', 22),
};

// Validate critical environment variables on startup
export const validateEnvironment = (): void => {
  const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'EMAIL_USER',
    'EMAIL_PASS',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
};

export default config;
