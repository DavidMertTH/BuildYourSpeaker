const plotStates = new WeakMap();
const PLOT_TRANSITION_MS = 120;
const activePlotAnimations = new Set();
let plotFrame = null;

export function drawPlot(canvas, config, options = {}) {
  if (!canvas) return;
  const state = getPlotState(canvas);
  const nextConfig = clonePlotConfig(config);
  state.canvas = canvas;

  if (!state.renderedConfig || !options.animate) {
    cancelPlotFrame(state);
    state.config = nextConfig;
    state.displayConfig = nextConfig;
    state.renderedConfig = nextConfig;
    state.transition = null;
    renderPlot(canvas, state);
    return;
  }

  cancelPlotFrame(state);
  state.config = nextConfig;
  state.transition = createPlotTransition(clonePlotConfig(state.displayConfig || state.renderedConfig), nextConfig);
  schedulePlotFrame(canvas, state);
}

export function adoptPlotState(targetCanvas, sourceCanvas) {
  if (!targetCanvas || !sourceCanvas || targetCanvas === sourceCanvas) return;
  const sourceState = plotStates.get(sourceCanvas);
  if (!sourceState?.displayConfig && !sourceState?.renderedConfig) return;
  const targetState = getPlotState(targetCanvas);
  cancelPlotFrame(targetState);
  const sourceConfig = clonePlotConfig(sourceState.displayConfig || sourceState.renderedConfig);
  targetState.config = sourceConfig;
  targetState.displayConfig = sourceConfig;
  targetState.renderedConfig = sourceConfig;
  targetState.transition = null;
}

