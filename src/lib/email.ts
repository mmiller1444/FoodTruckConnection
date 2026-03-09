import nodemailer from 'nodemailer';
import { emailEnabled, env } from '@/lib/env';

function getTransporter() {
  if (!emailEnabled()) return null;

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });
}

export async function sendEmailNotification(to: string | null | undefined, subject: string, text: string) {
  if (!to) return;
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('SMTP not configured; skipping email to', to);
    return;
  }

  await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    text
  });
}
