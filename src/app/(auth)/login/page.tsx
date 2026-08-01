import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-text-muted">
          Setting this up for the first time?{" "}
          <Link href="/signup" className="text-accent-strength hover:underline">
            Create the owner account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
