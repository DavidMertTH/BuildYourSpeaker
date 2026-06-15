export function drawBoxPreview(canvas, state) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
  canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));

  const theme = getTheme(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = theme.chrome;
  ctx.fillRect(0, 0, rect.width, rect.height);

  const volume = Math.max(Number(state.box.volumeL), 1);
  const aspect = 0.68;
  const depthFactor = 0.38;
  const boxW = Math.min(rect.width * 0.48, 170 + Math.log10(volume) * 24);
  const boxH = boxW / aspect;
  const depth = boxW * depthFactor;
  const x = rect.width / 2 - boxW / 2 - depth / 2;
  const y = rect.height / 2 - boxH / 2 + depth / 2;

  ctx.fillStyle = theme.surface3;
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + depth, y - depth);
  ctx.lineTo(x + boxW + depth, y - depth);
  ctx.lineTo(x + boxW, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.surface2;
  ctx.beginPath();
  ctx.moveTo(x + boxW, y);
  ctx.lineTo(x + boxW + depth, y - depth);
  ctx.lineTo(x + boxW + depth, y + boxH - depth);
  ctx.lineTo(x + boxW, y + boxH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.surface;
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeRect(x, y, boxW, boxH);

  const coneR = Math.min(boxW, boxH) * 0.22;
  ctx.fillStyle = theme.field;
  ctx.beginPath();
  ctx.arc(x + boxW * 0.5, y + boxH * 0.42, coneR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(x + boxW * 0.5, y + boxH * 0.42, coneR * 0.55, 0, Math.PI * 2);
  ctx.fill();

  if (state.mode === "vented") {
    ctx.fillStyle = theme.field;
    ctx.fillRect(x + boxW * 0.35, y + boxH * 0.76, boxW * 0.3, boxH * 0.08);
    ctx.strokeRect(x + boxW * 0.35, y + boxH * 0.76, boxW * 0.3, boxH * 0.08);
  } else if (state.mode === "passive") {
    const passiveR = coneR * 0.62;
    ctx.fillStyle = theme.field;
    ctx.beginPath();
    ctx.arc(x + boxW * 0.5, y + boxH * 0.76, passiveR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.surface2;
    ctx.beginPath();
    ctx.arc(x + boxW * 0.5, y + boxH * 0.76, passiveR * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = theme.muted;
  ctx.font = "12px system-ui";
  ctx.fillText(`${volume.toFixed(1)} L ${state.mode}`, 16, rect.height - 18);
}

function getTheme(element) {
  const styles = getComputedStyle(element);
  return {
    chrome: styles.getPropertyValue("--chrome").trim() || "#181b1f",
    surface: styles.getPropertyValue("--chrome-2").trim() || "#263035",
    surface2: styles.getPropertyValue("--line-soft").trim() || "#1f282d",
    surface3: styles.getPropertyValue("--line").trim() || "#2c3539",
    field: styles.getPropertyValue("--field").trim() || "#0e1113",
    line: styles.getPropertyValue("--line").trim() || "#64727a",
    accent: styles.getPropertyValue("--accent").trim() || "#35b779",
    muted: styles.getPropertyValue("--muted").trim() || "#9aa6ad",
  };
}
