// === PRODUCTION CONFIGURATION ===
const supabaseUrl = "https://ytoidmelmialrjfqyhet.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0b2lkbWVsbWlhbHJqZnF5aGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODcwNjI1NDIsImV4cCI6MjAwMjYzODU0Mn0.DEMO_KEY_REPLACE_WITH_REAL"; // Replace with your actual anon key

// === INITIALIZE SUPABASE ===
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// === GLOBAL STATE ===
let currentUser = { name: "", questions: [], answers: [], cheating: [] };
let mediaRecorder, videoChunks = [];
let currentQuestionIndex = 0;
let assessmentTimer = null;
let timeRemaining = 0;
let editors = {};

// === UI FUNCTIONS ===
function showIntro() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div style="max-width: 600px; margin: 40px auto; padding: 20px;">
      <div style="background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 30px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; font-size: 2.5em; margin-bottom: 10px;">TechAssess Pro</h1>
          <p style="color: #666; font-size: 1.1em;">Professional Assessment Platform</p>
        </div>
        
        <div style="background: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #007bff;">
            <i style="margin-right: 8px;">ℹ️</i>Assessment Instructions
          </h3>
          <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.6;">
            <li>This is a proctored assessment with webcam recording</li>
            <li>You'll have a specific time limit to complete all questions</li>
            <li>Do not switch tabs or leave the assessment window</li>
            <li>Your progress is automatically saved</li>
          </ul>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 500; margin-bottom: 8px;">Full Name *</label>
          <input type="text" id="nameInput" placeholder="Enter your full name" 
                 style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px;" required />
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 500; margin-bottom: 8px;">Email Address *</label>
          <input type="email" id="emailInput" placeholder="Enter your email address" 
                 style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px;" required />
        </div>
        
        <div style="margin-bottom: 30px;">
          <label style="display: block; font-weight: 500; margin-bottom: 8px;">Assessment Questions *</label>
          <textarea id="questionsInput" placeholder="Enter assessment questions (one per line)" rows="6"
                    style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; resize: vertical;" required></textarea>
          <small style="color: #666; font-size: 14px;">Enter each question on a new line</small>
        </div>
        
        <div style="margin-bottom: 30px;">
          <label style="display: block; font-weight: 500; margin-bottom: 8px;">Duration (minutes) *</label>
          <input type="number" id="durationInput" placeholder="30" min="5" max="180" value="30"
                 style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px;" required />
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-left: 4px solid #f39c12; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <h4 style="margin-top: 0; color: #856404;">
            <i style="margin-right: 8px;">⚠️</i>Before Starting
          </h4>
          <p style="margin: 0; color: #856404; font-size: 14px;">
            Ensure your webcam is working and you have a stable internet connection. 
            The assessment will begin recording immediately upon start.
          </p>
        </div>
        
        <button onclick="startAssessment()" 
                style="width: 100%; padding: 15px; background: #007bff; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
          🚀 Start Assessment
        </button>
      </div>
    </div>
  `;
}

async function startAssessment() {
  try {
    // Validate inputs
    const name = document.getElementById("nameInput").value.trim();
    const email = document.getElementById("emailInput").value.trim();
    const questionLines = document.getElementById("questionsInput").value.trim().split("\n").filter(q => q.trim());
    const duration = parseInt(document.getElementById("durationInput").value) || 30;

    if (!name || !email || questionLines.length === 0) {
      showNotification("Please fill in all required fields.", "error");
      return;
    }

    if (!isValidEmail(email)) {
      showNotification("Please enter a valid email address.", "error");
      return;
    }

    // Set up user data
    currentUser.name = name;
    currentUser.email = email;
    currentUser.questions = questionLines;
    currentUser.answers = Array(questionLines.length).fill("");
    currentUser.cheating = [];
    
    // Request camera permissions and setup recording
    await setupRecorder();
    
    // Setup cheating detection
    setupCheatingDetection();
    
    // Start timer
    timeRemaining = duration * 60; // Convert to seconds
    startTimer();
    
    // Render assessment interface
    renderAssessment();
    
    showNotification(`Assessment started! You have ${duration} minutes to complete.`, "success");
    
  } catch (error) {
    console.error("Failed to start assessment:", error);
    showNotification("Failed to start assessment. Please check your camera permissions.", "error");
  }
}

function renderAssessment() {
  const app = document.getElementById("app");
  
  app.innerHTML = `
    <div style="height: 100vh; display: flex; flex-direction: column; background: #f8f9fa;">
      <!-- Header -->
      <div style="background: white; border-bottom: 1px solid #dee2e6; padding: 15px 20px; display: flex; justify-content: between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div>
          <h2 style="margin: 0; color: #333; font-size: 1.4em;">${currentUser.name}</h2>
          <p style="margin: 0; color: #666; font-size: 0.9em;">Question ${currentQuestionIndex + 1} of ${currentUser.questions.length}</p>
        </div>
        <div style="display: flex; align-items: center; gap: 15px;">
          <div id="timer" style="background: #28a745; color: white; padding: 8px 15px; border-radius: 20px; font-weight: bold; font-family: monospace;">
            <i style="margin-right: 5px;">⏰</i><span id="timeDisplay">00:00</span>
          </div>
          <div style="background: #dc3545; color: white; padding: 8px 15px; border-radius: 20px; font-size: 12px;">
            <i style="margin-right: 5px;">🔴</i>Recording
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div style="flex: 1; display: flex;">
        <!-- Question Navigation -->
        <div style="width: 250px; background: white; border-right: 1px solid #dee2e6; padding: 20px; overflow-y: auto;">
          <h4 style="margin-top: 0; margin-bottom: 15px; color: #333;">Questions</h4>
          <div id="questionNav" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 8px; margin-bottom: 20px;">
            ${currentUser.questions.map((_, i) => `
              <button onclick="switchQuestion(${i})" 
                      class="question-btn ${i === currentQuestionIndex ? 'active' : ''} ${currentUser.answers[i]?.trim() ? 'answered' : ''}"
                      style="width: 40px; height: 40px; border: 2px solid #dee2e6; background: ${i === currentQuestionIndex ? '#007bff' : currentUser.answers[i]?.trim() ? '#28a745' : 'white'}; 
                             color: ${i === currentQuestionIndex || currentUser.answers[i]?.trim() ? 'white' : '#333'}; border-radius: 6px; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                ${i + 1}
              </button>
            `).join('')}
          </div>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
            <h5 style="margin-top: 0; font-size: 14px; color: #007bff;">Current Question:</h5>
            <p style="margin: 0; font-size: 13px; line-height: 1.4; color: #333;">${currentUser.questions[currentQuestionIndex]}</p>
          </div>
        </div>

        <!-- Code Editor -->
        <div style="flex: 1; display: flex; flex-direction: column; background: white;">
          <div style="padding: 15px 20px; border-bottom: 1px solid #dee2e6; background: #f8f9fa; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="background: white; padding: 6px 12px; border-radius: 4px; font-size: 13px; font-weight: 500;">Solution</span>
              <span style="color: #28a745; font-size: 13px; font-weight: 500;">● Auto-saved</span>
            </div>
            <button onclick="resetCode()" style="padding: 6px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; font-size: 13px; cursor: pointer;">
              🔄 Reset
            </button>
          </div>
          
          <div style="flex: 1; position: relative;">
            <textarea id="codeEditor" style="width: 100%; height: 100%; border: none; padding: 20px; font-family: 'Monaco', 'Consolas', monospace; font-size: 14px; line-height: 1.6; resize: none; outline: none;"
                      placeholder="// Write your solution here...">${currentUser.answers[currentQuestionIndex] || ''}</textarea>
          </div>
          
          <div style="padding: 15px 20px; border-top: 1px solid #dee2e6; background: #f8f9fa; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #666; font-size: 13px;">Language: JavaScript</span>
            <button onclick="submitAssessment()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
              📤 Submit Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Setup code editor event listener
  const editor = document.getElementById('codeEditor');
  editor.addEventListener('input', () => {
    currentUser.answers[currentQuestionIndex] = editor.value;
    updateQuestionNavigation();
  });
}

