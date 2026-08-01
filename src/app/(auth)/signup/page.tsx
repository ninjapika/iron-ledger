import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpForm } from "@/components/auth/signup-form";

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up your ledger</CardTitle>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
    </Card>
  );
}
