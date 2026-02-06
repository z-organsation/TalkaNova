"use client";
import { useState, useEffect } from "react";
import { getIdentity, setUserName, clearIdentity, type Profile } from "../lib/api";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function SettingsSidebar({ visible, onClose }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const identity = getIdentity();
    setProfile({ id: identity.user_id, user_name: identity.user_name || "Guest", email: "", pfp_url: null, created_at: new Date().toISOString() });
    setDisplayName(identity.user_name || "");
    const savedTheme = localStorage.getItem("talkanova_theme") as "dark" | "light";
    if (savedTheme) setTheme(savedTheme);
  }, [visible]);

  const handleSave = async () => {
    setSaving(true);
    try {
      setUserName(displayName);
      localStorage.setItem("talkanova_theme", theme);
      const identity = getIdentity();
      setProfile({ id: identity.user_id, user_name: displayName, email: "", pfp_url: null, created_at: new Date().toISOString() });
      alert("Settings saved!");
      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetIdentity = () => {
    if (confirm("Are you sure? This will clear your identity and create a new one.")) {
      clearIdentity();
      sessionStorage.clear();
      location.reload();
    }
  };

  if (!visible) return null;

  return (
    <div className="absolute top-0 right-0 w-[34%] h-full bg-gradient-to-b from-[#041d2d] to-[#154d71] border-l border-[#33A1E040] flex flex-col p-4 overflow-y-auto z-40">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Settings</h2>
        <button onClick={onClose} className="text-white">✕</button>
      </div>

      <section className="bg-[#1e3a5f]/30 rounded-xl p-4 mb-4">
        <h3 className="text-lg font-semibold mb-2">Profile</h3>
        <div className="space-y-3">
          <label className="text-sm text-gray-300">Display name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full p-2 rounded bg-[#0a1929] text-white" />
          <label className="text-sm text-gray-300">User ID (Ephemeral)</label>
          <input value={profile?.id || ""} readOnly className="w-full p-2 rounded bg-[#0a1929]/50 text-gray-400 cursor-not-allowed" />
        </div>
      </section>

      <section className="bg-[#1e3a5f]/30 rounded-xl p-4 mb-4">
        <h3 className="text-lg font-semibold mb-2">Appearance</h3>
        <div className="flex gap-3">
          <button onClick={() => setTheme("dark")} className={`px-4 py-2 rounded ${theme === "dark" ? "bg-[#33A1E0]/20 border border-[#33A1E0] text-[#33A1E0]" : "border border-gray-600 text-gray-300"}`}>🌙 Dark</button>
          <button onClick={() => setTheme("light")} className={`px-4 py-2 rounded ${theme === "light" ? "bg-[#33A1E0]/20 border border-[#33A1E0] text-[#33A1E0]" : "border border-gray-600 text-gray-300"}`}>☀️ Light</button>
        </div>
      </section>

      <section className="bg-[#1e3a5f]/30 rounded-xl p-4 mb-4">
        <h3 className="text-lg font-semibold mb-2">Privacy & Security</h3>
        <div className="space-y-3">
          <div className="p-3 bg-[#0a1929]/40 rounded flex items-center justify-between">
            <div>
              <p className="font-medium">End-to-End Encryption</p>
              <p className="text-sm text-gray-300">All P2P messages are encrypted</p>
            </div>
            <span className="text-green-400">✓</span>
          </div>

          <div className="p-3 bg-[#0a1929]/40 rounded flex items-center justify-between">
            <div>
              <p className="font-medium">Anonymous Mode</p>
              <p className="text-sm text-gray-300">No account required, no data stored</p>
            </div>
            <span className="text-green-400">✓</span>
          </div>

          <button onClick={handleResetIdentity} className="w-full py-2 bg-red-800/40 rounded text-red-300">🔄 Reset Identity</button>
        </div>
      </section>

      <div className="mt-auto">
        <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-[#33A1E0] rounded text-black font-semibold">{saving ? "Saving..." : "Save Settings"}</button>
      </div>
    </div>
  );
}
