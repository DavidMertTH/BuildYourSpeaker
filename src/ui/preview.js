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
  addDrivers(preview.model, dims, driverGroupsForPreview(state), theme);

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

function addDrivers(group, dims, driverGroups, theme) {
  const drivers = flattenDriverGroups(driverGroups);
  if (!drivers.length) return;

  const layout = driverLayout(dims, drivers.length);
  const naturalRadii = drivers.map((item) => Math.max(item.group.diameterCm / 2, 1));
  const maxNaturalRadius = Math.max(...naturalRadii, 1);
  const radiusScale = Math.min(1, layout.maxRadius / maxNaturalRadius);
  const groupColors = [theme.accent, theme.accent2, theme.text, theme.muted];
  const z = dims.d / 2 + 0.85;

  drivers.forEach((item, index) => {
    const { x, y } = driverPosition(layout, index);
    const minimumRadius = Math.min(2.2, layout.maxRadius);
    const radius = clamp(naturalRadii[index] * radiusScale, minimumRadius, layout.maxRadius);
    const color = groupColors[item.groupIndex % groupColors.length];
    addDisc(group, radius, new THREE.Vector3(x, y, z), theme.field, theme.line, 0.78);
    addDisc(group, radius * 0.56, new THREE.Vector3(x, y, z + 0.35), color, theme.line, 0.92);
  });

  addLabel(group, driverSummaryLabel(driverGroups, drivers), new THREE.Vector3(-dims.w * 0.22, dims.h / 2 + 4, z + 2), theme.text);
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
  const section = portSection(port, dims);
  const visualLength = Math.min(actualLength, Math.max(dims.d * 3.2, 14));
  const clearance = Math.max(section.width, section.height) * 0.62 + 2;
  const insideLength = Math.max(1, Math.min(visualLength, dims.d - clearance - 1.5));
  const foldedLength = Math.max(0, visualLength - insideLength);
  const zFront = dims.d / 2 + 0.3;
  const zCenter = zFront - insideLength / 2;
  const inlet = new THREE.Vector3(port.x, port.y, zCenter);

  addPortSegment(group, section, "z", insideLength, inlet, theme);

  if (foldedLength > 0) {
    const start = new THREE.Vector3(port.x, port.y, zFront - insideLength);
    addFoldedPortPath(group, dims, port, section, start, foldedLength, clearance, theme);
  }

  if (port.label) addLabel(group, `${formatNumber(actualLength, 1)} cm port`, new THREE.Vector3(port.x - dims.w * 0.18, -dims.h / 2 - 4, dims.d / 2 + 2), theme.text);
}

function portSection(port, dims) {
  if (port.shape === "rectangular") {
    const width = clamp(Number(port.widthCm) || 8, 3, dims.w * 0.42);
    const height = clamp(Number(port.heightCm) || 3, 1.5, dims.h * 0.16);
    return { shape: "rectangular", width, height, radius: Math.max(width, height) / 2 };
  }
  const radius = clamp((Number(port.diameterCm) || 7) / 2, 1.6, dims.w * 0.12);
  return { shape: "round", width: radius * 2, height: radius * 2, radius };
}

function addFoldedPortPath(group, dims, port, section, start, length, clearance, theme) {
  const bounds = {
    x: [-dims.w / 2 + clearance, dims.w / 2 - clearance],
    y: [-dims.h / 2 + clearance, dims.h / 2 - clearance],
    z: [-dims.d / 2 + clearance, dims.d / 2 - clearance],
  };
  const cursor = start.clone();
  cursor.x = clamp(cursor.x, bounds.x[0], bounds.x[1]);
  cursor.y = clamp(cursor.y, bounds.y[0], bounds.y[1]);
  cursor.z = clamp(cursor.z, bounds.z[0], bounds.z[1]);

  const xDirection = Math.abs(port.x) > dims.w * 0.04 ? Math.sign(port.x) : 1;
  const yDirection = port.y <= 0 ? 1 : -1;
  const directions = [
    { axis: "x", sign: xDirection },
    { axis: "y", sign: yDirection },
    { axis: "z", sign: 1 },
    { axis: "x", sign: -xDirection },
    { axis: "y", sign: -yDirection },
    { axis: "z", sign: -1 },
  ];

  let remaining = length;
  for (let index = 0; remaining > 0.2 && index < directions.length * 3; index += 1) {
    const direction = directions[index % directions.length];
    const limit = direction.sign > 0 ? bounds[direction.axis][1] : bounds[direction.axis][0];
    const capacity = Math.abs(limit - cursor[direction.axis]);
    if (capacity < Math.max(1.2, Math.min(section.width, section.height) * 0.35)) continue;

    const run = Math.min(remaining, capacity);
    const center = cursor.clone();
    center[direction.axis] += direction.sign * run * 0.5;
    addPortBend(group, section, cursor, theme);
    addPortSegment(group, section, direction.axis, run, center, theme, 0.54);
    cursor[direction.axis] += direction.sign * run;
    remaining -= run;
  }
}

