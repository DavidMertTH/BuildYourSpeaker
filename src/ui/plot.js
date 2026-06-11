const plotStates = new WeakMap();

export function drawPlot(canvas, config) {
  const state = getPlotState(canvas);
  state.config = config;
  renderPlot(canvas, state);
}

function renderPlot(canvas, state) {
  const config = state.config;
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const theme = getTheme(canvas);
  canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
  canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));

  const ctx = canvas.getContext("2d");
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const margin = { left: 52, right: 18, top: 24, bottom: 38 };
  const width = rect.width - margin.left - margin.right;
  const height = rect.height - margin.top - margin.bottom;
  if (width <= 0 || height <= 0) return;

  ctx.fillStyle = theme.chrome;
  ctx.fillRect(0, 0, rect.width, rect.height);
  const xMin = Math.log10(config.xMin);
  const xMax = Math.log10(config.xMax);
  const yMin = config.yMin;
  const yMax = config.yMax;

  const xScale = (value) => margin.left + ((Math.log10(value) - xMin) / (xMax - xMin)) * width;
  const yScale = (value) => margin.top + (1 - (value - yMin) / (yMax - yMin)) * height;

  ctx.strokeStyle = theme.lineSoft;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const xTicks = [10, 20, 50, 100, 200, 500, 1000];
  for (const tick of xTicks) {
    const x = xScale(tick);
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + height);
  }
  const yStep = niceStep((yMax - yMin) / 5);
  const firstY = Math.ceil(yMin / yStep) * yStep;
  for (let tick = firstY; tick <= yMax; tick += yStep) {
    const y = yScale(tick);
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + width, y);
  }
  ctx.stroke();

  ctx.fillStyle = theme.muted;
  ctx.font = "11px system-ui";
  for (const tick of xTicks) {
    const x = xScale(tick);
    ctx.fillText(String(tick), x - 8, rect.height - 14);
  }
  for (let tick = firstY; tick <= yMax; tick += yStep) {
    const y = yScale(tick);
    ctx.fillText(formatTick(tick), 10, y + 4);
  }

  ctx.strokeStyle = theme.line;
  ctx.strokeRect(margin.left, margin.top, width, height);

  for (const series of config.series) {
    if (!series.values || series.values.length === 0) continue;
    ctx.strokeStyle = series.color;
    ctx.lineWidth = series.width ?? 2;
    ctx.beginPath();
    series.x.forEach((frequency, index) => {
      const x = xScale(frequency);
      const y = yScale(clamp(series.values[index], yMin, yMax));
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  let legendX = margin.left + 8;
  for (const series of config.series) {
    ctx.fillStyle = series.color;
    ctx.fillRect(legendX, margin.top + 8, 16, 3);
    ctx.fillStyle = theme.text;
    ctx.fillText(series.name, legendX + 22, margin.top + 12);
    legendX += ctx.measureText(series.name).width + 52;
  }

  ctx.fillStyle = theme.muted;
  ctx.fillText(config.yLabel, margin.left, rect.height - 14);

  state.metrics = { margin, width, height, rect, xMin, xMax, yMin, yMax, xScale, yScale };
  if (state.hover) drawHover(ctx, config, theme, state.metrics, state.hover);
}

function getPlotState(canvas) {
  let state = plotStates.get(canvas);
  if (!state) {
    state = { config: null, hover: null, metrics: null };
    plotStates.set(canvas, state);
    bindHover(canvas, state);
  }
  return state;
}

function bindHover(canvas, state) {
  canvas.addEventListener("mousemove", (event) => {
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    state.hover = { x, y };
    if (state.config) renderPlot(canvas, state);
  });
  canvas.addEventListener("mouseleave", () => {
    state.hover = null;
    if (state.config) renderPlot(canvas, state);
  });
}

function drawHover(ctx, config, theme, metrics, hover) {
  const { margin, width, height, rect, xMin, xMax, yMin, yMax, xScale, yScale } = metrics;
  if (hover.x < margin.left || hover.x > margin.left + width || hover.y < margin.top || hover.y > margin.top + height) return;

  const logFrequency = xMin + ((hover.x - margin.left) / width) * (xMax - xMin);
  const frequency = 10 ** logFrequency;
  const rows = config.series
    .map((series) => {
      const value = interpolateSeriesValue(series, frequency);
      return Number.isFinite(value) ? { series, value } : null;
    })
    .filter(Boolean);
  if (rows.length === 0) return;

  const cursorX = xScale(frequency);
  ctx.save();
  ctx.strokeStyle = theme.hoverLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cursorX, margin.top);
  ctx.lineTo(cursorX, margin.top + height);
  ctx.stroke();

  ctx.font = "11px system-ui";
  const header = `${formatFrequency(frequency)} Hz`;
  const rowTexts = rows.map(({ series, value }) => `${series.name}: ${formatValue(value)} ${config.yLabel}`);
  const textWidth = Math.max(ctx.measureText(header).width, ...rowTexts.map((text) => ctx.measureText(text).width));
  const boxWidth = Math.min(textWidth + 28, rect.width - 12);
  const boxHeight = 20 + rows.length * 17;
  let boxX = cursorX + 12;
  if (boxX + boxWidth > rect.width - 6) boxX = cursorX - boxWidth - 12;
  boxX = clamp(boxX, 6, rect.width - boxWidth - 6);
  let boxY = hover.y - boxHeight / 2;
  boxY = clamp(boxY, margin.top + 4, margin.top + height - boxHeight - 4);

  ctx.fillStyle = theme.tooltip;
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 1;
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.text;
  ctx.fillText(header, boxX + 10, boxY + 14);

  rows.forEach(({ series, value }, index) => {
    const y = yScale(clamp(value, yMin, yMax));
    ctx.fillStyle = series.color;
    ctx.beginPath();
    ctx.arc(cursorX, y, 3, 0, Math.PI * 2);
    ctx.fill();

    const rowY = boxY + 31 + index * 17;
    ctx.fillRect(boxX + 10, rowY - 7, 10, 3);
    ctx.fillStyle = theme.text;
    ctx.fillText(`${series.name}: ${formatValue(value)} ${config.yLabel}`, boxX + 26, rowY - 3);
  });
  ctx.restore();
}

function interpolateSeriesValue(series, frequency) {
  if (!series.x || !series.values || series.x.length === 0) return NaN;
  if (frequency <= series.x[0]) return series.values[0];
  const lastIndex = Math.min(series.x.length, series.values.length) - 1;
  if (frequency >= series.x[lastIndex]) return series.values[lastIndex];

  for (let index = 1; index <= lastIndex; index += 1) {
    if (series.x[index] < frequency) continue;
    const leftX = Math.log10(series.x[index - 1]);
    const rightX = Math.log10(series.x[index]);
    const ratio = (Math.log10(frequency) - leftX) / (rightX - leftX || 1);
    return series.values[index - 1] + (series.values[index] - series.values[index - 1]) * ratio;
  }
  return series.values[lastIndex];
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function getTheme(element) {
  const styles = getComputedStyle(element);
  return {
    chrome: styles.getPropertyValue("--chrome").trim() || "#181b1f",
    line: styles.getPropertyValue("--line").trim() || "#52616b",
    lineSoft: styles.getPropertyValue("--line-soft").trim() || "#303840",
    muted: styles.getPropertyValue("--muted").trim() || "#9aa6ad",
    text: styles.getPropertyValue("--text").trim() || "#cfd7dc",
    hoverLine: styles.getPropertyValue("--accent").trim() || "#35b779",
    tooltip: styles.getPropertyValue("--chrome-2").trim() || "#20252b",
  };
}

export function autoRange(values, padding = 0.12) {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return [0, 1];
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (Math.abs(max - min) < 1e-9) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * padding;
  return [min - pad, max + pad];
}

function niceStep(rawStep) {
  const exponent = Math.floor(Math.log10(Math.max(rawStep, 1e-9)));
  const fraction = rawStep / 10 ** exponent;
  if (fraction < 1.5) return 10 ** exponent;
  if (fraction < 3.5) return 2 * 10 ** exponent;
  if (fraction < 7.5) return 5 * 10 ** exponent;
  return 10 ** (exponent + 1);
}

function formatTick(value) {
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function formatFrequency(value) {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function formatValue(value) {
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(3);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
