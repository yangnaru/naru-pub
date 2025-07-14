import { createMessage } from "@upyo/core";
import { SmtpTransport } from "@upyo/smtp";
import { generateId } from "lucia";

const transport = new SmtpTransport({
  host: process.env.SMTP_HOST!,
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
  secure: process.env.SMTP_SECURE === "true",
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.BASE_URL}/verify-email?token=${token}`;
  
  const message = createMessage({
    from: process.env.FROM_EMAIL || "noreply@naru.pub",
    to: email,
    subject: "Verify your email address",
    content: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify your email address</h2>
          <p>Please click the link below to verify your email address:</p>
          <p>
            <a href="${verificationUrl}" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Verify Email
            </a>
          </p>
          <p>If you didn't request this verification, you can safely ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `,
      text: `
        Verify your email address
        
        Please visit the following link to verify your email address:
        ${verificationUrl}
        
        If you didn't request this verification, you can safely ignore this email.
        This link will expire in 24 hours.
      `,
    },
  });

  return await transport.send(message);
}

export function generateVerificationToken(): string {
  return generateId(32);
}