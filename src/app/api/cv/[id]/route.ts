import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const sb = supabaseService();

  const { data: candidate } = await sb
    .from("candidates")
    .select("cv_path, name")
    .eq("id", id)
    .maybeSingle();

  if (!candidate?.cv_path) {
    return new NextResponse("No CV on file", { status: 404 });
  }

  const { data: signed, error } = await sb.storage
    .from("cvs")
    .createSignedUrl(candidate.cv_path, 60 * 10); // 10-min window

  if (error || !signed?.signedUrl) {
    return new NextResponse("Could not generate download link", { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
