"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  Clock,
  MapPin,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { siteConfig } from "@/config/site";

export function ContactClientView() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    orderNumber: "",
    subject: "general",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage("Please provide your full name.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      setErrorMessage("Please include a message with at least 10 characters.");
      return;
    }

    setSubmitting(true);

    // Simulate concierge dispatch with high-reliability response
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const randomTicket = `ATL-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedTicket(randomTicket);
      setFormData({
        name: "",
        email: "",
        orderNumber: "",
        subject: "general",
        message: "",
      });
    } catch {
      setErrorMessage("Failed to send message. Please reach us directly at " + siteConfig.contact.email);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
      {/* Left Column: Interactive Concierge Form (7 cols) */}
      <div className="lg:col-span-7">
        <div className="border border-[#E5E5E5] bg-[#FFFFFF] p-6 sm:p-10">
          <div className="border-b border-[#E5E5E5] pb-5 mb-6">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111]">
              Send an Atelier Inquiry
            </h2>
            <p className="mt-1 text-xs text-[#757575] leading-relaxed">
              Inquiries are typically addressed within 24 business hours by our dedicated concierge team.
            </p>
          </div>

          {submittedTicket ? (
            <div className="bg-[#F5F5F5] border border-[#007D48] p-8 text-center space-y-4 animate-in fade-in duration-300">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#007D48]/10 text-[#007D48]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#007D48]">
                  Inquiry Dispatched
                </span>
                <h3 className="mt-1 text-lg font-bold uppercase tracking-tight text-[#111111]">
                  Reference #{submittedTicket}
                </h3>
                <p className="mt-2 text-xs text-[#757575] leading-relaxed max-w-md mx-auto">
                  Your communication has been logged in our client concierge queue. A specialist will
                  follow up via your provided email with full technical specifications or order updates.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSubmittedTicket(null)}
                  className="text-xs font-bold uppercase tracking-wider text-[#111111] underline underline-offset-4 hover:text-[#757575] transition-colors"
                >
                  Submit Another Inquiry
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-2"
                  >
                    Full Name <span className="text-[#D33918]">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Julian Vance"
                    className="w-full h-11 border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 text-xs text-[#111111] placeholder:text-[#AAAAAA] focus:border-[#111111] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-2"
                  >
                    Email Address <span className="text-[#D33918]">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full h-11 border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 text-xs text-[#111111] placeholder:text-[#AAAAAA] focus:border-[#111111] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="contact-subject"
                    className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-2"
                  >
                    Inquiry Topic
                  </label>
                  <select
                    id="contact-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full h-11 border border-[#E5E5E5] bg-[#FFFFFF] px-3 text-xs text-[#111111] focus:border-[#111111] focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="general">General Inquiry & Brand</option>
                    <option value="sizing">Sizing & Fit Advice</option>
                    <option value="order">Order Status & Dispatch</option>
                    <option value="returns">Complimentary Returns & Exchanges</option>
                    <option value="bespoke">Bespoke & Custom Commission</option>
                    <option value="press">Press, Media & Wholesale</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="contact-order"
                    className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-2"
                  >
                    Order Number <span className="text-[#AAAAAA] font-normal">(Optional)</span>
                  </label>
                  <input
                    id="contact-order"
                    type="text"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    placeholder="e.g. ORD-82914"
                    className="w-full h-11 border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 text-xs text-[#111111] placeholder:text-[#AAAAAA] focus:border-[#111111] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-xs font-bold uppercase tracking-wider text-[#111111] mb-2"
                >
                  Message <span className="text-[#D33918]">*</span>
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Detail your question, sizing concern, or requirements..."
                  className="w-full border border-[#E5E5E5] bg-[#FFFFFF] p-3.5 text-xs text-[#111111] placeholder:text-[#AAAAAA] focus:border-[#111111] focus:outline-none transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#111111] text-[#FFFFFF] h-12 px-8 text-xs font-bold uppercase tracking-wider hover:bg-[#333333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <span>Transmitting Inquiry...</span>
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Right Column: Direct Channels, Atelier Showroom & FAQs (5 cols) */}
      <div className="lg:col-span-5 space-y-8">
        {/* Direct Channels Card */}
        <div className="border border-[#E5E5E5] bg-[#F5F5F5] p-6 sm:p-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#111111] border-b border-[#E5E5E5] pb-3 mb-5">
            Direct Concierge Channels
          </h3>

          <div className="space-y-6 text-xs">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#FFFFFF] border border-[#E5E5E5] text-[#111111]">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-[#111111] uppercase tracking-wider block">
                  Electronic Mail
                </span>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="mt-0.5 text-[#757575] hover:text-[#111111] transition-colors underline underline-offset-2"
                >
                  {siteConfig.contact.email}
                </a>
                <p className="mt-1 text-[11px] text-[#AAAAAA]">Direct inbox monitored by senior advisors.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#FFFFFF] border border-[#E5E5E5] text-[#111111]">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-[#111111] uppercase tracking-wider block">
                  Concierge Hotline
                </span>
                <a
                  href={`tel:${siteConfig.contact.phone.replace(/[^0-9+]/g, "")}`}
                  className="mt-0.5 text-[#757575] hover:text-[#111111] transition-colors font-mono"
                >
                  {siteConfig.contact.phone}
                </a>
                <p className="mt-1 text-[11px] text-[#AAAAAA]">Toll-free priority client line.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#FFFFFF] border border-[#E5E5E5] text-[#111111]">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-[#111111] uppercase tracking-wider block">
                  Advisory Hours
                </span>
                <p className="mt-0.5 text-[#757575]">{siteConfig.contact.hours}</p>
                <p className="mt-1 text-[11px] text-[#AAAAAA]">Excluding major European and US holidays.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#FFFFFF] border border-[#E5E5E5] text-[#111111]">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-[#111111] uppercase tracking-wider block">
                  Atelier & Archives
                </span>
                <p className="mt-0.5 text-[#757575] leading-relaxed">
                  Gundulićeva 18, Donji Grad<br />
                  10000 Zagreb, Croatia
                </p>
                <p className="mt-1 text-[11px] text-[#AAAAAA]">
                  Showroom visits by confirmed appointment only.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Self-Service Links */}
        <div className="border border-[#E5E5E5] bg-[#FFFFFF] p-6 sm:p-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#111111] mb-4 flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-[#757575]" />
            <span>Instant Client Resources</span>
          </h3>

          <div className="space-y-3 text-xs">
            <Link
              href="/account/orders"
              className="flex items-center justify-between p-3 border border-[#E5E5E5] hover:border-[#111111] transition-colors"
            >
              <span className="font-medium text-[#111111]">Track an Existing Order</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#757575]" />
            </Link>
            <Link
              href="/guides"
              className="flex items-center justify-between p-3 border border-[#E5E5E5] hover:border-[#111111] transition-colors"
            >
              <span className="font-medium text-[#111111]">Sizing Conversion & Benchcraft Guides</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#757575]" />
            </Link>
            <Link
              href="/shipping-returns"
              className="flex items-center justify-between p-3 border border-[#E5E5E5] hover:border-[#111111] transition-colors"
            >
              <span className="font-medium text-[#111111]">Shipping Speeds & 30-Day Returns</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#757575]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
