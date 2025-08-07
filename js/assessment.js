import { state } from './state.js';
import { api } from './api.js';
import { renderAssessment, showNotification, updateTimerDisplay, showSubmissionScreen } from './ui.js';
import { setupRecorder, stopRecording } from './recorder.js';
import { setupCheatingDetection } from './cheating.js';

async function fetchAndSetQuestions() {
    try {
        const data = await api.getAssessment();
        state.currentUser.questions = data.questions.map(q => q.title); // Simplified for this example
        state.assessmentDuration = data.duration;
    } catch (error) {
        showNotification("Could not load assessment questions.", "error");
        // Fallback to dummy data from questions.json if API fails
        const response = await fetch('questions.json');
        const data = await response.json();
        state.currentUser.questions = data.assessments.javascript_fundamentals.questions.map(q => q.title);
        state.assessmentDuration = data.assessments.javascript_fundamentals.duration;
    }
}

export async function startAssessment() {
  const nameInput = document.getElementById("nameInput");
  const emailInput = document.getElementById("emailInput");
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();

  if (!name || !email) {
    return showNotification("Please fill in all required fields.", "error");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showNotification("Please enter a valid email address.", "error");
  }

  try {
    nameInput.disabled = true;
    emailInput.disabled = true;
    document.getElementById("startBtn").disabled = true;
    document.getElementById("startBtn").textContent = "Initializing...";

    await fetchAndSetQuestions();
    
    state.currentUser.name = name;
    state.currentUser.email = email;
    state.currentUser.answers = Array(state.currentUser.questions.length).fill("");
    state.currentUser.cheating = [];
    
    await setupRecorder();
    setupCheatingDetection();
    
    state.timeRemaining = state.assessmentDuration * 60;
    startTimer();
    
    renderAssessment();
    showNotification(`Assessment started! You have ${state.assessmentDuration} minutes.`, "success");

  } catch (error) {
    console.error("Failed to start assessment:", error);
    showNotification(error.message || "Failed to start assessment.", "error");
    nameInput.disabled = false;
    emailInput.disabled = false;
    document.getElementById("startBtn").disabled = false;
    document.getElementById("startBtn").textContent = "🚀 Start Assessment";
  }
}

export function switchQuestion(index) {
  if (index === state.currentUser.currentQuestionIndex) return;
  state.currentUser.currentQuestionIndex = index;
  renderAssessment();
}

export function resetCode() {
  if (confirm('Are you sure you want to reset your code for this question?')) {
    state.currentUser.answers[state.currentUser.currentQuestionIndex] = '';
    renderAssessment();
    showNotification('Code reset for this question.', 'warning');
  }
}

export function startTimer() {
  updateTimerDisplay();
  state.assessmentTimer = setInterval(() => {
    state.timeRemaining--;
    updateTimerDisplay();
    if (state.timeRemaining <= 0) {
      showNotification("Time's up! Submitting automatically...", "warning");
      submitAssessment();
    } else if (state.timeRemaining === 300) {
      showNotification("⚠️ Only 5 minutes remaining!", "warning");
    } else if (state.timeRemaining === 60) {
      showNotification("⚠️ Only 1 minute remaining!", "error");
    }
  }, 1000);
}

export async function submitAssessment() {
  if (state.isSubmitting) return;
  state.isSubmitting = true;

  clearInterval(state.assessmentTimer);
  const videoBlob = stopRecording();

  showNotification("Submitting your assessment...", "info");

  try {
    await api.submitAssessment({
        candidate_name: state.currentUser.name,
        candidate_email: state.currentUser.email,
        questions: state.currentUser.questions,
        answers: state.currentUser.answers,
        cheating_logs: state.currentUser.cheating,
        videoBlob: videoBlob
    });
    showSubmissionScreen();
  } catch (error) {
    console.error("Submission failed:", error);
    showNotification("Failed to submit. Please check your connection.", "error");
    state.isSubmitting = false; // Allow retry
  }
}
