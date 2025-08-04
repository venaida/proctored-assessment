// === CONFIG ===
const supabaseUrl = "https://ytoidmelmialrjfqyhet.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0b2lkbWVsbWlhbHJqZnF5aGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODcwNjI1NDIsImV4cCI6MjAwMjYzODU0Mn0.DEMO_KEY_REPLACE_WITH_REAL"; // You need to complete this

// Fix: Proper Supabase client creation
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// === UI ===
const app = document.getElementById("app");
let currentUser = { name: "", questions: [], answers: [], cheating: [] };
let mediaRecorder, videoChunks = [];

function showIntro() {
  app.innerHTML = `
    <h2>Welcome to the Proctored Assessment</h2>
    <input placeholder="Full Name" id="nameInput"/><br/>
    <textarea placeholder="Enter questions, one per line" id="questionsInput"></textarea><br/>
    <input type="number" placeholder="Duration (mins)" id="durationInput"/><br/>
    <button onclick="startAssessment()">Start</button>
  `;
}

async function startAssessment() {
  currentUser.name = document.getElementById("nameInput").value.trim();
  const questionLines = document.getElementById("questionsInput").value.trim().split("\n");
  const duration = parseInt(document.getElementById("durationInput").value) || 10;

  if (!currentUser.name || questionLines.length === 0) {
    alert("Please fill in all fields.");
    return;
  }

  currentUser.questions = questionLines;
  currentUser.answers = Array(questionLines.length).fill("");
  currentUser.cheating = [];

  await setupRecorder();
  beginTimer(duration);
  renderAssessment();
}

function renderAssessment() {
  let html = `<h3>Assessment - Good Luck!</h3>`;

  currentUser.questions.forEach((q, i) => {
    html += `
      <div class="question-block">
        <p><strong>Question ${i + 1}:</strong> ${q}</p>
        <textarea id="answer-${i}" placeholder="Write your code here..."></textarea>
      </div>
    `;
  });

  html += `<button onclick="submitAssessment()">Submit</button>`;
  app.innerHTML = html;

  // Fix: Properly initialize CodeMirror editors
  currentUser.questions.forEach((_, i) => {
    const textarea = document.getElementById(`answer-${i}`);
    
    // Create CodeMirror editor
    const editor = CodeMirror.fromTextArea(textarea, {
      lineNumbers: true,
      mode: "javascript",
      theme: "default",
      indentUnit: 2,
      tabSize: 2,
      lineWrapping: true
    });

    // Update answers when editor content changes
    editor.on("change", () => {
      currentUser.answers[i] = editor.getValue();
    });
  });
}

function beginTimer(durationMinutes) {
  setTimeout(() => {
    alert("Time's up! Submitting now.");
    submitAssessment();
  }, durationMinutes * 60000);
}

// === Cheating Detection ===
["blur", "mouseleave", "visibilitychange"].forEach(event => {
  window.addEventListener(event, () => {
    const time = new Date().toISOString();
    currentUser.cheating.push({ event, time });
    console.log("Cheating detected:", event, time);
  });
});

// === Webcam ===
async function setupRecorder() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoChunks = []; // Reset video chunks
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) {
        videoChunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      const blob = new Blob(videoChunks, { type: "video/webm" });
      const fileName = `video-${Date.now()}.webm`;
      
      try {
        const { data, error } = await supabaseClient.storage
          .from("recordings")
          .upload(fileName, blob, {
            contentType: "video/webm"
          });
        
        if (!error) {
          currentUser.video = fileName;
          console.log("Video uploaded:", fileName);
        } else {
          console.error("Video upload error:", error);
        }
      } catch (err) {
        console.error("Video upload failed:", err);
      }
    };
    
    mediaRecorder.start();
    console.log("Recording started");
  } catch (err) {
    console.error("Webcam setup failed:", err);
    alert("Webcam access denied or unavailable.");
  }
}

// === Submit ===
async function submitAssessment() {
  if (!confirm("Are you sure you want to submit your assessment?")) {
    return;
  }

  // Stop recording
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }

  const submissionData = {
    name: currentUser.name,
    cheating_logs: currentUser.cheating,
    questions: currentUser.questions,
    responses: currentUser.answers,
    video: currentUser.video || null,
    submitted_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabaseClient
      .from("submissions")
      .insert(submissionData);

    if (error) {
      console.error("Submission error:", error);
      alert("Submission failed. Please try again.");
    } else {
      app.innerHTML = `<h2>Submitted successfully. Thank you!</h2>`;
      console.log("Submission successful:", data);
    }
  } catch (err) {
    console.error("Submission failed:", err);
    alert("Submission failed. Please check your connection.");
  }
}

// === Initialize App ===
// Fix: Call showIntro when page loads
document.addEventListener("DOMContentLoaded", () => {
  showIntro();
});
