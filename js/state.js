export const state = {
    supabase: null,
    currentUser: {
        name: "",
        email: "",
        questions: [],
        answers: [],
        cheating: [],
        videoFileName: null
    },
    mediaRecorder: null,
    videoChunks: [],
    currentQuestionIndex: 0,
    assessmentTimer: null,
    timeRemaining: 0,
    isSubmitting: false,
};
