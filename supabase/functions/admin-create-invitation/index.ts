import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // Verify admin authentication
  const authHeader = req.headers.get('Authorization')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(
    authHeader?.replace('Bearer ', '') ?? ''
  )
  
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { candidateEmail, assessmentTemplate, personalMessage, expirationDate } = await req.json()

  // Create invitation with admin privileges
  const invitationToken = crypto.randomUUID().replace(/-/g, '').substring(0, 32)
  
  const { data, error: insertError } = await supabaseAdmin
    .from('invitations')
    .insert({
      assessment_id: assessmentTemplate,
      candidate_email: candidateEmail,
      invitation_token: invitationToken,
      personal_message: personalMessage,
      expires_at: expirationDate,
      status: 'sent'
    })
    .select()
    .single()

  if (insertError) {
    return new Response('Failed to create invitation', { status: 500 })
  }

  return new Response(JSON.stringify({ 
    success: true, 
    invitationUrl: `${req.headers.get('origin')}/index.html?assessment=${assessmentTemplate}&token=${invitationToken}`
  }))
})
