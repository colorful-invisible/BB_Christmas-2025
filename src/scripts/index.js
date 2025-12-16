import p5 from "p5";
import { mediaPipe } from "./handModelMediaPipe.js";
import { faceMediaPipe } from "./faceModelMediaPipe.js";
import { initializeCamCapture, updateFeedDimensions } from "./videoFeedUtils";
import { getMappedLandmarks } from "./landmarksHandler";
import { createGridDeform } from "./orthogonalGridDeform";
import img01 from "url:../assets/images/grid_01.png";

const MARGIN = 24;
const GAP = 24;
const MARGIN_MOBILE = 8;
const GAP_MOBILE = 8;
const THUMB_FRACTION = 1 / 5;
const MOUTH_OPEN_THRESHOLD = 0.05;

new p5((sk) => {
  let camFeed;
  let gridDeform;
  let snapshotPending = false;
  let mouthWasClosed = true;
  const landmarksIndex = [8, 4];

  // DOM elements
  const intro = document.getElementById("intro");
  const btnStart = document.getElementById("btn-start");
  const overlay = document.getElementById("overlay");
  const snapshotImg = document.getElementById("snapshot-img");
  const btnDownload = document.getElementById("btn-download");
  const btnShare = document.getElementById("btn-share");
  const btnAgain = document.getElementById("btn-again");

  // Button handlers
  btnStart.addEventListener("click", () => intro.classList.add("hidden"));
  btnDownload.addEventListener("click", downloadSnapshot);
  btnShare.addEventListener("click", shareSnapshot);
  btnAgain.addEventListener("click", closeOverlay);

  function showOverlay() {
    const dataURL = sk.canvas.toDataURL("image/png");
    snapshotImg.src = dataURL;
    overlay.classList.remove("hidden");
  }

  function closeOverlay() {
    overlay.classList.add("hidden");
    snapshotImg.src = "";
  }

  function downloadSnapshot() {
    const link = document.createElement("a");
    link.download = `snapshot_${Date.now()}.png`;
    link.href = snapshotImg.src;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  }

  async function shareSnapshot() {
    if (!navigator.share) {
      downloadSnapshot();
      return;
    }

    try {
      const response = await fetch(snapshotImg.src);
      const blob = await response.blob();
      const file = new File([blob], "snapshot.png", { type: "image/png" });
      await navigator.share({ files: [file], title: "Snapshot" });
    } catch (err) {}
  }

  sk.preload = () => {
    gridDeform = createGridDeform(sk, img01);
    gridDeform.preload();
  };

  sk.setup = () => {
    sk.createCanvas(sk.windowWidth, sk.windowHeight, sk.WEBGL);
    camFeed = initializeCamCapture(sk, mediaPipe);
    faceMediaPipe.predictWebcam(camFeed);
  };

  sk.draw = () => {
    sk.background(0);
    sk.translate(-sk.width / 2, -sk.height / 2);

    const isMobile = sk.width < sk.height;
    const margin = isMobile ? MARGIN_MOBILE : MARGIN;
    const gap = isMobile ? GAP_MOBILE : GAP;
    const contentWidth = sk.width - margin * 2;
    const contentHeight = sk.height - margin * 2;
    const thumbAspect = camFeed ? camFeed.width / camFeed.height : 16 / 9;

    let thumbX, thumbY, thumbWidth, thumbHeight;
    let imgX, imgY, imgWidth, imgHeight;

    if (isMobile) {
      // Mobile: thumb on top (right-aligned), image below
      thumbHeight = contentHeight * THUMB_FRACTION;
      thumbWidth = thumbHeight * thumbAspect;
      thumbX = margin + contentWidth - thumbWidth;
      thumbY = margin;

      imgX = margin;
      imgY = margin + thumbHeight + gap;
      imgWidth = contentWidth;
      imgHeight = contentHeight - thumbHeight - gap;
    } else {
      // Desktop: thumb on left, image on right
      thumbWidth = contentWidth * THUMB_FRACTION;
      thumbHeight = thumbWidth / thumbAspect;
      thumbX = margin;
      thumbY = margin;

      imgX = margin + thumbWidth + gap;
      imgY = margin;
      imgWidth = contentWidth - thumbWidth - gap;
      imgHeight = contentHeight;
    }

    gridDeform.setBounds(imgX, imgY, imgWidth, imgHeight);

    const LM = getMappedLandmarks(sk, mediaPipe, camFeed, landmarksIndex);

    gridDeform.updateAnchors(LM.LX8, LM.LY8, LM.RX8, LM.RY8, LM.RY4);
    gridDeform.draw();

    if (camFeed) {
      sk.push();
      if (
        !sk._g ||
        sk._g.width !== Math.round(thumbWidth) ||
        sk._g.height !== Math.round(thumbHeight)
      ) {
        if (sk._g) sk._g.remove();
        sk._g = sk.createGraphics(
          Math.round(thumbWidth),
          Math.round(thumbHeight)
        );
      }
      sk._g.image(camFeed, 0, 0, sk._g.width, sk._g.height);
      sk._g.filter(sk.GRAY);
      sk.image(sk._g, thumbX, thumbY, thumbWidth, thumbHeight);

      sk.noFill();
      sk.stroke(0);
      sk.strokeWeight(1);
      sk.rect(thumbX, thumbY, thumbWidth, thumbHeight);

      // Draw anchor rectangle on thumb
      if (LM.LX8 && LM.RX8 && LM.RY8 && LM.RY4) {
        const mapToThumb = (val, feedStart, feedSize, thumbStart, thumbSize) =>
          thumbStart + ((val - feedStart) / feedSize) * thumbSize;

        const leftX = mapToThumb(
          LM.LX8,
          camFeed.x,
          camFeed.scaledWidth,
          thumbX,
          thumbWidth
        );
        const rightX = mapToThumb(
          LM.RX8,
          camFeed.x,
          camFeed.scaledWidth,
          thumbX,
          thumbWidth
        );
        const topY = mapToThumb(
          LM.RY8,
          camFeed.y,
          camFeed.scaledHeight,
          thumbY,
          thumbHeight
        );
        const bottomY = mapToThumb(
          LM.RY4,
          camFeed.y,
          camFeed.scaledHeight,
          thumbY,
          thumbHeight
        );

        sk.stroke(255);
        sk.strokeWeight(1);
        sk.noFill();
        sk.rect(leftX, topY, rightX - leftX, bottomY - topY);
      }

      sk.pop();
    }

    // Mouth open detection for snapshot
    const mouthOpen = faceMediaPipe.getMouthOpen();
    const isOpen = mouthOpen > MOUTH_OPEN_THRESHOLD;

    if (
      isOpen &&
      mouthWasClosed &&
      !snapshotPending &&
      overlay.classList.contains("hidden")
    ) {
      snapshotPending = true;
      setTimeout(() => {
        showOverlay();
        snapshotPending = false;
        mouthWasClosed = false;
      }, 700);
    }

    if (!isOpen && !snapshotPending) {
      mouthWasClosed = true;
    }
  };

  sk.windowResized = () => {
    sk.resizeCanvas(sk.windowWidth, sk.windowHeight);
    updateFeedDimensions(sk, camFeed, true);
  };

  sk.keyPressed = () => {
    if (!overlay.classList.contains("hidden")) {
      if (sk.key === "d" || sk.key === "D") {
        downloadSnapshot();
      } else if (sk.key === "Escape" || sk.key === " ") {
        closeOverlay();
      }
      return;
    }

    if (sk.key === "s" || sk.key === "S") {
      showOverlay();
    }
  };
});
