// Orthogonal Grid Deformation System

const GRID_COLS = 4;
const GRID_ROWS = 4;

export function createGridDeform(sketch, imagePath) {
  const state = {
    sk: sketch,
    img: null,
    imagePath,
    imgX: 0,
    imgY: 0,
    imgWidth: 0,
    imgHeight: 0,
    anchors: {
      topLeft: { x: 1 / 3, y: 1 / 3 },
      topRight: { x: 2 / 3, y: 1 / 3 },
      bottomLeft: { x: 1 / 3, y: 2 / 3 },
      bottomRight: { x: 2 / 3, y: 2 / 3 },
    },
  };

  return {
    preload: () => preload(state),
    setBounds: (x, y, w, h) => setBounds(state, x, y, w, h),
    updateAnchors: (lx, ly, rx, ry, rty) =>
      updateAnchors(state, lx, ly, rx, ry, rty),
    draw: () => draw(state),
    replaceImage: (img) => {
      state.img = img;
    },
  };
}

function preload(state) {
  state.img = state.sk.loadImage(state.imagePath);
}

function setBounds(state, x, y, width, height) {
  state.imgX = x;
  state.imgY = y;
  state.imgWidth = width;
  state.imgHeight = height;
}

function updateAnchors(
  state,
  leftIndexX,
  leftIndexY,
  rightIndexX,
  rightIndexY,
  rightThumbY
) {
  if (
    !leftIndexX ||
    !leftIndexY ||
    !rightIndexX ||
    !rightIndexY ||
    !rightThumbY
  )
    return;

  const { sk, imgX, imgY, imgWidth, imgHeight, anchors } = state;

  anchors.topLeft.x = sk.constrain((leftIndexX - imgX) / imgWidth, 0.05, 0.95);
  anchors.topLeft.y = sk.constrain(
    (rightIndexY - imgY) / imgHeight,
    0.05,
    0.95
  );
  anchors.topRight.x = sk.constrain(
    (rightIndexX - imgX) / imgWidth,
    0.05,
    0.95
  );
  anchors.topRight.y = anchors.topLeft.y;

  anchors.bottomLeft.x = anchors.topLeft.x;
  anchors.bottomLeft.y = sk.constrain(
    (rightThumbY - imgY) / imgHeight,
    0.05,
    0.95
  );
  anchors.bottomRight.x = anchors.topRight.x;
  anchors.bottomRight.y = anchors.bottomLeft.y;
}

function calculateGrid(state) {
  const { anchors, imgX, imgY, imgWidth, imgHeight } = state;

  const colX = normalizePositions([
    0,
    anchors.topLeft.x,
    anchors.topRight.x,
    1,
  ]);
  const rowY = normalizePositions([
    0,
    anchors.topLeft.y,
    anchors.bottomLeft.y,
    1,
  ]);

  const vertices = [];
  const uvCoords = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      vertices.push({
        x: imgX + colX[col] * imgWidth,
        y: imgY + rowY[row] * imgHeight,
      });
      uvCoords.push({
        u: col / (GRID_COLS - 1),
        v: row / (GRID_ROWS - 1),
      });
    }
  }

  return { vertices, uvCoords };
}

function normalizePositions(positions) {
  const total =
    positions[1] + (positions[2] - positions[1]) + (1 - positions[2]);
  return [
    0,
    positions[1] / total,
    (positions[1] + (positions[2] - positions[1])) / total,
    1,
  ];
}

function draw(state) {
  const { sk, img } = state;
  if (!img || img.width <= 1) return;

  const { vertices, uvCoords } = calculateGrid(state);

  sk.push();
  sk.noStroke();
  sk.texture(img);

  for (let row = 0; row < GRID_ROWS - 1; row++) {
    for (let col = 0; col < GRID_COLS - 1; col++) {
      const tl = col + row * GRID_COLS;
      const tr = tl + 1;
      const bl = tl + GRID_COLS;
      const br = bl + 1;

      sk.beginShape();
      sk.vertex(
        vertices[tl].x,
        vertices[tl].y,
        uvCoords[tl].u * img.width,
        uvCoords[tl].v * img.height
      );
      sk.vertex(
        vertices[tr].x,
        vertices[tr].y,
        uvCoords[tr].u * img.width,
        uvCoords[tr].v * img.height
      );
      sk.vertex(
        vertices[br].x,
        vertices[br].y,
        uvCoords[br].u * img.width,
        uvCoords[br].v * img.height
      );
      sk.vertex(
        vertices[bl].x,
        vertices[bl].y,
        uvCoords[bl].u * img.width,
        uvCoords[bl].v * img.height
      );
      sk.endShape(sk.CLOSE);
    }
  }

  sk.pop();
}
