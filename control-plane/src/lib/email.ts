import { createMessage } from "@upyo/core";
import { MailgunTransport } from "@upyo/mailgun";
import { generateId } from "lucia";

const transport = new MailgunTransport({
  domain: process.env.MAILGUN_DOMAIN || "naru.pub",
  apiKey: process.env.MAILGUN_API_KEY!,
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

export async function sendAccountDeletionEmail(email: string, token: string) {
  const confirmationUrl = `${process.env.BASE_URL}/confirm-account-deletion?token=${token}`;
  
  const message = createMessage({
    from: process.env.FROM_EMAIL || "noreply@naru.pub",
    to: email,
    subject: "계정 삭제 확인",
    content: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">계정 삭제 확인</h2>
          <p><strong>주의:</strong> 계정 삭제를 완료하려면 아래 링크를 클릭해주세요.</p>
          <p>계정이 삭제되면:</p>
          <ul>
            <li>모든 파일과 데이터가 영구적으로 삭제됩니다</li>
            <li>이 작업은 되돌릴 수 없습니다</li>
            <li>동일한 로그인명으로 다시 가입할 수 있습니다</li>
          </ul>
          <p>
            <a href="${confirmationUrl}" style="background-color: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              계정 삭제 확인
            </a>
          </p>
          <p>계정 삭제를 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.</p>
          <p>이 링크는 1시간 후에 만료됩니다.</p>
        </div>
      `,
      text: `
        계정 삭제 확인
        
        주의: 계정 삭제를 완료하려면 다음 링크를 방문해주세요:
        ${confirmationUrl}
        
        계정이 삭제되면:
        - 모든 파일과 데이터가 영구적으로 삭제됩니다
        - 이 작업은 되돌릴 수 없습니다
        - 동일한 로그인명으로 다시 가입할 수 있습니다
        
        계정 삭제를 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.
        이 링크는 1시간 후에 만료됩니다.
      `,
    },
    tags: ["account-deletion", "security"],
  });

  const receipt = await transport.send(message);
  if (!receipt.successful) {
    throw new Error(`Failed to send account deletion email: ${receipt.errorMessages?.join(", ")}`);
  }
  return receipt;
}

export function generateAccountDeletionToken(): string {
  return generateId(32);
}