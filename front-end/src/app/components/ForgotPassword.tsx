"use client";
import { useState } from "react";
import supabase from "../config/supabaseClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return alert("Please enter your email");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/login",
      } as any);
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      alert(err.message || "Unable to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 shadow-lg">
        <h2 className="text-2xl font-semibold text-[#33A1E0] text-center mb-4">Reset your password</h2>
        <p className="text-sm text-gray-300 text-center mb-6">Enter your account email and we'll send password reset instructions.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-transparent border border-white/10 text-white placeholder-gray-400 focus:outline-none"
            required
          />

          <button
            type="submit"
            disabled={loading || sent}
            className="w-full py-3 rounded-lg bg-[#154D71] hover:bg-[#33A1E0] text-white font-medium disabled:opacity-50"
          >
            {loading ? "Sending..." : sent ? "Email sent" : "Send reset email"}
          </button>
        </form>

        <p className="text-sm text-gray-400 text-center mt-4">Check your inbox for instructions. If you don't see it, check spam.</p>
      </div>
    </div>
  );
}
