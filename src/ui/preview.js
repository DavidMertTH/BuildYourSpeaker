import * as THREE from "../vendor/three/three.module.min.js";
import { normalizeBandpassOptions } from "../core/bandpassBox.js";
import { portLengthFromTuningOptions } from "../core/ventedBox.js";

const previews = new WeakMap();
const BOX_ROTATION_STORAGE_KEY = "audioSim.boxPreview.rotation";

export function drawBoxPreview(canvas, state) {
  if (!canvas) return;
  const preview = ensurePreview(canvas);
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * pixelRatio));
  const height = Math.max(1, Math.floor(rect.height * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    preview.renderer.setPixelRatio(pixelRatio);
    preview.renderer.setSize(rect.width, rect.height, false);
    preview.camera.aspect = rect.width / rect.height;
    preview.camera.updateProjectionMatrix();
  }

  const theme = getTheme(canvas);
  const signature = modelSignature(state, theme);
  if (preview.signature !== signature) {
    preview.signature = signature;
    rebuildModel(preview, state, theme);
  }

  if (preview.autoRotate && !preview.dragging) preview.rotation.y += 0.0035;
  updateCamera(preview);
  preview.theme = theme;
  renderPreview(preview);
}

function ensurePreview(canvas) {
  let preview = previews.get(canvas);
  if (preview) return preview;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
  const model = new THREE.Group();
  scene.add(model);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x25303a, 1.25);
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(80, 100, 70);
  scene.add(hemi, key);

  preview = {
    renderer,
    scene,
    camera,
    model,
    signature: "",
    rotation: { x: -0.18, y: 0.75 },
    distance: 160,
    dragging: false,
    animationFrame: null,
    autoRotate: readRotationPreference(),
    pointer: { x: 0, y: 0 },
    theme: null,
  };
  previews.set(canvas, preview);
  bindOrbit(canvas, preview);
  installPreviewControls(canvas, preview);
  startPreviewLoop(canvas, preview);
  return preview;
}

function bindOrbit(canvas, preview) {
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    preview.dragging = true;
    preview.pointer = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!preview.dragging) return;
    const dx = event.clientX - preview.pointer.x;
    const dy = event.clientY - preview.pointer.y;
    preview.pointer = { x: event.clientX, y: event.clientY };
    preview.rotation.y += dx * 0.01;
    preview.rotation.x = clamp(preview.rotation.x + dy * 0.008, -1.15, 0.8);
    updateCamera(preview);
    renderPreview(preview);
  });
  canvas.addEventListener("pointerup", (event) => {
    preview.dragging = false;
    canvas.releasePointerCapture?.(event.pointerId);
  });
  canvas.addEventListener("pointercancel", () => {
    preview.dragging = false;
  });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    preview.distance = clamp(preview.distance * (event.deltaY > 0 ? 1.08 : 0.92), 80, 280);
    updateCamera(preview);
    renderPreview(preview);
  }, { passive: false });
}

function startPreviewLoop(canvas, preview) {
  if (preview.animationFrame !== null) return;
  const tick = () => {
    if (!canvas.isConnected) {
      preview.animationFrame = null;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2 && preview.autoRotate && !preview.dragging) {
      preview.rotation.y += 0.0035;
      updateCamera(preview);
      renderPreview(preview);
    }
    preview.animationFrame = window.requestAnimationFrame(tick);
  };
  preview.animationFrame = window.requestAnimationFrame(tick);
}

