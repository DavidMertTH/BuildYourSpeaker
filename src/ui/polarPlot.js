export function drawPolarPlot(canvas, config = {}) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const pixelWidth = Math.max(1, Math.floor(rect.width * pixelRatio));
  const pixelHeight = Math.max(1, Math.floor(rect.height * pixelRatio));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext("2d");
  const theme = getTheme(canvas);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = theme.chrome;
  ctx.fillRect(0, 0, rect.width, rect.height);

  const size = Math.min(rect.width, rect.height);
  const compact = rect.width < 360 || rect.height < 180;
  const radius = Math.max(28, size * (compact ? 0.31 : 0.38));
  const centerX = compact ? rect.width * 0.58 : rect.width * 0.5;
  const centerY = rect.height * (compact ? 0.57 : 0.52);
  const minDb = Number.isFinite(config.minDb) ? config.minDb : -30;
  const maxDb = Number.isFinite(config.maxDb) ? config.maxDb : 0;
  const radialScale = (db) => {
    const ratio = (Math.max(minDb, Math.min(maxDb, db)) - minDb) / (maxDb - minDb || 1);
    return ratio * radius;
  };

  drawGrid(ctx, theme, { centerX, centerY, radius, minDb, maxDb, radialScale, compact });
  drawSeries(ctx, config.series || [], { centerX, centerY, radialScale });
  drawTitle(ctx, theme, config.title || "Polar response", rect, compact);
  drawLegend(ctx, theme, config.series || [], rect, compact);
  drawEmptyState(ctx, theme, config, rect, compact);
}

function drawGrid(ctx, theme, metrics) {
  const { centerX, centerY, radius, minDb, maxDb, radialScale, compact } = metrics;
  ctx.save();
  ctx.strokeStyle = theme.lineSoft;
  ctx.lineWidth = 1;

  for (const db of [minDb, -24, -18, -12, -6, maxDb].filter((value, index, values) => value >= minDb && value <= maxDb && values.indexOf(value) === index)) {
    const ringRadius = radialScale(db);
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    if (!compact || db === minDb || db === maxDb) {
      ctx.fillStyle = theme.muted;
      ctx.font = "10px system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${db}`, centerX + ringRadius + 4, centerY);
    }
  }

  for (let angle = -180; angle <= 180; angle += 30) {
    const radians = degreesToRadians(angle - 90);
    const x = centerX + Math.cos(radians) * radius;
    const y = centerY + Math.sin(radians) * radius;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();

    const shouldLabel = compact ? [-90, 0, 90, 180].includes(angle) : angle % 60 === 0;
    if (shouldLabel) {
      const labelRadius = radius + 16;
      ctx.fillStyle = theme.muted;
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${angle}`, centerX + Math.cos(radians) * labelRadius, centerY + Math.sin(radians) * labelRadius);
    }
  }

  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSeries(ctx, series, metrics) {
  const { centerX, centerY, radialScale } = metrics;
  series.forEach((item) => {
    const points = item.points || [];
    if (!points.length) return;
    ctx.save();
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.width || 2;
    ctx.globalAlpha = item.opacity ?? 0.95;
    ctx.beginPath();
    points.forEach((point, index) => {
      const radians = degreesToRadians(point.angleDeg - 90);
      const radius = radialScale(point.db);
      const x = centerX + Math.cos(radians) * radius;
      const y = centerY + Math.sin(radians) * radius;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  });
}

function drawTitle(ctx, theme, title, rect, compact) {
  ctx.save();
  ctx.fillStyle = theme.text;
  ctx.font = "12px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(title, 10, 8);
  ctx.restore();
}

function drawLegend(ctx, theme, series, rect, compact) {
  const rows = series.slice(0, 6);
  if (!rows.length) return;
  ctx.save();
  ctx.font = "10px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const x = 10;
  const startY = compact ? 30 : rect.height - rows.length * 16 - 8;
  const rowHeight = compact ? 12 : 16;
  rows.forEach((item, index) => {
    const y = startY + index * rowHeight;
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 14, y);
    ctx.stroke();
    ctx.fillStyle = theme.text;
    ctx.fillText(item.name, x + 19, y);
  });
  ctx.restore();
}

function drawEmptyState(ctx, theme, config, rect, compact) {
  if ((config.series || []).length) return;
  const message = config.emptyMessage || "Need at least two angles in one recording group.";
  ctx.save();
  ctx.fillStyle = theme.muted;
  ctx.font = compact ? "10px system-ui" : "12px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  wrapText(ctx, message, rect.width / 2, rect.height / 2, Math.max(80, rect.width - 28), compact ? 12 : 15);
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) current = next;
    else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => ctx.fillText(line, x, startY + index * lineHeight));
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function getTheme(element) {
  const styles = getComputedStyle(element);
  return {
    chrome: styles.getPropertyValue("--chrome").trim() || "#181b1f",
    line: styles.getPropertyValue("--line").trim() || "#52616b",
    lineSoft: styles.getPropertyValue("--line-soft").trim() || "#303840",
    muted: styles.getPropertyValue("--muted").trim() || "#9aa6ad",
    text: styles.getPropertyValue("--text").trim() || "#cfd7dc",
  };
}