function renderPlot(canvas, state) {
  const config = state.displayConfig || state.config;
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const theme = getTheme(canvas);
  const ctx = canvas.getContext("2d");
  const pixelWidth = Math.max(1, Math.floor(rect.width * pixelRatio));
  const pixelHeight = Math.max(1, Math.floor(rect.height * pixelRatio));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    state.edgeCacheKey = "";
  }
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const edge = detectPlotEdges(canvas, state);
  const margin = { left: 0, right: 0, top: 0, bottom: 0 };
  const width = rect.width - margin.left - margin.right;
  const height = rect.height - margin.top - margin.bottom;
  if (width <= 0 || height <= 0) return;

  ctx.fillStyle = theme.chrome;
  ctx.fillRect(0, 0, rect.width, rect.height);
  const xMin = Math.log10(config.xMin);
  const xMax = Math.log10(config.xMax);
  const yMode = config.yScale === "log" && config.yMin > 0 && config.yMax > config.yMin * 1.001 ? "log" : "linear";
  const yMin = config.yMin;
  const yMax = config.yMax;
  const yDomainMin = yMode === "log" ? Math.log10(yMin) : yMin;
  const yDomainMax = yMode === "log" ? Math.log10(yMax) : yMax;

  const xScale = (value) => margin.left + ((Math.log10(value) - xMin) / (xMax - xMin)) * width;
  const yScale = (value) => {
    const scaledValue = yMode === "log" ? Math.log10(Math.max(value, yMin)) : value;
    return margin.top + (1 - (scaledValue - yDomainMin) / (yDomainMax - yDomainMin)) * height;
  };

  ctx.strokeStyle = theme.lineSoft;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const xTicks = frequencyTicks(config.xMin, config.xMax);
  for (const tick of xTicks) {
    const x = xScale(tick);
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + height);
  }
  const yTicks = yMode === "log" ? logValueTicks(yMin, yMax) : linearValueTicks(yMin, yMax);
  for (const tick of yTicks) {
    const y = yScale(tick);
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + width, y);
  }
  ctx.stroke();

  ctx.strokeStyle = theme.line;
  ctx.strokeRect(margin.left, margin.top, width, height);

  drawAnnotationBands(ctx, config, theme, { margin, width, height, xScale, yScale });

  for (const series of config.series) {
    if (!series.values || series.values.length === 0) continue;
    ctx.globalAlpha = series.opacity ?? 1;
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
  ctx.globalAlpha = 1;

  drawAnnotationLines(ctx, config, theme, { margin, width, height, rect, xScale, yScale });

  ctx.fillStyle = theme.muted;
  ctx.font = "10px system-ui";
  if (edge.left) {
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (const tick of yTicks) {
      const y = clamp(yScale(tick), 8, rect.height - 8);
      drawInlineLabel(ctx, formatAxisTick(tick), 6, y, "left", "middle", theme);
    }
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  for (const tick of xTicks) {
    const x = clamp(xScale(tick), 14, rect.width - 14);
    drawInlineLabel(ctx, formatFrequencyTick(tick), x, rect.height - 6, "center", "bottom", theme);
  }
  ctx.textAlign = "right";
  drawInlineLabel(ctx, "Hz", rect.width - 7, rect.height - 20, "right", "bottom", theme);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  drawInlineLabel(ctx, config.yLabel, 6, 6, "left", "top", theme);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  state.metrics = { margin, width, height, rect, xMin, xMax, yMin, yMax, yMode, xScale, yScale };
  if (state.hover) drawHover(ctx, config, theme, state.metrics, state.hover);
}

function getPlotState(canvas) {
  let state = plotStates.get(canvas);
  if (!state) {
    state = { canvas, config: null, displayConfig: null, renderedConfig: null, transition: null, hover: null, metrics: null, edgeCacheKey: "", edgeCache: null };
    plotStates.set(canvas, state);
    bindHover(canvas, state);
  }
  return state;
}

function bindHover(canvas, state) {
  canvas.addEventListener("pointerdown", (event) => {
    const drag = draggableAnnotationAtEvent(canvas, state, event);
    if (!drag) return;
    event.preventDefault();
    event.stopPropagation();
    state.drag = drag;
    canvas.setPointerCapture?.(event.pointerId);
    canvas.classList.add("is-dragging-annotation");
    updateAnnotationDrag(canvas, state, event, false);
  });

  canvas.addEventListener("pointermove", (event) => {
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    if (state.drag) {
      event.preventDefault();
      event.stopPropagation();
      updateAnnotationDrag(canvas, state, event, false);
      return;
    }
    state.hover = { x, y };
    updateAnnotationCursor(canvas, state, event);
    if (state.displayConfig || state.config) renderPlot(canvas, state);
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!state.drag) return;
    event.preventDefault();
    event.stopPropagation();
    updateAnnotationDrag(canvas, state, event, true);
    state.drag = null;
    canvas.releasePointerCapture?.(event.pointerId);
    canvas.classList.remove("is-dragging-annotation");
    updateAnnotationCursor(canvas, state, event);
  });

  canvas.addEventListener("pointercancel", (event) => {
    if (!state.drag) return;
    state.drag = null;
    canvas.releasePointerCapture?.(event.pointerId);
    canvas.classList.remove("is-dragging-annotation");
    updateAnnotationCursor(canvas, state, event);
  });

  canvas.addEventListener("mouseleave", (event) => {
    if (state.drag) return;
    state.hover = null;
    updateAnnotationCursor(canvas, state, event);
    if (state.displayConfig || state.config) renderPlot(canvas, state);
  });
}

