// Orthogonal Grid Deformation System
// Deforms image based on 4 anchor points with perpendicular-only distortion

export class OrthogonalGridDeform {
  constructor(sketch, imagePath) {
    this.sk = sketch;
    this.img = null;
    this.imagePath = imagePath;

    // Image positioning (centered with aspect ratio)
    this.imgX = 0;
    this.imgY = 0;
    this.imgWidth = 0;
    this.imgHeight = 0;

    // 4 anchor points (normalized 0-1 within image bounds)
    // These are the RED DOTS positions in the grid
    this.anchors = {
      topLeft: { x: 1 / 3, y: 1 / 3 }, // Left index finger
      topRight: { x: 2 / 3, y: 1 / 3 }, // Right index finger
      bottomLeft: { x: 1 / 3, y: 2 / 3 }, // Right thumb
      bottomRight: { x: 2 / 3, y: 2 / 3 }, // Right thumb
    };

    // Grid resolution (4x4 vertices = 3x3 sections)
    this.gridCols = 4;
    this.gridRows = 4;

    // Computed vertices and UV coordinates
    this.vertices = [];
    this.uvCoords = [];
  }

  preload() {
    this.img = this.sk.loadImage(this.imagePath);
  }

  setup() {
    this.calculateImageBounds();
  }

  // Replace the current image with a new one
  replaceImage(newImage) {
    if (!newImage) {
      console.error("Invalid image provided");
      return;
    }

    this.img = newImage;

    // Recalculate bounds to respect new image's aspect ratio
    this.calculateImageBounds();
  }

  // Calculate image position maintaining aspect ratio
  calculateImageBounds() {
    if (!this.img || !this.img.width) {
      // Use default bounds if no image
      this.imgWidth = this.sk.width * 0.8;
      this.imgHeight = this.sk.height * 0.6;
      this.imgX = (this.sk.width - this.imgWidth) / 2;
      this.imgY = (this.sk.height - this.imgHeight) / 2;
      return;
    }

    const canvasAspect = this.sk.width / this.sk.height;
    const imageAspect = this.img.width / this.img.height;

    if (imageAspect > canvasAspect) {
      // Image is wider - fit to width
      this.imgWidth = this.sk.width - 48;
      this.imgHeight = this.imgWidth / imageAspect;
    } else {
      // Image is taller - fit to height
      this.imgHeight = this.sk.height - 48;
      this.imgWidth = this.imgHeight * imageAspect;
    }

    // Center the image
    this.imgX = (this.sk.width - this.imgWidth) / 2;
    this.imgY = (this.sk.height - this.imgHeight) / 2;
  }

  // Update anchor positions from landmarks
  updateAnchors(leftIndexX, leftIndexY, rightIndexX, rightIndexY, rightThumbY) {
    // Check if landmarks are valid (not undefined or 0)
    if (
      !leftIndexX ||
      !leftIndexY ||
      !rightIndexX ||
      !rightIndexY ||
      !rightThumbY
    ) {
      // Keep default positions if landmarks not detected
      return;
    }

    // Convert pixel positions to normalized coordinates (0-1) within image bounds
    // Left index finger controls horizontal (X) position for left column
    this.anchors.topLeft.x = this.sk.constrain(
      (leftIndexX - this.imgX) / this.imgWidth,
      0.05,
      0.95
    );

    // Right index finger controls top row Y position and right column X position
    this.anchors.topLeft.y = this.sk.constrain(
      (rightIndexY - this.imgY) / this.imgHeight,
      0.05,
      0.95
    );
    this.anchors.topRight.x = this.sk.constrain(
      (rightIndexX - this.imgX) / this.imgWidth,
      0.05,
      0.95
    );
    this.anchors.topRight.y = this.anchors.topLeft.y; // Same Y as top left

    // Right thumb controls the bottom row Y position for the entire bottom row
    this.anchors.bottomLeft.x = this.anchors.topLeft.x; // Keep X aligned
    this.anchors.bottomLeft.y = this.sk.constrain(
      (rightThumbY - this.imgY) / this.imgHeight,
      0.05,
      0.95
    );

    // Right bottom anchor: X follows right index, Y matches right thumb (same bottom row)
    this.anchors.bottomRight.x = this.anchors.topRight.x; // Keep X aligned
    this.anchors.bottomRight.y = this.anchors.bottomLeft.y; // Same Y as left
  }

