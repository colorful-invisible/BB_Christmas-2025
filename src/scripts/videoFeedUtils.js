export async function initializeCamCapture(sk, mediaPipeHandler) {
  try {
    // Request permission explicitly - this catches denial immediately
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280, min: 1024 },
        height: { ideal: 720, min: 576 },
        frameRate: { ideal: 30, min: 24 },
      },
      audio: false,
    });

    // Permission granted - stop test stream, let p5 create its own
    stream.getTracks().forEach((track) => track.stop());

    // Now create p5 capture (will succeed since permission was granted)
    const camFeed = sk.createCapture(
      {
        flipped: true,
        audio: false,
        video: {
          width: { ideal: 1280, min: 1024 },
          height: { ideal: 720, min: 576 },
          frameRate: { ideal: 30, min: 24 },
        },
      },
      (capturedStream) => {
        if (capturedStream) {
          console.log(capturedStream.getTracks()[0].getSettings());
          updateFeedDimensions(sk, camFeed, false);
          mediaPipeHandler.predictWebcam(camFeed);
        }
      }
    );

    camFeed.elt.setAttribute("playsinline", "");
    camFeed.hide();

    return camFeed;
  } catch (error) {
    // Catches: NotAllowedError (denied), NotFoundError (no camera), etc.
    console.error("Camera error:", error.name, error.message);
    showCameraError();
    return null;
  }
}

function showCameraError() {
  const existing = document.querySelector(".camera-error-message");
  if (existing) return;

  const errorDiv = document.createElement("div");
  errorDiv.className = "camera-error-message";

  const errorP = document.createElement("p");
  errorP.textContent =
    "Um das Tool zu nutzen, lade die Seite neu und erlaube den Kamera Zugriff";
  errorDiv.appendChild(errorP);

  const main = document.querySelector("main");
  (main || document.body).appendChild(errorDiv);
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
      w = sk.height * videoRatio;
      x = (sk.width - w) / 2;
    } else {
      h = sk.width / videoRatio;
      y = (sk.height - h) / 2;
    }
  } else {
    w = sk.height * videoRatio;
    x = (sk.width - w) / 2;
  }

  feed.scaledWidth = w;
  feed.scaledHeight = h;
  feed.x = x;
  feed.y = y;
}

export function stopCamCapture(feed) {
  if (feed?.elt?.srcObject) {
    feed.elt.srcObject.getTracks().forEach((track) => track.stop());
    feed.elt.srcObject = null;
  }
}