function switchQuestion(index) {
  if (index === currentQuestionIndex) return;
  
  // Save current answer
  const editor = document.getElementById('codeEditor');
  if (editor) {
    currentUser.answers[currentQuestionIndex] = editor.value;
  }
  
  currentQuestionIndex = index;
  renderAssessment();
}

function resetCode() {
  if (confirm('Are you sure you want to reset your code for this question?')) {
    currentUser.answers[currentQuestionIndex] = '';
    const editor = document.getElementById('codeEditor');
    if (editor) {
      editor.value = '';
    }
    updateQuestionNavigation();
    showNotification('Code reset for this question.', 'warning');
  }
}

function updateQuestionNavigation() {
  const nav = document.getElementById('questionNav');
  if (nav) {
    nav.innerHTML = currentUser.questions.map((_, i) => `
      <button onclick="switchQuestion(${i})" 
              class="question-btn ${i === currentQuestionIndex ? 'active' : ''} ${currentUser.answers[i]?.trim() ? 'answered' : ''}"
              style="width: 40px; height: 40px; border: 2px solid #dee2e6; background: ${i === currentQuestionIndex ? '#007bff' : currentUser.answers[i]?.trim() ? '#28a745' : 'white'}; 
                     color: ${i === currentQuestionIndex || currentUser.answers[i]?.trim() ? 'white' : '#333'}; border-radius: 6px; font-weight: bold; cursor: pointer; transition: all 0.2s;">
        ${i + 1}
      </button>
    `).join('');
  }
}

