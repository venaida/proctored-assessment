import { state } from './state.js';
import { showNotification } from './ui.js';

export async function setupRecorder() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
    state.videoChunks = [];
    state.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
    state.mediaRecorder.ondataavailable = e => e.data.size > 0 && state.videoChunks.push(e.data);
    state.mediaRecorder.start(1000); // Record in 1s chunks
    console.log("Recording started.");
  } catch (error) {
    console.error("Recorder setup failed:", error);
    throw new Error("Camera access is required for this assessment.");
  }
}

export function stopRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
        state.mediaRecorder.stop();
        return new Blob(state.videoChunks, { type: 'video/webm' });
    }
    return null;
}
