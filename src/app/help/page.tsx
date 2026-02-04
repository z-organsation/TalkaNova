"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authMe } from "../lib/api";

/**
 * Help Page - Contact form for user support
 * Sends emails to imadzakxy@gmail.com
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function HelpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Pre-fill email if logged in
    authMe()
      .then((p) => setEmail(p.email || ""))
      .catch(() => { });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) {
        throw new Error("Failed to send");
      }

      setSent(true);
    } catch (err) {
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1929] to-[#1a2744] text-white flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2">Message Sent!</h1>
          <p className="text-gray-400 mb-6">We&apos;ll get back to you soon.</p>
          <button
            onClick={() => router.push("/chat")}
            className="px-6 py-2 bg-[#33A1E0] hover:bg-[#2890cf] rounded-lg transition-colors"
          >
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1929] to-[#1a2744] text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[#33A1E0]">Help & Support</h1>
          <button
            onClick={() => router.push("/chat")}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Chat
          </button>
        </div>

        {/* FAQ Section */}
        <section className="bg-[#1e3a5f]/50 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="bg-[#0a1929]/50 rounded-lg p-4">
              <summary className="cursor-pointer font-medium">How is my data protected?</summary>
              <p className="mt-2 text-gray-400 text-sm">
                All private messages use end-to-end encryption (E2EE). The server never sees your message content.
              </p>
            </details>
            <details className="bg-[#0a1929]/50 rounded-lg p-4">
              <summary className="cursor-pointer font-medium">What is P2P chat?</summary>
              <p className="mt-2 text-gray-400 text-sm">
                P2P (peer-to-peer) chat connects you directly with another user via Tailscale VPN.
                Messages never pass through our servers.
              </p>
            </details>
            <details className="bg-[#0a1929]/50 rounded-lg p-4">
              <summary className="cursor-pointer font-medium">Can I use TalkaNova on Tor?</summary>
              <p className="mt-2 text-gray-400 text-sm">
                Yes! TalkaNova is designed to work with Tor Browser for maximum privacy.
              </p>
            </details>
          </div>
        </section>

        {/* Contact Form */}
        <section className="bg-[#1e3a5f]/50 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Contact Us</h2>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4 text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm text-gray-400 mb-2">Your Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#0a1929] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#33A1E0]"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-gray-400 mb-2">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0a1929] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#33A1E0]"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm text-gray-400 mb-2">Subject</label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full bg-[#0a1929] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#33A1E0]"
                placeholder="How can we help?"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm text-gray-400 mb-2">Message</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                className="w-full bg-[#0a1929] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#33A1E0] resize-none"
                placeholder="Describe your issue or question..."
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-[#33A1E0] hover:bg-[#2890cf] rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Message"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
