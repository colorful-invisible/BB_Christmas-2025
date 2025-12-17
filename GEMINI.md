# Project Overview

This is a creative coding project that uses computer vision to create a generative art piece. The application captures video from the user's camera and uses MediaPipe to track hand and face landmarks. The hand landmarks are used to deform a grid, creating a unique visual effect. The application takes a snapshot when the user opens their mouth, which can then be downloaded or shared.

The project is built using `p5.js` for drawing and `parcel` as a web application bundler.

# Building and Running

To build and run the project, you need to have Node.js and npm installed.

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the development server:**
    ```bash
    npm start
    ```
    This will open the application in your default web browser.

3.  **Build for production:**
    ```bash
    npm run build
    ```
    This will create a `dist` directory with the optimized and minified application files.

# Development Conventions

*   The project uses modern JavaScript (ES6 modules).
*   The code is organized into modules with specific responsibilities:
    *   `index.js`: The main application logic.
    *   `handModelMediaPipe.js`: Handles hand tracking using MediaPipe.
    *   `faceModelMediaPipe.js`: Handles face tracking using MediaPipe.
    *   `videoFeedUtils.js`: Utilities for managing the camera feed.
    *   `landmarksHandler.js`: Processes and maps the landmarks from MediaPipe.
    *   `orthogonalGridDeform.js`: The logic for deforming the grid.
*   The project uses `parcel` to bundle the code, which simplifies the development process by automatically handling dependencies and transformations.

# Work Completed

*   **Bug Fixes:**
    *   **Race Condition in Initialization:** Fixed a race condition where the hand and face MediaPipe models were initializing concurrently. The initialization is now sequential.
    *   **Memory Leaks from Unreleased Resources:** Fixed memory leaks by ensuring that the camera feed and MediaPipe models are properly closed and released when they are no longer needed.