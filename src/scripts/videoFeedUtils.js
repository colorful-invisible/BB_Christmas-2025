// Version 2.0 - 23.06.2025

export function initializeCamCapture(sk, mediaPipeHandler) {
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
    (stream) => {
      if (stream) {
        console.log(stream.getTracks()[0].getSettings());
        updateFeedDimensions(sk, camFeed, false);
        mediaPipeHandler.predictWebcam(camFeed);
      } else {
        console.error("Camera access denied.");
        return null;
      }
    }
  );

  camFeed.elt.setAttribute("playsinline", "");
  camFeed.hide();

  return camFeed;
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
