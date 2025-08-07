import { startAssessment, switchQuestion, resetCode, submitAssessment } from './assessment.js';
import { state } from './state.js';

const app = document.getElementById("app");

export function showIntro() {
  app.innerHTML = `
    <div style="max-width: 600px; margin: 40px auto; padding: 20px;">
      <div style="background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 30px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; font-size: 2.5em; margin-bottom: 10px;">TechAssess Pro</h1>
          <p style="color: #666; font-size: 1.1em;">Professional Assessment Platform</p>
        </div>
        <div style="background: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #007bff;"><i>ℹ️</i> Assessment Instructions</h3>
          <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.6;">
            <li>This is a proctored assessment with webcam recording.</li>
            <li>You'll have a specific time limit to complete all questions.</li>
            <li>Do not switch tabs or leave the assessment window.</li>
            <li>Your progress is automatically saved.</li>
          </ul>
        </div>
        <div>
          <label style="display: block; font-weight: 500; margin-bottom: 8px;">Full Name *</label>
          <input type="text" id="nameInput" placeholder="Enter your full name" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px;" required />
        </div>
        <div style="margin-top: 20px;">
          <label style="display: block; font-weight: 500; margin-bottom: 8px;">Email Address *</label>
          <input type="email" id="emailInput" placeholder="Enter your email address" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px;" required />
        </div>
        <div style="margin-top: 20px; background: #fff3cd; border: 1px solid #ffeaa7; border-left: 4px solid #f39c12; padding: 15px; border-radius: 4px;">
          <h4 style="margin-top: 0; color: #856404;"><i>⚠️</i> Before Starting</h4>
          <p style="margin: 0; color: #856404; font-size: 14px;">Ensure your webcam is working and you have a stable internet connection.</p>
        </div>
        <button id="startBtn" style="width: 100%; margin-top: 20px; padding: 15px; background: #007bff; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer;">🚀 Start Assessment</button>
      </div>
    </div>
  `;
  document.getElementById("startBtn").onclick = startAssessment;
}

export function renderAssessment() {
  const { name, questions, answers, currentQuestionIndex } = state.currentUser;
  app.innerHTML = `
    <div style="height: 100vh; display: flex; flex-direction: column; background: #f8f9fa;">
      <header style="background: white; border-bottom: 1px solid #dee2e6; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div>
          <h2 style="margin: 0; color: #333; font-size: 1.4em;">${name}</h2>
          <p style="margin: 0; color: #666; font-size: 0.9em;">Question ${currentQuestionIndex + 1} of ${questions.length}</p>
        </div>
        <div style="display: flex; align-items: center; gap: 15px;">
          <div id="timer" style="background: #28a745; color: white; padding: 8px 15px; border-radius: 20px; font-weight: bold; font-family: monospace;"><i>⏰</i><span id="timeDisplay">00:00</span></div>
          <div style="background: #dc3545; color: white; padding: 8px 15px; border-radius: 20px; font-size: 12px;"><i>🔴</i>Recording</div>
        </div>
      </header>
      <main style="flex: 1; display: flex;">
        <nav style="width: 250px; background: white; border-right: 1px solid #dee2e6; padding: 20px; overflow-y: auto;">
          <h4 style="margin-top: 0; margin-bottom: 15px; color: #333;">Questions</h4>
          <div id="questionNav" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 8px; margin-bottom: 20px;">
            ${questions.map((_, i) => `<button data-idx="${i}" class="question-btn" style="width: 40px; height: 40px; border: 2px solid #dee2e6; background: ${i === currentQuestionIndex ? '#007bff' : answers[i]?.trim() ? '#28a745' : 'white'}; color: ${i === currentQuestionIndex || answers[i]?.trim() ? 'white' : '#333'}; border-radius: 6px; font-weight: bold; cursor: pointer;">${i + 1}</button>`).join('')}
          </div>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
            <h5 style="margin-top: 0; font-size: 14px; color: #007bff;">Current Question:</h5>
            <p style="margin: 0; font-size: 13px; line-height: 1.4; color: #333;">${questions[currentQuestionIndex]}</p>
          </div>
        </nav>
        <div style="flex: 1; display: flex; flex-direction: column; background: white;">
            <textarea id="codeEditor" style="width: 100%; height: 100%; border: none; padding: 20px; font-family: 'Monaco', 'Consolas', monospace; font-size: 14px; resize: none; outline: none;" placeholder="// Write your solution here...">${answers[currentQuestionIndex] || ''}</textarea>
        </div>
      </main>
      <footer style="padding: 15px 20px; border-top: 1px solid #dee2e6; background: #f8f9fa; display: flex; justify-content: space-between; align-items: center;">
        <div>
            <button id="resetBtn" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">🔄 Reset Code</button>
        </div>
        <button id="submitBtn" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">📤 Submit Assessment</button>
      </footer>
    </div>
  `;

  document.getElementById('codeEditor').addEventListener('input', (e) => {
    state.currentUser.answers[state.currentUser.currentQuestionIndex] = e.target.value;
    updateQuestionNavigation();
  });

  document.getElementById("questionNav").addEventListener('click', (e) => {
    if (e.target.classList.contains('question-btn')) {
        switchQuestion(parseInt(e.target.dataset.idx));
    }
  });

  document.getElementById("resetBtn").onclick = resetCode;
  document.getElementById("submitBtn").onclick = submitAssessment;
}

export function updateQuestionNavigation() {
  const nav = document.getElementById('questionNav');
  if (nav) {
    nav.querySelectorAll('button').forEach((button, i) => {
       const isActive = i === state.currentUser.currentQuestionIndex;
       const isAnswered = state.currentUser.answers[i]?.trim();
       button.style.background = isActive ? '#007bff' : isAnswered ? '#28a745' : 'white';
       button.style.color = isActive || isAnswered ? 'white' : '#333';
    });
  }
}

export function updateTimerDisplay() {
  const minutes = Math.floor(state.timeRemaining / 60);
  const seconds = state.timeRemaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  const timerDisplay = document.getElementById('timeDisplay');
  if(timerDisplay) timerDisplay.textContent = display;

  const timerContainer = document.getElementById('timer');
  if (timerContainer) {
    if (state.timeRemaining < 60) timerContainer.style.background = '#dc3545';
    else if (state.timeRemaining < 300) timerContainer.style.background = '#ffc107';
  }
}

export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 15px; border-radius: 8px;
        background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : '#cce5ff'};
        color: ${type === 'error' ? '#721c24' : type === 'success' ? '#155724' : '#004085'};
        border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'success' ? '#c3e6cb' : '#b8daff'};
        z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

export function showSubmissionScreen() {
    app.innerHTML = `
      <div style="text-align: center; padding: 50px; max-width: 600px; margin: 40px auto;">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #28a745;">Assessment Submitted!</h1>
            <p style="color: #666; font-size: 1.1em;">Your assessment has been successfully submitted. Thank you.</p>
        </div>
      </div>
    `;
}
