import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { file?: string; fileName?: string };
  try {
    body = await req.json() as { file?: string; fileName?: string };
  } catch {
    return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  }

  if (
    typeof body.file !== "string"
    || typeof body.fileName !== "string"
    || body.fileName.length > 200
  ) {
    return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  }

  const dataUrlMatch = body.file.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/
  );
  if (!dataUrlMatch) {
    return NextResponse.json(
      { error: "Only base64-encoded JPG, PNG, and WebP images are supported" },
      { status: 400 }
    );
  }
  const submittedBytes = Buffer.from(dataUrlMatch[2], "base64");
  if (!submittedBytes.length || submittedBytes.length > 750_000) {
    return NextResponse.json(
      { error: "Evidence must be between 1 byte and 750KB" },
      { status: 400 }
    );
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    return NextResponse.json(
      {
        error: (
          "Public evidence storage is not configured. Validators cannot "
          + "authenticate browser-only files."
        ),
      },
      { status: 503 }
    );
  }

  try {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([submittedBytes], { type: dataUrlMatch[1] }),
      body.fileName
    );
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", "beacon-evidence");

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    let res: Response | undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt < 3 && !res; attempt += 1) {
      try {
        res = await fetch(cloudinaryUrl, {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(20_000),
        });
      } catch (err) {
        lastError = err;
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
        }
      }
    }
    if (!res) {
      console.error("Cloudinary upload request failed", lastError);
      return NextResponse.json(
        { error: "Cloudinary could not be reached. Please retry the upload." },
        { status: 502 }
      );
    }

    const data = await res.json() as {
      secure_url?: string;
      bytes?: number;
      format?: string;
      resource_type?: string;
      error?: { message: string };
    };

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message },
        { status: res.ok ? 502 : res.status }
      );
    }
    if (!res.ok) {
      return NextResponse.json({ error: "Cloudinary rejected the upload" }, { status: 502 });
    }
    if (!data.secure_url) {
      return NextResponse.json({ error: "Upload returned no public URL" }, { status: 502 });
    }
    const expectedFormat = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[dataUrlMatch[1]];
    if (
      data.resource_type !== "image"
      || data.format !== expectedFormat
      || data.bytes !== submittedBytes.length
      || !data.secure_url.startsWith("https://res.cloudinary.com/")
    ) {
      return NextResponse.json(
        { error: "Uploaded evidence is not a supported public image" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      url: data.secure_url,
      // The URL is the immutable, untransformed original upload. The contract
      // re-fetches it and independently checks this commitment before VERIFY.
      sha256: createHash("sha256").update(submittedBytes).digest("hex"),
    });
  } catch (err) {
    console.error("Evidence upload failed", err);
    return NextResponse.json(
      { error: "Evidence upload failed unexpectedly. Please retry." },
      { status: 500 }
    );
  }
}