function installPreviewControls(canvas, preview) {
  const panel = canvas.closest(".plot-panel");
  if (!panel || panel.querySelector(".box-preview-controls")) return;

  const controls = document.createElement("div");
  controls.className = "box-preview-controls";

  const rotateButton = document.createElement("button");
  rotateButton.type = "button";
  rotateButton.className = "box-preview-control";
  rotateButton.textContent = "Rotate";
  rotateButton.title = "Rotate box preview";

  const stillButton = document.createElement("button");
  stillButton.type = "button";
  stillButton.className = "box-preview-control";
  stillButton.textContent = "Still";
  stillButton.title = "Stop box preview rotation";

  const sync = () => {
    rotateButton.classList.toggle("active", preview.autoRotate);
    stillButton.classList.toggle("active", !preview.autoRotate);
    rotateButton.setAttribute("aria-pressed", String(preview.autoRotate));
    stillButton.setAttribute("aria-pressed", String(!preview.autoRotate));
  };

  rotateButton.addEventListener("click", () => {
    preview.autoRotate = true;
    writeRotationPreference(preview.autoRotate);
    sync();
  });
  stillButton.addEventListener("click", () => {
    preview.autoRotate = false;
    writeRotationPreference(preview.autoRotate);
    sync();
  });

  controls.append(rotateButton, stillButton);
  panel.append(controls);
  sync();
}

function renderPreview(preview) {
  if (preview.theme) preview.renderer.setClearColor(preview.theme.chrome, 1);
  preview.renderer.render(preview.scene, preview.camera);
}

function rebuildModel(preview, state, theme) {
  preview.model.clear();
  const box = state.box || {};
  const mode = state.mode || "sealed";
  const dims = enclosureDimensions(state);

  addCabinet(preview.model, dims, theme, mode);
  addDriver(preview.model, dims, driverDiameterCm(state), theme);

  if (mode === "vented") addVentedPorts(preview.model, dims, box, theme);
  if (mode === "passive") addPassiveRadiators(preview.model, dims, box, theme);
  if (mode === "bandpass") addBandpass(preview.model, dims, box, theme);

  addDimensionLines(preview.model, dims, theme);
  addLabel(preview.model, `${formatNumber(volumeForState(state), 1)} L ${mode}`, new THREE.Vector3(dims.w / 2 - 2, dims.h / 2 + 8, dims.d / 2), theme.text);

  const radius = Math.hypot(dims.w, dims.h, dims.d) * 0.78;
  preview.distance = clamp(radius * 2.55, 105, 280);
  updateCamera(preview);
}

function addCabinet(group, dims, theme, mode) {
  const fill = material(theme.surface, mode === "bandpass" ? 0.18 : 0.24, true);
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(dims.w, dims.h, dims.d), fill);
  group.add(cabinet);
  group.add(edges(new THREE.BoxGeometry(dims.w, dims.h, dims.d), theme.line, 1.35));
}

function addDriver(group, dims, diameterCm, theme) {
  const radius = clamp(diameterCm / 2, 4, Math.min(dims.w, dims.h) * 0.28);
  const z = dims.d / 2 + 0.85;
  const y = dims.h * 0.13;
  addDisc(group, radius, new THREE.Vector3(0, y, z), theme.field, theme.line, 0.78);
  addDisc(group, radius * 0.56, new THREE.Vector3(0, y, z + 0.35), theme.accent, theme.line, 0.92);
  addLabel(group, `${formatNumber(radius * 2, 1)} cm driver`, new THREE.Vector3(-dims.w * 0.22, dims.h / 2 + 4, z + 2), theme.text);
}

function addVentedPorts(group, dims, box, theme) {
  const port = portInfo(box);
  const count = clampInt(port.count, 1, 4);
  const spread = Math.min(dims.w * 0.46, count * 13);
  for (let index = 0; index < count; index += 1) {
    const x = count === 1 ? 0 : -spread / 2 + (spread * index) / (count - 1);
    const y = -dims.h * 0.27;
    addPort(group, dims, { ...port, x, y, label: index === 0 }, theme);
  }
}

