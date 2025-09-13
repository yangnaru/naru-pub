"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/account";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        logout();
      }}
      className="flex items-center gap-2"
    >
      <LogOut size={16} />
      로그아웃
    </Button>
  );
}