function draggableAnnotationAtEvent(canvas, state, event) {
  const metrics = state.metrics;
  const config = state.displayConfig || state.config;
  if (!metrics || !config?.onAnnotationDrag) return null;

  const bounds = canvas.getBoundingClientRect();
  const pointer = {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
  const { margin, width, height, xScale } = metrics;
  if (pointer.y < margin.top || pointer.y > margin.top + height) return null;

  let best = null;
  (config.annotations || []).forEach((annotation) => {
    if (!annotation.draggable) return;
    const frequency = Number(annotation.frequencyHz);
    if (!Number.isFinite(frequency) || frequency < config.xMin || frequency > config.xMax) return;
    const distance = Math.abs(pointer.x - xScale(frequency));
    if (distance > 10) return;
    if (!best || distance < best.distance) best = { annotation, distance, width, margin };
  });
  return best ? { annotation: best.annotation } : null;
}

function updateAnnotationCursor(canvas, state, event) {
  if (state.drag) {
    canvas.style.cursor = "ew-resize";
    return;
  }
  canvas.style.cursor = draggableAnnotationAtEvent(canvas, state, event) ? "ew-resize" : "";
}

function updateAnnotationDrag(canvas, state, event, final) {
  const metrics = state.metrics;
  const config = state.displayConfig || state.config;
  if (!metrics || !config?.onAnnotationDrag || !state.drag?.annotation) return;
  const bounds = canvas.getBoundingClientRect();
  const x = clamp(event.clientX - bounds.left, metrics.margin.left, metrics.margin.left + metrics.width);
  const ratio = metrics.width > 0 ? (x - metrics.margin.left) / metrics.width : 0;
  const frequencyHz = 10 ** (metrics.xMin + ratio * (metrics.xMax - metrics.xMin));
  config.onAnnotationDrag({
    annotation: state.drag.annotation,
    frequencyHz: clamp(frequencyHz, config.xMin, config.xMax),
    final,
  });
}

function schedulePlotFrame(canvas, state) {
  state.canvas = canvas;
  activePlotAnimations.add(state);
  if (plotFrame !== null) return;
  plotFrame = requestPlotFrame(runPlotFrame);
}

function runPlotFrame(timestamp) {
  plotFrame = null;

  [...activePlotAnimations].forEach((state) => {
    const transition = state.transition;
    const canvas = state.canvas;
    if (!transition || !canvas) {
      activePlotAnimations.delete(state);
      return;
    }

    const rawProgress = clamp((timestamp - transition.start) / PLOT_TRANSITION_MS, 0, 1);
    const progress = easeInOutCubic(rawProgress);
    state.displayConfig = interpolatePlotTransition(transition, progress);
    renderPlot(canvas, state);

    if (rawProgress < 1) {
      return;
    }

    state.transition = null;
    state.displayConfig = transition.to;
    state.renderedConfig = transition.to;
    activePlotAnimations.delete(state);
    renderPlot(canvas, state);
  });

  if (activePlotAnimations.size > 0) {
    plotFrame = requestPlotFrame(runPlotFrame);
  }
}

function cancelPlotFrame(state) {
  activePlotAnimations.delete(state);
  if (activePlotAnimations.size === 0 && plotFrame !== null) {
    cancelFrame(plotFrame);
    plotFrame = null;
  }
}

function clonePlotConfig(config) {
  return {
    ...config,
    annotations: (config.annotations || []).map((annotation) => ({ ...annotation })),
    series: (config.series || []).map((series) => ({
      ...series,
      x: [...(series.x || [])],
      values: [...(series.values || [])],
    })),
  };
}

function createPlotTransition(from, to) {
  const fromYMin = finiteOr(from.yMin, to.yMin);
  const fromYMax = finiteOr(from.yMax, to.yMax);
  const toYMin = finiteOr(to.yMin, from.yMin);
  const toYMax = finiteOr(to.yMax, from.yMax);
  const usedFromSeries = new Set();
  const incomingSeries = to.series.map((toSeries, index) => {
    const fromSeries = findTransitionSeries(from.series, toSeries, index, usedFromSeries);
    if (fromSeries) usedFromSeries.add(fromSeries);
    const startValues = fromSeries
      ? sampleSeriesAtX(fromSeries, toSeries.x, midpoint(fromYMin, fromYMax))
      : toSeries.values.map(() => toYMin);
    return {
      series: toSeries,
      x: toSeries.x,
      startOpacity: 1,
      endOpacity: 1,
      startValues,
      endValues: toSeries.values.map((value, pointIndex) => finiteOr(value, startValues[pointIndex])),
    };
  });

  const outgoingSeries = from.series
    .filter((fromSeries) => !usedFromSeries.has(fromSeries))
    .map((fromSeries) => {
      const targetX = to.series[0]?.x?.length ? to.series[0].x : fromSeries.x;
      const startValues = sampleSeriesAtX(fromSeries, targetX, midpoint(fromYMin, fromYMax));
      return {
        series: fromSeries,
        x: [...targetX],
        startOpacity: 1,
        endOpacity: 1,
        startValues,
        endValues: startValues.map(() => toYMin),
      };
    });

  return {
    to,
    start: now(),
    xMinStart: finiteOr(from.xMin, to.xMin),
    xMinEnd: finiteOr(to.xMin, from.xMin),
    xMaxStart: finiteOr(from.xMax, to.xMax),
    xMaxEnd: finiteOr(to.xMax, from.xMax),
    yMinStart: fromYMin,
    yMinEnd: toYMin,
    yMaxStart: fromYMax,
    yMaxEnd: toYMax,
    seriesPlans: [...incomingSeries, ...outgoingSeries],
  };
}

function interpolatePlotTransition(transition, progress) {
  return {
    ...transition.to,
    xMin: lerp(transition.xMinStart, transition.xMinEnd, progress),
    xMax: lerp(transition.xMaxStart, transition.xMaxEnd, progress),
    yMin: lerp(transition.yMinStart, transition.yMinEnd, progress),
    yMax: lerp(transition.yMaxStart, transition.yMaxEnd, progress),
    series: transition.seriesPlans
      .map((plan) => ({
        ...plan.series,
        x: plan.x,
        opacity: lerp(plan.startOpacity, plan.endOpacity, progress),
        values: plan.endValues.map((value, index) => lerp(plan.startValues[index], value, progress)),
      }))
  };
}

function findTransitionSeries(seriesList, targetSeries, targetIndex, usedSeries) {
  const byName = seriesList.find((series) => !usedSeries.has(series) && series.name === targetSeries.name);
  if (byName) return byName;
  const byIndex = seriesList[targetIndex];
  if (byIndex && !usedSeries.has(byIndex)) return byIndex;
  return seriesList.find((series) => !usedSeries.has(series)) || null;
}

function sampleSeriesAtX(series, xValues, fallback) {
  if (series.x?.length === xValues.length && series.x.every((value, index) => value === xValues[index])) {
    return series.values.map((value) => finiteOr(value, fallback));
  }

  let sourceIndex = 1;
  const lastIndex = Math.min(series.x?.length || 0, series.values?.length || 0) - 1;
  if (lastIndex < 0) return xValues.map(() => fallback);

  return xValues.map((frequency) => {
    if (frequency <= series.x[0]) return finiteOr(series.values[0], fallback);
    if (frequency >= series.x[lastIndex]) return finiteOr(series.values[lastIndex], fallback);

    while (sourceIndex < lastIndex && series.x[sourceIndex] < frequency) sourceIndex += 1;
    const leftX = Math.log10(series.x[sourceIndex - 1]);
    const rightX = Math.log10(series.x[sourceIndex]);
    const ratio = (Math.log10(frequency) - leftX) / (rightX - leftX || 1);
    const value = series.values[sourceIndex - 1] + (series.values[sourceIndex] - series.values[sourceIndex - 1]) * ratio;
    return Number.isFinite(value) ? value : fallback;
  });
}

function midpoint(min, max) {
  return (min + max) / 2;
}

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

function requestPlotFrame(callback) {
  if (typeof window !== "undefined" && window.requestAnimationFrame) return window.requestAnimationFrame(callback);
  return setTimeout(() => callback(now()), 16);
}

function cancelFrame(frame) {
  if (typeof window !== "undefined" && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(frame);
    return;
  }
  clearTimeout(frame);
}

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function drawAnnotationBands(ctx, config, theme, metrics) {
  const { margin, width, height, xScale, yScale } = metrics;
  const annotations = config.annotations || [];
  annotations.forEach((annotation) => {
    const limitValue = Number(annotation.limitValue);
    if (Number.isFinite(limitValue)) {
      const limitY = yScale(limitValue);
      if (limitY < margin.top || limitY > margin.top + height) return;
      const direction = annotation.limitDirection === "below" ? "below" : "above";
      ctx.save();
      ctx.globalAlpha = annotation.limitFillAlpha ?? 0.08;
      ctx.fillStyle = annotation.color || theme.hoverLine;
      if (direction === "below") {
        ctx.fillRect(margin.left, limitY, width, Math.max(1, margin.top + height - limitY));
      } else {
        ctx.fillRect(margin.left, margin.top, width, Math.max(1, limitY - margin.top));
      }
      ctx.restore();
      return;
    }

    const bandMin = Math.max(Number(annotation.bandMinHz) || 0, config.xMin);
    const bandMax = Math.min(Number(annotation.bandMaxHz) || 0, config.xMax);
    if (!(bandMax > bandMin)) return;
    const x1 = xScale(bandMin);
    const x2 = xScale(bandMax);
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = annotation.color || theme.hoverLine;
    ctx.fillRect(x1, margin.top, Math.max(1, x2 - x1), height);
    ctx.restore();
  });
}

function drawAnnotationLines(ctx, config, theme, metrics) {
  const { margin, width, height, rect, xScale, yScale } = metrics;
  const annotations = config.annotations || [];
  annotations.forEach((annotation, index) => {
    const limitValue = Number(annotation.limitValue);
    if (Number.isFinite(limitValue)) {
      const y = yScale(limitValue);
      if (y < margin.top || y > margin.top + height) return;
      const color = annotation.color || theme.hoverLine;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.86;
      ctx.lineWidth = annotation.width ?? 1.6;
      ctx.setLineDash(annotation.dash || [6, 4]);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + width, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      const label = annotation.label || formatValue(limitValue);
      const detail = annotation.detail || "";
      ctx.font = "10px system-ui";
      const labelWidth = ctx.measureText(label).width;
      const detailWidth = detail ? ctx.measureText(detail).width : 0;
      const boxWidth = Math.min(Math.max(labelWidth, detailWidth) + 12, rect.width - 12);
      const boxHeight = detail ? 30 : 17;
      const boxX = clamp(margin.left + width - boxWidth - 6, 6, rect.width - boxWidth - 6);
      let boxY = y - boxHeight - 6;
      if (boxY < margin.top + 6) boxY = y + 6;
      boxY = clamp(boxY, margin.top + 6, margin.top + height - boxHeight - 6);

      ctx.fillStyle = theme.tooltip;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.92;
      roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 4);
      ctx.fill();
      ctx.globalAlpha = 0.75;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.text;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(label, boxX + 6, boxY + 4);
      if (detail) {
        ctx.fillStyle = theme.muted;
        ctx.fillText(detail, boxX + 6, boxY + 17);
      }
      ctx.restore();
      return;
    }

    const frequency = Number(annotation.frequencyHz);
    if (!Number.isFinite(frequency) || frequency < config.xMin || frequency > config.xMax) return;
    const x = xScale(frequency);
    const color = annotation.color || theme.hoverLine;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    const label = annotation.label || formatFrequency(frequency);
    const detail = annotation.detail || "";
    ctx.font = "10px system-ui";
    const labelWidth = ctx.measureText(label).width;
    const detailWidth = detail ? ctx.measureText(detail).width : 0;
    const boxWidth = Math.min(Math.max(labelWidth, detailWidth) + 12, rect.width - 12);
    const boxHeight = detail ? 30 : 17;
    let boxX = x + 6;
    if (boxX + boxWidth > rect.width - 6) boxX = x - boxWidth - 6;
    boxX = clamp(boxX, 6, rect.width - boxWidth - 6);
    const boxY = margin.top + 8 + (index % 3) * (boxHeight + 3);

    ctx.fillStyle = theme.tooltip;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.92;
    roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 4);
    ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.text;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, boxX + 6, boxY + 4);
    if (detail) {
      ctx.fillStyle = theme.muted;
      ctx.fillText(detail, boxX + 6, boxY + 17);
    }
    ctx.restore();
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
  const chrome = styles.getPropertyValue("--chrome").trim() || "#181b1f";
  return {
    chrome,
    line: styles.getPropertyValue("--line").trim() || "#52616b",
    lineSoft: styles.getPropertyValue("--line-soft").trim() || "#303840",
    muted: styles.getPropertyValue("--muted").trim() || "#9aa6ad",
    text: styles.getPropertyValue("--text").trim() || "#cfd7dc",
    hoverLine: styles.getPropertyValue("--accent").trim() || "#35b779",
    tooltip: styles.getPropertyValue("--chrome-2").trim() || "#20252b",
    axisBackdrop: chrome,
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

function linearValueTicks(min, max) {
  const step = niceStep((max - min) / 5);
  const first = Math.ceil(min / step) * step;
  const ticks = [];
  for (let tick = first; tick <= max; tick += step) {
    ticks.push(Number(tick.toPrecision(10)));
  }
  return ticks.length ? ticks : [min, max];
}

function logValueTicks(minValue, maxValue) {
  const min = Math.max(Number(minValue) || 1e-6, 1e-9);
  const max = Math.max(Number(maxValue) || min * 10, min * 1.01);
  const ticks = [];
  const startDecade = Math.floor(Math.log10(min)) - 1;
  const endDecade = Math.ceil(Math.log10(max)) + 1;
  for (let decade = startDecade; decade <= endDecade; decade += 1) {
    const base = 10 ** decade;
    for (const multiplier of [1, 2, 5]) {
      const tick = multiplier * base;
      if (tick >= min * 0.999 && tick <= max * 1.001) ticks.push(tick);
    }
  }
  const uniqueTicks = [...new Set(ticks.map((tick) => Number(tick.toPrecision(8))))].sort((a, b) => a - b);
  if (uniqueTicks.length >= 2) return uniqueTicks;
  return [min, max];
}

function formatAxisTick(value) {
  const magnitude = Math.abs(value);
  if (magnitude > 0 && magnitude < 0.01) return value.toExponential(1).replace("e-0", "e-").replace("e+0", "e");
  if (magnitude >= 1000) return `${formatCompactNumber(value / 1000)}k`;
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  if (Math.abs(value) >= 1) return value.toFixed(2);
  if (Math.abs(value) >= 0.1) return value.toFixed(2);
  return value.toFixed(2);
}

function detectPlotEdges(canvas, state) {
  const panel = canvas.closest(".plot-panel");
  const grid = panel?.parentElement;
  if (!panel || !grid) return { left: true, bottom: true };

  const panelRect = panel.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  const visiblePanels = [...grid.querySelectorAll(".plot-panel:not(.is-hidden)")];
  const cacheKey = [
    Math.round(panelRect.left),
    Math.round(panelRect.top),
    Math.round(panelRect.right),
    Math.round(panelRect.bottom),
    visiblePanels.length,
    visiblePanels.map((item) => item.dataset.panel).join(","),
  ].join("|");
  if (state.edgeCacheKey === cacheKey && state.edgeCache) return state.edgeCache;

  const sameColumnTolerance = 4;
  const sameRowTolerance = 4;
  const left = panelRect.left <= gridRect.left + sameColumnTolerance;
  const bottom = !visiblePanels.some((otherPanel) => {
    if (otherPanel === panel) return false;
    const otherRect = otherPanel.getBoundingClientRect();
    const overlapsHorizontally = otherRect.left < panelRect.right - sameRowTolerance && otherRect.right > panelRect.left + sameRowTolerance;
    return overlapsHorizontally && otherRect.top > panelRect.top + sameRowTolerance;
  });
  state.edgeCacheKey = cacheKey;
  state.edgeCache = { left, bottom };
  return state.edgeCache;
}

function drawInlineLabel(ctx, text, x, y, align, baseline, theme) {
  const previousAlign = ctx.textAlign;
  const previousBaseline = ctx.textBaseline;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const metrics = ctx.measureText(text);
  const width = metrics.width + 7;
  const height = 15;
  let boxX = x;
  if (align === "center") boxX -= width / 2;
  if (align === "right") boxX -= width;
  let boxY = y;
  if (baseline === "middle") boxY -= height / 2;
  if (baseline === "bottom") boxY -= height;
  ctx.fillStyle = theme.axisBackdrop;
  roundRect(ctx, boxX, boxY, width, height, 3);
  ctx.fill();
  ctx.fillStyle = theme.muted;
  ctx.fillText(text, x, y);
  ctx.textAlign = previousAlign;
  ctx.textBaseline = previousBaseline;
}

function frequencyTicks(minFrequency, maxFrequency) {
  const min = Math.max(Number(minFrequency) || 10, 0.01);
  const max = Math.max(Number(maxFrequency) || 1000, min * 1.01);
  const ticks = [];
  const startDecade = Math.floor(Math.log10(min)) - 1;
  const endDecade = Math.ceil(Math.log10(max)) + 1;
  for (let decade = startDecade; decade <= endDecade; decade += 1) {
    const base = 10 ** decade;
    for (const multiplier of [1, 2, 5]) {
      const tick = multiplier * base;
      if (tick >= min * 0.999 && tick <= max * 1.001) ticks.push(tick);
    }
  }
  const uniqueTicks = [...new Set(ticks.map((tick) => Number(tick.toPrecision(8))))].sort((a, b) => a - b);
  if (uniqueTicks.length >= 2) return uniqueTicks;
  return [min, max];
}

function formatFrequencyTick(value) {
  if (value >= 1000) return `${formatCompactNumber(value / 1000)}k`;
  if (value >= 100) return String(Math.round(value));
  if (value >= 10) return String(Math.round(value * 10) / 10);
  return String(Math.round(value * 100) / 100);
}

function formatCompactNumber(value) {
  if (Math.abs(value - Math.round(value)) < 1e-6) return String(Math.round(value));
  if (value >= 10) return String(Math.round(value * 10) / 10);
  return String(Math.round(value * 100) / 100);
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
