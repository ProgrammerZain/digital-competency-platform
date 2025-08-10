import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/environment';

// Email types
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

// Email service class
export class EmailService {
  private transporter: Transporter;
  private static instance: EmailService;

  private constructor() {
    this.transporter = this.createTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private createTransporter(): Transporter {
    return nodemailer.createTransport({
      service: config.EMAIL_SERVICE,
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      secure: config.EMAIL_SECURE,
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: `${config.EMAIL_FROM_NAME} <${config.EMAIL_FROM_ADDRESS}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return false;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, firstName: string, verificationToken?: string): Promise<boolean> {
    const template = this.getWelcomeEmailTemplate(firstName, verificationToken);
    
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(to: string, firstName: string, verificationToken: string): Promise<boolean> {
    const template = this.getEmailVerificationTemplate(firstName, verificationToken);
    
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, firstName: string, resetToken: string): Promise<boolean> {
    const template = this.getPasswordResetTemplate(firstName, resetToken);
    
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }

  /**
   * Send OTP email
   */
  async sendOTPEmail(to: string, firstName: string, otp: string, action: string): Promise<boolean> {
    const template = this.getOTPTemplate(firstName, otp, action);
    
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }

  /**
   * Send assessment completion email
   */
  async sendAssessmentCompletionEmail(
    to: string, 
    firstName: string, 
    level: string, 
    score: number,
    certificateUrl?: string
  ): Promise<boolean> {
    const template = this.getAssessmentCompletionTemplate(firstName, level, score, certificateUrl);
    
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }

  /**
   * Send certificate email
   */
  async sendCertificateEmail(
    to: string, 
    firstName: string, 
    level: string,
    certificateBuffer: Buffer
  ): Promise<boolean> {
    const template = this.getCertificateTemplate(firstName, level);
    
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
      attachments: [{
        filename: `Digital_Competency_Certificate_${level}.pdf`,
        content: certificateBuffer,
        contentType: 'application/pdf'
      }]
    });
  }

  // Email Templates

  private getWelcomeEmailTemplate(firstName: string, verificationToken?: string): EmailTemplate {
    const verificationLink = verificationToken 
      ? `${config.FRONTEND_URL}/verify-email?token=${verificationToken}`
      : '';

    const subject = 'Welcome to Digital Competency Platform! 🌟';
    
    const text = `
Hi ${firstName},

Welcome to the Digital Competency Assessment Platform!

We're excited to have you join our community of learners working to improve their digital skills.

${verificationToken ? `Please verify your email address by clicking this link: ${verificationLink}` : ''}

What's next?
1. Complete your profile
2. Start with your first assessment (A1/A2 level)
3. Earn your digital competency certificates

If you have any questions, feel free to reach out to our support team.

Best regards,
Digital Competency Platform Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                 text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌟 Welcome to Digital Competency Platform!</h1>
        </div>
        <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Welcome to our community of learners working to improve their digital skills!</p>
            
            ${verificationToken ? `
            <p>To get started, please verify your email address:</p>
            <a href="${verificationLink}" class="button">Verify Email Address</a>
            ` : ''}
            
            <h3>What's next?</h3>
            <ol>
                <li>Complete your profile</li>
                <li>Start with your first assessment (A1/A2 level)</li>
                <li>Earn your digital competency certificates</li>
            </ol>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Digital Competency Platform Team</p>
        </div>
    </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  private getEmailVerificationTemplate(firstName: string, verificationToken: string): EmailTemplate {
    const verificationLink = `${config.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const subject = 'Verify Your Email Address';
    
    const text = `
Hi ${firstName},

Please verify your email address by clicking the link below:
${verificationLink}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
Digital Competency Platform Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                 text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Email Verification</h1>
        </div>
        <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Please verify your email address to complete your registration:</p>
            <a href="${verificationLink}" class="button">Verify Email Address</a>
            <p><em>This link will expire in 24 hours.</em></p>
            <p>If you didn't create an account, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Digital Competency Platform Team</p>
        </div>
    </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  private getPasswordResetTemplate(firstName: string, resetToken: string): EmailTemplate {
    const resetLink = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const subject = 'Reset Your Password';
    
    const text = `
Hi ${firstName},

You requested to reset your password. Click the link below to set a new password:
${resetLink}

This link will expire in 30 minutes.

If you didn't request this, please ignore this email and your password will remain unchanged.

Best regards,
Digital Competency Platform Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; 
                 text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>You requested to reset your password. Click the button below to set a new password:</p>
            <a href="${resetLink}" class="button">Reset Password</a>
            <p><em>This link will expire in 30 minutes.</em></p>
            <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Digital Competency Platform Team</p>
        </div>
    </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  private getOTPTemplate(firstName: string, otp: string, action: string): EmailTemplate {
    const subject = `Your OTP Code: ${otp}`;
    
    const text = `
Hi ${firstName},

Your OTP code for ${action} is: ${otp}

This code will expire in ${config.OTP_EXPIRE_TIME} minutes.

If you didn't request this code, please ignore this email.

Best regards,
Digital Competency Platform Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; text-align: center; }
        .otp-code { font-size: 32px; font-weight: bold; color: #059669; 
                   letter-spacing: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔢 Your OTP Code</h1>
        </div>
        <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Your OTP code for ${action} is:</p>
            <div class="otp-code">${otp}</div>
            <p><em>This code will expire in ${config.OTP_EXPIRE_TIME} minutes.</em></p>
            <p>If you didn't request this code, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Digital Competency Platform Team</p>
        </div>
    </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  private getAssessmentCompletionTemplate(
    firstName: string, 
    level: string, 
    score: number,
    certificateUrl?: string
  ): EmailTemplate {
    const subject = `🎉 Assessment Completed - ${level} Level Achieved!`;
    
    const text = `
Hi ${firstName},

Congratulations! You have successfully completed your digital competency assessment.

Assessment Results:
- Level Achieved: ${level}
- Score: ${score}%

${certificateUrl ? `Your certificate is ready for download: ${certificateUrl}` : 'Your certificate will be available shortly.'}

Keep up the great work on your digital learning journey!

Best regards,
Digital Competency Platform Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; 
                 text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .results { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Assessment Completed!</h1>
        </div>
        <div class="content">
            <h2>Congratulations ${firstName}!</h2>
            <p>You have successfully completed your digital competency assessment.</p>
            
            <div class="results">
                <h3>Assessment Results:</h3>
                <ul>
                    <li><strong>Level Achieved:</strong> ${level}</li>
                    <li><strong>Score:</strong> ${score}%</li>
                </ul>
            </div>
            
            ${certificateUrl ? `
            <p>Your certificate is ready for download:</p>
            <a href="${certificateUrl}" class="button">Download Certificate</a>
            ` : '<p>Your certificate will be available shortly.</p>'}
            
            <p>Keep up the great work on your digital learning journey!</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Digital Competency Platform Team</p>
        </div>
    </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  private getCertificateTemplate(firstName: string, level: string): EmailTemplate {
    const subject = `📜 Your Digital Competency Certificate - ${level} Level`;
    
    const text = `
Hi ${firstName},

Congratulations! Your Digital Competency Certificate for ${level} level is attached to this email.

You can also download it anytime from your dashboard.

Share your achievement with pride!

Best regards,
Digital Competency Platform Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; text-align: center; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📜 Your Certificate is Ready!</h1>
        </div>
        <div class="content">
            <h2>Congratulations ${firstName}!</h2>
            <p>Your Digital Competency Certificate for <strong>${level} level</strong> is attached to this email.</p>
            <p>You can also download it anytime from your dashboard.</p>
            <p>Share your achievement with pride!</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Digital Competency Platform Team</p>
        </div>
    </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
export default emailService;
