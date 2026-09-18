"use client";

import { useState, use } from "react";
import { adminLoginAction, ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ShieldCheck, Lock, AlertCircle, ArrowLeft, Key } from "lucide-react";
import Link from "next/link";

interface AdminLoginPageProps {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}

export default function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const resolvedParams = use(searchParams);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ActionState | null>(null);

  const initialError =
    resolvedParams.error === "restricted"
      ? "Access denied. Your account does not possess staff or administrator privileges."
      : resolvedParams.error === "disabled"
      ? "Your administrative credentials have been suspended or deactivated."
      : resolvedParams.error === "forbidden"
      ? "You lack the specific administrative permission required for that resource."
      : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setState(null);
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    const res = await adminLoginAction(null, formData);
    if (res && !res.success) {
      setState(res);
      setLoading(false);
    }
  };

  const handleQuickFill = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
    setState(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-neutral-800">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-900 border border-neutral-800 text-neutral-200 mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-medium tracking-widest uppercase text-white">
            Atelier Management
          </h1>
          <p className="text-xs text-neutral-400 uppercase tracking-wider">
            Administrative & Operational Access Portal
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="p-3 bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 flex items-start gap-2.5">
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Access to this portal is restricted to authenticated store staff, managers, and owners.
            All connection events and administrative mutations are immutably audited.
          </span>
        </div>

        {(state?.error || initialError) && (
          <div
            id="admin-error-banner"
            className="p-4 bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-start gap-3"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold uppercase tracking-wider text-[10px] text-red-300">
                Security Authorization Alert
              </p>
              <p className="mt-0.5 text-red-200">{state?.error || initialError}</p>
            </div>
          </div>
        )}

        {/* Admin Login Card */}
        <Card className="bg-neutral-900/90 border-neutral-800 shadow-2xl rounded-none text-neutral-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold tracking-wider uppercase text-neutral-200">
              Staff Verification
            </CardTitle>
            <CardDescription className="text-xs text-neutral-400">
              Enter your enterprise credentials to unlock the administrative console.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-300 mb-1.5">
                  Staff Email
                </label>
                <input
                  id="admin-email-input"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@atelier.internal"
                  required
                  autoComplete="email"
                  className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-300 mb-1.5">
                  Security Passphrase
                </label>
                <input
                  id="admin-password-input"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 font-mono text-xs"
                />
              </div>

              <Button
                id="admin-submit-btn"
                type="submit"
                variant="primary"
                className="w-full h-11 bg-white text-neutral-950 hover:bg-neutral-200 uppercase tracking-widest text-xs font-medium mt-2"
                disabled={loading}
              >
                {loading ? "Verifying Credentials..." : "Authenticate & Enter"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Development / Evaluation Helper Quick-Fills */}
        <div className="p-4 bg-neutral-900/40 border border-neutral-850 text-xs space-y-3">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-2">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-neutral-500" />
              Role Demonstration Profiles
            </span>
            <span className="text-[10px] text-neutral-500">Click to load</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("owner@atelier.internal", "OwnerPass123!")}
              className="p-2 text-left bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-colors text-[11px]"
            >
              <div className="font-semibold text-white">Owner</div>
              <div className="text-[10px] text-neutral-500 truncate">Julian Vance</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill("admin@atelier.internal", "AdminPass123!")}
              className="p-2 text-left bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-colors text-[11px]"
            >
              <div className="font-semibold text-white">Admin</div>
              <div className="text-[10px] text-neutral-500 truncate">Elena Rostova</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill("staff@atelier.internal", "StaffPass123!")}
              className="p-2 text-left bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-colors text-[11px]"
            >
              <div className="font-semibold text-white">Staff</div>
              <div className="text-[10px] text-neutral-500 truncate">Marcus Kaye</div>
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs text-neutral-500 hover:text-neutral-300 inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Return to Public Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