function addPortSegment(group, section, axis, length, position, theme, opacity = null) {
  const ductOpacity = opacity ?? (section.shape === "rectangular" ? 0.62 : 0.68);
  const geometry = portSegmentGeometry(section, axis, length);
  const duct = new THREE.Mesh(geometry, material(theme.port, ductOpacity, true));
  orientPortSegment(duct, section, axis);
  duct.position.copy(position);
  group.add(duct);
  group.add(positionedEdges(portSegmentGeometry(section, axis, length), theme.accent2, duct.position, duct.rotation));
}

function portSegmentGeometry(section, axis, length) {
  if (section.shape === "rectangular") {
    if (axis === "x") return new THREE.BoxGeometry(length, section.height, section.width);
    if (axis === "y") return new THREE.BoxGeometry(section.width, length, section.height);
    return new THREE.BoxGeometry(section.width, section.height, length);
  }
  return new THREE.CylinderGeometry(section.radius, section.radius, length, 40, 1, true);
}

function orientPortSegment(mesh, section, axis) {
  if (section.shape !== "round") return;
  if (axis === "x") mesh.rotation.z = Math.PI / 2;
  if (axis === "z") mesh.rotation.x = Math.PI / 2;
}

function addPortBend(group, section, position, theme) {
  const size = Math.max(section.width, section.height);
  const geometry = section.shape === "round"
    ? new THREE.SphereGeometry(section.radius * 1.02, 24, 12)
    : new THREE.BoxGeometry(section.width, section.height, size * 0.72);
  const bend = new THREE.Mesh(geometry, material(theme.port, 0.5, true));
  bend.position.copy(position);
  group.add(bend);
  group.add(positionedEdges(geometry, theme.accent2, bend.position));
}

function addPassiveRadiators(group, dims, box, theme) {
  const passive = box.passiveRadiator || {};
  const diameter = passive.diameterCm || diameterFromArea(passive.sdCm2) || driverDiameterCmFromDriver({}) * 0.85;
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

function driverGroupsForPreview(state) {
  const rawGroups = Array.isArray(state.driverGroups) && state.driverGroups.length
    ? state.driverGroups
    : [{
        id: "driver-main",
        name: "Driver",
        driver: state.driver || {},
        count: state.box?.driverCount || 1,
      }];

  const fallbackDriver = state.driver || {};
  return rawGroups
    .map((group, index) => {
      const driver = group?.driver || (index === 0 ? fallbackDriver : {});
      const count = clampInt(group?.count ?? (index === 0 ? state.box?.driverCount : 1), 1, 16);
      return {
        id: group?.id || `driver-group-${index + 1}`,
        name: String(group?.name || `Group ${index + 1}`).trim() || `Group ${index + 1}`,
        driver,
        count,
        diameterCm: driverDiameterCmFromDriver(driver || fallbackDriver),
      };
    })
    .filter((group) => group.count > 0);
}

function flattenDriverGroups(driverGroups) {
  const drivers = [];
  driverGroups.forEach((group, groupIndex) => {
    for (let copy = 0; copy < group.count; copy += 1) {
      drivers.push({ group, groupIndex, copy });
    }
  });
  return drivers;
}

function driverLayout(dims, count) {
  const baffleRatio = dims.w / Math.max(dims.h * 0.72, 1);
  const columns = clampInt(Math.ceil(Math.sqrt(count * baffleRatio)), 1, Math.min(count, 6));
  const rows = Math.ceil(count / columns);
  const availableWidth = dims.w * 0.76;
  const availableHeight = dims.h * (rows <= 2 ? 0.52 : 0.62);
  const cellW = availableWidth / columns;
  const cellH = availableHeight / rows;
  return {
    count,
    columns,
    rows,
    availableWidth,
    cellW,
    cellH,
    centerY: dims.h * 0.12,
    maxRadius: Math.max(1.4, Math.min(cellW, cellH) * 0.36),
  };
}

function driverPosition(layout, index) {
  const row = Math.floor(index / layout.columns);
  const col = index % layout.columns;
  const itemsInRow = Math.min(layout.columns, layout.count - row * layout.columns);
  const centeredCol = col + (layout.columns - itemsInRow) / 2;
  const x = -layout.availableWidth / 2 + layout.cellW / 2 + centeredCol * layout.cellW;
  const y = layout.centerY + ((layout.rows - 1) * layout.cellH) / 2 - row * layout.cellH;
  return { x, y };
}

function driverSummaryLabel(driverGroups, drivers) {
  if (driverGroups.length === 1) {
    const group = driverGroups[0];
    return `${group.count}x ${formatNumber(group.diameterCm, 1)} cm ${shortLabel(group.name, 16)}`;
  }
  return `${drivers.length} active drivers / ${driverGroups.length} groups`;
}

function shortLabel(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}.`;
}

function driverDiameterCmFromDriver(driver) {
  const sd = Number(driver?.sdCm2);
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
  const driverGroups = driverGroupsForPreview(state).map((group) => ({
    id: group.id,
    name: group.name,
    count: group.count,
    sdCm2: group.driver?.sdCm2,
    diameterCm: group.diameterCm,
  }));
  return JSON.stringify({
    mode: state.mode,
    volumeL: box.volumeL,
    driverGroups,
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