function addPort(group, dims, port, theme) {
  const actualLength = Math.max(Number(port.lengthCm) || 8, 3);
  const visualLength = Math.min(actualLength, Math.max(dims.d * 2.4, 12));
  const insideLength = Math.max(1, Math.min(visualLength, dims.d - 4));
  const foldedLength = Math.max(0, visualLength - insideLength);
  const zFront = dims.d / 2 + 0.3;
  const zCenter = zFront - insideLength / 2;

  if (port.shape === "rectangular") {
    const width = clamp(Number(port.widthCm) || 8, 3, dims.w * 0.42);
    const height = clamp(Number(port.heightCm) || 3, 1.5, dims.h * 0.16);
    const duct = new THREE.Mesh(new THREE.BoxGeometry(width, height, insideLength), material(theme.port, 0.62, true));
    duct.position.set(port.x, port.y, zCenter);
    group.add(duct);
    group.add(positionedEdges(new THREE.BoxGeometry(width, height, insideLength), theme.accent2, duct.position));
  } else {
    const radius = clamp((Number(port.diameterCm) || 7) / 2, 1.6, dims.w * 0.12);
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, insideLength, 40, 1, true), material(theme.port, 0.68, true));
    duct.rotation.x = Math.PI / 2;
    duct.position.set(port.x, port.y, zCenter);
    group.add(duct);
    group.add(positionedEdges(new THREE.CylinderGeometry(radius, radius, insideLength, 40), theme.accent2, duct.position, duct.rotation));
  }

  if (foldedLength > 0) {
    const foldWidth = Math.min(foldedLength, Math.max(3, dims.w * 0.52));
    const foldX = clamp(port.x * 0.5, -dims.w / 2 + foldWidth / 2 + 3, dims.w / 2 - foldWidth / 2 - 3);
    const fold = new THREE.Mesh(new THREE.BoxGeometry(foldWidth, 2.2, 2.2), material(theme.accent2, 0.44, true));
    fold.position.set(foldX, port.y, -dims.d / 2 + 2);
    group.add(fold);
    group.add(positionedEdges(new THREE.BoxGeometry(foldWidth, 2.2, 2.2), theme.accent2, fold.position));
  }

  if (port.label) addLabel(group, `${formatNumber(actualLength, 1)} cm port`, new THREE.Vector3(port.x - dims.w * 0.18, -dims.h / 2 - 4, dims.d / 2 + 2), theme.text);
}

function addPassiveRadiators(group, dims, box, theme) {
  const passive = box.passiveRadiator || {};
  const diameter = passive.diameterCm || diameterFromArea(passive.sdCm2) || driverDiameterCm({ driver: {} }) * 0.85;
  const count = clampInt(passive.count || 1, 1, 4);
  const radius = clamp(diameter / 2, 3, Math.min(dims.w, dims.h) * 0.22);
  const spread = Math.min(dims.w * 0.45, count * radius * 1.6);
  for (let index = 0; index < count; index += 1) {
    const x = count === 1 ? 0 : -spread / 2 + (spread * index) / (count - 1);
    const y = -dims.h * 0.28;
    addDisc(group, radius, new THREE.Vector3(x, y, dims.d / 2 + 0.7), theme.field, theme.accent2, 0.72);
    addDisc(group, radius * 0.48, new THREE.Vector3(x, y, dims.d / 2 + 1.05), theme.surface2, theme.line, 0.9);
  }
  addLabel(group, `${formatNumber(radius * 2, 1)} cm PR`, new THREE.Vector3(0, -dims.h * 0.28 - radius - 5, dims.d / 2 + 2), theme.text);
}

