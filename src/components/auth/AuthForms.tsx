"use client";

import { useState } from "react";
import { loginAction, registerAction, forgotPasswordAction, ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { LogIn, UserPlus, KeyRound, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

interface AuthFormsProps {
  initialMode?: "login" | "register" | "forgot";
  redirectTo?: string;
}

export function AuthForms({ initialMode = "login", redirectTo = "/account" }: AuthFormsProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ActionState | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setState(null);
    const formData = new FormData(e.currentTarget);
    formData.append("redirectTo", redirectTo);
    const res = await loginAction(null, formData);
    if (res && !res.success) {
      setState(res);
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setState(null);
    const formData = new FormData(e.currentTarget);
    formData.append("redirectTo", redirectTo);
    const res = await registerAction(null, formData);
    if (res && !res.success) {
      setState(res);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setState(null);
    const formData = new FormData(e.currentTarget);
    const res = await forgotPasswordAction(null, formData);
    setState(res);
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Navigation tabs */}
      <div className="flex border-b border-neutral-200 mb-6" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => {
            setMode("login");
            setState(null);
          }}
          className={`flex-1 pb-3 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 ${
            mode === "login"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          onClick={() => {
            setMode("register");
            setState(null);
          }}
          className={`flex-1 pb-3 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 ${
            mode === "register"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Register
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "forgot"}
          onClick={() => {
            setMode("forgot");
            setState(null);
          }}
          className={`flex-1 pb-3 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 ${
            mode === "forgot"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          Recovery
        </button>
      </div>

      {/* Global Alert Notification */}
      {state?.error && (
        <div
          id="auth-error-banner"
          className="mb-6 p-4 rounded-none bg-red-50/80 border border-red-200 text-red-900 text-xs flex items-start gap-3 animate-in fade-in"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Authentication notice</p>
            <p className="mt-0.5 text-red-700">{state.error}</p>
          </div>
        </div>
      )}

      {state?.message && state.success && (
        <div
          id="auth-success-banner"
          className="mb-6 p-4 rounded-none bg-neutral-900 text-white text-xs flex items-start gap-3 animate-in fade-in"
          role="status"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium tracking-wide uppercase">Request Dispatched</p>
            <p className="mt-0.5 text-neutral-300">{state.message}</p>
            {Boolean(state.data?.devToken) && (
              <div className="mt-3 p-2 bg-neutral-800 rounded border border-neutral-700 text-[11px]">
                <span className="text-neutral-400">Development Test Token:</span>{" "}
                <code className="text-amber-300 select-all font-mono">
                  {String(state.data?.devToken)}
                </code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SIGN IN FORM */}
      {mode === "login" && (
        <Card className="rounded-none border-neutral-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-light tracking-wide uppercase">
              Sign In to Atelier
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Access your bespoke wardrobe, order history, and concierge services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <Input
                id="login-email"
                name="email"
                type="email"
                label="Email Address"
                placeholder="client@atelier.internal"
                required
                autoComplete="email"
              />
              <div>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  label="Password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setState(null);
                    }}
                    className="text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button
                id="login-submit-btn"
                type="submit"
                variant="primary"
                className="w-full h-11 tracking-wider uppercase text-xs"
                disabled={loading}
              >
                {loading ? "Authenticating..." : "Sign In"}
                {!loading && <LogIn className="w-3.5 h-3.5 ml-2" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* REGISTRATION FORM */}
      {mode === "register" && (
        <Card className="rounded-none border-neutral-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-light tracking-wide uppercase">
              Create Client Account
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Join the maison to curate your private collection and receive tailored sizing consultations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-3.5" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="register-first-name"
                  name="firstName"
                  type="text"
                  label="First Name"
                  placeholder="Arthur"
                  required
                  autoComplete="given-name"
                />
                <Input
                  id="register-last-name"
                  name="lastName"
                  type="text"
                  label="Last Name"
                  placeholder="Pendleton"
                  required
                  autoComplete="family-name"
                />
              </div>

              <Input
                id="register-email"
                name="email"
                type="email"
                label="Email Address"
                placeholder="arthur@pendleton.com"
                required
                autoComplete="email"
              />

              <Input
                id="register-phone"
                name="phone"
                type="tel"
                label="Phone (Optional)"
                placeholder="+1 555-0190"
                autoComplete="tel"
              />

              <Input
                id="register-password"
                name="password"
                type="password"
                label="Password (min 8 chars, letter & number)"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />

              <Input
                id="register-confirm-password"
                name="confirmPassword"
                type="password"
                label="Confirm Password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />

              <div className="p-3 bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-500 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
                <span>
                  Your credentials are encrypted using salt-salted PBKDF2 cryptography. Plaintext passwords are never stored.
                </span>
              </div>

              <Button
                id="register-submit-btn"
                type="submit"
                variant="primary"
                className="w-full h-11 tracking-wider uppercase text-xs mt-2"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Complete Registration"}
                {!loading && <UserPlus className="w-3.5 h-3.5 ml-2" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* PASSWORD RECOVERY FORM */}
      {mode === "forgot" && (
        <Card className="rounded-none border-neutral-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-light tracking-wide uppercase">
              Password Recovery
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Enter your verified email address to receive a secure time-limited reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                label="Registered Email"
                placeholder="client@atelier.internal"
                required
                autoComplete="email"
              />

              <Button
                id="forgot-submit-btn"
                type="submit"
                variant="primary"
                className="w-full h-11 tracking-wider uppercase text-xs"
                disabled={loading}
              >
                {loading ? "Dispatching..." : "Send Password Reset Link"}
                {!loading && <KeyRound className="w-3.5 h-3.5 ml-2" />}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setState(null);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-900 underline"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
