import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Entrar · StudyHub" };

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid place-items-center px-6">
      <Suspense fallback={null}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
