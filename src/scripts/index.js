import p5 from "p5";
import { mediaPipe } from "./handModelMediaPipe.js";
import { initializeCamCapture, updateFeedDimensions } from "./videoFeedUtils";
import { getMappedLandmarks } from "./landmarksHandler";
import { createGridDeform } from "./orthogonalGridDeform";
import { saveSnapshot } from "./utils.js";
import img01 from "url:../assets/images/grid.png";

const MARGIN = 24;
const GAP = 24;
const THUMB_FRACTION = 1 / 5;

new p5((sk) => {
  let camFeed;
  let gridDeform;
  const landmarksIndex = [8, 4];

  sk.preload = () => {
    gridDeform = createGridDeform(sk, img01);
    gridDeform.preload();
  };

  sk.setup = () => {
    sk.createCanvas(sk.windowWidth, sk.windowHeight, sk.WEBGL);
    camFeed = initializeCamCapture(sk, mediaPipe);
  };

  sk.draw = () => {
    sk.background(255);
    sk.translate(-sk.width / 2, -sk.height / 2);

    const contentWidth = sk.width - MARGIN * 2;
    const contentHeight = sk.height - MARGIN * 2;

    const thumbWidth = contentWidth * THUMB_FRACTION;
    const thumbAspect = camFeed ? camFeed.width / camFeed.height : 16 / 9;
    const thumbHeight = thumbWidth / thumbAspect;

    const imgX = MARGIN + thumbWidth + GAP;
    const imgY = MARGIN;
    const imgWidth = contentWidth - thumbWidth - GAP;
    const imgHeight = contentHeight;

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
      sk.image(sk._g, MARGIN, MARGIN, thumbWidth, thumbHeight);

      sk.noFill();
      sk.stroke(0);
      sk.strokeWeight(1);
      sk.rect(MARGIN, MARGIN, thumbWidth, thumbHeight);

      // Draw anchor rectangle on thumb
      if (LM.LX8 && LM.RX8 && LM.RY8 && LM.RY4) {
        const mapToThumb = (val, feedStart, feedSize, thumbStart, thumbSize) =>
          thumbStart + ((val - feedStart) / feedSize) * thumbSize;

        const leftX = mapToThumb(
          LM.LX8,
          camFeed.x,
          camFeed.scaledWidth,
          MARGIN,
          thumbWidth
        );
        const rightX = mapToThumb(
          LM.RX8,
          camFeed.x,
          camFeed.scaledWidth,
          MARGIN,
          thumbWidth
        );
        const topY = mapToThumb(
          LM.RY8,
          camFeed.y,
          camFeed.scaledHeight,
          MARGIN,
          thumbHeight
        );
        const bottomY = mapToThumb(
          LM.RY4,
          camFeed.y,
          camFeed.scaledHeight,
          MARGIN,
          thumbHeight
        );

        sk.stroke(255);
        sk.strokeWeight(1);
        sk.noFill();
        sk.rect(leftX, topY, rightX - leftX, bottomY - topY);
      }

      sk.pop();
    }
  };

  sk.windowResized = () => {
    sk.resizeCanvas(sk.windowWidth, sk.windowHeight);
    updateFeedDimensions(sk, camFeed, true);
  };

  sk.keyPressed = () => {
    if (sk.key === "s" || sk.key === "S") {
      console.log("Snapshot will be taken in 3 seconds...");
      setTimeout(() => {
        saveSnapshot(sk, sk.pixelDensity(), 2);
        console.log("Snapshot saved!");
      }, 3000);
    }
  };
});
