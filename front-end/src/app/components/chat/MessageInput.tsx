"use client";
import { useState, useRef, KeyboardEvent } from "react";

/**
 * MessageInput - Chat input with file attachment support
 */

interface MessageInputProps {
    onSend: (message: string) => void;
    onFileSelect?: (file: File) => void;
    disabled?: boolean;
    placeholder?: string;
}

export default function MessageInput({
    onSend,
    onFileSelect,
    disabled = false,
    placeholder = "Type a message...",
}: MessageInputProps) {
    const [message, setMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSend(message.trim());
            setMessage("");
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onFileSelect) {
            onFileSelect(file);
        }
        e.target.value = ""; // Reset for re-selection
    };

    return (
        <div className="w-full h-16 flex items-center justify-center p-2">
            <div className="h-full w-full flex items-center gap-2 border border-[rgba(255,255,255,0.3)] rounded-full bg-[rgba(255,255,255,0.06)] shadow-[0_0_15px_#33A1E0] px-4">
                {/* File Attachment */}
                {onFileSelect && (
                    <>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.txt"
                        />
                        <button
                            onClick={handleFileClick}
                            disabled={disabled}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Attach file"
                        >
                            📎
                        </button>
                    </>
                )}

                {/* Text Input */}
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-white resize-none h-10 py-2 focus:outline-none placeholder:text-gray-500"
                    rows={1}
                />

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    disabled={disabled || !message.trim()}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-5 h-5 text-white"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}
