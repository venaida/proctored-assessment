// === CONFIG ===
const supabaseUrl = "https://ytoidmelmialrjfqyhet.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

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

  setupRecorder();
  beginTimer(duration);
  renderAssessment();
}

function renderAssessment() {
  let html = `<h3>Assessment - Good Luck!</h3>`;

  currentUser.questions.forEach((q, i) => {
    html += `
      <div class="question-block">
        <p><strong>Question ${i + 1}:</strong> ${q}</p>
        <textarea id="answer-${i}"></textarea>
      </div>
    `;
  });

  html += `<button onclick="submitAssessment()">Submit</button>`;
  app.innerHTML = html;

  currentUser.questions.forEach((_, i) => {
    const textarea = document.getElementById(`answer-${i}`);
    textarea.addEventListener("input", e => {
      currentUser.answers[i] = e.target.value;
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
  });
});

// === Webcam ===
async function setupRecorder() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => videoChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(videoChunks, { type: "video/webm" });
      const fileName = `video-${Date.now()}.webm`;
      const { data, error } = await supabase.storage.from("recordings").upload(fileName, blob, {
        contentType: "video/webm"
      });
      if (!error) currentUser.video = fileName;
    };
    mediaRecorder.start();
  } catch (err) {
    alert("Webcam access denied or unavailable.");
  }
}

// === Submit ===
async function submitAssessment() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }

  const { error } = await supabase.from("submissions").insert({
    name: currentUser.name,
    cheating_logs: currentUser.cheating,
    questions: currentUser.questions,
    responses: currentUser.answers,
    video: currentUser.video || null
  });

  app.innerHTML = `<h2>Submitted successfully. Thank you!</h2>`;
}
