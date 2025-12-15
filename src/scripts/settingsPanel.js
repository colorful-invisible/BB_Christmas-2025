// ============ SETTINGS PANEL SYSTEM ============

export function createSettingsPanel(options = {}) {
  const {
    autoHide = false,
    autoHideDelay = 5000,
    initialAutoHideDelay = 3000,
  } = options;

  let hideTimeout;
  const panel = document.querySelector(".panel");
  const toggle = document.querySelector(".panel-toggle");

  if (!panel || !toggle) {
    console.error("Panel or toggle button not found in DOM");
    return null;
  }

  // ============ TOGGLE VISIBILITY ============

  function showToggle() {
    toggle.classList.remove("is-hidden");
  }

  function hideToggle() {
    if (!panel.classList.contains("is-open")) {
      toggle.classList.add("is-hidden");
    }
  }

  function resetHideTimeout() {
    if (!autoHide) return;

    clearTimeout(hideTimeout);
    showToggle();
    hideTimeout = setTimeout(hideToggle, autoHideDelay);
  }

  // ============ PANEL CONTROLS ============

  function openPanel() {
    panel.classList.add("is-open");
    document.body.classList.add("panel-active");

    if (autoHide) {
      clearTimeout(hideTimeout);
      showToggle();
    }
  }

  function closePanel() {
    panel.classList.remove("is-open");
    document.body.classList.remove("panel-active");

    if (autoHide) {
      resetHideTimeout();
    }
  }

  function togglePanel() {
    if (panel.classList.contains("is-open")) {
      closePanel();
    } else {
      openPanel();
    }
  }

  // ============ EVENT LISTENERS ============

  toggle.addEventListener("click", togglePanel);

  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !toggle.contains(e.target)) {
      closePanel();
    }
  });

  if (autoHide) {
    document.addEventListener("mousemove", resetHideTimeout);
    hideTimeout = setTimeout(hideToggle, initialAutoHideDelay);
  }

  // ============ PUBLIC API ============

  return {
    open: openPanel,
    close: closePanel,
    toggle: togglePanel,
    destroy: () => {
      clearTimeout(hideTimeout);
      toggle.removeEventListener("click", togglePanel);
    },
  };
}
