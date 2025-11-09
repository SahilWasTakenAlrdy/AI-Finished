
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove the "data:mime/type;base64," prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

export const getVideoFirstFrame = (videoFile: File, seekTo = 0.1): Promise<{ blob: Blob, dataUrl: string }> => {
    return new Promise((resolve, reject) => {
        const videoPlayer = document.createElement('video');
        videoPlayer.setAttribute('src', URL.createObjectURL(videoFile));
        videoPlayer.load();
        videoPlayer.addEventListener('error', (ex) => {
            reject(`Error loading video file: ${ex}`);
        });
        videoPlayer.addEventListener('loadedmetadata', () => {
            // seek to a specific time
            videoPlayer.currentTime = seekTo;
            videoPlayer.addEventListener('seeked', () => {
                const canvas = document.createElement('canvas');
                canvas.width = videoPlayer.videoWidth;
                canvas.height = videoPlayer.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject('Could not get canvas context');
                }
                ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                canvas.toBlob((blob) => {
                    if (!blob) {
                        return reject('Could not get blob from canvas');
                    }
                    resolve({ blob, dataUrl });
                }, 'image/jpeg');
            });
        });
    });
};
