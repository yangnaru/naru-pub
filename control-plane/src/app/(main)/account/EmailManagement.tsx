"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { associateEmail, resendVerificationEmail } from "@/lib/actions/account";
import { useToast } from "@/components/hooks/use-toast";
import { Mail, CheckCircle, Clock, Loader, Send } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요."),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface EmailManagementProps {
  currentEmail: string | null;
  emailVerifiedAt: Date | null;
}

export default function EmailManagement({ currentEmail, emailVerifiedAt }: EmailManagementProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: currentEmail || "",
    },
  });

  const onSubmit = async (data: EmailFormData) => {
    setIsSubmitting(true);
    try {
      const result = await associateEmail(data.email);
      if (result.success) {
        toast({
          description: result.message,
        });
      } else {
        toast({
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        description: "오류가 발생했습니다.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const result = await resendVerificationEmail();
      if (result.success) {
        toast({
          description: result.message,
        });
      } else {
        toast({
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        description: "오류가 발생했습니다.",
        variant: "destructive",
      });
    }
    setIsResending(false);
  };

  return (
    <Card className="bg-white border-2 border-gray-300 shadow-lg">
      <CardHeader className="bg-gray-100 border-b-2 border-gray-300">
        <CardTitle className="text-gray-800 text-xl font-bold flex items-center gap-2">
          <Mail size={20} />
          이메일 관리
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {currentEmail && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">현재 이메일</p>
                <p className="font-medium text-gray-700">{currentEmail}</p>
              </div>
              <div className="flex items-center gap-2">
                {emailVerifiedAt ? (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle size={12} />
                      인증됨
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(emailVerifiedAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Clock size={12} />
                      인증 대기
                    </span>
                    <button
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {isResending ? (
                        <>
                          <Loader size={12} className="animate-spin" />
                          발송 중...
                        </>
                      ) : (
                        <>
                          <Send size={12} />
                          재발송
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              {currentEmail ? "이메일 변경" : "이메일 추가"}
            </label>
            <input
              {...register("email")}
              type="email"
              id="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader size={16} className="animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <Mail size={16} />
                {currentEmail ? "이메일 변경" : "이메일 추가"}
              </>
            )}
          </button>
        </form>

        {!emailVerifiedAt && currentEmail && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              이메일 인증이 완료되지 않았습니다. 이메일함을 확인해주세요.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}