import p5 from "p5";
import { mediaPipe } from "./handModelMediaPipe.js";
import { faceMediaPipe } from "./faceModelMediaPipe.js";
import {
  initializeCamCapture,
  updateFeedDimensions,
  stopCamCapture,
} from "./videoFeedUtils";
import { getMappedLandmarks } from "./landmarksHandler";
import { createGridDeform } from "./orthogonalGridDeform";
import img01 from "url:../assets/images/grid.png";

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
  let thumbGraphics = null;
  let resizeTimeout = null;
  const landmarksIndex = [8, 4];

  // DOM elements
  const intro = document.getElementById("intro");
  const btnStart = document.getElementById("btn-start");
  const overlay = document.getElementById("overlay");
  const snapshotImg = document.getElementById("snapshot-img");
  const btnDownload = document.getElementById("btn-download");
  const btnDownloadMobile = document.getElementById("btn-download-mobile");
  const btnShare = document.getElementById("btn-share");
  const btnAgain = document.getElementById("btn-again");
  const btnAgainMobile = document.getElementById("btn-again-mobile");
  const btnEmail = document.getElementById("btn-email");
  const btnWhatsApp = document.getElementById("btn-whatsapp");
  const btnTwitter = document.getElementById("btn-twitter");
  const btnInfo = document.getElementById("btn-info");
  const credits = document.getElementById("credits");

  // Button handlers
  btnStart.addEventListener("click", startExperience);
  btnDownload?.addEventListener("click", downloadSnapshot);
  btnDownloadMobile?.addEventListener("click", downloadSnapshot);
  btnShare?.addEventListener("click", shareSnapshot);
  btnAgain?.addEventListener("click", closeOverlay);
  btnAgainMobile?.addEventListener("click", closeOverlay);
  btnEmail?.addEventListener("click", shareViaEmail);
  btnWhatsApp?.addEventListener("click", shareViaWhatsApp);
  btnTwitter?.addEventListener("click", shareViaTwitter);
  btnInfo?.addEventListener("click", toggleCredits);

  function toggleCredits() {
    credits?.classList.toggle("hidden");
  }

  async function startExperience() {
    intro.classList.add("hidden");

    if (!camFeed) {
      document.body.classList.add("loading");

      await mediaPipe.initialize();
      await faceMediaPipe.initialize();

      // initializeCamCapture is now async and handles errors internally
      camFeed = await initializeCamCapture(sk, mediaPipe);

      document.body.classList.remove("loading");

      // Only start face prediction if camera was successfully initialized
      if (camFeed) {
        faceMediaPipe.predictWebcam(camFeed);
      }
    }
  }

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
    setTimeout(() => document.body.removeChild(link), 100);
  }

  const SHARE_TITLE = "Geb auch Du Intoleranz keinen Platz!";
  const SHARE_URL = "www.2025.brueckner.studio";
  const SHARE_TEXT = `${SHARE_TITLE}\n${SHARE_URL}`;

  async function shareSnapshot() {
    if (!navigator.share || !navigator.canShare) return;

    try {
      const response = await fetch(snapshotImg.src);
      const blob = await response.blob();
      const file = new File([blob], "snapshot.png", { type: "image/png" });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: SHARE_TITLE,
          text: SHARE_TEXT,
        });
      }
    } catch (err) {
      console.error("Error sharing snapshot:", err);
    }
  }

  function shareViaEmail() {
    const subject = encodeURIComponent(SHARE_TITLE);
    const body = encodeURIComponent(SHARE_TEXT);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }

  function shareViaWhatsApp() {
    const text = encodeURIComponent(SHARE_TEXT);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function shareViaTwitter() {
    const text = encodeURIComponent(SHARE_TEXT);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  }

  sk.preload = () => {
    gridDeform = createGridDeform(sk, img01);
    gridDeform.preload();
  };

  sk.setup = () => {
    sk.createCanvas(window.innerWidth, window.innerHeight, sk.WEBGL);
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
      thumbHeight = contentHeight * THUMB_FRACTION;
      thumbWidth = thumbHeight * thumbAspect;

      imgX = margin;
      imgY = margin;
      imgWidth = contentWidth;
      imgHeight = contentHeight - thumbHeight - gap;

      thumbX = margin + contentWidth - thumbWidth;
      thumbY = margin + imgHeight + gap;
    } else {
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

      const targetWidth = Math.round(thumbWidth);
      const targetHeight = Math.round(thumbHeight);

      if (
        !thumbGraphics ||
        Math.abs(thumbGraphics.width - targetWidth) > 2 ||
        Math.abs(thumbGraphics.height - targetHeight) > 2
      ) {
        if (thumbGraphics) {
          thumbGraphics.remove();
          thumbGraphics = null;
        }
        if (targetWidth > 0 && targetHeight > 0) {
          thumbGraphics = sk.createGraphics(targetWidth, targetHeight);
        }
      }

      if (thumbGraphics) {
        thumbGraphics.image(
          camFeed,
          0,
          0,
          thumbGraphics.width,
          thumbGraphics.height
        );
        thumbGraphics.filter(sk.GRAY);
        sk.image(thumbGraphics, thumbX, thumbY, thumbWidth, thumbHeight);
      }

      sk.noFill();
      sk.stroke(0);
      sk.strokeWeight(1);
      sk.rect(thumbX, thumbY, thumbWidth, thumbHeight);

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
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }

    resizeTimeout = setTimeout(() => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      if (newWidth > 0 && newHeight > 0) {
        sk.resizeCanvas(newWidth, newHeight);

        if (camFeed) {
          updateFeedDimensions(sk, camFeed, newHeight > newWidth);
        }
      }
    }, 100);
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

  sk.remove = () => {
    if (thumbGraphics) {
      thumbGraphics.remove();
      thumbGraphics = null;
    }
    stopCamCapture(camFeed);
    mediaPipe.close();
    faceMediaPipe.close();
  };
});