function addBandpass(group, dims, box, theme) {
  const bandpass = normalizeBandpassOptions(box);
  const rearShare = bandpass.rearVolumeL / Math.max(bandpass.rearVolumeL + bandpass.frontVolumeL, 0.1);
  const rearDepth = dims.d * rearShare;
  const dividerZ = dims.d / 2 - rearDepth;
  const divider = new THREE.Mesh(new THREE.BoxGeometry(dims.w * 0.96, dims.h * 0.92, 0.7), material(theme.accent, 0.34, true));
  divider.position.z = dividerZ;
  group.add(divider);
  group.add(positionedEdges(new THREE.BoxGeometry(dims.w * 0.96, dims.h * 0.92, 0.7), theme.accent, divider.position));

  const chamberFront = new THREE.Mesh(new THREE.BoxGeometry(dims.w * 0.92, dims.h * 0.86, Math.max(dims.d / 2 - dividerZ, 1)), material(theme.surface2, 0.13, true));
  chamberFront.position.z = (dims.d / 2 + dividerZ) / 2;
  const chamberRear = new THREE.Mesh(new THREE.BoxGeometry(dims.w * 0.92, dims.h * 0.86, Math.max(dividerZ + dims.d / 2, 1)), material(theme.surface3, 0.16, true));
  chamberRear.position.z = (-dims.d / 2 + dividerZ) / 2;
  group.add(chamberFront, chamberRear);

  addLabel(group, `front ${formatNumber(bandpass.frontVolumeL, 1)} L`, new THREE.Vector3(-dims.w / 2, dims.h / 2 + 5, dims.d * 0.25), theme.text);
  addLabel(group, `rear ${formatNumber(bandpass.rearVolumeL, 1)} L`, new THREE.Vector3(-dims.w / 2, dims.h / 2 + 5, -dims.d * 0.25), theme.text);

  addPort(group, dims, {
    shape: "round",
    diameterCm: bandpass.frontPortDiameterCm,
    lengthCm: bandpass.frontPortLengthCm,
    count: bandpass.frontPortCount,
    x: -dims.w * 0.22,
    y: -dims.h * 0.28,
    label: true,
  }, theme);

  if (bandpass.order === 6) {
    addPort(group, dims, {
      shape: "round",
      diameterCm: bandpass.rearPortDiameterCm,
      lengthCm: bandpass.rearPortLengthCm,
      count: bandpass.rearPortCount,
      x: dims.w * 0.22,
      y: -dims.h * 0.28,
      label: true,
    }, theme);
  }
}

function addDimensionLines(group, dims, theme) {
  const points = [
    new THREE.Vector3(-dims.w / 2, -dims.h / 2 - 5, dims.d / 2),
    new THREE.Vector3(dims.w / 2, -dims.h / 2 - 5, dims.d / 2),
  ];
  group.add(line(points, theme.muted));
  addLabel(group, `${formatNumber(dims.w, 1)} x ${formatNumber(dims.h, 1)} x ${formatNumber(dims.d, 1)} cm`, new THREE.Vector3(0, -dims.h / 2 - 10, dims.d / 2), theme.muted);
}

function addDisc(group, radius, position, fill, stroke, opacity = 0.8) {
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1.2, 56), material(fill, opacity, true));
  disc.rotation.x = Math.PI / 2;
  disc.position.copy(position);
  group.add(disc);
  group.add(positionedEdges(new THREE.CylinderGeometry(radius, radius, 1.2, 56), stroke, position, disc.rotation));
}

function addLabel(group, text, position, color) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = 256;
  const height = 48;
  canvas.width = width;
  canvas.height = height;
  context.font = "700 18px system-ui";
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.position.copy(position);
  sprite.scale.set(29, 5.4, 1);
  group.add(sprite);
}

function line(points, color) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color }));
}

function edges(geometry, color, opacity = 1) {
  const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  return new THREE.LineSegments(new THREE.EdgesGeometry(geometry), material);
}

function positionedEdges(geometry, color, position, rotation = null) {
  const edge = edges(geometry, color, 0.9);
  edge.position.copy(position);
  if (rotation) edge.rotation.copy(rotation);
  return edge;
}

function material(color, opacity = 1, transparent = false) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.04,
    transparent,
    opacity,
    depthWrite: opacity > 0.32,
    side: THREE.DoubleSide,
  });
}

function updateCamera(preview) {
  const x = Math.sin(preview.rotation.y) * Math.cos(preview.rotation.x) * preview.distance;
  const y = Math.sin(preview.rotation.x) * preview.distance;
  const z = Math.cos(preview.rotation.y) * Math.cos(preview.rotation.x) * preview.distance;
  preview.camera.position.set(x, y, z);
  preview.camera.lookAt(0, 0, 0);
}

