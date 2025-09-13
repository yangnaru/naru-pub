"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { toast } from "@/components/hooks/use-toast";
import { setDiscoverable } from "@/lib/actions/account";

const FormSchema = z.object({
  discoverable: z.boolean().default(false).optional(),
});

export function DiscoverabilityForm({
  discoverable,
}: {
  discoverable: boolean;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      discoverable,
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    await setDiscoverable(data.discoverable ?? false);

    toast({
      title: "사이트 검색 및 발견 허용 설정이 변경되었습니다.",
      description: `검색 및 발견: ${data.discoverable ? "허용" : "비허용"}`,
    });
  }

  return (
    <Card className="bg-white border-2 border-gray-300 shadow-lg">
      <CardHeader className="bg-gray-100 border-b-2 border-gray-300">
        <CardTitle className="text-gray-800 text-xl font-bold flex items-center gap-2">
          🔍 검색 및 발견 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="discoverable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-gray-50 border border-gray-200 rounded p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-gray-800">검색 및 발견 허용</FormLabel>
                    <FormDescription className="text-gray-700">
                      해당 설정을 활성화한 경우 나루 메인 홈페이지에 노출될 수
                      있습니다.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit">저장</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
