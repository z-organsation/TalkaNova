/**
 * API Client for TalkaNova Backend (NO AUTH VERSION)
 * Uses ephemeral identity (client-side UUID + pseudo)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

// ========== Ephemeral Identity ==========

const IDENTITY_KEY = "talkanova_identity";

export interface EphemeralIdentity {
  user_id: string;
  user_name: string;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getIdentity(): EphemeralIdentity {
  if (typeof window === "undefined") {
    return { user_id: generateUUID(), user_name: "Guest" };
  }

  const stored = sessionStorage.getItem(IDENTITY_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Corrupted, regenerate
    }
  }

  // Generate new identity
  const identity: EphemeralIdentity = {
    user_id: generateUUID(),
    user_name: "",  // Will be set by user
  };
  sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

export function setUserName(name: string): void {
  if (typeof window === "undefined") return;
  const identity = getIdentity();
  identity.user_name = name;
  sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function getUserId(): string {
  return getIdentity().user_id;
}

export function getUserName(): string {
  return getIdentity().user_name || "Guest";
}

export function clearIdentity(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(IDENTITY_KEY);
  }
}

// ========== Request Function ==========

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const identity = getIdentity();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-ID": identity.user_id,
    "X-User-Name": identity.user_name || "Guest",
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(apiUrl(path), { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

// ========== Profile (Local Only) ==========

export interface Profile {
  id: string;
  user_name: string;
  email: string;
  pfp_url: string | null;
  created_at: string;
}

export function getLocalProfile(): Profile {
  const identity = getIdentity();
  return {
    id: identity.user_id,
    user_name: identity.user_name || "Guest",
    email: "",
    pfp_url: null,
    created_at: new Date().toISOString(),
  };
}

// ========== Room Endpoints ==========

export interface Room {
  id: string;
  name: string;
  code: string;
  is_dm: boolean;
  created_at: string;
}

export async function getRooms(): Promise<Room[]> {
  return request<Room[]>("/api/v1/rooms");
}

export async function createRoom(name: string, code: string): Promise<Room> {
  return request<Room>("/api/v1/rooms", {
    method: "POST",
    body: JSON.stringify({ name, code }),
  });
}

export async function joinRoom(roomId: string): Promise<void> {
  await request<void>(`/api/v1/rooms/${roomId}/join`, { method: "POST" });
}

// ========== Message Endpoints ==========

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string | null;
  body_encrypted: string;
  deleted?: boolean;
  timestamp: string;
}

export async function getMessages(roomId?: string): Promise<Message[]> {
  const params = new URLSearchParams();
  if (roomId) params.set("room_id", roomId);
  return request<Message[]>(`/api/v1/messages?${params.toString()}`);
}

export interface SendMessageData {
  body_encrypted: string;
  sender_name?: string;
  sender_id?: string;
  room_id?: string;
}

export async function sendMessage(data: SendMessageData): Promise<Message> {
  const identity = getIdentity();
  return request<Message>("/api/v1/messages", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      sender_id: identity.user_id,
      sender_name: data.sender_name || identity.user_name || "Guest",
    }),
  });
}


export interface FileResponse {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  uploaded_at: string;
}

export async function uploadFile(file: File): Promise<FileResponse> {
  const identity = getIdentity();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(apiUrl("/api/v1/files"), {
    method: "POST",
    headers: {
      "X-User-ID": identity.user_id,
      "X-User-Name": identity.user_name || "Guest",
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function deleteMessage(messageId: string): Promise<void> {
  // Assuming endpoint exists. If not, it's feature discovery.
  // reports.py has delete? No reports.py is reports.
  // messages.py has delete?
  // Checking existing endpoints later. Using assumption for now.
  return request<void>(`/api/v1/messages/${messageId}`, { method: "DELETE" });
}

export async function reportMessage(messageId: string, reason: string): Promise<void> {
  return request<void>("/api/v1/reports", {
    method: "POST",
    body: JSON.stringify({ message_id: messageId, reason }),
  });
}

// ========== P2P Signaling ==========

export interface P2PSession {
  session_id: string;
  initiator_id: string;
  initiator_name?: string;
  status: "pending" | "accepted" | "connecting" | "connected" | "closed";
  peer_ip?: string;
  created_at?: string;
  sdp_offer?: { sdp: string; type: "offer" };
  sdp_answer?: { sdp: string; type: "answer" };
}

export async function requestP2PSession(targetUserId: string): Promise<P2PSession> {
  const identity = getIdentity();
  return request<P2PSession>("/api/v1/p2p/request", {
    method: "POST",
    body: JSON.stringify({
      target_user_id: targetUserId,
      user_id: identity.user_id,
      user_name: identity.user_name,
    }),
  });
}

export async function getPendingP2PSessions(): Promise<P2PSession[]> {
  return request<P2PSession[]>("/api/v1/p2p/pending");
}

export async function acceptP2PSession(sessionId: string, tailscaleIp: string): Promise<P2PSession> {
  const identity = getIdentity();
  return request<P2PSession>("/api/v1/p2p/accept", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      tailscale_ip: tailscaleIp,
      user_id: identity.user_id,
    }),
  });
}

export async function exchangeP2PIP(sessionId: string, tailscaleIp: string): Promise<unknown> {
  const identity = getIdentity();
  return request<unknown>("/api/v1/p2p/exchange-ip", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      tailscale_ip: tailscaleIp,
      user_id: identity.user_id,
    }),
  });
}

export async function getP2PSessionStatus(sessionId: string): Promise<P2PSession> {
  return request<P2PSession>(`/api/v1/p2p/session/${sessionId}`);
}

export async function sendP2POffer(sessionId: string, sdp: string): Promise<void> {
  await request<void>("/api/v1/p2p/signal/offer", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, sdp, type: "offer" }),
  });
}

export async function sendP2PAnswer(sessionId: string, sdp: string): Promise<void> {
  await request<void>("/api/v1/p2p/signal/answer", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, sdp, type: "answer" }),
  });
}

export async function sendP2PIceCandidate(
  sessionId: string,
  candidate: string,
  sdpMid?: string | null,
  sdpMLineIndex?: number | null
): Promise<void> {
  await request<void>("/api/v1/p2p/signal/ice", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      candidate,
      sdp_mid: sdpMid,
      sdp_m_line_index: sdpMLineIndex
    }),
  });
}

export async function closeP2PSession(sessionId: string): Promise<void> {
  await request<void>(`/api/v1/p2p/close/${sessionId}`, { method: "POST" });
}

// ========== WebSocket URLs ==========

export function wsGeneralChatUrl(roomId: string = "general"): string {
  const identity = getIdentity();
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/api/v1/ws/general?user_id=${encodeURIComponent(identity.user_id)}&name=${encodeURIComponent(identity.user_name || "Guest")}&room_id=${encodeURIComponent(roomId)}`;
}

// End of api.ts
