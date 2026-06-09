import { NextRequest, NextResponse } from "next/server";

// Simple base64-to-blob upload to Cloudinary unsigned preset
// Falls back to returning the data URL if no Cloudinary env set
export async function POST(req: NextRequest) {
  const body = await req.json() as { file: string; fileName: string };

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    // No Cloudinary configured — store evidence URL as-is (data URL or external)
    return NextResponse.json({ url: body.file });
  }

  try {
    const formData = new FormData();
    formData.append("file", body.file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", "beacon-evidence");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      { method: "POST", body: formData }
    );
    const data = await res.json() as { secure_url?: string; error?: { message: string } };

    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
    return NextResponse.json({ url: data.secure_url });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
