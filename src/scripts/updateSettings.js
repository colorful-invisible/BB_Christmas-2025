// Image Upload Settings Manager
// Handles image upload, validation, preview, and replacement

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

let gridDeformInstance = null;
let selectedFile = null;

export function initImageUploadSettings(gridDeform) {
  gridDeformInstance = gridDeform;

  // Get DOM elements
  const fileInput = document.getElementById("imageUpload");
  const previewContainer = document.getElementById("imagePreviewContainer");
  const previewImg = document.getElementById("imagePreview");
  const confirmBtn = document.getElementById("confirmImageBtn");
  const confirmBtnContainer = document.getElementById("confirmButtonContainer");
  const errorDiv = document.getElementById("uploadError");

  if (
    !fileInput ||
    !previewContainer ||
    !previewImg ||
    !confirmBtn ||
    !confirmBtnContainer
  ) {
    console.error("Image upload elements not found in DOM");
    return;
  }

  // File input change handler
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (!file) {
      hidePreview();
      hideConfirmButton();
      return;
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      showError(validation.error);
      hidePreview();
      hideConfirmButton();
      selectedFile = null;
      return;
    }

    // File is valid - show preview
    hideError();
    selectedFile = file;
    showPreview(file, previewImg, previewContainer);
    showConfirmButton();
  });

  // Confirm button handler
  confirmBtn.addEventListener("click", () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target.result;
      replaceImage(imageDataUrl);
      showSuccess();
    };
    reader.readAsDataURL(selectedFile);
  });

  // Helper functions
  function validateFile(file) {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Please upload JPG, PNG, or WEBP images.`,
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `File too large (${sizeMB}MB). Maximum size is 3MB.`,
      };
    }

    return { valid: true };
  }

  function showPreview(file, imgElement, container) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imgElement.src = e.target.result;
      container.style.display = "block";
    };
    reader.readAsDataURL(file);
  }

  function hidePreview() {
    previewContainer.style.display = "none";
    previewImg.src = "";
  }

  function showConfirmButton() {
    confirmBtnContainer.style.display = "flex";
  }

  function hideConfirmButton() {
    confirmBtnContainer.style.display = "none";
  }

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  }

  function hideError() {
    errorDiv.style.display = "none";
    errorDiv.textContent = "";
  }

  function showSuccess() {
    // Temporarily show success message
    errorDiv.textContent = "✓ Image applied successfully!";
    errorDiv.style.color = "#2e7d32";
    errorDiv.style.display = "block";

    setTimeout(() => {
      hideError();
      errorDiv.style.color = "#d32f2f"; // Reset to error color
    }, 3000);
  }

  function replaceImage(imageDataUrl) {
    if (!gridDeformInstance) {
      console.error("Grid deform instance not available");
      return;
    }

    // Store in localStorage for persistence across sessions
    try {
      localStorage.setItem("customImage", imageDataUrl);
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }

    // Create new p5.Image from data URL
    const img = gridDeformInstance.sk.loadImage(
      imageDataUrl,
      () => {
        // Once loaded, replace the image in the grid deform instance
        gridDeformInstance.replaceImage(img);
        console.log("Image successfully loaded and applied");
      },
      (err) => {
        console.error("Failed to load image:", err);
        showError("Failed to load image. Please try again.");
      }
    );
  }
}

// Load custom image from localStorage on init if available
export function loadStoredImage(gridDeform) {
  try {
    const storedImage = localStorage.getItem("customImage");
    if (storedImage && gridDeform) {
      const img = gridDeform.sk.loadImage(
        storedImage,
        () => {
          gridDeform.replaceImage(img);
          console.log("Restored custom image from localStorage");
        },
        (err) => {
          console.warn("Could not restore stored image:", err);
          localStorage.removeItem("customImage");
        }
      );
    }
  } catch (e) {
    console.warn("Could not access localStorage:", e);
  }
}
