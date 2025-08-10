import { Router } from 'express';
import AuthController from '../controllers/authController';
import { authenticate, sensitiveOperationLimit, logUserActivity } from '../middleware/auth';

const router = Router();

// Public routes
router.post(
  '/register',
  sensitiveOperationLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  logUserActivity('register'),
  AuthController.register
);

router.post(
  '/login',
  sensitiveOperationLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  logUserActivity('login'),
  AuthController.login
);

router.post(
  '/refresh-token',
  sensitiveOperationLimit(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
  AuthController.refreshToken
);

router.post(
  '/forgot-password',
  sensitiveOperationLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  logUserActivity('forgot_password'),
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  sensitiveOperationLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  logUserActivity('reset_password'),
  AuthController.resetPassword
);

router.post(
  '/verify-email',
  sensitiveOperationLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  logUserActivity('verify_email'),
  AuthController.verifyEmail
);

router.post(
  '/send-otp',
  sensitiveOperationLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  logUserActivity('send_otp'),
  AuthController.sendOTP
);

router.post(
  '/verify-otp',
  sensitiveOperationLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  logUserActivity('verify_otp'),
  AuthController.verifyOTP
);

// Protected routes (require authentication)
router.use(authenticate); // All routes below require authentication

router.post('/logout', logUserActivity('logout'), AuthController.logout);

router.get('/profile', AuthController.getProfile);

router.put('/profile', logUserActivity('update_profile'), AuthController.updateProfile);

router.post(
  '/change-password',
  sensitiveOperationLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  logUserActivity('change_password'),
  AuthController.changePassword
);

router.post(
  '/send-email-verification',
  sensitiveOperationLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  logUserActivity('send_email_verification'),
  AuthController.sendEmailVerification
);

export default router;
