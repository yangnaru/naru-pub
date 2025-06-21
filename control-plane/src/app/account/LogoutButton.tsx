"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/account";

export default function LogoutButton() {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        logout();
      }}
    >
      로그아웃
    </Button>
  );
}
