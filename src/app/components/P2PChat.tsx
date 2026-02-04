"use client";
import { useState, useEffect, useRef } from "react";
import {
    getP2PSessionStatus,
    sendP2POffer,
    sendP2PAnswer,
    sendP2PIceCandidate,
    closeP2PSession,
} from "../lib/api";

interface P2PChatProps {
    sessionId: string;
    myUserId: string;
    onClose: () => void;
}

type CallMode = "none" | "audio" | "video";

export default function P2PChat({ sessionId, onClose }: P2PChatProps) {
    const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [status, setStatus] = useState("connecting");
    const [peerIp, setPeerIp] = useState<string | null>(null);

    // Call state
    const [callMode, setCallMode] = useState<CallMode>("none");
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // Initialize WebRTC
    useEffect(() => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        });
        pcRef.current = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendP2PIceCandidate(sessionId, JSON.stringify(event.candidate));
            }
        };

        pc.onconnectionstatechange = () => {
            console.log("P2P Connection State:", pc.connectionState);
            if (pc.connectionState === "connected") {
                setStatus("connected");
            } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                setStatus("disconnected");
            }
        };

        pc.ondatachannel = (event) => {
            setupDataChannel(event.channel);
        };

        // Handle incoming media tracks
        pc.ontrack = (event) => {
            console.log("Received remote track:", event.track.kind);
            if (remoteVideoRef.current && event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        // Poll signaling status
        pollInterval.current = setInterval(async () => {
            try {
                const session = await getP2PSessionStatus(sessionId);
                setPeerIp(session.peer_ip || null);

                if (session.status === "connecting" && !session.sdp_offer && !dcRef.current) {
                    const dc = pc.createDataChannel("chat");
                    setupDataChannel(dc);

                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    await sendP2POffer(sessionId, JSON.stringify(offer));
                }

                if (session.sdp_offer && !pc.currentLocalDescription && !session.sdp_answer) {
                    const offer = JSON.parse(session.sdp_offer.sdp);
                    await pc.setRemoteDescription(offer);
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await sendP2PAnswer(sessionId, JSON.stringify(answer));
                }

                if (session.sdp_answer && pc.currentLocalDescription && !pc.currentRemoteDescription) {
                    const answer = JSON.parse(session.sdp_answer.sdp);
                    await pc.setRemoteDescription(answer);
                }
            } catch (e) {
                console.error("Signaling poll error", e);
            }
        }, 2000);

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
            stopMediaStream();
            pc.close();
            closeP2PSession(sessionId);
        };
    }, [sessionId]);

    const setupDataChannel = (dc: RTCDataChannel) => {
        dcRef.current = dc;
        dc.onopen = () => setStatus("connected");
        dc.onclose = () => setStatus("disconnected");
        dc.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMessages(prev => [...prev, { ...data, sender: "peer" }]);
        };
    };

    const sendMessage = () => {
        if (!newMessage.trim() || !dcRef.current || dcRef.current.readyState !== "open") return;

        const msg = {
            sender: "me",
            text: newMessage,
            time: new Date().toISOString()
        };

        dcRef.current.send(JSON.stringify(msg));
        setMessages(prev => [...prev, msg]);
        setNewMessage("");
    };

    // ========== Media Controls ==========

    const startCall = async (mode: "audio" | "video") => {
        try {
            const constraints = {
                audio: true,
                video: mode === "video"
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;

            // Display local video
            if (localVideoRef.current && mode === "video") {
                localVideoRef.current.srcObject = stream;
            }

            // Add tracks to peer connection
            const pc = pcRef.current;
            if (pc) {
                stream.getTracks().forEach(track => {
                    pc.addTrack(track, stream);
                });

                // Renegotiate if already connected
                if (pc.connectionState === "connected") {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    await sendP2POffer(sessionId, JSON.stringify(offer));
                }
            }

            setCallMode(mode);
        } catch (error) {
            console.error("Failed to start call:", error);
            alert("Could not access camera/microphone. Please check permissions.");
        }
    };

    const stopMediaStream = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
    };

    const endCall = () => {
        stopMediaStream();
        setCallMode("none");
        setIsMuted(false);
        setIsVideoOff(false);
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a1929] text-white">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-700 p-4">
                <div>
                    <h2 className="text-xl font-bold text-green-400">🔒 Secure P2P Chat</h2>
                    <p className="text-xs text-gray-400">
                        Status: <span className={status === "connected" ? "text-green-400" : "text-yellow-400"}>{status}</span>
                    </p>
                    {peerIp && <p className="text-xs text-gray-500">Peer IP: {peerIp}</p>}
                </div>
                <div className="flex items-center gap-2">
                    {/* Call Buttons */}
                    {callMode === "none" && status === "connected" && (
                        <>
                            <button
                                onClick={() => startCall("audio")}
                                className="w-10 h-10 bg-green-600 hover:bg-green-500 rounded-full flex items-center justify-center"
                                title="Audio Call"
                            >
                                🎤
                            </button>
                            <button
                                onClick={() => startCall("video")}
                                className="w-10 h-10 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center"
                                title="Video Call"
                            >
                                📹
                            </button>
                        </>
                    )}
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl" title="Close">
                        ✕
                    </button>
                </div>
            </div>

            {/* Video Area (when in call) */}
            {callMode !== "none" && (
                <div className="relative bg-black flex-shrink-0" style={{ height: "300px" }}>
                    {/* Remote Video (large) */}
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />

                    {/* Local Video (small, corner) */}
                    {callMode === "video" && (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute bottom-4 right-4 w-32 h-24 object-cover rounded-lg border-2 border-white"
                        />
                    )}

                    {/* Call Controls */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                        <button
                            onClick={toggleMute}
                            className={`w-12 h-12 rounded-full flex items-center justify-center ${isMuted ? "bg-red-600" : "bg-gray-700"}`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? "🔇" : "🔊"}
                        </button>
                        {callMode === "video" && (
                            <button
                                onClick={toggleVideo}
                                className={`w-12 h-12 rounded-full flex items-center justify-center ${isVideoOff ? "bg-red-600" : "bg-gray-700"}`}
                                title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                            >
                                {isVideoOff ? "📷" : "📹"}
                            </button>
                        )}
                        <button
                            onClick={endCall}
                            className="w-12 h-12 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center"
                            title="End Call"
                        >
                            📞
                        </button>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 && (
                    <p className="text-center text-gray-500 text-sm">No messages yet. Start chatting securely!</p>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}>
                        <div className={`p-3 rounded-lg max-w-[70%] ${m.sender === "me" ? "bg-green-700" : "bg-gray-700"}`}>
                            <p>{m.text}</p>
                            <span className="text-[10px] opacity-70">{new Date(m.time).toLocaleTimeString()}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className="flex gap-2 p-4 border-t border-gray-700">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                    placeholder="Type a secure message..."
                />
                <button
                    onClick={sendMessage}
                    disabled={status !== "connected"}
                    className="bg-green-600 hover:bg-green-500 px-6 rounded-lg disabled:opacity-50 font-semibold"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
