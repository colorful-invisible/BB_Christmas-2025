// ---- SAVE P5 CANVAS SNAPSHOT AS PNG
// -----------------------------------
let countSaved = 1;
function saveSnapshot(sk, defaultDensity, densityFactor = 2) {
  const currentDensity = sk.pixelDensity();
  sk.pixelDensity(defaultDensity * densityFactor);
  sk.redraw();
  sk.saveCanvas(`sketch_${countSaved}`, "png");
  countSaved++;
  sk.pixelDensity(currentDensity);
  sk.redraw();
}

export { saveSnapshot };
