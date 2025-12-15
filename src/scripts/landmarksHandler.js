export const getMappedLandmarks = (
  sketch,
  mediaPipe,
  camFeed,
  landmarksIndex
) => {
  const mappedLandmarks = {};

  if (mediaPipe.landmarks.length > 0 && mediaPipe.handedness.length > 0) {
    // Process each detected hand
    mediaPipe.landmarks.forEach((handLandmarks, handIndex) => {
      const handedness = mediaPipe.handedness[handIndex]?.[0]?.categoryName;
      const handPrefix = handedness === "Left" ? "L" : "R";

      // Map all requested landmark indices for this hand
      landmarksIndex.forEach((landmarkIndex) => {
        if (handLandmarks[landmarkIndex]) {
          const LMX = `${handPrefix}X${landmarkIndex}`;
          const LMY = `${handPrefix}Y${landmarkIndex}`;

          mappedLandmarks[LMX] = sketch.map(
            handLandmarks[landmarkIndex].x,
            1,
            0,
            camFeed.x || 0,
            (camFeed.x || 0) + (camFeed.scaledWidth || sketch.width)
          );

          mappedLandmarks[LMY] = sketch.map(
            handLandmarks[landmarkIndex].y,
            0,
            1,
            camFeed.y || 0,
            (camFeed.y || 0) + (camFeed.scaledHeight || sketch.height)
          );
        }
      });
    });
  }

  return mappedLandmarks;
};
