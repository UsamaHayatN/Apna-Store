"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction, ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ActionState | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setState(null);
    const formData = new FormData(e.currentTarget);
    const res = await resetPasswordAction(null, formData);
    setState(res);
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-light tracking-tight uppercase text-neutral-950">
          Reset Credentials
        </h1>
        <p className="mt-2 text-xs text-neutral-500">
          Establish a new secure password for your Atelier account.
        </p>
      </div>

      {state?.error && (
        <div
          id="reset-error-banner"
          className="mb-6 p-4 bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-3"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p>{state.error}</p>
        </div>
      )}

      {state?.success ? (
        <Card className="rounded-none border-neutral-200">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-medium text-neutral-900">Password Updated</h2>
            <p className="text-xs text-neutral-500">{state.message}</p>
            <div className="pt-4">
              <Link href="/account">
                <Button variant="primary" className="w-full tracking-wider uppercase text-xs">
                  Proceed to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-none border-neutral-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-light tracking-wide uppercase">
              Choose New Password
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Passwords must be at least 8 characters and contain letters and numbers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="reset-token"
                name="token"
                type="text"
                label="Reset Security Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="64-character token"
                required
              />

              <Input
                id="reset-new-password"
                name="newPassword"
                type="password"
                label="New Password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />

              <Input
                id="reset-confirm-password"
                name="confirmPassword"
                type="password"
                label="Confirm New Password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />

              <Button
                id="reset-submit-btn"
                type="submit"
                variant="primary"
                className="w-full h-11 tracking-wider uppercase text-xs mt-2"
                disabled={loading}
              >
                {loading ? "Updating Password..." : "Update Password"}
                {!loading && <KeyRound className="w-3.5 h-3.5 ml-2" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center text-xs text-neutral-400 uppercase tracking-widest">
          Loading Security Form...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
