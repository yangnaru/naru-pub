"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);
  const [message, setMessage] = useState("후원을 처리하고 있습니다…");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const authKey = params.get("authKey");
    const customerKey = params.get("customerKey");

    // Toss redirects here without authKey when the card registration is
    // cancelled or fails.
    if (!authKey || !customerKey) {
      router.replace("/account?support=canceled");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/account/subscription/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authKey, customerKey }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          router.replace("/account?support=success");
        } else {
          setMessage(data.message ?? "후원 처리에 실패했습니다.");
          router.replace("/account?support=failed");
        }
      } catch {
        router.replace("/account?support=failed");
      }
    })();
  }, [params, router]);

  return (
    <div className="max-w-xl mx-auto p-8 text-center text-muted-foreground">
      {message}
    </div>
  );
}

export default function SubscriptionCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-xl mx-auto p-8 text-center text-muted-foreground">
          후원을 처리하고 있습니다…
        </div>
      }
    >
      <Callback />
    </Suspense>
  );
}
