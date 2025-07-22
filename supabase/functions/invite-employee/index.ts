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
    // This key must be set as a secret in your Supabase project (e.g., SUPABASE_SERVICE_ROLE_KEY)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Invite the user by email
    const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        name: name,
        area: area,
        role: role,
        avatar_url: avatar_url,
      },
      redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/callback`, // Or your desired redirect URL after email confirmation
    });

    if (inviteError) {
      console.error("Supabase invite error:", inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Manually create the profile entry since inviteUserByEmail doesn't trigger handle_new_user
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: invitedUser.user.id,
        user_id: invitedUser.user.id,
        name: name,
        email: email,
        area: area,
        role: role,
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