// === TIMER FUNCTIONS ===
function startTimer() {
  updateTimerDisplay();
  
  assessmentTimer = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    
    if (timeRemaining <= 0) {
      clearInterval(assessmentTimer);
      showNotification("Time's up! Submitting automatically...", "warning");
      setTimeout(submitAssessment, 2000);
    } else if (timeRemaining === 300) { // 5 minutes warning
      showNotification("⚠️ Only 5 minutes remaining!", "warning");
    } else if (timeRemaining === 60) { // 1 minute warning
      showNotification("⚠️ Only 1 minute remaining!", "error");
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const timerDisplay = document.getElementById('timeDisplay');
  const timerContainer = document.getElementById('timer');
  
  if (timerDisplay) {
    timerDisplay.textContent = display;
  }
  
  if (timerContainer) {
    if (timeRemaining < 300) { // Less than 5 minutes
      timerContainer.style.background = '#dc3545';
    } else if (timeRemaining < 600) { // Less than 10 minutes
      timerContainer.style.background = '#ffc107';
      timerContainer.style.color = '#212529';
    }
  }
}

// === WEBCAM RECORDING ===
async function setupRecorder() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 1280, height: 720 }, 
      audio: true 
    });
    
    videoChunks = [];
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        videoChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      const blob = new Blob(videoChunks, { type: 'video/webm' });
      await uploadVideo(blob);
    };
    
    mediaRecorder.start(1000); // Record in 1-second chunks
    console.log("Recording started successfully");
    
  } catch (error) {
    console.error("Failed to setup recorder:", error);
    throw new Error("Camera access required for proctored assessment");
  }
}

async function uploadVideo(blob) {
  try {
    const fileName = `assessment-${Date.now()}-${currentUser.name.replace(/\s+/g, '-')}.webm`;
    
    const { data, error } = await supabaseClient.storage
      .from('recordings')
      .upload(fileName, blob, {
        contentType: 'video/webm'
      });
    
    if (error) {
      console.error("Video upload error:", error);
      showNotification("Video upload failed, but answers were saved.", "warning");
    } else {
      console.log("Video uploaded successfully:", fileName);
      currentUser.videoFileName = fileName;
    }
  } catch (error) {
    console.error("Video upload failed:", error);
  }
}

// === CHEATING DETECTION ===
function setupCheatingDetection() {
  const logEvent = (event, details = {}) => {
    const timestamp = new Date().toISOString();
    currentUser.cheating.push({ event, timestamp, details });
    console.warn(`Cheating detected: ${event}`, details);
    showNotification(`⚠️ Security Alert: ${event.replace('_', ' ')}`, "error");
  };

  // Tab switching / window focus
  window.addEventListener('blur', () => logEvent('window_blur'));
  window.addEventListener('focus', () => logEvent('window_focus'));
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      logEvent('tab_hidden');
    } else {
      logEvent('tab_visible');
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const forbidden = [
      { key: 'F12' },
      { key: 'F5' },
      { ctrlKey: true, shiftKey: true, key: 'I' },
      { ctrlKey: true, shiftKey: true, key: 'J' },
      { ctrlKey: true, key: 'U' },
      { ctrlKey: true, key: 'R' },
      { altKey: true, key: 'Tab' }
    ];

    for (const combo
