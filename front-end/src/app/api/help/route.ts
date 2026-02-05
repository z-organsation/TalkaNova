import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json();

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Log the message (in production, you'd send an email here)
    console.log("=== TALKANOVA HELP REQUEST ===");
    console.log("Name:", name);
    console.log("Email:", email);
    console.log("Message:", message);
    console.log("============================");

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json(
      { success: true, message: "Message received successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Help API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}