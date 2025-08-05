// supabase/functions/admin-create-invitation/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .single()

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const { candidateEmail, assessmentTemplate, personalMessage, expirationDate } = await req.json()

    // Validate required fields
    if (!candidateEmail || !assessmentTemplate || !expirationDate) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: candidateEmail, assessmentTemplate, expirationDate' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate secure invitation token
    const invitationToken = crypto.randomUUID().replace(/-/g, '').substring(0, 32)

    // Create invitation record
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from('invitations')
      .insert({
        assessment_id: assessmentTemplate,
        candidate_email: candidateEmail,
        invitation_token: invitationToken,
        duration: 60, // Default duration
        personal_message: personalMessage || null,
        expires_at: expirationDate,
        status: 'sent',
        created_by: user.email
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create invitation:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation: ' + insertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate assessment URL
    const origin = req.headers.get('origin') || Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'
    const invitationUrl = `${origin}/index.html?assessment=${assessmentTemplate}&token=${invitationToken}`

    return new Response(JSON.stringify({ 
      success: true, 
      invitation: invitation,
      invitationUrl: invitationUrl,
      message: `Invitation created successfully for ${candidateEmail}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in admin-create-invitation function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
