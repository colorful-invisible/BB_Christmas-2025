import p5 from "p5";
import { mediaPipe } from "./handModelMediaPipe.js";
import { initializeCamCapture, updateFeedDimensions } from "./videoFeedUtils";
import { getMappedLandmarks } from "./landmarksHandler";
import { OrthogonalGridDeform } from "./orthogonalGridDeform";

import { saveSnapshot } from "./utils.js";
import img01 from "url:../assets/images/grid.png";

new p5((sk) => {
  let camFeed;
  let gridDeform;

  const landmarksIndex = [8, 4];

  sk.preload = () => {
    gridDeform = new OrthogonalGridDeform(sk, img01);
    gridDeform.preload();
  };

  sk.setup = () => {
    sk.createCanvas(sk.windowWidth, sk.windowHeight, sk.WEBGL);
    camFeed = initializeCamCapture(sk, mediaPipe);
    gridDeform.setup();
  };

  sk.draw = () => {
    sk.background(255);
    sk.translate(-sk.width / 2, -sk.height / 2);

    // Get hand landmarks
    const LM = getMappedLandmarks(sk, mediaPipe, camFeed, landmarksIndex);

    // Extract positions
    const leftIndexX = LM.LX8;
    const leftIndexY = LM.LY8;
    const rightIndexX = LM.RX8;
    const rightIndexY = LM.RY8;
    const rightThumbY = LM.RY4;

    // Update and draw deformed grid
    gridDeform.updateAnchors(
      leftIndexX,
      leftIndexY,
      rightIndexX,
      rightIndexY,
      rightThumbY
    );

    gridDeform.draw();

    // Draw camera feed thumbnail
    if (camFeed) {
      sk.push();

      function videoFeedThumb(sk, video, x, y, w, h) {
        if (
          !sk._g ||
          sk._g.width !== Math.round(w) ||
          sk._g.height !== Math.round(h)
        ) {
          if (sk._g) sk._g.remove();
          sk._g = sk.createGraphics(Math.round(w), Math.round(h));
        }
        const g = sk._g;
        g.image(video, 0, 0, g.width, g.height);
        g.filter(sk.GRAY);
        sk.image(g, x, y, w, h);
      }

      // Calculate feed dimensions maintaining aspect ratio
      const feedWidth = sk.width / 5;
      const feedAspect = camFeed.width / camFeed.height;
      const feedHeight = feedWidth / feedAspect;

      videoFeedThumb(sk, camFeed, 24, 24, feedWidth, feedHeight);

      sk.noFill();
      sk.stroke(0);
      sk.strokeWeight(1);
      sk.rect(24, 24, feedWidth, feedHeight);

      sk.pop();
    }
  };

  sk.windowResized = () => {
    sk.resizeCanvas(sk.windowWidth, sk.windowHeight);
    updateFeedDimensions(sk, camFeed, true);
    gridDeform.resize();
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
