"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getIdentity, setUserName, clearIdentity, type Profile } from "../lib/api";

/**
 * Settings Page - User preferences (NO AUTH)
 * Uses ephemeral identity stored in sessionStorage
 */

export default function SettingsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const identity = getIdentity();
        setProfile({
            id: identity.user_id,
            user_name: identity.user_name || "Guest",
            email: "",
            pfp_url: null,
            created_at: new Date().toISOString(),
        });
        setDisplayName(identity.user_name || "");

        // Load theme from localStorage
        const savedTheme = localStorage.getItem("talkanova_theme") as "dark" | "light";
        if (savedTheme) setTheme(savedTheme);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Update local identity
            setUserName(displayName);
            localStorage.setItem("talkanova_theme", theme);

            // Update local profile
            const identity = getIdentity();
            setProfile({
                id: identity.user_id,
                user_name: displayName,
                email: "",
                pfp_url: null,
                created_at: new Date().toISOString(),
            });

            alert("Settings saved!");
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a1929] to-[#1a2744] text-white p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-[#33A1E0]">Settings</h1>
                    <button
                        onClick={() => router.push("/chat")}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ← Back to Chat
                    </button>
                </div>

                {/* Profile Section */}
                <section className="bg-[#1e3a5f]/50 rounded-xl p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Profile</h2>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="displayName" className="block text-sm text-gray-400 mb-2">Display Name</label>
                            <input
                                id="displayName"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full bg-[#0a1929] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#33A1E0]"
                                placeholder="Your display name"
                            />
                        </div>

                        <div>
                            <label htmlFor="userId" className="block text-sm text-gray-400 mb-2">User ID (Ephemeral)</label>
                            <input
                                id="userId"
                                type="text"
                                value={profile?.id || ""}
                                readOnly
                                className="w-full bg-[#0a1929]/50 border border-gray-700 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">This ID is temporary and will reset when you close the browser.</p>
                        </div>
                    </div>
                </section>

                {/* Appearance Section */}
                <section className="bg-[#1e3a5f]/50 rounded-xl p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Appearance</h2>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Theme</label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setTheme("dark")}
                                className={`px-6 py-2 rounded-lg border ${theme === "dark"
                                    ? "border-[#33A1E0] bg-[#33A1E0]/20 text-[#33A1E0]"
                                    : "border-gray-600 text-gray-400 hover:border-gray-400"
                                    }`}
                            >
                                🌙 Dark
                            </button>
                            <button
                                onClick={() => setTheme("light")}
                                className={`px-6 py-2 rounded-lg border ${theme === "light"
                                    ? "border-[#33A1E0] bg-[#33A1E0]/20 text-[#33A1E0]"
                                    : "border-gray-600 text-gray-400 hover:border-gray-400"
                                    }`}
                            >
                                ☀️ Light
                            </button>
                        </div>
                    </div>
                </section>

                {/* Privacy Section */}
                <section className="bg-[#1e3a5f]/50 rounded-xl p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Privacy & Security</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-[#0a1929]/50 rounded-lg">
                            <div>
                                <p className="font-medium">End-to-End Encryption</p>
                                <p className="text-sm text-gray-400">All P2P messages are encrypted</p>
                            </div>
                            <span className="text-green-400">✓ Enabled</span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-[#0a1929]/50 rounded-lg">
                            <div>
                                <p className="font-medium">Anonymous Mode</p>
                                <p className="text-sm text-gray-400">No account required, no data stored</p>
                            </div>
                            <span className="text-green-400">✓ Active</span>
                        </div>

                        <button
                            onClick={handleResetIdentity}
                            className="w-full p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400 hover:bg-red-900/50 transition-colors"
                        >
                            🔄 Reset Identity (Get New Anonymous ID)
                        </button>
                    </div>
                </section>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 bg-[#33A1E0] hover:bg-[#2890cf] rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>
        </div>
    );
}
