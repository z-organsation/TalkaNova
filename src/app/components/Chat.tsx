"use client";
import { useState, useEffect, useRef, useCallback } from "react";

import Image from "next/image";
/* 
 * TalkaNova Core Chat Component
 * Integrates Centralized WebSocket (Rooms) and P2P Signaling (Tailscale).
 */

import {
  getRooms,
  createRoom as apiCreateRoom,
  joinRoom as apiJoinRoom,
  wsGeneralChatUrl,
  getPendingP2PSessions,
  acceptP2PSession,
  getIdentity,
  setUserName,
  getLocalProfile,
  type Profile as ApiProfile,
  type Room as ApiRoom,
  type P2PSession,
} from "../lib/api";
import { roomOpaqueEncode, roomOpaqueDecode } from "../lib/crypto";
import P2PChat from "./P2PChat";


function useIsPc() {
  const [isPc, setIsPc] = useState(false);
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const checkMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
      setIsPc(!checkMobile);
    }
  }, []);
  return isPc;
}

type ChatMessage = {
  id: string;
  message: string;
  user_name?: string;
  avatar?: string;
  timestamp: string;
};

type Profile = ApiProfile & { id: string };
type ActiveChat = { id: string; type: "room" | "dm" | "p2p"; name?: string; roomId?: string; conversationId?: string; otherUserId?: string; p2pSessionId?: string };
type Room = ApiRoom;

