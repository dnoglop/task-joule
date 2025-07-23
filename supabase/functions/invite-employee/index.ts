import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, area, role, avatar_url } = await req.json();

    if (!email || !name || !role) {
      return new Response(JSON.stringify({ error: 'Email, name, and role are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Invite the user by email and set app_metadata directly
    const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        name: name,
        area: area,
        avatar_url: avatar_url,
      },
      app_metadata: {
        role: role, // Set the role in app_metadata
      },
      redirectTo: `${Deno.env.get('VITE_SITE_URL')}/login`, // Use VITE_SITE_URL for redirect
    });

    if (inviteError) {
      console.error("Supabase invite error:", inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Manually create the profile entry in public.profiles
    // The 'role' column in public.profiles will still be used for direct database queries
    // but the RLS policies will rely on app_metadata.role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: invitedUser.user.id,
        user_id: invitedUser.user.id,
        name: name,
        email: email,
        area: area,
        role: role, // Keep storing role in profiles table for consistency/other uses
        avatar_url: avatar_url,
      })
      .select()
      .single();

    if (profileError) {
      console.error("Supabase profile insert error:", profileError);
      // Optionally, you might want to delete the invited user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(invitedUser.user.id);
      return new Response(JSON.stringify({ error: profileError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Employee invited and profile created successfully!', user: invitedUser.user, profile: profile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});