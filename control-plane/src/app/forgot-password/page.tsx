"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { requestPasswordReset } from "@/lib/actions/account";
import { useState } from "react";

const formSchema = z.object({
  email: z.string().email({
    message: "올바른 이메일 주소를 입력해주세요.",
  }),
});

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await requestPasswordReset(values.email);

    if (!res.success) {
      form.setError("email", {
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
          <h1 className="text-2xl font-bold mb-4">이메일을 확인해주세요</h1>
          <p className="text-gray-600 mb-4">
            비밀번호 재설정 링크가 입력하신 이메일로 발송되었습니다.
            이메일을 확인하여 비밀번호를 재설정해주세요.
          </p>
          <p className="text-sm text-gray-500">
            이메일이 도착하지 않았다면 스팸 폴더를 확인해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-6">비밀번호 찾기</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일 주소</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="example@email.com"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  계정에 연결된 인증된 이메일 주소를 입력해주세요.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            비밀번호 재설정 링크 보내기
          </Button>
        </form>
      </Form>
    </div>
  );
}