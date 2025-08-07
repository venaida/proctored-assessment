import { state } from './state.js';

async function invoke(functionName, body) {
    const { data, error } = await state.supabase.functions.invoke(functionName, {
        body: JSON.stringify(body),
    });

    if (error) {
        console.error(`Error invoking ${functionName}:`, error);
        throw new Error(error.message);
    }
    return data;
}

export const api = {
    getAssessment: () => {
        // In a real app, you might pass a specific assessment ID
        return invoke('get-assessment', {});
    },
    submitAssessment: async (payload) => {
        // The video upload is a bit tricky without a backend to generate signed URLs.
        // For now, we will upload directly and include the filename in the submission.
        // THIS IS NOT IDEAL but works without a complex backend setup.
        const { videoBlob, ...submissionData } = payload;
        let videoFileName = null;

        if (videoBlob && videoBlob.size > 0) {
            const fileName = `assessment-${Date.now()}-${state.currentUser.name.replace(/\s+/g, '-')}.webm`;
            const { data, error } = await state.supabase.storage
                .from('recordings')
                .upload(fileName, videoBlob, { contentType: 'video/webm' });

            if (error) {
                console.error("Video upload error:", error);
                // We still proceed with submission even if video fails
            } else {
                videoFileName = data.path;
            }
        }

        submissionData.videoFileName = videoFileName;
        return invoke('submit-assessment', submissionData);
    },
};
