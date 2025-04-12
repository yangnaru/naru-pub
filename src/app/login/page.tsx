"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/actions/account";
import { LOGIN_NAME_REGEX } from "@/lib/const";
import { toast } from "@/components/hooks/use-toast";

const formSchema = z.object({
  username: z
    .string()
    .regex(LOGIN_NAME_REGEX, {
      message:
        "아이디는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있으며, 하이픈은 연속으로 사용할 수 없습니다.",
    })
    .min(2, {
      message: "아이디는 2자 이상이어야 합니다.",
    })
    .max(50, {
      message: "아이디는 50자 이하여야 합니다.",
    })
    .refine((value) => !value.startsWith("-") && !value.endsWith("-"), {
      message: "아이디는 하이픈으로 시작하거나 끝날 수 없습니다.",
    }),
  password: z.string().min(8, {
    message: "비밀번호는 8자 이상이어야 합니다.",
  }),
});

export default function LoginPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await login(values.username, values.password);

    if (!res.success) {
      toast({ title: "로그인에 실패했습니다." });
    } else {
      location.href = "/";
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 max-w-fit"
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>아이디</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">로그인</Button>
      </form>
    </Form>
  );
}
