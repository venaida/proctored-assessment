import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Check admin status
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .single()

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Get all submissions
    const { data: submissions, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (error) {
      throw error
    }

    // Format submissions for frontend
    const formattedSubmissions = submissions.map(submission => ({
      id: submission.id,
      candidate_name: submission.candidate_name,
      candidate_email: submission.candidate_email,
      assessment_id: submission.assessment_id || 'Assessment',
      submitted_at: submission.submitted_at,
      time_taken: submission.time_taken || 0,
      score: submission.score || 0,
      security_events: Array.isArray(submission.cheating_logs) ? submission.cheating_logs.length : 0,
      answers: submission.answers,
      questions: submission.questions,
      cheating_logs: submission.cheating_logs
    }))

    return new Response(JSON.stringify({ submissions: formattedSubmissions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in admin-submissions function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }
})
