"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/chat");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full">
      <h1 className="text-xl sm:text-4xl lg:text-6xl font-sans text-[#33A1E0] [text-shadow:_0_2px_4px_#33A1E0]">
        Redirection vers le chat...
      </h1>
    </div>
  );
}
