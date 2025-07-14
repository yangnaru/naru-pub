"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/lib/actions/account";
import { useState } from "react";

const formSchema = z
  .object({
    password: z.string().min(8, {
      message: "비밀번호는 8자 이상이어야 합니다.",
    }),
    passwordConfirm: z.string().min(8, {
      message: "비밀번호는 8자 이상이어야 합니다.",
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      passwordConfirm: "",
    },
  });

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">유효하지 않은 링크</h1>
          <p className="text-gray-600">
            비밀번호 재설정 링크가 유효하지 않습니다.
            다시 비밀번호 재설정을 요청해주세요.
          </p>
        </div>
      </div>
    );
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await resetPassword(token, values.password);

    if (!res.success) {
      form.setError("password", {
        type: "manual",
        message: res.message,
      });
    } else {
      setIsSubmitted(true);
    }
  }

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">비밀번호 변경 완료</h1>
          <p className="text-gray-600 mb-4">
            비밀번호가 성공적으로 변경되었습니다.
            새로운 비밀번호로 로그인해주세요.
          </p>
          <Button onClick={() => window.location.href = "/login"}>
            로그인하러 가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-6">새 비밀번호 설정</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>새 비밀번호</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormDescription>
                  비밀번호는 8자 이상이어야 합니다.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="passwordConfirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>새 비밀번호 확인</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormDescription>
                  위에서 입력한 비밀번호를 한 번 더 입력해주세요.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            비밀번호 변경
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}