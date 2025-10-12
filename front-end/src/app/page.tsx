"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
 
  return (
    <> 
      <div className="flex flex-col items-center min-h-screen w-full">
        <h1 className="h-[40vh] w-full flex justify-center items-center text-xl sm:text-4xl lg:text-6xl font-sans text-[#33A1E0] [text-shadow:_0_2px_4px_#33A1E0] [--tw-text-stroke:1px_#154D71] [text-stroke:var(--tw-text-stroke)]">Bienvenue</h1>
        <button
          onClick={() => router.push("/login")}
          className="btn h-[42px] w-[48%] sm:h-[50px] sm:w-[60%] bg-none shadow-[0_2px_4px_rgba(51,161,224,0.65)] rounded-[15px] bg-[#154D71] text-white font-semibold flex items-center justify-center hover:bg-[#33A1E0] hover:text-[#154D71] cursor-pointer"
        >
          Login
        </button>
        <p className="h-[10vh] w-full flex justify-center items-center text-lg sm:text-2xl lg:text-3xl font-sans text-[#33A1E0] p-2">or</p>
        <button
          onClick={() => router.push("/signup")}
          className="btn h-[42px] w-[48%] sm:h-[50px] sm:w-[60%] bg-none shadow-[0_2px_4px_rgba(51,161,224,0.65)] rounded-[15px] bg-[#154D71] text-white font-semibold flex items-center justify-center hover:bg-[#33A1E0] hover:text-[#154D71] cursor-pointer"
        >
          Signup
        </button>
      </div>
    </>
  );
}
