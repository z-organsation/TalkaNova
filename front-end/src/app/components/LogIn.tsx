"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "../config/supabaseClient";

export default function LogIn() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogIn = async (e: React.FormEvent) => {
    e.preventDefault();
    let email = identifier;
    let usernameFromLookup: string | null = null;

    if (!email.includes("@")) {
      const { data, error } = await supabase
        .from("profile")
        .select("email, user_name")
        .eq("user_name", identifier)
        .maybeSingle();
      if (error) {
        console.error(error);
      }
      if (!data || !data.email) {
        alert("Username not found");
        return;
      }
      email = data.email;
      usernameFromLookup = data.user_name || null;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      alert(authError.message);
      return;
    }

    const user = authData?.user;
    if (!user) {
      alert("Login failed");
      return;
    }

    // After successful login (email already confirmed), ensure profile exists
    const { data: profile, error: profileError } = await supabase
      .from("profile")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      const defaultUsername = usernameFromLookup || email.split("@")[0];
      const { error: insertError } = await supabase.from("profile").insert({
        id: user.id,
        user_name: defaultUsername,
        email: email,
        pfp_url: "/profile.svg",
      });

      if (insertError) console.error("Profile insert error:", insertError);
    }

    router.push("/chat");
  };

  const handleForgotPassword = () => {
    router.push("/forgot");
  };

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/chat`
        }
      });
      
      if (error) {
        console.error('Google login error:', error);
        alert(error.message);
      }
    } catch (error) {
      console.error('Google login exception:', error);
      alert('An error occurred during Google login');
    }
  };

  return (
    <>
      <h1 className="h-25 flex justify-center items-center text-6xl font-[ZenDots] text-[#33A1E0] [text-shadow:_0_2px_4px_#33A1E0] [--tw-text-stroke:1px_#154D71] [text-stroke:var(--tw-text-stroke)] ">
        TalkaNova
      </h1>
      <form
        onSubmit={handleLogIn}
autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleLogIn(e); // appelle directement ta fonction de login
          }
        }}
        className="box lg:h-[57%] sm:h-[50%] h-[38%] w-[85%]  shadow-[0_10px_27px_rgba(51,161,224,0.40)]  flex flex-col justify-start items-center border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.05)] border-[1px] rounded-[20px] text-[15px] lg:text-lg z-10 mx-auto  sm:mt-12 mt-29"
        style={{
          maxWidth: "520px",
          minWidth: "320px",
        }}
      >
        <div className="inputs h-[40%] w-full flex flex-col items-center justify-center">
          <div className="input_uname h-[30%] w-[85%] front-sans flex items-center justify-center border-1 border-[rgba(255,255,255,0.25)] rounded-[15px] bg-transparent shadow-[0_5px_10px_rgba(0,0,0,0.3)] mt-4">
            <input
              type="text"
              placeholder="Username or email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full h-full flex items-center justify-center front-sans border-0 bg-transparent text-[#ffffff] p-5 focus:outline-none"
            />
            <div className="user w-[12%] h-[75%] bg-center bg-contain bg-no-repeat bg-[url('/user.svg')] mr-2 sm:mr-0 lg:mr-[2px]"></div>
          </div>

          <div className="input_pass h-[30%] w-[85%] flex items-center justify-center border-1 border-[rgba(255,255,255,0.25)] rounded-[15px] bg-transparent shadow-[0_5px_10px_rgba(0,0,0,0.3)] mt-4">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-full flex items-center justify-center border-0 bg-transparent text-[#ffffff] p-5 focus:outline-none"
            />
            <div className="lock w-[12%] h-[75%] bg-center bg-contain bg-no-repeat bg-[url('/lock.svg')] mr-2 sm:mr-0"></div>
          </div>
        </div>

        <div className="remember w-[90%] h-[10%] sm:h-[18%] flex items-center font-sans justify-between text-[15px] lg:text-lg p-5">
          <span className="rem flex items-center">
            <label className="relative flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="peer w-5 h-5 appearance-none border border-[rgba(255,255,255,0.25)] rounded bg-transparent"
              />
              <span className="absolute left-0 top-0 w-5 h-5 bg-[url('/check.png')] bg-contain bg-center bg-no-repeat opacity-0 peer-checked:opacity-100 pointer-events-none"></span>
            </label>

            <span className="ml-2 text-[15px] lg:text-lg text-[#d0d0d0]">Remember me</span>
          </span>
          <button 
            type="button"
            onClick={handleForgotPassword}
            className="forgot text-[#33A1E0] text-[10px] sm:text-[15px] lg:text-lg cursor-pointer bg-transparent hover:[text-shadow:0_2px_4px_rgba(51,161,224,0.7)]"
          >
            Forgot password!
          </button>
        </div>

        <div className="login h-[40%] sm:h-[20%] lg:h-[27%] w-full flex flex-col items-center justify-center gap-3">
          <button
            type="submit"
            className="btn h-[42px] w-[48%] sm:h-[50px] sm:w-[60%] bg-none shadow-[0_2px_4px_rgba(51,161,224,0.65)] rounded-[15px] bg-[#154D71] text-white font-semibold flex items-center justify-center hover:bg-[#33A1E0] hover:text-[#154D71] cursor-pointer"
          >
            Log in
          </button>
          
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn h-[42px] w-[48%] sm:h-[50px] sm:w-[60%] bg-none shadow-[0_2px_4px_rgba(51,161,224,0.65)] rounded-[15px] bg-[#154D71] text-white font-semibold flex items-center justify-center hover:bg-[#33A1E0] hover:text-[#154D71] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20" className="mr-2">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            Sign in with Google
          </button>
        </div>

        <div className="register w-full flex items-end justify-center text-[#d0d0d0] font-sans flex-grow">
          <span className="creat p-[5px]">
            Don&apos;t have an account?
            <Link href="/signup">
              <button className="signup text-[#33A1E0] font-bold cursor-pointer bg-transparent p-[7px] hover:[text-shadow:0_2px_4px_rgba(51,161,224)]">
                Sign up!
              </button>
            </Link>
          </span>
        </div>
      </form>

      <div className="help w-full flex items-center justify-center font-sans text-[#d0d0d0] z-10 fixed bottom-0 p-4">
        <span className="contact flex items-center justify-center w-full text-center">
          If you need help,
          <Link
            href="/help"
            className="acc ml-2 hover:underline text-[#33A1E0] cursor-pointer"
          >
            contact us!
          </Link>
        </span>
      </div>
    </>
  );
}