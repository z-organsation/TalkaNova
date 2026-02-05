"use client";
import { useState, useEffect, useRef } from "react";
import client from "../config/supabsaeClient";
import { useRouter } from "next/navigation";
import { RealtimeChannel } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";

function useIsPc() {
  const [isPc, setIsPc] = useState(false);
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const checkMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(
        navigator.userAgent
      );
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


type Profile = {
  id: string;
  email: string;
  user_name: string;
  pfp_url: string;
};

export default function Chat() {
  const isPc = useIsPc();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getSessionAndProfile = async () => {
      // Récupérer la session actuelle
      const { data: { session } } = await client.auth.getSession();
      setSession(session);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        router.push("/");
      }
    };

    getSessionAndProfile();

    // Écouter les changements d'état de connexion
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        router.push("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const fetchProfile = async (userId: string) => {
    const { data, error } = await client
      .from("profile")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Erreur fetch profile:", error.message);
      setProfile(null);
    } else {
      setProfile(data);
    }
  };

  const handleLogout = async () => {
    const { error } = await client.auth.signOut();
    if (error) {
      console.error("Erreur logout:", error.message);
    } else {
      setProfile(null);
      setSession(null);
      router.push("/");
    }
  };
  
  const roomRef = useRef<RealtimeChannel | null>(null);
  const [userList, setUserList] = useState<Profile[]>([]); 
  const [usersOnline, setUsersOnline] = useState<string[]>([]);
  const [showMembers, setShowMembers] = useState(false);
 
  useEffect(() => {

    let isMounted = true;

    const fetchProfiles = async () => {
      const { data, error } = await client
        .from("profile")
        .select("id, user_name, pfp_url, email");

      if (!error && data && isMounted) {
        setUserList(
          data.map((u: Profile) => ({
            id: String(u.id),
            user_name: u.user_name,
            pfp_url: u.pfp_url ?? null,
            email: u.email,
          }))
        );
      } else if (error) {
        console.error("Erreur fetch profiles:", error);
      }
    };

    fetchProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  if(session){
    if(!isPc){
      return (
      <>
        <div className="flex flex-col h-dvh">
          {activeChat === null && (
            <div className="contact w-full h-full flex flex-col">

              <div className="bar h-[7%] w-full z-10 bg-transparent flex flex-row items-center justify-between">
                <h1 className="h-full flex flex-end justify-center items-center text-4xl font-sans text-[#33A1E0] [text-shadow:_0_2px_4px_#33A1E0] [--tw-text-stroke:1px_#154D71] [text-stroke:var(--tw-text-stroke)] ml-2">
                  TalkaNova
                </h1>
                <button className="profile w-[12%] h-[75%] bg-no-repeat bg-[url('/TN.svg')] bg-center bg-contain flex justify-end items-center mr-2"></button>
              </div>

              <div className=" search h-[8%] w-full flex items-center justify-center">
                <div className="search_bar w-[90%] h-[78%] flex items-center justify-center border-1 border-[rgba(255,255,255,0.3)] rounded-[60px] bg-[#FFFFFF30] font-sans shadow-[0_0_15px_#33A1E0]">
                  <div className="loop w-[10%] h-[65%] bg-no-repeat bg-contain bg-center bg-[url('/loop.svg')] ml-3 "></div>
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full h-full border-0 bg-transparent text-[#FFFFFF60] text-[16px] lg:text-lg p-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="all_chats border-1 border-[#33A1E040] flex-1 overflow-y-autot">
                {rooms.map((room: Room) => (
                  <div
                    key={room.code}
                    className="room w-full py-2 border-b border-[#33A1E040] cursor-pointer flex items-center"
                    onClick={() => joinRoom(room)}
                  >
                    <p className="text-[#33A1E0] text-sm sm:text-lg lg:text-xl font-bold p-1 ml-2">
                      # {room.name}
                    </p>
                  </div>
                ))} 
              </div>
              
              <div className="creat_chat p-1 border-l-1 border-r-1 border-[#33A1E040] flex flex-col justify-center items-center gap-2">
                <input
                  type="text"
                  placeholder="Nom de la room"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="name h-[30%] w-[90%] p-1 text-sm rounded bg-[#154D71] text-white outline-none"
                />
                <input
                  type="text"
                  placeholder="Code (ex: room123)"
                  value={newRoomCode}
                  onChange={(e) => setNewRoomCode(e.target.value)}
                  className="code h-[30%] w-[90%] p-1 text-sm rounded bg-[#154D71] text-white outline-none"
                />
                <button
                  onClick={createRoom}
                  className="h-[30%] w-[90%] bg-[#33A1E0] text-white py-1 px-2 rounded hover:bg-[#1e7bbf] text-sm flex justify-center items-center"
                >
                  ➕
                </button>
              </div>
              
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
                <button
                  onClick={handleLogout}
                  className="prameter w-[25%] h-[75%] bg-center bg-contain bg-no-repeat bg-[url('/parametre.svg')] cursor-pointer flex justify-end items-center mr-2"
                ></button>
              </div>

            </div>
          )}

          {activeChat !== null && (
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
                  const isMe = msg.id === session.user.id; // check si c'est toi

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 mb-2 ${
                        isMe ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {/* Avatar */}
                      <img
                        src={msg.avatar}
                        alt="pfp"
                        className="w-8 h-8 rounded-full object-cover"
                      />

                      {/* Message */}
                      <p
                        className={`px-3 py-1 rounded-2xl max-w-[60%] text-white justify-start break-words whitespace-pre-wrap ${
                          isMe ? "bg-blue-600 text-left max-w-[70%]" : "bg-gray-700 text-left max-w-[70%]"
                        }`}
                      >
                        {msg.message}
                      </p> 
                    </div>
                  );
                })}
                
              </div>

              <div className="send_part w-full h-[10%]  flex items-center justify-center font-sans">
                <div className="send_bar h-[92%] w-[99%] flex items-center justify-center border-1 border-[rgba(255,255,255,0.3)] rounded-[60px] bg-[rgba(255,255,255,0.06)] shadow-[0_0_15px_#33A1E0]">
                  <button className="add_file w-[14%] h-[65%] bg-[#33A1E0] cursor-pointer border-0 rounded-[100%] flex justify-center items-center ml-3">
                    <div className="add w-[76%] h-[70%] bg-center bg-contain bg-no-repeat bg-[url('/add.svg')] rounded-[100%]"></div>
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="send message ..."
                    required
                    className="w-full h-full text-lg flex items-center justify-center border-0 bg-transparent text-[#ffffff] focus:outline-none ml-2 focus:outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    className="send w-[12%] h-[80%] bg-center bg-contain bg-no-repeat bg-[url('/send.svg')] mr-2">
                  </button>
                </div>
              </div>
              
              {showMembers && (
                <div className="absolute inset-0 bg-black/70 flex">
                  <div className="absolute top-0 right-0 w-[80%] h-full bg-gradient-to-b from-[#041d2d] to-[#154d71] border-l border-[#33A1E040] flex flex-col p-2 overflow-y-auto">
                    <div className="flex justify-between items-center mb-2">
                      <button 
                        onClick={() => setShowMembers(false)}
                        className="text-white text-lg"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-green-400 font-bold">En ligne :</p>
                    {userList
                      .filter((user) => usersOnline.includes(user.id))
                      .map((user) => (
                        <div key={user.id} className="w-full h-11 flex items-center gap-3">
                          <img
                            src={user.pfp_url}
                            alt={user.user_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span className="text-white pt-2">{user.user_name}</span>
                        </div>
                      ))}

                    <p className="text-gray-400 font-bold mt-2">Hors ligne :</p>
                    {userList
                      .filter((user) => !usersOnline.includes(user.id))
                      .map((user) => (
                        <div key={user.id} className="w-full h-9 flex items-center gap-2 opacity-50">
                          <img
                            src={user.pfp_url}
                            alt={user.user_name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <span className="text-white pt-2">{user.user_name}</span>
                        </div>
                      ))}
                  </div>

                  {/* zone clic pour fermer */}
                  <div 
                    className="flex-1" 
                    onClick={() => setShowMembers(false)} 
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </>
      );
    }
    return (
      <>
        <div className="page h-full w-full grid grid-rows-10 transition-all duration-300 grid-cols-5">
          
          <div className=" search col-start-1 row-start-1 border-1 border-[#33A1E040] flex items-center justify-center">
            <div className="search_bar w-[90%] h-[75%] flex items-center justify-center border-1 border-[rgba(255,255,255,0.3)] rounded-[60px] bg-[#FFFFFF30] font-sans shadow-[0_0_15px_#33A1E0]">
              <div className="loop w-[13%] h-[70%] bg-no-repeat bg-contain bg-center bg-[url('/loop.svg')] ml-3"></div>
              <input
                type="text"
                placeholder="Search"
                className="w-full h-full border-0 bg-transparent text-[#FFFFFF60] text-[16px] sm:text-[25px] lg:text-3xl p-2 focus:outline-none"
              />
            </div>
          </div>

          <div className="massage flex flex-col font-sans border-1 border-[#33A1E040] border-t-0 bg-transparent row-span-9 col-start-1 row-start-2">
            
            <div className="all_chats relative flex-1 overflow-y-autot">
              {rooms.map((room: Room) => (
                <div
                  key={room.code}
                  className={`room w-full py-2 border-b border-[#33A1E040] cursor-pointer flex items-center
                    ${activeChat?.id === room.code ? "bg-[#154D7120]" : ""}`}
                  onClick={() => joinRoom(room)}
                >
                  <p className="text-[#33A1E0] text-sm sm:text-lg lg:text-xl font-bold p-1 ml-2">
                    # {room.name}
                  </p>
                </div>
              ))} 
            </div>
            
            <div className="creat_chat p-1 border-t-1 border-[#33A1E040] flex flex-col justify-center items-center gap-2">
              <input
                type="text"
                placeholder="Nom de la room"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="name h-[30%] w-[90%] p-1 text-sm rounded bg-[#154D71] text-white outline-none"
              />
              <input
                type="text"
                placeholder="Code (ex: room123)"
                value={newRoomCode}
                onChange={(e) => setNewRoomCode(e.target.value)}
                className="code h-[30%] w-[90%] p-1 text-sm rounded bg-[#154D71] text-white outline-none"
              />
              <button
                onClick={createRoom}
                className="h-[30%] w-[90%] bg-[#33A1E0] text-white py-1 px-2 rounded hover:bg-[#1e7bbf] text-sm flex justify-center items-center"
              >
                ➕
              </button>
            </div>

            <div className="parameters w-full h-[10%] border-t-1 border-[#33A1E040] flex flex-end items-center justify-center ">
              <div 
                className="profile w-[15px] h-[15px] sm:w-[30px] sm:h-[30px] lg:w-[43px] lg:h-[37px] bg-center bg-cover bg-no-repeat rounded-full" 
                style={{ backgroundImage: `url(${profile?.pfp_url || '/profile.svg'})` }}
              ></div>
              <div className="infos h-[90%] w-[77%] items-center p-1">
                <p className="name text-[#33A1E0] text-[7px] sm:text-[11px] lg:text-sm w-full">
                  {profile?.user_name}
                </p>
                <p className="email text-[#2678A3] text-[5px] sm:text-[7px] lg:text-xs w-full pt-1">
                  {profile?.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="prameter w-[25%] h-[75%] bg-center bg-contain bg-no-repeat bg-[url('/parametre.svg')] cursor-pointer flex justify-end items-center mr-2"
              ></button>
            </div>
          </div>
            
          <div 
          className={`bar row-start-1 border-1 border-[#33A1E040] border-l-0 bg-transparent flex flex-row items-center justify-between 
            ${showMembers ? "col-span-4 col-start-2" : "col-span-5 col-start-2"}`}
          >
            <h1 className="h-full flex flex-end justify-center items-center text-2xl sm:text-4xl lg:text-5xl font-sans text-[#33A1E0] [text-shadow:_0_2px_4px_#33A1E0] [--tw-text-stroke:1px_#154D71] [text-stroke:var(--tw-text-stroke)] ml-2">
              TalkaNova
            </h1>
            <button 
              onClick={ShowThem}
              className="members w-7 h-7 sm:w-12 sm:h-12 lg:w-15 lg:h-15 bg-no-repeat bg-[url('/members.svg')] bg-center bg-contain cursor-pointer flex justify-end items-center mr-2"
            >
            </button>
          </div>

          <div className={`chat flex flex-col bg-transparent row-span-9 row-start-2
                ${showMembers ? "col-span-4 col-start-2" : "col-span-5 col-start-2"}`}
          >

            <div className="msgs p-3 flex-1 overflow-y-auto">
              {messages.map((msg, idx) => {
                const isMe = msg.id === session.user.id; // check si c'est toi

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 mb-2 ${
                      isMe ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <img
                      src={msg.avatar}
                      alt="pfp"
                      className="w-8 h-8 rounded-full object-cover"
                    />

                    {/* Message */}
                    <p
                      className={`px-3 py-1 rounded-2xl max-w-[60%] text-white justify-start break-words whitespace-pre-wrap ${
                        isMe ? "bg-blue-600 text-left" : "bg-gray-700 text-left"
                      }`}
                    >
                      {msg.message}
                    </p>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="send_part w-full h-[10%]  flex items-center justify-center font-sans">
              <div className="send_bar h-[90%] w-[99%] flex items-center justify-center border-1 border-[rgba(255,255,255,0.3)] rounded-[60px] bg-[rgba(255,255,255,0.06)] shadow-[0_0_15px_#33A1E0] p-2">
                <button className="add_file py-1 w-[15px] h-[15px] sm:w-[25px] sm:h-[25px] lg:w-[36px] lg:h-[35px] bg-[#33A1E0] cursor-pointer border-0 rounded-[100%] flex justify-center items-center">
                  <div className="add w-[75%] h-[70%] bg-contain bg-center bg-no-repeat bg-[url('/add.svg')]"></div>
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                    if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      
                      const cursorPos = e.currentTarget.selectionStart;
                      const value = e.currentTarget.value;
                      const newValue = value.slice(0, cursorPos) + "\n" + value.slice(cursorPos);
                      setNewMessage(newValue);

                      setTimeout(() => {
                        e.currentTarget.selectionStart = e.currentTarget.selectionEnd = cursorPos + 1;
                      }, 0);
                    }
                  }}
                  placeholder="Send message ..."
                  required
                  className="w-full h-full text-[13px] sm:text-lg lg:text-2xl flex items-center justify-center border-0 bg-transparent text-[#FFFFFF] focus:outline-none ml-1 sm:ml-1 lg:ml-3 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  className="send w-[5%] h-full bg-center bg-contain bg-no-repeat bg-[url('/send.svg')]"
                ></button>
              </div>
            </div>
            </div> 
          {showMembers && (
            <div className="members col-start-6 row-start-1 row-span-10 border-1 border-[#33A1E040] flex flex-col divide-y divide-gray-700 overflow-y-auto p-2">
              <p className="text-green-400 font-bold">in room :</p>
              {userList
                .filter((user) => usersOnline.includes(user.id))
                .map((user) => (
                  <div key={user.id} className="w-full h-11 flex items-center gap-3">
                    <img
                      src={user.pfp_url}
                      alt={user.user_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="text-white pt-2">{user.user_name}</span>
                  </div>
                ))}

              <p className="text-gray-400 font-bold mt-2">out of room :</p>
              {userList
                .filter((user) => !usersOnline.includes(user.id))
                .map((user) => (
                  <div key={user.id} className="fw-full h-9 flex items-center gap-2 opacity-50">
                    <img
                      src={user.pfp_url}
                      alt={user.user_name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <span className="text-white pt-2">{user.user_name}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </>
    );
  }
}