function enclosureDimensions(state) {
  const mode = state.mode || "sealed";
  const box = state.box || {};
  let volume = volumeForState(state);
  if (mode === "bandpass") {
    const bandpass = normalizeBandpassOptions(box);
    volume = bandpass.frontVolumeL + bandpass.rearVolumeL;
  }
  const cc = Math.max(volume * 1000, 1000);
  const height = Math.cbrt(cc * 1.48);
  const width = height * 0.68;
  const depth = cc / Math.max(width * height, 1);
  return {
    w: clamp(width, 20, 95),
    h: clamp(height, 24, 125),
    d: clamp(depth, 18, 105),
  };
}

function volumeForState(state) {
  return Math.max(Number(state.box?.volumeL) || 1, 1);
}

function driverDiameterCm(state) {
  const sd = Number(state.driver?.sdCm2);
  return diameterFromArea(sd) || 16;
}

function diameterFromArea(areaCm2) {
  const area = Number(areaCm2);
  if (!Number.isFinite(area) || area <= 0) return null;
  return 2 * Math.sqrt(area / Math.PI);
}

function portInfo(box = {}) {
  const fallback = portLengthFromTuningOptions(box.volumeL || 24, box.fb || 35, box);
  return {
    shape: box.portShape === "rectangular" ? "rectangular" : "round",
    diameterCm: Number(box.portDiameterCm) || 8,
    widthCm: Number(box.portWidthCm) || 16,
    heightCm: Number(box.portHeightCm) || 3,
    count: Number(box.portCount) || fallback.count || 1,
    lengthCm: Number(box.portLengthCm) > 0 ? Number(box.portLengthCm) : fallback.physicalLength * 100,
  };
}

function modelSignature(state, theme) {
  const box = state.box || {};
  const passive = box.passiveRadiator || {};
  const bandpass = box.bandpass || {};
  return JSON.stringify({
    mode: state.mode,
    volumeL: box.volumeL,
    driverSd: state.driver?.sdCm2,
    portShape: box.portShape,
    portDiameterCm: box.portDiameterCm,
    portWidthCm: box.portWidthCm,
    portHeightCm: box.portHeightCm,
    portLengthCm: box.portLengthCm,
    portCount: box.portCount,
    fb: box.fb,
    passive,
    bandpass,
    theme,
  });
}

function getTheme(element) {
  const styles = getComputedStyle(element);
  return {
    chrome: styles.getPropertyValue("--chrome").trim() || "#181b1f",
    surface: styles.getPropertyValue("--chrome-2").trim() || "#263035",
    surface2: styles.getPropertyValue("--surface-soft").trim() || "#1f282d",
    surface3: styles.getPropertyValue("--surface-faint").trim() || "#2c3539",
    field: styles.getPropertyValue("--field").trim() || "#0e1113",
    line: styles.getPropertyValue("--line").trim() || "#64727a",
    accent: styles.getPropertyValue("--accent").trim() || "#35b779",
    accent2: styles.getPropertyValue("--accent-2").trim() || "#57b9ff",
    port: styles.getPropertyValue("--accent-2").trim() || "#57b9ff",
    muted: styles.getPropertyValue("--muted").trim() || "#9aa6ad",
    text: styles.getPropertyValue("--text").trim() || "#f5f5f5",
  };
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function clampInt(value, min, max) {
  return Math.round(clamp(value, min, max));
}

function formatNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "n/a";
  return number.toFixed(digits);
}

function readRotationPreference() {
  try {
    return window.localStorage.getItem(BOX_ROTATION_STORAGE_KEY) !== "still";
  } catch {
    return true;
  }
}

function writeRotationPreference(autoRotate) {
  try {
    window.localStorage.setItem(BOX_ROTATION_STORAGE_KEY, autoRotate ? "rotate" : "still");
  } catch {
    // Rotation preference is optional.
  }
}
