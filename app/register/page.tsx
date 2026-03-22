import { redirect } from "next/navigation";

/** Email/password signup was removed; accounts are GitHub-only. */
export default function RegisterRedirectPage() {
  redirect("/login");
}