export default function Chat() {
  const isPc = useIsPc();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pendingP2P, setPendingP2P] = useState<P2PSession[]>([]);
  const [usersOnline, setUsersOnline] = useState<string[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  /**
   * SESSION MANAGEMENT
   * Automatically handles Guest Login and Identity Persistence.
   */


  // LoginModal import moved to top

  // ... inside Chat component ...


  // ... inside Chat component ...

  // const [showNamePrompt, setShowNamePrompt] = useState(false); // Removed
  // const [nameInput, setNameInput] = useState(""); // Removed

  const loadInitialData = useCallback(() => {
    getRooms().then(async (rs) => {
      let general = rs.find(r => r.name === "General");
      if (!general) {
        // Create General room if it doesn't exist
        try {
          general = await apiCreateRoom("General", "public");
          rs.push(general);
        } catch { }
      }
      setRooms(rs);

      if (!activeChat && general) {
        await apiJoinRoom(general.id);
        setActiveChat({ id: general.id, type: "room", name: general.name, roomId: general.id });
      } else if (rs.length > 0 && !activeChat) {
        setActiveChat({ id: rs[0].id, type: "room", name: rs[0].name, roomId: rs[0].id });
      }
    }).catch(() => { });
    // No user list in no-auth mode
    getPendingP2PSessions().then(setPendingP2P).catch(() => { });
  }, [activeChat]);

  useEffect(() => {
    // Check for existing identity
    const identity = getIdentity();
    if (!identity.user_name) {
      // Auto-set guest name instead of prompting
      const defaultName = `Guest-${identity.user_id.slice(0, 4)}`;
      setUserName(defaultName);
    }
    setProfile(getLocalProfile());
    loadInitialData();
  }, [loadInitialData]);

  // handleNameSubmit removed


  // But handleNameSubmit needs it.
  // We add dependency below.

  useEffect(() => {
    if (!profile) return;
    const interval = setInterval(() => {
      getPendingP2PSessions().then(setPendingP2P).catch(() => { });
    }, 5000);
    return () => clearInterval(interval);
  }, [profile]);

  useEffect(() => {
    if (!profile || !activeChat) {
      setUsersOnline([]);
      setMessages([]);
      return;
    }

    // P2P Chat is handled by separate component
    if (activeChat.type === "p2p") return;

    // DM not supported in no-auth mode, only rooms and P2P
    if (activeChat.type === "dm") {
      return;
    }
    if (activeChat.type === "room" && activeChat.roomId) {
      setMessages([]);
      if (wsRef.current) wsRef.current.close();

      try {
        const url = wsGeneralChatUrl(activeChat.roomId);
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "message") {
              setMessages((prev) => [
                ...prev,
                {
                  id: data.sender_id,
                  message: data.content ? roomOpaqueDecode(data.content) : (data.message ? roomOpaqueDecode(data.message) : ""),
                  user_name: data.user_name || "Guest",
                  avatar: data.avatar,
                  timestamp: data.timestamp || new Date().toISOString(),
                },
              ]);
            }
            if (data.type === "room_users" && data.users) {
              // Initial user list for presence
              setUsersOnline(data.users.map((u: { user_id: string }) => u.user_id));
            }
            if (data.type === "presence" && data.event === "join") {
              setUsersOnline((prev) => (prev.includes(data.user_id) ? prev : [...prev, data.user_id]));
            }
            if (data.type === "presence" && data.event === "leave") {
              setUsersOnline((prev) => prev.filter((id) => id !== data.user_id));
            }
          } catch { }
        };
        ws.onclose = () => setUsersOnline([]);
      } catch (e) {
        console.error("WS Connect error", e);
      }
      return () => {
        wsRef.current?.close();
        wsRef.current = null;
      };
    }
  }, [activeChat, profile]);

  const sendMessage = async () => {
    if (newMessage.trim() === "" || !profile) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "chat", content: roomOpaqueEncode(newMessage) })
      );
      setNewMessage("");
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ShowThem = () => {
    setShowMembers((prev) => !prev);
  };

  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCode, setNewRoomCode] = useState("");

  const createRoom = async () => {
    if (!newRoomName.trim() || !newRoomCode.trim()) return;
    try {
      const room = await apiCreateRoom(newRoomName.trim(), newRoomCode.trim());
      await apiJoinRoom(room.id);
      setRooms((prev) => [...prev, room]);
      setNewRoomName("");
      setNewRoomCode("");
    } catch { }
  };



  // openDm removed - DMs not supported in no-auth mode

  // startP2P removed as it was unused and implemented in sidebar


  const handleAcceptP2P = async (sessionId: string) => {
    const ip = prompt("Enter your Tailscale IP (e.g. 100.x.x.x):");
    if (!ip) return;
    try {
      await acceptP2PSession(sessionId, ip);
      setActiveChat({ id: sessionId, type: "p2p", name: "P2P Chat", p2pSessionId: sessionId });
      setPendingP2P(prev => prev.filter(p => p.session_id !== sessionId));
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert((e as any).message || "Error accepting P2P");
    }
  };

  // Render Sidebar Content (Shared)
  const SidebarContent = () => (
    <div className="all_chats relative flex-1 overflow-y-auto">
      {/* P2P Requests */}
      {pendingP2P.length > 0 && (
        <>
          <p className="text-green-400 text-xs font-bold p-1 ml-2">P2P Requests</p>
          {pendingP2P.map((s) => (
            <div key={s.session_id} className="room w-full py-2 border-b border-[#33A1E040] flex items-center justify-between px-2">
              <span className="text-white text-sm">Session {s.session_id.slice(-4)}</span>
              <button onClick={() => handleAcceptP2P(s.session_id)} className="bg-green-600 text-xs px-2 py-1 rounded">Accept</button>
            </div>
          ))}
        </>
      )}

      <p className="text-[#33A1E0] text-xs font-bold p-1 ml-2">Rooms</p>
      {rooms.map((room: Room) => (
        <div
          key={room.id}
          className={`room w-full py-2 border-b border-[#33A1E040] cursor-pointer flex items-center
              ${activeChat?.roomId === room.id ? "bg-[#154D7120]" : ""}`}
          onClick={() => {
            apiJoinRoom(room.id).then(() => {
              setActiveChat({ id: room.id, type: "room", name: room.name, roomId: room.id });
            });
          }}
        >
          <p className="text-[#33A1E0] text-sm sm:text-lg lg:text-xl font-bold p-1 ml-2"># {room.name}</p>
        </div>
      ))}
      {/* P2P Pending Section */}
      <p className="text-[#33A1E0] text-xs font-bold p-1 ml-2 mt-2">P2P Requests</p>
      {pendingP2P.map((p) => (
        <div
          key={p.session_id}
          className="room w-full py-2 border-b border-[#33A1E040] flex items-center justify-between pr-2"
        >
          <p className="text-[#33A1E0] text-sm p-1 ml-2">{p.initiator_name || "Unknown"}</p>
          <button
            onClick={() => handleAcceptP2P(p.session_id)}
            className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-500"
          >
            Accept
          </button>
        </div>
      ))}
    </div>
  );


  if (!isPc) {
    return (
      <div className="flex flex-col h-dvh">
        {activeChat === null && (
          <div className="contact w-full h-full flex flex-col">
            <div className="bar h-[7%] w-full z-10 bg-transparent flex flex-row items-center justify-between">
              <h1 className="h-full flex flex-end justify-center items-center text-4xl font-sans text-[#33A1E0] [text-shadow:_0_2px_4px_#33A1E0] [--tw-text-stroke:1px_#154D71] [text-stroke:var(--tw-text-stroke)] ml-2">
                TalkaNova
              </h1>
              <button
                className="profile w-[12%] h-[75%] bg-no-repeat bg-[url('/TN.svg')] bg-center bg-contain flex justify-end items-center mr-2"
                onClick={() => {
                  if (confirm("Reset Identity? This will clear your guest session.")) {
                    localStorage.clear();
                    location.reload();
                  }
                }}
              />
            </div>

            <SidebarContent />

            <div className="parameters w-full h-[10%] border-1 border-[#33A1E040] flex flex-end items-center justify-center ">
              <div className="profile w-[20%] h-[90%] bg-center bg-cover bg-no-repeat rounded-full"
                style={{ backgroundImage: `url(${profile?.pfp_url || '/profile.svg'})` }}></div>

              <div className="infos h-[90%] w-[80%] flex flex-end flex-col p-1">
                <p className="name text-[#33A1E0] text-sm w-full h-[40%]">
                  {profile?.user_name}
                </p>
                <p className="email text-[#2678A3] text-xs w-full h-[40%] pt-1">
                  {profile?.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeChat !== null && (
          activeChat.type === "p2p" ? (
            <P2PChat
              sessionId={activeChat.p2pSessionId || ""}
              myUserId={profile?.id || ""}
              onClose={() => setActiveChat(null)}
            />
          ) : (
            <div className="chat w-full h-full flex flex-col">
              <div className="bar h-[7%] w-full border-1 border-[#33A1E040] bg-transparent flex flex-row items-center">
                <div
                  className="back w-[10%] h-[60%] bg-center bg-contain bg-no-repeat bg-[url('/back.svg')] cursor-pointer flex justify-end items-center"
                  onClick={() => setActiveChat(null)}
                ></div>
                <h1 className="h-full flex flex-end items-center text-4xl font-sans text-[#33A1E0] [text-shadow:_0_2px_4px_#33A1E0] [--tw-text-stroke:1px_#154D71] [text-stroke:var(--tw-text-stroke)] flex-grow mr-2">
                  TalkaNova
                </h1>
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="members w-[12%] h-[75%] bg-no-repeat bg-[url('/members.svg')] bg-center bg-contain cursor-pointer flex justify-end items-center mr-2"
                ></button>
              </div>

              <div className="msgs flex-1 overflow-y-auto p-2">
                {messages.map((msg, idx) => {
                  const isMe = msg.id === profile?.id;
                  return (
                    <div key={idx} className={`flex items-start gap-2 mb-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      <Image src={msg.avatar || "/profile.svg"} alt="pfp" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                      <p className={`px-3 py-1 rounded-2xl max-w-[60%] text-white justify-start break-words whitespace-pre-wrap ${isMe ? "bg-blue-600 text-left max-w-[70%]" : "bg-gray-700 text-left max-w-[70%]"}`}>
                        {msg.message}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="send_part w-full h-[10%]  flex items-center justify-center font-sans">
                <div className="send_bar h-[92%] w-[99%] flex items-center justify-center border-1 border-[rgba(255,255,255,0.3)] rounded-[60px] bg-[rgba(255,255,255,0.06)] shadow-[0_0_15px_#33A1E0]">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="send message ..."
                    required
                    className="w-full h-full text-lg flex items-center justify-center border-0 bg-transparent text-[#ffffff] focus:outline-none ml-2 focus:outline-none"
                  />
                  <button onClick={sendMessage} className="send w-[12%] h-[80%] bg-center bg-contain bg-no-repeat bg-[url('/send.svg')] mr-2"></button>
                </div>
              </div>

              {showMembers && (
                <div className="absolute inset-0 bg-black/70 flex">
                  <div className="absolute top-0 right-0 w-[80%] h-full bg-gradient-to-b from-[#041d2d] to-[#154d71] border-l border-[#33A1E040] flex flex-col p-2 overflow-y-auto">
                    <div className="flex justify-between items-center mb-2">
                      <button onClick={() => setShowMembers(false)} className="text-white text-lg">✕</button>
                    </div>
                    {/* ... (Users lists) ... */}
                  </div>
                  <div className="flex-1" onClick={() => setShowMembers(false)} />
                </div>
              )}
            </div>
          )
        )}
      </div>
    );
  }


  // Modal removed


  return (
    <div className="page h-full w-full grid grid-rows-10 transition-all duration-300 grid-cols-5">
      <div className="search col-start-1 row-start-1 border-1 border-[#33A1E040] flex items-center justify-center">
        {/* Search bar ... */}
        <div className="search_bar w-[90%] h-[75%] flex items-center justify-center border-1 border-[rgba(255,255,255,0.3)] rounded-[60px] bg-[#FFFFFF30] font-sans shadow-[0_0_15px_#33A1E0]">
          <input type="text" placeholder="Search" className="w-full h-full border-0 bg-transparent text-[#FFFFFF60] p-2 focus:outline-none" />
        </div>
      </div>

      <div className="massage flex flex-col font-sans border-1 border-[#33A1E040] border-t-0 bg-transparent row-span-9 col-start-1 row-start-2">
        <SidebarContent />
        {/* Create room inputs ... */}
        <div className="creat_chat p-1 border-t-1 border-[#33A1E040] flex flex-col justify-center items-center gap-2">
          <input type="text" placeholder="Room Name" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="name h-[30%] w-[90%] p-1 text-sm rounded bg-[#154D71] text-white outline-none" />
          <input type="text" placeholder="Code" value={newRoomCode} onChange={(e) => setNewRoomCode(e.target.value)} className="code h-[30%] w-[90%] p-1 text-sm rounded bg-[#154D71] text-white outline-none" />
          <button onClick={createRoom} className="h-[30%] w-[90%] bg-[#33A1E0] text-white py-1 px-2 rounded hover:bg-[#1e7bbf] text-sm flex justify-center items-center">➕</button>
        </div>

        <div className="parameters w-full h-[10%] border-t-1 border-[#33A1E040] flex flex-end items-center justify-center ">
          {/* Profile footer ... */}
          <div className="profile w-[30px] h-[30px] bg-center bg-cover rounded-full" style={{ backgroundImage: `url(${profile?.pfp_url || '/profile.svg'})` }}></div>
          <div className="infos h-[90%] w-[77%] items-center p-1">
            <p className="name text-[#33A1E0] text-sm">{profile?.user_name}</p>
            <button
              className="text-white text-xs hover:text-red-400"
              onClick={() => {
                if (confirm("Reset Identity?")) {
                  localStorage.clear();
                  location.reload();
                }
              }}
            >Reset Identity</button>
          </div>
        </div>
      </div>

      <div className={`bar row-start-1 border-1 border-[#33A1E040] border-l-0 bg-transparent flex flex-row items-center justify-between ${showMembers ? "col-span-3 col-start-2" : "col-span-4 col-start-2"}`}>
        <h1 className="h-full flex flex-end justify-center items-center text-4xl text-[#33A1E0] ml-2">TalkaNova</h1>
        <button onClick={ShowThem} className="members w-12 h-12 bg-no-repeat bg-[url('/members.svg')] bg-center bg-contain cursor-pointer flex justify-end items-center mr-2"></button>
      </div>

      <div className={`chat flex flex-col bg-transparent row-span-9 row-start-2 ${showMembers ? "col-span-3 col-start-2" : "col-span-4 col-start-2"}`}>
        {activeChat?.type === "p2p" ? (
          <P2PChat
            sessionId={activeChat.p2pSessionId || ""}
            myUserId={profile?.id || ""}
            onClose={() => setActiveChat(null)}
          />
        ) : (
          <>
            <div className="msgs p-3 flex-1 overflow-y-auto">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-2 mb-2 ${msg.id === profile?.id ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Msg */}
                  <p className={`px-3 py-1 rounded-2xl max-w-[60%] text-white ${msg.id === profile?.id ? "bg-blue-600" : "bg-gray-700"}`}>{msg.message}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="send_part w-full h-[10%] flex items-center justify-center font-sans">
              {/* ... input ... */}
              <div className="send_bar h-[90%] w-[99%] flex items-center justify-center border-1 border-[rgba(255,255,255,0.3)] rounded-[60px] bg-[rgba(255,255,255,0.06)] shadow-[0_0_15px_#33A1E0] p-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Send message..."
                  className="w-full h-full text-lg bg-transparent text-white focus:outline-none ml-3"
                />
                <button onClick={sendMessage} className="send w-[5%] h-full bg-center bg-contain bg-no-repeat bg-[url('/send.svg')]"></button>
              </div>
            </div>
          </>
        )}
      </div>

      {showMembers && (
        <div className="members col-start-5 row-start-1 row-span-10 border-1 border-[#33A1E040] flex flex-col p-2">
          {/* room members list */}
          <p className="text-green-400">Online Users:</p>
          {usersOnline.map(id => <div key={id} className="text-[#33A1E0] text-sm">User {id.slice(0, 8)}...</div>)}
        </div>
      )}
    </div>
  );
}

