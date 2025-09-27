import nodemailer from 'nodemailer';
import { logger } from './logger';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

// Email templates
const EMAIL_TEMPLATES = {
  'email-verification': {
    subject: 'Welcome to NeoAI IDE - Verify your email',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Welcome to NeoAI IDE!</h1>
        <p>Hi ${data.name},</p>
        <p>Thank you for signing up for NeoAI IDE. To complete your registration, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${data.verificationUrl}">${data.verificationUrl}</a></p>
        <p>This link will expire in 24 hours for security reasons.</p>
        <p>If you didn't create an account with NeoAI IDE, you can safely ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Best regards,<br>
          The NeoAI IDE Team
        </p>
      </div>
    `,
  },
  'password-reset': {
    subject: 'Reset your NeoAI IDE password',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Password Reset Request</h1>
        <p>Hi ${data.name},</p>
        <p>We received a request to reset your password for your NeoAI IDE account. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${data.resetUrl}">${data.resetUrl}</a></p>
        <p>This link will expire in ${data.expiryTime} for security reasons.</p>
        <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Best regards,<br>
          The NeoAI IDE Team
        </p>
      </div>
    `,
  },
  'welcome': {
    subject: 'Welcome to NeoAI IDE!',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Welcome to NeoAI IDE!</h1>
        <p>Hi ${data.name},</p>
        <p>Welcome to the future of development! You're now part of the NeoAI IDE community.</p>
        <h2>Getting Started</h2>
        <ul>
          <li>Create your first project</li>
          <li>Try the AI assistant for code generation</li>
          <li>Explore agent workflows for automated development</li>
          <li>Use the integrated preview and deployment features</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboardUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        <p>If you have any questions, feel free to reach out to our support team or check out our documentation.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Best regards,<br>
          The NeoAI IDE Team
        </p>
      </div>
    `,
  },
  'subscription-welcome': {
    subject: 'Welcome to NeoAI IDE Pro!',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Welcome to NeoAI IDE ${data.plan}!</h1>
        <p>Hi ${data.name},</p>
        <p>Thank you for upgrading to NeoAI IDE ${data.plan}! You now have access to premium features:</p>
        <h2>Your ${data.plan} Features</h2>
        <ul>
          ${data.features.map((feature: string) => `<li>${feature}</li>`).join('')}
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboardUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Start Using ${data.plan} Features
          </a>
        </div>
        <p>Your subscription will renew automatically on ${data.renewalDate}. You can manage your subscription anytime from your dashboard.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Best regards,<br>
          The NeoAI IDE Team
        </p>
      </div>
    `,
  },
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'test') {
      logger.info('Email sending skipped in test environment');
      return;
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('Email configuration missing, skipping email send');
      return;
    }

    const template = EMAIL_TEMPLATES[options.template as keyof typeof EMAIL_TEMPLATES];
    if (!template) {
      throw new Error(`Email template '${options.template}' not found`);
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"NeoAI IDE" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject || template.subject,
      html: template.html(options.data),
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info('Email sent successfully', {
      to: options.to,
      subject: options.subject,
      template: options.template,
      messageId: info.messageId,
    });
  } catch (error) {
    logger.error('Failed to send email', {
      to: options.to,
      subject: options.subject,
      template: options.template,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

export const sendWelcomeEmail = async (user: { email: string; name: string }) => {
  await sendEmail({
    to: user.email,
    subject: 'Welcome to NeoAI IDE!',
    template: 'welcome',
    data: {
      name: user.name,
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
    },
  });
};

export const sendSubscriptionWelcomeEmail = async (
  user: { email: string; name: string },
  plan: string,
  features: string[],
  renewalDate: string
) => {
  await sendEmail({
    to: user.email,
    subject: `Welcome to NeoAI IDE ${plan}!`,
    template: 'subscription-welcome',
    data: {
      name: user.name,
      plan,
      features,
      renewalDate,
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
    },
  });
};
