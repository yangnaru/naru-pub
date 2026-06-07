import { redirect } from "next/navigation";

export default function AccountPaymentsRedirect() {
  redirect("/support/payments");
}
