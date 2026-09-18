"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { CheckCircle2, AlertCircle, ShieldCheck, Mail, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

interface VerifyEmailProps {
  searchParams: Promise<{ token?: string }>;
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailProps) {
  const resolvedParams = use(searchParams);
  const tokenFromUrl = resolvedParams.token || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const executeVerification = async (verifyToken: string) => {
    if (!verifyToken.trim()) {
      setError("Please provide a valid verification token.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyToken.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Verification link is invalid or has expired.");
      } else {
        setSuccess(data.message || "Your email address has been verified successfully.");
      }
    } catch {
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify if token is present in the URL
  useEffect(() => {
    if (tokenFromUrl) {
      executeVerification(tokenFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-light tracking-tight uppercase text-neutral-950">
          Email Verification
        </h1>
        <p className="mt-2 text-xs text-neutral-500">
          Confirm your identity to unlock full account capabilities.
        </p>
      </div>

      {error && (
        <div
          id="verify-error-banner"
          className="mb-6 p-4 bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-3"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Verification Failed</p>
            <p className="text-[11px] text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success ? (
        <Card className="rounded-none border-neutral-200 shadow-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-medium uppercase tracking-wide text-neutral-900">
                Verification Complete
              </h2>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                {success}
              </p>
            </div>
            <div className="pt-4 flex flex-col gap-2">
              <Link href="/account">
                <Button variant="primary" className="w-full tracking-wider uppercase text-xs">
                  Access Account <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-none border-neutral-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
              <Mail className="w-5 h-5 text-neutral-700" />
            </div>
            <CardTitle className="text-lg font-light tracking-wide uppercase">
              Confirm Security Token
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Paste the cryptographic verification token sent to your email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeVerification(token);
              }}
              className="space-y-4"
            >
              <Input
                id="verify-token-input"
                name="token"
                type="text"
                label="Verification Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="64-character verification token"
                required
              />

              <Button
                id="verify-submit-btn"
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full tracking-wider uppercase text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Confirm Verification
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/account"
                  className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  Return to Client Sign In
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
