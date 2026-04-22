import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, password, full_name, role } = await request.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Create user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) throw authError;

    // 2. Update role in profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role, full_name })
      .eq('id', authData.user.id);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
