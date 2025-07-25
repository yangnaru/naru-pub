"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 max-w-fit"
      >
        <FormField
          control={form.control}
          name="discoverable"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>검색 및 발견 허용</FormLabel>
                <FormDescription>
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
  );
}
