"use client";
import Image from "next/image";

/**
 * MessageBubble - Renders a single chat message
 * Supports sent/received styling and optional avatar
 */

interface MessageBubbleProps {
    message: string;
    userName?: string;
    avatar?: string;
    timestamp: string;
    isMine: boolean;
    onDelete?: () => void;
    onReport?: () => void;
}

export default function MessageBubble({
    message,
    userName,
    avatar,
    timestamp,
    isMine,
    onDelete,
    onReport,
}: MessageBubbleProps) {
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`flex items-start gap-2 mb-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className="flex-shrink-0">
                <Image
                    src={avatar || '/profile.svg'}
                    alt={userName || 'User'}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover"
                />
            </div>

            {/* Message Content */}
            <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                {/* Username */}
                {userName && !isMine && (
                    <span className="text-xs text-gray-400 mb-1">{userName}</span>
                )}

                {/* Bubble */}
                <div
                    className={`px-4 py-2 rounded-2xl break-words ${isMine
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-gray-700 text-white rounded-bl-sm'
                        }`}
                >
                    {message}
                </div>

                {/* Time & Actions */}
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-500">{time}</span>
                    {isMine && onDelete && (
                        <button
                            onClick={onDelete}
                            className="text-[10px] text-red-400 hover:text-red-300"
                            title="Delete"
                        >
                            ✕
                        </button>
                    )}
                    {!isMine && onReport && (
                        <button
                            onClick={onReport}
                            className="text-[10px] text-yellow-400 hover:text-yellow-300"
                            title="Report"
                        >
                            ⚠
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
