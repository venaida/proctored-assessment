import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Note: Use the Service Role Key here, NOT the anon key.
    // This is secure because this code runs on Supabase's servers, not the client.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const submissionData = await req.json()

    const { error } = await supabaseAdmin.from('submissions').insert({
        candidate_name: submissionData.candidate_name,
        candidate_email: submissionData.candidate_email,
        questions: submissionData.questions,
        answers: submissionData.answers,
        cheating_logs: submissionData.cheating_logs,
        video_url: submissionData.videoFileName, // The column is 'video_url' in your schema
        submitted_at: new Date().toISOString()
    });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, message: "Submission saved." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
