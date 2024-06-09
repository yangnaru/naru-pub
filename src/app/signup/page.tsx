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
import { signUp } from "@/lib/actions/account";
import { LOGIN_NAME_REGEX } from "@/lib/const";

const formSchema = z
  .object({
    username: z
      .string()
      .regex(LOGIN_NAME_REGEX, {
        message:
          "아이디는 영문, 숫자, 하이픈(-)만 사용할 수 있으며, 하이픈은 연속으로 사용할 수 없습니다.",
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
    passwordConfirm: z.string().min(8, {
      message: "비밀번호는 8자 이상이어야 합니다.",
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

const usernamePlaceholder = "naru";

export default function SignUpPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      passwordConfirm: "",
    },
  });

  const username = form.watch("username");
  const domain = `${username === "" ? usernamePlaceholder : username}.${
    process.env.NEXT_PUBLIC_DOMAIN
  }`;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await signUp(values.username, values.password);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>아이디</FormLabel>
              <FormControl>
                <Input
                  placeholder={usernamePlaceholder}
                  autoCapitalize="none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                로그인과 홈페이지 도메인에 사용될 아이디입니다. ({domain})
              </FormDescription>
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
              <FormLabel>비밀번호 확인</FormLabel>
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
        <Button type="submit">회원 가입</Button>
      </form>
    </Form>
  );
}
