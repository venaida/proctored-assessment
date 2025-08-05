// supabase/functions/admin-stats/index.ts
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

    // Get dashboard statistics
    const [
      submissionsResult,
      invitationsResult,
      recentSubmissions
    ] = await Promise.all([
      supabaseAdmin.from('submissions').select('*', { count: 'exact' }),
      supabaseAdmin.from('invitations').select('*', { count: 'exact' }).eq('status', 'sent'),
      supabaseAdmin.from('submissions')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(5)
    ])

    // Calculate security incidents
    const securityIncidents = submissionsResult.data?.reduce((total, sub) => {
      const logs = sub.cheating_logs || []
      return total + (Array.isArray(logs) ? logs.length : 0)
    }, 0) || 0

    // Calculate average score
    const averageScore = submissionsResult.data?.length > 0 
      ? Math.round(submissionsResult.data.reduce((sum, sub) => sum + (sub.score || 0), 0) / submissionsResult.data.length)
      : 0

    // Format recent submissions
    const formattedRecentSubmissions = recentSubmissions.data?.map(submission => ({
      id: submission.id,
      candidate_name: submission.candidate_name,
      assessment_id: submission.assessment_id || 'Assessment',
      submitted_at: submission.submitted_at,
      time_taken: submission.time_taken || 0,
      security_events: Array.isArray(submission.cheating_logs) ? submission.cheating_logs.length : 0
    })) || []

    const stats = {
      totalSubmissions: submissionsResult.count || 0,
      activeAssessments: invitationsResult.count || 0,
      securityIncidents: securityIncidents,
      averageScore: averageScore,
      recentSubmissions: formattedRecentSubmissions
    }

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in admin-stats function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
