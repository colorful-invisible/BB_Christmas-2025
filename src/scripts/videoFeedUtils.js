let cameraInitialized = false;

export function initializeCamCapture(sk, mediaPipeHandler) {
  let camFeed;
  cameraInitialized = false;

  // Timeout to detect if camera never initializes
  const timeout = setTimeout(() => {
    if (!cameraInitialized) {
      console.error("Camera initialization timeout - permission likely denied");
      showCameraError();
    }
  }, 3000);

  try {
    camFeed = sk.createCapture(
      {
        flipped: true,
        audio: false,
        video: {
          width: { ideal: 1280, min: 1024 },
          height: { ideal: 720, min: 576 },
          frameRate: { ideal: 30, min: 24 },
        },
      },
      (stream) => {
        if (stream) {
          clearTimeout(timeout);
          cameraInitialized = true;
          console.log(stream.getTracks()[0].getSettings());
          updateFeedDimensions(sk, camFeed, false);
          mediaPipeHandler.predictWebcam(camFeed);
        } else {
          clearTimeout(timeout);
          showCameraError();
        }
      },
      (error) => {
        clearTimeout(timeout);
        console.error("Camera access error:", error);
        showCameraError();
      }
    );

    camFeed.elt.setAttribute("playsinline", "");
    camFeed.hide();
  } catch (error) {
    clearTimeout(timeout);
    console.error("Camera initialization error:", error);
    showCameraError();
  }

  return camFeed;
}

function showCameraError() {
  // Remove any existing error messages
  const existing = document.querySelector(".camera-error-message");
  if (existing) return;

  const errorDiv = document.createElement("div");
  errorDiv.className = "camera-error-message";

  const errorP = document.createElement("p");
  errorP.textContent =
    "Um das Tool zu nutzen, lade die Seite neu und erlaube den Kamera Zugriff";
  errorDiv.appendChild(errorP);

  const main = document.querySelector("main");
  if (main) {
    main.appendChild(errorDiv);
  } else {
    document.body.appendChild(errorDiv);
  }
}

export function updateFeedDimensions(sk, feed, fitToHeight = false) {
  if (!feed) return;

  const canvasRatio = sk.width / sk.height;
  const videoRatio = feed.width / feed.height;

  let x = 0;
  let y = 0;
  let w = sk.width;
  let h = sk.height;

  if (canvasRatio > videoRatio) {
    if (fitToHeight) {
      // Fit to canvas height, center horizontally, Portrait mode
      w = sk.height * videoRatio;
      x = (sk.width - w) / 2;
    } else {
      // Fit to canvas width, center vertically, Landscape mode
      h = sk.width / videoRatio;
      y = (sk.height - h) / 2;
    }
  } else {
    // Video is wider - fit to height, center horizontally
    w = sk.height * videoRatio;
    x = (sk.width - w) / 2;
  }

  feed.scaledWidth = w;
  feed.scaledHeight = h;
  feed.x = x;
  feed.y = y;
}
export function stopCamCapture(feed) {
  if (feed && feed.elt.srcObject) {
    const stream = feed.elt.srcObject;
    const tracks = stream.getTracks();

    tracks.forEach((track) => {
      track.stop();
    });

    feed.elt.srcObject = null;
  }
}
