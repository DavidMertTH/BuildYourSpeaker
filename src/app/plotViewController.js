export function createPlotViewController({
  axisKeys,
  clampNumber,
  frequencies,
  isMobileLayout,
  parseNumericInputValue,
  plotIds,
  render,
  autoRange,
}) {
  const plotViews = {};
  const plotAxisInputTimers = {};
  let plotPanDrag = null;

  function resetPlotView(plotId) {
    delete plotViews[plotId];
    render();
  }

  function queuePlotAxisInput(plotId, key, input) {
    const timerKey = `${plotId}.${key}`;
    window.clearTimeout(plotAxisInputTimers[timerKey]);
    plotAxisInputTimers[timerKey] = window.setTimeout(() => {
      const value = parsePlotAxisInput(input);
      if (Number.isFinite(value)) setPlotAxisValue(plotId, key, value);
    }, 120);
  }

  function commitPlotAxisInput(plotId, key, input) {
    window.clearTimeout(plotAxisInputTimers[`${plotId}.${key}`]);
    const value = parsePlotAxisInput(input);
    if (Number.isFinite(value)) {
      setPlotAxisValue(plotId, key, value);
    } else {
      input.value = formatAxisInput(currentPlotRange(plotId)[key]);
    }
  }

  function parsePlotAxisInput(input) {
    return parseNumericInputValue(input);
  }

  function setPlotAxisMode(plotId, mode) {
    if (isMobileLayout()) return;
    const view = ensurePlotView(plotId);
    if (mode === "fixed") {
      const range = currentPlotRange(plotId);
      axisKeys.forEach((key) => {
        view[key] = range[key];
      });
    } else {
      axisKeys.forEach((key) => {
        delete view[key];
      });
    }
    render();
  }

  function setPlotAxisValue(plotId, key, value) {
    if (isMobileLayout() || !Number.isFinite(value)) return;
    const view = ensurePlotView(plotId);
    const current = currentPlotRange(plotId);
    const next = constrainPlotRangeToData(plotId, { ...current, [key]: value });
    if (!validPlotRange(next, plotId)) {
      updatePlotControlValues();
      return;
    }
    axisKeys.forEach((axisKey) => {
      view[axisKey] = next[axisKey];
    });
    render();
  }

  function zoomPlot(plotId, factor, event = null, axis = "both") {
    if (isMobileLayout()) return;
    const current = currentPlotRange(plotId);
    if (!validPlotRange(current, plotId)) return;

    const canvas = document.querySelector(`#${plotId}`);
    const rect = canvas?.getBoundingClientRect();
    const xRatio = event && rect?.width ? clampNumber((event.clientX - rect.left) / rect.width, 0.02, 0.98) : 0.5;
    const yRatio = event && rect?.height ? clampNumber((event.clientY - rect.top) / rect.height, 0.02, 0.98) : 0.5;
    const next = { ...current };

    if (axis === "both" || axis === "x") {
      const logMin = Math.log10(Math.max(current.xMin, 0.01));
      const logMax = Math.log10(Math.max(current.xMax, current.xMin + 0.01));
      const focus = logMin + (logMax - logMin) * xRatio;
      next.xMin = 10 ** (focus - (focus - logMin) * factor);
      next.xMax = 10 ** (focus + (logMax - focus) * factor);
    }

    if (axis === "both" || axis === "y") {
      if (plotUsesLogY(plotId, current)) {
        const logMin = Math.log10(current.yMin);
        const logMax = Math.log10(current.yMax);
        const focus = logMax - (logMax - logMin) * yRatio;
        next.yMin = 10 ** (focus - (focus - logMin) * factor);
        next.yMax = 10 ** (focus + (logMax - focus) * factor);
      } else {
        const focus = current.yMax - (current.yMax - current.yMin) * yRatio;
        next.yMin = focus - (focus - current.yMin) * factor;
        next.yMax = focus + (current.yMax - focus) * factor;
      }
    }

    if (!validPlotRange(next, plotId)) return;
    Object.assign(ensurePlotView(plotId), constrainPlotRangeToData(plotId, next));
    render();
  }

  function startPlotPan(plotId, event) {
    if (isMobileLayout() || event.button !== 0) return;
    if (event.currentTarget?.classList?.contains("is-dragging-annotation")) return;
    const current = currentPlotRange(plotId);
    if (!validPlotRange(current, plotId)) return;
    const canvas = document.querySelector(`#${plotId}`);
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    event.preventDefault();
    plotPanDrag = {
      plotId,
      startX: event.clientX,
      startY: event.clientY,
      rect,
      range: current,
    };
    canvas.closest(".plot-panel")?.classList.add("plot-is-panning");
    document.addEventListener("mousemove", handlePlotPanMove);
    document.addEventListener("mouseup", finishPlotPan);
  }

  function handlePlotPanMove(event) {
    if (!plotPanDrag) return;
    const { plotId, startX, startY, rect, range } = plotPanDrag;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const logMin = Math.log10(Math.max(range.xMin, 0.01));
    const logMax = Math.log10(Math.max(range.xMax, range.xMin + 0.01));
    const logSpan = logMax - logMin;
    const logShift = (dx / rect.width) * logSpan;
    const next = {
      xMin: 10 ** (logMin - logShift),
      xMax: 10 ** (logMax - logShift),
    };
    if (plotUsesLogY(plotId, range)) {
      const yLogMin = Math.log10(range.yMin);
      const yLogMax = Math.log10(range.yMax);
      const yLogShift = (dy / rect.height) * (yLogMax - yLogMin);
      next.yMin = 10 ** (yLogMin + yLogShift);
      next.yMax = 10 ** (yLogMax + yLogShift);
    } else {
      const ySpan = range.yMax - range.yMin;
      const yShift = (dy / rect.height) * ySpan;
      next.yMin = range.yMin + yShift;
      next.yMax = range.yMax + yShift;
    }
    const constrained = constrainPlotRangeToData(plotId, next);
    if (!validPlotRange(constrained, plotId)) return;
    Object.assign(ensurePlotView(plotId), constrained);
    render();
  }

  function finishPlotPan() {
    if (!plotPanDrag) return;
    document.querySelector(`#${plotPanDrag.plotId}`)?.closest(".plot-panel")?.classList.remove("plot-is-panning");
    plotPanDrag = null;
    document.removeEventListener("mousemove", handlePlotPanMove);
    document.removeEventListener("mouseup", finishPlotPan);
  }

  function ensurePlotView(plotId) {
    plotViews[plotId] ||= {};
    return plotViews[plotId];
  }

  function currentPlotRange(plotId) {
    const view = plotViews[plotId] || {};
    const auto = view.auto || { xMin: frequencies[0], xMax: frequencies[frequencies.length - 1], yMin: 0, yMax: 1 };
    return constrainPlotRangeToData(plotId, {
      xMin: Number.isFinite(view.xMin) ? view.xMin : auto.xMin,
      xMax: Number.isFinite(view.xMax) ? view.xMax : auto.xMax,
      yMin: Number.isFinite(view.yMin) ? view.yMin : auto.yMin,
      yMax: Number.isFinite(view.yMax) ? view.yMax : auto.yMax,
    });
  }

  function validPlotRange(range) {
    return range.xMin > 0 && range.xMax > range.xMin * 1.01 && range.yMax > range.yMin + 1e-6;
  }

  function constrainPlotRangeToData(plotId, range, config = null) {
    const auto = config || plotViews[plotId]?.auto || {};
    const domainMin = Math.max(Number(auto.xMin) || frequencies[0], 0.01);
    const domainMax = Math.max(Number(auto.xMax) || frequencies[frequencies.length - 1], domainMin * 1.01);
    let logMin = Math.log10(Math.max(Number(range.xMin) || domainMin, 0.01));
    let logMax = Math.log10(Math.max(Number(range.xMax) || domainMax, 0.01));
    const logDomainMin = Math.log10(domainMin);
    const logDomainMax = Math.log10(domainMax);
    const domainSpan = logDomainMax - logDomainMin;
    let span = logMax - logMin;

    if (!Number.isFinite(span) || span <= 0) {
      logMin = logDomainMin;
      logMax = logDomainMax;
      span = domainSpan;
    }

    if (span >= domainSpan) {
      logMin = logDomainMin;
      logMax = logDomainMax;
    } else {
      if (logMin < logDomainMin) {
        logMax += logDomainMin - logMin;
        logMin = logDomainMin;
      }
      if (logMax > logDomainMax) {
        logMin -= logMax - logDomainMax;
        logMax = logDomainMax;
      }
    }

    return {
      ...range,
      xMin: 10 ** logMin,
      xMax: 10 ** logMax,
    };
  }

  function applyPlotView(plotId, config) {
    const view = ensurePlotView(plotId);
    const constrainedX = constrainPlotRangeToData(plotId, {
      xMin: Number.isFinite(view.xMin) ? view.xMin : config.xMin,
      xMax: Number.isFinite(view.xMax) ? view.xMax : config.xMax,
      yMin: config.yMin,
      yMax: config.yMax,
    }, config);
    const xMin = constrainedX.xMin;
    const xMax = constrainedX.xMax;
    const autoY = visiblePlotYRange(config, xMin, xMax);
    view.auto = {
      xMin: config.xMin,
      xMax: config.xMax,
      yMin: autoY.yMin,
      yMax: autoY.yMax,
      yScale: autoY.yScale,
    };
    const next = { ...config, xMin, xMax, ...currentPlotRange(plotId), yScale: autoY.yScale };
    return validPlotRange(next) ? next : config;
  }

  function plotUsesLogY(plotId, range = currentPlotRange(plotId)) {
    return plotViews[plotId]?.auto?.yScale === "log" && range.yMin > 0 && range.yMax > range.yMin * 1.01;
  }

  function updatePlotControlValues() {
    plotIds.forEach((plotId) => {
      const range = currentPlotRange(plotId);
      const view = plotViews[plotId] || {};
      const isFixed = axisKeys.some((key) => Number.isFinite(view[key]));
      document.querySelectorAll(`[data-plot-axis-mode="${plotId}"]`).forEach((mode) => {
        if (document.activeElement !== mode) {
          mode.checked = isFixed;
        }
        mode.dataset.axisMode = isFixed ? "fixed" : "adaptive";
      });
      axisKeys.forEach((key) => {
        document.querySelectorAll(`[data-plot-axis-input="${plotId}.${key}"]`).forEach((input) => {
          input.dataset.axisMode = isFixed ? "fixed" : "adaptive";
          if (document.activeElement !== input) input.value = formatAxisInput(range[key]);
        });
      });
      const panel = document.querySelector(`#${plotId}`)?.closest(".plot-panel");
      panel?.classList.toggle("plot-has-custom-view", hasCustomPlotView(plotId));
    });
  }

  function hasCustomPlotView(plotId) {
    const view = plotViews[plotId] || {};
    return ["xMin", "xMax", "yMin", "yMax"].some((key) => Number.isFinite(view[key]));
  }

  function formatAxisInput(value) {
    if (!Number.isFinite(value)) return "";
    if (Math.abs(value) >= 100) return String(Math.round(value * 10) / 10);
    if (Math.abs(value) >= 10) return String(Math.round(value * 100) / 100);
    return String(Math.round(value * 1000) / 1000);
  }

  function visiblePlotYRange(config, xMin, xMax) {
    const rangeMin = Math.max(Number(xMin) || config.xMin, config.xMin);
    const rangeMax = Math.min(Number(xMax) || config.xMax, config.xMax);
    const values = [];

    (config.series || []).forEach((series) => {
      const xValues = series.x || [];
      const yValues = series.values || [];
      if (!xValues.length || !yValues.length) return;

      [rangeMin, rangeMax].forEach((frequency) => {
        const value = interpolatePlotSeriesValue(series, frequency);
        if (Number.isFinite(value)) values.push(value);
      });

      xValues.forEach((frequency, index) => {
        if (frequency < rangeMin || frequency > rangeMax) return;
        const value = yValues[index];
        if (Number.isFinite(value)) values.push(value);
      });
    });

    (config.annotations || []).forEach((annotation) => {
      if (annotation.exceeded === false) return;
      const limitValue = Number(annotation.limitValue);
      if (Number.isFinite(limitValue)) values.push(limitValue);
    });

    if (config.yScale === "log") {
      return positiveMagnitudeRange(values, {
        fallbackMax: Math.max(config.yMax, 1),
        minFloor: Math.max(Math.min(config.yMin, config.yMax / 1000), 1e-9),
        includeFallbackMax: false,
      });
    }

    if (!values.length) {
      return { yMin: config.yMin, yMax: config.yMax, yScale: config.yScale };
    }

    const [yMin, yMax] = autoRange(values);
    if (config.forceYMinZero) {
      return { yMin: 0, yMax: Math.max(yMax, 1), yScale: config.yScale };
    }
    return { yMin, yMax, yScale: config.yScale };
  }

  return {
    applyPlotView,
    commitPlotAxisInput,
    currentPlotRange,
    formatAxisInput,
    hasCustomPlotView,
    plotUsesLogY,
    positiveMagnitudeRange,
    queuePlotAxisInput,
    resetPlotView,
    setPlotAxisMode,
    setPlotAxisValue,
    startPlotPan,
    updatePlotControlValues,
  };
}

