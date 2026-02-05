"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Help() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch("/api/help", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, message }),
      });

      if (response.ok) {
        alert("Message sent successfully!");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to send message");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="border-[1px] rounded-[20px] border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.05)] shadow-[0_10px_27px_rgba(51,161,224,0.40)] p-8 w-full max-w-2xl">
        <h1 className="text-3xl text-[#33A1E0] [text-shadow:_0_2px_4px_#33A1E0] [--tw-text-stroke:1px_#154D71] [text-stroke:var(--tw-text-stroke)]font-bold text-center mb-2">TalkaNova Support</h1>
        <p className="text-white text-center mb-8">Need help? Send us a message and we'll get back to you soon.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* First row: Name and Email side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-white text-sm font-medium mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-transparent text-white"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-transparent border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                required
              />
            </div>
          </div>

          {/* Second row: Message textarea */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-white mb-1">
              Message
            </label>
            <textarea
              id="message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-white"
              required
            />
          </div>

          {/* Horizontal divider */}
          <hr className="border-gray-500" />

          {/* Buttons row */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-6 py-3 border border-gray-500 text-white rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 shadow-[0_2px_4px_rgba(51,161,224,0.65)] rounded-[15px] bg-[#154D71] text-white font-semibold flex items-center justify-center hover:bg-[#33A1E0] hover:text-[#154D71] cursor-pointer"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}