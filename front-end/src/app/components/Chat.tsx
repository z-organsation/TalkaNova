"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

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
  requestP2PSession,
  uploadFile,
  deleteMessage,
  reportMessage,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"chats" | "members" | "account" | "settings">("chats");
  const wsRef = useRef<WebSocket | null>(null);

  /**
   * SESSION MANAGEMENT
   * Automatically handles Guest Login and Identity Persistence.
   */

  const loadInitialData = useCallback(() => {
    getRooms().then(async (rs) => {
      let general = rs.find(r => r.name === "General");
      if (!general) {
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

    getPendingP2PSessions().then(setPendingP2P).catch(() => { });
  }, [activeChat]);

  useEffect(() => {
    const identity = getIdentity();
    if (!identity.user_name) {
      const defaultName = `Guest-${identity.user_id.slice(0, 4)}`;
      setUserName(defaultName);
    }
    setProfile(getLocalProfile());
    loadInitialData();
  }, [loadInitialData]);

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

    if (activeChat.type === "p2p") return;

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const res = await uploadFile(file);
        const content = `[FILE]:${res.id}:${res.filename}:${res.content_type}`;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({ type: "chat", content: roomOpaqueEncode(content) })
          );
        }
      } catch (err) {
        alert("Upload failed");
      }
    }
  };

  const renderMessageContent = (msg: string) => {
    if (msg.startsWith("[FILE]:")) {
      const parts = msg.split(":");
      const id = parts[1];
      const name = parts[2];
      const type = parts[3];
      const url = `/api/v1/files/${id}`;
      if (type.startsWith("image/")) {
        return <div className="flex flex-col"><Image src={url} alt={name} width={200} height={200} className="rounded mb-1" /><a href={url} download={name} className="text-xs underline text-white">Download {name}</a></div>;
      }
      return <a href={url} download={name} target="_blank" className="text-blue-300 underline flex items-center gap-2">📄 {name}</a>;
    }
    return msg;
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

  const handleAcceptP2P = async (sessionId: string) => {
    const ip = prompt("Enter your Tailscale IP (e.g. 100.x.x.x):");
    if (!ip) return;
    try {
      await acceptP2PSession(sessionId, ip);
      setActiveChat({ id: sessionId, type: "p2p", name: "P2P Chat", p2pSessionId: sessionId });
      setPendingP2P(prev => prev.filter(p => p.session_id !== sessionId));
    } catch (e: unknown) {
      alert((e as any).message || "Error accepting P2P");
    }
  };

  // Sidebar Content Components
  const ChatsSidebar = () => (
    <div className="all_chats flex-1 overflow-y-auto">
      {pendingP2P.length > 0 && (
        <>
          <p className="text-green-400 text-xs font-bold p-2">P2P Requests</p>
          {pendingP2P.map((s) => (
            <div key={s.session_id} className="room w-full py-2 border-b border-[#33A1E040] flex items-center justify-between px-2">
              <span className="text-white text-sm">Session {s.session_id.slice(-4)}</span>
              <button onClick={() => handleAcceptP2P(s.session_id)} className="bg-green-600 text-xs px-2 py-1 rounded">Accept</button>
            </div>
          ))}
        </>
      )}

      <p className="text-[#33A1E0] text-xs font-bold p-2">Rooms</p>
      {rooms
        .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((room: Room) => (
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
    </div>
  );

  const MembersSidebar = () => (
    <div className="members_list flex-1 overflow-y-auto">
      <p className="text-[#33A1E0] text-xs font-bold p-2">Online Users ({usersOnline.length})</p>
      {usersOnline
        .filter(u => u !== profile?.id && u.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(userId => (
          <div key={userId} className="user-item w-full py-2 border-b border-[#33A1E040] flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-white text-xs">{userId.slice(0, 2).toUpperCase()}</span>
              </div>
              <span className="text-white text-sm">User {userId.slice(0, 8)}</span>
            </div>
            <button
              onClick={async () => {
                try {
                  await requestP2PSession(userId);
                  alert("P2P Request Sent!");
                } catch (e) { alert("Failed to send request"); }
              }}
              className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-500"
            >
              Connect
            </button>
          </div>
        ))}
    </div>
  );

  const AccountSidebar = () => (
    <div className="account_settings flex-1 overflow-y-auto p-2">
      <div className="profile-section mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
            <span className="text-white text-lg">{profile?.user_name?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>
          <div>
            <p className="text-white font-medium">{profile?.user_name || 'Guest User'}</p>
            <p className="text-gray-400 text-sm">{profile?.email || 'guest@example.com'}</p>
          </div>
        </div>
        
        <button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded mb-2 text-sm"
          onClick={() => alert('Edit profile feature coming soon')}
        >
          Edit Profile
        </button>
        
        <button 
          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded text-sm"
          onClick={() => alert('Change password feature coming soon')}
        >
          Change Password
        </button>
      </div>

      <div className="divider border-t border-gray-700 my-4"></div>

      <div className="preferences-section">
        <h3 className="text-[#33A1E0] text-sm font-bold mb-2">Preferences</h3>
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span className="text-white text-sm">Dark Mode</span>
            <input type="checkbox" className="rounded" defaultChecked />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-white text-sm">Notifications</span>
            <input type="checkbox" className="rounded" defaultChecked />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-white text-sm">Email Updates</span>
            <input type="checkbox" className="rounded" />
          </label>
        </div>
      </div>
    </div>
  );

  const SettingsSidebar = () => (
    <div className="settings_panel flex-1 overflow-y-auto p-2">
      <h3 className="text-[#33A1E0] text-sm font-bold mb-3">Settings</h3>
      
      <div className="setting-group mb-4">
        <h4 className="text-white text-sm font-medium mb-2">Appearance</h4>
        <div className="space-y-2">
          <button className="w-full text-left text-white text-sm p-2 hover:bg-gray-700 rounded">
            Theme Settings
          </button>
          <button className="w-full text-left text-white text-sm p-2 hover:bg-gray-700 rounded">
            Font Size
          </button>
        </div>
      </div>

      <div className="setting-group mb-4">
        <h4 className="text-white text-sm font-medium mb-2">Privacy</h4>
        <div className="space-y-2">
          <button className="w-full text-left text-white text-sm p-2 hover:bg-gray-700 rounded">
            Privacy Settings
          </button>
          <button className="w-full text-left text-white text-sm p-2 hover:bg-gray-700 rounded">
            Blocked Users
          </button>
        </div>
      </div>

      <div className="setting-group mb-4">
        <h4 className="text-white text-sm font-medium mb-2">Help & Support</h4>
        <div className="space-y-2">
          <Link href="/help" className="block text-left text-white text-sm p-2 hover:bg-gray-700 rounded">
            Help Center
          </Link>
          <button className="w-full text-left text-white text-sm p-2 hover:bg-gray-700 rounded">
            Contact Support
          </button>
        </div>
      </div>

      <div className="divider border-t border-gray-700 my-4"></div>

      <button 
        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-sm"
        onClick={() => {
          if (confirm("Are you sure you want to logout?")) {
            localStorage.clear();
            window.location.href = '/';
          }
        }}
      >
        Logout
      </button>
    </div>
  );

  const SidebarContent = () => {
    switch (sidebarTab) {
      case "chats":
        return <ChatsSidebar />;
      case "members":
        return <MembersSidebar />;
      case "account":
        return <AccountSidebar />;
      case "settings":
        return <SettingsSidebar />;
      default:
        return <ChatsSidebar />;
    }
  };

  const SidebarTabs = () => (
    <div className="sidebar_tabs flex border-b border-[#33A1E040]">
      <button
        className={`tab flex-1 py-2 text-center text-sm ${sidebarTab === "chats" ? "text-[#33A1E0] border-b-2 border-[#33A1E0]" : "text-gray-400"}`}
        onClick={() => setSidebarTab("chats")}
      >
        Chats
      </button>
      <button
        className={`tab flex-1 py-2 text-center text-sm ${sidebarTab === "members" ? "text-[#33A1E0] border-b-2 border-[#33A1E0]" : "text-gray-400"}`}
        onClick={() => setSidebarTab("members")}
      >
        Members
      </button>
      <button
        className={`tab flex-1 py-2 text-center text-sm ${sidebarTab === "account" ? "text-[#33A1E0] border-b-2 border-[#33A1E0]" : "text-gray-400"}`}
        onClick={() => setSidebarTab("account")}
      >
        Account
      </button>
      <button
        className={`tab flex-1 py-2 text-center text-sm ${sidebarTab === "settings" ? "text-[#33A1E0] border-b-2 border-[#33A1E0]" : "text-gray-400"}`}
        onClick={() => setSidebarTab("settings")}
      >
        ⚙️
      </button>
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

            <SidebarTabs />
            <SidebarContent />

            <div className="parameters w-full h-[10%] border-1 border-[#33A1E040] flex flex-end items-center justify-center p-2">
              <div className="profile w-[30px] h-[30px] bg-center bg-cover bg-no-repeat rounded-full"
                style={{ backgroundImage: `url(${profile?.pfp_url || '/profile.svg'})` }}></div>
              <div className="infos h-[90%] w-[80%] flex flex-end flex-col ml-2">
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
                    <SidebarTabs />
                    <SidebarContent />
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

  return (
    <div className="page h-full w-full grid grid-rows-10 transition-all duration-300 grid-cols-5">
      <div className="search col-start-1 row-start-1 border-1 border-[#33A1E040] flex items-center justify-center p-2">
        <div className="search_bar w-full h-[75%] flex items-center justify-center border-1 border-[rgba(255,255,255,0.3)] rounded-[60px] bg-[#FFFFFF30] font-sans shadow-[0_0_15px_#33A1E0]">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full border-0 bg-transparent text-[#FFFFFF60] p-2 focus:outline-none"
          />
        </div>
      </div>

      <div className="massage flex flex-col font-sans border-1 border-[#33A1E040] border-t-0 bg-transparent row-span-9 col-start-1 row-start-2">
        <SidebarTabs />
        <SidebarContent />
        
        <div className="creat_chat p-2 border-t-1 border-[#33A1E040] flex flex-col justify-center items-center gap-2">
          <input type="text" placeholder="Room Name" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="name h-[30%] w-[90%] p-1 text-sm rounded bg-[#154D71] text-white outline-none" />
          <input type="text" placeholder="Code" value={newRoomCode} onChange={(e) => setNewRoomCode(e.target.value)} className="code h-[30%] w-[90%] p-1 text-sm rounded bg-[#154D71] text-white outline-none" />
          <button onClick={createRoom} className="h-[30%] w-[90%] bg-[#33A1E0] text-white py-1 px-2 rounded hover:bg-[#1e7bbf] text-sm flex justify-center items-center">➕ Create Room</button>
        </div>

        <div className="parameters w-full h-[10%] border-t-1 border-[#33A1E040] flex items-center justify-center p-2">
          <div className="profile w-[30px] h-[30px] bg-center bg-cover rounded-full" style={{ backgroundImage: `url(${profile?.pfp_url || '/profile.svg'})` }}></div>
          <div className="infos h-[90%] w-[77%] items-center ml-2">
            <p className="name text-[#33A1E0] text-sm">{profile?.user_name}</p>
            <button
              className="text-white text-xs hover:text-red-400"
              onClick={() => {
                if (confirm("Reset Identity?")) {
                  localStorage.clear();
                  location.reload();
                }
              }}
            >Logout</button>
          </div>
        </div>
      </div>

      <div className={`bar row-start-1 border-1 border-[#33A1E040] border-l-0 bg-transparent flex flex-row items-center justify-between ${showMembers ? "col-span-3 col-start-2" : "col-span-4 col-start-2"}`}>
        <h1 className="h-full flex flex-end justify-center items-center text-4xl text-[#33A1E0] ml-2">TalkaNova</h1>
        <button onClick={() => setShowMembers(!showMembers)} className="members w-12 h-12 bg-no-repeat bg-[url('/members.svg')] bg-center bg-contain cursor-pointer flex justify-end items-center mr-2"></button>
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
                <div key={idx} className={`flex items-start gap-2 mb-2 group ${msg.id === profile?.id ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`px-3 py-1 rounded-2xl max-w-[60%] text-white relative ${msg.id === profile?.id ? "bg-blue-600" : "bg-gray-700"}`}>
                    {renderMessageContent(msg.message)}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1">
                    {msg.id === profile?.id ? (
                      <button
                        onClick={() => deleteMessage(msg.id).then(() => setMessages(prev => prev.filter(m => m.id !== msg.id)))}
                        className="text-red-400 text-xs hover:text-red-300"
                        title="Delete"
                      >🗑️</button>
                    ) : (
                      <button
                        onClick={() => reportMessage(msg.id, "spam").then(() => alert("Reported"))}
                        className="text-yellow-400 text-xs hover:text-yellow-300"
                        title="Report"
                      >⚠️</button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="send_part w-full h-[10%] flex items-center justify-center font-sans p-2">
              <div className="send_bar h-[90%] w-[99%] flex items-center justify-center border-1 border-[rgba(255,255,255,0.3)] rounded-[60px] bg-[rgba(255,255,255,0.06)] shadow-[0_0_15px_#33A1E0] p-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-[5%] h-full text-2xl mr-2 hover:bg-white/10 rounded flex items-center justify-center"
                >📎</button>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Send message..."
                  className="w-full h-full text-lg bg-transparent text-white focus:outline-none ml-3 resize-none"
                ></textarea>
                <button onClick={sendMessage} className="send w-[5%] h-full bg-center bg-contain bg-no-repeat bg-[url('/send.svg')]"></button>
              </div>
            </div>
          </>
        )}
      </div>

      {showMembers && (
        <div className="members col-start-5 row-start-1 row-span-10 border-1 border-[#33A1E040] flex flex-col p-2">
          <div className="mb-2">
            <button onClick={() => setShowMembers(false)} className="text-white text-lg float-right">✕</button>
          </div>
          <SidebarTabs />
          <SidebarContent />
        </div>
      )}
    </div>
  );
}