export function interpolatePlotSeriesValue(series, frequency) {
  const xValues = series.x || [];
  const yValues = series.values || [];
  const lastIndex = Math.min(xValues.length, yValues.length) - 1;
  if (lastIndex < 0) return NaN;
  if (frequency <= xValues[0]) return yValues[0];
  if (frequency >= xValues[lastIndex]) return yValues[lastIndex];

  for (let index = 1; index <= lastIndex; index += 1) {
    if (xValues[index] < frequency) continue;
    const leftX = Math.log10(xValues[index - 1]);
    const rightX = Math.log10(xValues[index]);
    const ratio = (Math.log10(frequency) - leftX) / (rightX - leftX || 1);
    const value = yValues[index - 1] + (yValues[index] - yValues[index - 1]) * ratio;
    return Number.isFinite(value) ? value : NaN;
  }
  return yValues[lastIndex];
}

export function positiveMagnitudeRange(values, options = {}) {
  const fallbackMax = Math.max(Number(options.fallbackMax) || 1, 1e-6);
  const minFloor = Math.max(Number(options.minFloor) || 1e-6, 1e-9);
  const positiveValues = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!positiveValues.length) {
    return { yMin: 0, yMax: fallbackMax, yScale: "linear" };
  }

  const min = Math.min(...positiveValues);
  const max = options.includeFallbackMax === false ? Math.max(...positiveValues) : Math.max(...positiveValues, fallbackMax);
  const yMin = Math.max(min * 0.82, max / 1000, minFloor);
  const yMax = Math.max(max * 1.18, yMin * 1.12);
  return { yMin, yMax, yScale: "log" };
}
