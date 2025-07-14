import { createMessage } from "@upyo/core";
import { SmtpTransport } from "@upyo/smtp";
import { generateId } from "lucia";

const transport = new SmtpTransport({
  host: process.env.SMTP_HOST!,
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
    method: "plain",
  },
  secure: process.env.SMTP_SECURE === "true",
  connectionTimeout: 30000,
  socketTimeout: 60000,
  retries: 3,
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.BASE_URL}/verify-email?token=${token}`;
  
  const message = createMessage({
    from: process.env.FROM_EMAIL || "noreply@naru.pub",
    to: email,
    subject: "이메일 주소를 인증해주세요",
    content: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>이메일 주소 인증</h2>
          <p>아래 링크를 클릭하여 이메일 주소를 인증해주세요:</p>
          <p>
            <a href="${verificationUrl}" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              이메일 인증하기
            </a>
          </p>
          <p>이메일 인증을 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.</p>
          <p>이 링크는 24시간 후에 만료됩니다.</p>
        </div>
      `,
      text: `
        이메일 주소 인증
        
        다음 링크를 방문하여 이메일 주소를 인증해주세요:
        ${verificationUrl}
        
        이메일 인증을 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.
        이 링크는 24시간 후에 만료됩니다.
      `,
    },
    tags: ["verification", "onboarding"],
  });

  const receipt = await transport.send(message);
  if (!receipt.successful) {
    throw new Error(`Failed to send verification email: ${receipt.errorMessages?.join(", ")}`);
  }
  return receipt;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.BASE_URL}/reset-password?token=${token}`;
  
  const message = createMessage({
    from: process.env.FROM_EMAIL || "noreply@naru.pub",
    to: email,
    subject: "비밀번호 재설정",
    content: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>비밀번호 재설정</h2>
          <p>아래 링크를 클릭하여 새로운 비밀번호를 설정해주세요:</p>
          <p>
            <a href="${resetUrl}" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              비밀번호 재설정하기
            </a>
          </p>
          <p>비밀번호 재설정을 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.</p>
          <p>이 링크는 1시간 후에 만료됩니다.</p>
        </div>
      `,
      text: `
        비밀번호 재설정
        
        다음 링크를 방문하여 새로운 비밀번호를 설정해주세요:
        ${resetUrl}
        
        비밀번호 재설정을 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.
        이 링크는 1시간 후에 만료됩니다.
      `,
    },
    tags: ["password-reset", "security"],
  });

  const receipt = await transport.send(message);
  if (!receipt.successful) {
    throw new Error(`Failed to send password reset email: ${receipt.errorMessages?.join(", ")}`);
  }
  return receipt;
}

export function generateVerificationToken(): string {
  return generateId(32);
}

export function generatePasswordResetToken(): string {
  return generateId(32);
}