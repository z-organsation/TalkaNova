"use client";
import Link from "next/link";
import client from "../config/supabsaeClient";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SignUp() {
  const [username, setUsername] = useState("");
  const regex = /^(?!.*[._]{2})(?![._])[a-zA-Z0-9._]{3,20}(?<![._])$/;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [imagePreview, ImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const router = useRouter();

  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const ImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
    if (!validTypes.includes(file.type)) {
      alert("Format non supporté. Choisir jpg, jpeg, png ou gif.");
      return;
    }

    setImageFile(file);
    ImagePreview(URL.createObjectURL(file));
  };
  
  const removeImage = () => {
    setImageFile(null);
    ImagePreview(null);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return alert("Passwords don't match");
    if (password.length < 8) return alert("Password must be 8+ chars");
    if (!regex.test(username)) return alert("Username is not valid");

    // 1. Créer le compte
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return alert(error.message);
    if (!data.user) return;

    // 2. Upload de l’image si présente
    let imageUrl: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `avatars/${data.user.id}.${ext}`;

      const { error: uploadError } = await client.storage
        .from("avatars")
        .upload(path, imageFile, { cacheControl: "3600", upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
      } else {
        const { data: publicData } = client.storage
          .from("avatars")
          .getPublicUrl(path);
        imageUrl = publicData.publicUrl;
      }
    }

  if (!imageUrl) imageUrl = '/profile.svg';

    // 3. Insérer le profil
    const { error: insertError } = await client.from("profile").insert({
      id: data.user.id,
      user_name: username,
      email: email,
      pfp_url: imageUrl,
    });

    if (insertError) {
      console.error(insertError);
    } else {
      alert("Check your email for confirmation!");
      router.push("/chat");
    }
  };

  return (
    <>
      <h1 className="h-25 flex justify-center items-center text-4xl sm:text-5xl font-[ZenDots] text-[#33A1E0] [text-shadow:_0_2px_4px_#33A1E0] [--tw-text-stroke:1px_#154D71] [text-stroke:var(--tw-text-stroke)]">
        TalkaNova
      </h1>
      {/* Form container */}
      <form
        onSubmit={handleSignUp}
        className="box h-[53%] sm:h-[60%] lg:h-[70%] w-[80%] mx-auto flex flex-col items-center justify-center bg-[rgba(255,255,255,0.05)] backdrop-transparent border-1 border-[rgba(255,255,255,0.25)] shadow-[0_10px_27px_rgba(51,161,224,0.40)] text-[14px] lg:text-lg rounded-[20px] z-10 mt-15 sm:mt-3"
        style={{ maxWidth: "520px" }}
      >
        {/* Username field */}
        <div className="flex items-center justify-center  w-[80%] h-[9%] mt-4 border-1 border-[rgba(255,255,255,0.25)] rounded-[15px] bg-transparent font-sans shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
          <input
            type="text"
            placeholder="Username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full h-full border-0 bg-transparent text-[#ffffff] p-5 focus:outline-none"
          />
          <div className="user w-[12%] h-[75%] bg-center bg-contain bg-no-repeat bg-[url('/user.svg')] mr-2 sm:mr-0"></div>
        </div>

        {/* Email field */}
        <div className="flex items-center justify-center w-[80%] h-[9%] mt-4 border-1 border-[rgba(255,255,255,0.25)] rounded-[15px] bg-transparent font-sans shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
          <input
            type="text"
            placeholder="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-full bg-transparent border-0 text-[#ffffff] p-5 focus:outline-none"
          />
          <div className="mail w-[12%] h-[75%] bg-center bg-contain bg-no-repeat bg-[url('/mail.svg')] mr-2 sm:mr-0"></div>
        </div>

        {/* Password field */}
        <div className="flex items-center justify-center w-[80%] h-[9%] mt-4 border-1 border-[rgba(255,255,255,0.25)] rounded-[15px] bg-transparent font-sans shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-full bg-transparent border-0 text-[#ffffff] p-5 focus:outline-none"
          />
          <div className="lock w-[12%] h-[75%] bg-center bg-contain bg-no-repeat bg-[url('/lock.svg')] mr-2 sm:mr-0"></div>
        </div>

        {/* Confirm Password field */}
        <div className="flex items-center justify-center w-[80%] h-[9%] mt-4 border-1 border-[rgba(255,255,255,0.25)] rounded-[15px] bg-transparent font-sans shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
          <input
            type="password"
            placeholder="Confirm Password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-full bg-transparent border-0 text-[#ffffff] p-5 focus:outline-none"
          />
          <div className="lock w-[12%] h-[75%] bg-center bg-contain bg-no-repeat bg-[url('/lock.svg')] mr-2 sm:mr-0"></div>
        </div>

        {/* Profile image upload */}
        <div className="relative w-[80%] h-[35%] cursor-pointer border-2 border-dashed border-[rgba(255,255,255,0.25)] text-[#d0d0d0] rounded-[15px]  shadow-[0_5px_10px_rgba(0,0,0,0.3)] p-2 mt-4 ">
          {imagePreview ? (
            <>
              <Image
                src={imagePreview}
                alt="Preview"
                fill
                className="object-cover bg-contain bg-no-repeat bg-center rounded-[15px]"
              />
              <button
                onClick={removeImage}
                className="absolute top-3 right-2 text-xl text-[#041d2d] hover:text-[#33A1E0] px-2 py-1 z-10"
              >
                X
              </button>
            </>
          ) : (
            <div className="add w-full h-full bg-center bg-contain bg-no-repeat bg-[url('/add.svg')]"></div>
          )}
          {/* Input invisible */}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={ImageChange}
          />
        </div>

        {/* Sign up button */}
        <div className="flex items-center justify-center w-full h-[42%] sm:h-[18%] mt-4 ">
          <button
            type="submit"
            className="bt_sign h-[38px] w-[40%] sm:h-[50px] sm:w-[60%] bg-none rounded-[15] bg-[#154D71] shadow-[0_2px_4px_rgba(51,161,224,0.65)] text-white font-semibold flex items-center justify-center  hover:bg-[#33A1E0] hover:text-[#154D71] hover:cursor-pointer transition duration-300"
          >
            Sign up
          </button>
        </div>

        {/* Link to Log in */}
        <div className="login w-full flex items-end justify-center text-[#d0d0d0] font-sans flex-grow">
          <span className="have p-2">
            You have an account?
            <Link href="/login">
              <button className="log_in text-[#33A1E0] font-bold cursor-pointer bg-transparent p-[7px] hover:[text-shadow:0_2px_4px_rgba(51,161,224)]">
                Log in!
              </button>
            </Link>
          </span>
        </div>
      </form>

      {/* Help/contact section */}
      <div className="w-full flex items-center justify-center fixed bottom-0 p-4 font-sans text-[#d0d0d0] z-10">
        <span className="flex items-center justify-center w-full text-center">
          If you have a problem,
          <Link href="/help" className="ml-2 text-[#33A1E0] hover:underline">
            contact us!
          </Link>
        </span>
      </div>
    </>
  );
}
