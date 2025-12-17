import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const MODEL_URL_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";

const NUM_FACES = 1;
const RUNNING_MODE = "VIDEO";

let faceLandmarker;
let lastVideoTime = -1;

export const faceMediaPipe = {
  landmarks: [],
  initialize: async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(MODEL_URL_WASM);
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: RUNNING_MODE,
        numFaces: NUM_FACES,
      });
    } catch (error) {
      console.error("Failed to initialize FaceLandmarker:", error);
    }
  },
  predictWebcam: async (video) => {
    try {
      if (
        faceLandmarker &&
        video.elt.readyState >= 2 &&
        video.elt.videoWidth > 0 &&
        video.elt.videoHeight > 0
      ) {
        if (lastVideoTime !== video.elt.currentTime) {
          lastVideoTime = video.elt.currentTime;
          const results = await faceLandmarker.detectForVideo(
            video.elt,
            performance.now()
          );

          if (results) {
            faceMediaPipe.landmarks = results.faceLandmarks || [];
          }
        }
      }
    } catch (error) {
      console.warn("Face prediction error (recovering):", error.message);
    }

    window.requestAnimationFrame(() => faceMediaPipe.predictWebcam(video));
  },
  getMouthOpen: () => {
    if (faceMediaPipe.landmarks.length === 0) return 0;

    const face = faceMediaPipe.landmarks[0];
    const upperLip = face[13];
    const lowerLip = face[14];

    if (!upperLip || !lowerLip) return 0;

    return Math.abs(lowerLip.y - upperLip.y);
  },
  close: () => {
    if (faceLandmarker) {
      faceLandmarker.close();
    }
  },
};
