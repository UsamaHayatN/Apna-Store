"use client";

import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

/* 
  NEWSLETTER SECTION ARCHITECTURE:
  - Exact Color Palette:
    * Background: #F5F5F5 (Light-200) canvas
    * Border: #E5E5E5 (Light-300)
    * Typography: #111111 (Dark-900) bold titles, #757575 (Dark-700) descriptions
    * Input & Button: Pill-shaped rounded-full inputs and solid black #111111 submit button
  - Hydration Shield:
    * Server renders identical non-tamperable placeholder shell
    * Client mounts interactive form post-hydration to eliminate extension/autofill DOM injection mismatches
*/

export function NewsletterSection() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setErrorMsg("");
    setStatus("submitting");

    setTimeout(() => {
      setStatus("success");
    }, 600);
  };

  return (
    <section
      id="storefront-newsletter"
      aria-label="VIP Access and Private Releases"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#F5F5F5] p-8 sm:p-12 lg:p-16 text-center">
        <div className="mx-auto max-w-xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#757575]">
            Private Access & Drops
          </span>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-[#111111]">
            BE THE FIRST TO KNOW
          </h2>

          <p className="text-xs sm:text-sm text-[#757575] font-normal leading-relaxed">
            Sign up for first access to new seasonal drops, limited releases, bespoke trunk events, and exclusive members-only offers.
          </p>

          {!mounted ? (
            /* SSR and pre-hydration matching shell: 100% immune to extension DOM mutations */
            <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-center max-w-md mx-auto">
              <div className="w-full rounded-full border border-[#E5E5E5] bg-[#FFFFFF] px-5 py-3.5 text-xs text-[#AAAAAA] text-left">
                Enter your email address
              </div>
              <div className="w-full sm:w-auto shrink-0 rounded-full bg-[#111111] text-[#FFFFFF] px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-center">
                Sign Up
              </div>
            </div>
          ) : status === "success" ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#007D48]/30 bg-[#007D48]/10 px-6 py-3 text-xs font-bold text-[#007D48]">
              <CheckCircle2 className="h-4 w-4 text-[#007D48]" />
              <span>You have been subscribed to exclusive access releases.</span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-6"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
            >
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center max-w-md mx-auto">
                <input
                  type="email"
                  name="storefront_newsletter_email"
                  id="storefront_newsletter_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full rounded-full border border-[#E5E5E5] bg-[#FFFFFF] px-5 py-3.5 text-xs text-[#111111] placeholder:text-[#AAAAAA] focus:border-[#111111] focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="w-full sm:w-auto shrink-0 rounded-full bg-[#111111] text-[#FFFFFF] px-7 py-3.5 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {status === "submitting" ? "Joining..." : "Sign Up"}
                </button>
              </div>
              {errorMsg && (
                <p className="mt-2 text-xs font-medium text-[#D33918]">{errorMsg}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
