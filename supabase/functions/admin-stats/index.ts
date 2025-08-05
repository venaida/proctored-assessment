import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Stored securely in Supabase
  )

  // Verify admin authentication
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get dashboard stats
  const [submissions, invitations] = await Promise.all([
    supabaseAdmin.from('submissions').select('*', { count: 'exact' }),
    supabaseAdmin.from('invitations').select('*', { count: 'exact' }).eq('status', 'sent')
  ])

  const stats = {
    totalSubmissions: submissions.count || 0,
    activeAssessments: invitations.count || 0,
    // ... other stats
  }

  return new Response(JSON.stringify(stats), {
    headers: { 'Content-Type': 'application/json' }
  })
})
