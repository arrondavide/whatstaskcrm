import { redirect } from "next/navigation";

// With Google-only auth, signup and login are the same flow
export default function SignupPage() {
  redirect("/login");
}
