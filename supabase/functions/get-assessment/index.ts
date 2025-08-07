import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

// For this example, we return a hardcoded assessment.
// In a real app, you would fetch this from your 'assessments' table.
const dummyAssessment = {
  id: "javascript_fundamentals",
  title: "JavaScript Fundamentals Assessment",
  description: "Test your core JavaScript programming skills",
  duration: 30, // in minutes
  questions: [
    { id: 1, title: "Array Sum of Evens" },
    { id: 2, title: "String Word Reversal" },
    { id: 3, title: "Palindrome Finder" },
  ]
};

serve(async (_req) => {
  return new Response(JSON.stringify(dummyAssessment), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
})
