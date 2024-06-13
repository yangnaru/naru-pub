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
import { changePassword } from "@/lib/actions/account";
import { toast } from "@/components/ui/use-toast";

const formSchema = z
  .object({
    originalPassword: z.string().min(8, {
      message: "비밀번호는 8자 이상이어야 합니다.",
    }),
    newPassword: z.string().min(8, {
      message: "비밀번호는 8자 이상이어야 합니다.",
    }),
    newPasswordConfirm: z.string().min(8, {
      message: "비밀번호는 8자 이상이어야 합니다.",
    }),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

export default function ChangePasswordForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      originalPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await changePassword(
      values.originalPassword,
      values.newPassword
    );

    toast({
      title: res.message,
      variant: res.success ? "default" : "destructive",
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="originalPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>기존 비밀번호</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
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
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>새 비밀번호</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
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
          name="newPasswordConfirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호 확인</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>
                새 비밀번호를 한 번 더 입력해주세요.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">비밀번호 변경</Button>
      </form>
    </Form>
  );
}