  // Calculate grid with orthogonal deformation and proportional compensation
  calculateGrid() {
    this.vertices = [];
    this.uvCoords = [];

    // Calculate proportional column widths with compensation
    const leftAnchorX = this.anchors.topLeft.x; // Left anchor (1/3 default)
    const rightAnchorX = this.anchors.topRight.x; // Right anchor (2/3 default)

    // Calculate section widths
    const leftWidth = leftAnchorX; // 0 to left anchor
    const middleWidth = rightAnchorX - leftAnchorX; // between anchors
    const rightWidth = 1 - rightAnchorX; // right anchor to 1

    // Normalize widths to maintain total image width (proportional compensation)
    const totalWidth = leftWidth + middleWidth + rightWidth;
    const normalizedLeft = leftWidth / totalWidth;
    const normalizedMiddle = middleWidth / totalWidth;
    const normalizedRight = rightWidth / totalWidth;

    // Column positions with proportional compensation
    const colX = [0, normalizedLeft, normalizedLeft + normalizedMiddle, 1];

    // Calculate proportional row heights with compensation
    const topAnchorY = this.anchors.topLeft.y; // Top anchors (1/3 default)
    const bottomAnchorY = this.anchors.bottomLeft.y; // Bottom anchors (2/3 default)

    // Calculate section heights
    const topHeight = topAnchorY; // 0 to top anchor
    const middleHeight = bottomAnchorY - topAnchorY; // between anchors
    const bottomHeight = 1 - bottomAnchorY; // bottom anchor to 1

    // Normalize heights to maintain total image height (proportional compensation)
    const totalHeight = topHeight + middleHeight + bottomHeight;
    const normalizedTop = topHeight / totalHeight;
    const normalizedMiddleH = middleHeight / totalHeight;
    const normalizedBottom = bottomHeight / totalHeight;

    // Row positions with proportional compensation
    const rowY = [0, normalizedTop, normalizedTop + normalizedMiddleH, 1];

    // Generate grid vertices
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        // UV coordinates (normalized texture coords - original image positions)
        const u = col / (this.gridCols - 1);
        const v = row / (this.gridRows - 1);

        // World position (in canvas space) - deformed positions
        const worldX = this.imgX + colX[col] * this.imgWidth;
        const worldY = this.imgY + rowY[row] * this.imgHeight;

        this.vertices.push({ x: worldX, y: worldY });
        this.uvCoords.push({ u: u, v: v });
      }
    }
  }

  // Draw the deformed image
  draw() {
    if (!this.img || this.img.width <= 1) {
      // Image not loaded
      return;
    }

    // Calculate the deformed grid
    this.calculateGrid();

    // Draw deformed image using textured quads
    this.sk.push();
    this.sk.noStroke();
    this.sk.texture(this.img);

    // Draw grid as quads (3x3 = 9 quads)
    for (let row = 0; row < this.gridRows - 1; row++) {
      for (let col = 0; col < this.gridCols - 1; col++) {
        const tl = col + row * this.gridCols;
        const tr = col + 1 + row * this.gridCols;
        const br = col + 1 + (row + 1) * this.gridCols;
        const bl = col + (row + 1) * this.gridCols;

        // Draw quad using vertex positions and UV coordinates
        this.sk.beginShape();
        this.sk.vertex(
          this.vertices[tl].x,
          this.vertices[tl].y,
          this.uvCoords[tl].u * this.img.width,
          this.uvCoords[tl].v * this.img.height
        );
        this.sk.vertex(
          this.vertices[tr].x,
          this.vertices[tr].y,
          this.uvCoords[tr].u * this.img.width,
          this.uvCoords[tr].v * this.img.height
        );
        this.sk.vertex(
          this.vertices[br].x,
          this.vertices[br].y,
          this.uvCoords[br].u * this.img.width,
          this.uvCoords[br].v * this.img.height
        );
        this.sk.vertex(
          this.vertices[bl].x,
          this.vertices[bl].y,
          this.uvCoords[bl].u * this.img.width,
          this.uvCoords[bl].v * this.img.height
        );
        this.sk.endShape(this.sk.CLOSE);
      }
    }

    this.sk.pop();
  }

  // Debug: Draw anchor points and landmark positions
  drawAnchors(landmarkData = null) {
    this.sk.push();

    // Draw grid lines to show the 3x3 structure
    this.sk.stroke(255, 0, 0, 100);
    this.sk.strokeWeight(1);

    // Vertical lines
    const leftX = this.imgX + this.anchors.topLeft.x * this.imgWidth;
    const rightX = this.imgX + this.anchors.topRight.x * this.imgWidth;
    this.sk.line(leftX, this.imgY, leftX, this.imgY + this.imgHeight);
    this.sk.line(rightX, this.imgY, rightX, this.imgY + this.imgHeight);

    // Horizontal lines
    const topY = this.imgY + this.anchors.topLeft.y * this.imgHeight;
    const bottomY = this.imgY + this.anchors.bottomLeft.y * this.imgHeight;
    this.sk.line(this.imgX, topY, this.imgX + this.imgWidth, topY);
    this.sk.line(this.imgX, bottomY, this.imgX + this.imgWidth, bottomY);

    // Draw red circles at the 4 control points on the grid lines
    this.sk.fill(255, 0, 0);
    this.sk.noStroke();

    // Left vertical line control point (centered vertically)
    const leftCenterY = this.imgY + this.imgHeight / 2;
    this.sk.circle(leftX, leftCenterY, 12);

    // Right vertical line control point (centered vertically)
    const rightCenterY = this.imgY + this.imgHeight / 2;
    this.sk.circle(rightX, rightCenterY, 12);

    // Top horizontal line control point (centered horizontally)
    const centerX = this.imgX + this.imgWidth / 2;
    this.sk.circle(centerX, topY, 12);

    // Bottom horizontal line control point (centered horizontally)
    this.sk.circle(centerX, bottomY, 12);

    // If landmark data provided, show landmark positions
    if (landmarkData) {
      this.sk.fill(0, 255, 0, 150);
      this.sk.stroke(0, 255, 0);
      this.sk.strokeWeight(2);

      // Left index finger (controls left column X position)
      this.sk.circle(landmarkData.leftIndexX, landmarkData.leftIndexY, 15);
      // Right index finger (controls top row Y and right column X position)
      this.sk.circle(landmarkData.rightIndexX, landmarkData.rightIndexY, 15);
      // Right thumb (controls bottom row Y position)
      this.sk.circle(landmarkData.rightIndexX, landmarkData.rightThumbY, 15);

      // Draw lines connecting landmarks to their controlled elements
      this.sk.stroke(255, 255, 0, 100);
      this.sk.strokeWeight(2);

      // Left index to left vertical line (X control)
      const leftX = this.imgX + this.anchors.topLeft.x * this.imgWidth;
      this.sk.line(
        landmarkData.leftIndexX,
        landmarkData.leftIndexY,
        leftX,
        landmarkData.leftIndexY
      );

      // Right index to top horizontal line (Y control)
      const topY = this.imgY + this.anchors.topLeft.y * this.imgHeight;
      this.sk.line(
        landmarkData.rightIndexX,
        landmarkData.rightIndexY,
        landmarkData.rightIndexX,
        topY
      );

      // Right index to right vertical line (X control)
      const rightX = this.imgX + this.anchors.topRight.x * this.imgWidth;
      this.sk.line(
        landmarkData.rightIndexX,
        landmarkData.rightIndexY,
        rightX,
        landmarkData.rightIndexY
      );

      // Right thumb to bottom horizontal line (Y control)
      const bottomY = this.imgY + this.anchors.bottomLeft.y * this.imgHeight;
      this.sk.line(
        landmarkData.rightIndexX,
        landmarkData.rightThumbY,
        landmarkData.rightIndexX,
        bottomY
      );
    }

    this.sk.pop();
  }

  // Update on window resize
  resize() {
    this.calculateImageBounds();
  }
}
