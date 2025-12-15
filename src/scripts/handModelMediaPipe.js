import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
// Use CDN with the exact version we have installed
const MODEL_URL_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";

const NUM_HANDS = 2;
const RUNNING_MODE = "VIDEO";

let handLandmarker;
let lastVideoTime = -1;

export const mediaPipe = {
  landmarks: [],
  worldLandmarks: [],
  handedness: [],
  initialize: async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(MODEL_URL_WASM);
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: RUNNING_MODE,
        numHands: NUM_HANDS,
      });
    } catch (error) {
      console.error("Failed to initialize HandLandmarker:", error);
    }
  },
  predictWebcam: async (video) => {
    try {
      if (lastVideoTime !== video.elt.currentTime && handLandmarker) {
        lastVideoTime = video.elt.currentTime;
        const results = await handLandmarker.detectForVideo(
          video.elt,
          performance.now()
        );

        if (results) {
          mediaPipe.landmarks = results.landmarks || [];
          mediaPipe.worldLandmarks = results.worldLandmarks || [];
          mediaPipe.handedness = results.handedness || [];
        }
      }

      window.requestAnimationFrame(() => mediaPipe.predictWebcam(video));
    } catch (error) {
      console.error("Failed to predict webcam:", error);
    }
  },
};

mediaPipe.initialize();
