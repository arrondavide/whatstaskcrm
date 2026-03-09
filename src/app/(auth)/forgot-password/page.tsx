import { redirect } from "next/navigation";

// Not needed with Google-only auth
export default function ForgotPasswordPage() {
  redirect("/login");
}
