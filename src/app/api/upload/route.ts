import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { success, error } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, "Not authenticated", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "No file provided", 400);
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "File too large (max 10MB)", 400);
    }

    // Generate unique path
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `uploads/${user.id}/${timestamp}_${safeName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("files")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new AppError(ErrorCodes.INTERNAL_ERROR, `Upload failed: ${uploadError.message}`, 500);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("files")
      .getPublicUrl(uploadData.path);

    return success({
      url: urlData.publicUrl,
      path: uploadData.path,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (err) {
    return error(err);
  }
}
