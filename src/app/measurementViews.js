export function createMeasurementViews(deps) {
  const {
    compactMeasurementSeriesName,
    defaultMeasurementTarget,
    discardStagedRecording,
    formatFrequencyValue,
    formatMeasurementAngleCompact,
    fullMeasurementName,
    getStagedRecordingResponse,
    getState,
    hydrateMeasurementTargetSelect,
    measurementTargetLabel,
    measurementTargetOptions,
    parseNumericInputValue,
    removeFrequencyResponse,
    removeFrequencyResponseCandidate,
    saveStagedRecording,
    setFrequencyResponseVisibility,
    shortMeasurementName,
    updateFrequencyResponseAngle,
    updateFrequencyResponseName,
    updateFrequencyResponseTarget,
  } = deps;

  let state = getState();
  let stagedRecordingResponse = getStagedRecordingResponse();

  function renderMeasurementControls() {
    state = getState();
    stagedRecordingResponse = getStagedRecordingResponse();
    hydrateMeasurementTargetSelect();
    window.dispatchEvent(new CustomEvent("cabio:measurement-list-sync", {
      detail: createMeasurementListSnapshot(),
    }));
  }

  function createMeasurementListSnapshot() {
    return {
      staged: createStagedSnapshot(stagedRecordingResponse),
      responses: (state.measurements?.frequencyResponses || []).map(createResponseSnapshot),
      candidates: (state.measurements?.frequencyResponseCandidates || []).map(createCandidateSnapshot),
      targetOptions: measurementTargetOptions(),
    };
  }

  function createStagedSnapshot(response) {
    if (!response) return null;
    const first = response.points[0]?.frequencyHz;
    const last = response.points[response.points.length - 1]?.frequencyHz;
    return {
      id: response.id,
      name: compactMeasurementSeriesName(response),
      fullName: fullMeasurementName(response),
      meta: `${response.points.length} pts / ${formatFrequencyValue(first)}-${formatFrequencyValue(last)} / ${measurementTargetLabel(response.target)}`,
    };
  }

  function createResponseSnapshot(response) {
    const shortName = shortMeasurementName(response);
    const first = response.points[0]?.frequencyHz;
    const last = response.points[response.points.length - 1]?.frequencyHz;
    const target = response.target || defaultMeasurementTarget();
    return {
      id: response.id,
      measurementId: `response:${response.id}`,
      name: response.name || "",
      shortName,
      fullName: fullMeasurementName(response),
      meta: `${formatMeasurementAngleCompact(response)} / ${formatFrequencyValue(first)}-${formatFrequencyValue(last)}`,
      target,
      angle: String(Math.round(Number(response.angleDeg || 0))),
      visible: response.visible !== false,
    };
  }

  function createCandidateSnapshot(candidate) {
    return {
      id: candidate.id,
      measurementId: `candidate:${candidate.id}`,
      name: candidate.name,
      meta: [candidate.source, candidate.format, candidate.url].filter(Boolean).join(" / "),
      status: candidate.status || "candidate",
      format: candidate.format || "html",
      graph: "needs data",
      reason: candidate.reason || "Candidate found by driver search; numeric response data was not available yet.",
      url: candidate.url || "",
    };
  }

  function handleMeasurementViewAction(event) {
    const detail = event.detail || {};
    if (detail.action === "save-staged") {
      saveStagedRecording();
      return;
    }
    if (detail.action === "discard-staged") {
      discardStagedRecording();
      return;
    }
    if (detail.action === "toggle-response-visibility" && detail.responseId) {
      setFrequencyResponseVisibility(detail.responseId, Boolean(detail.visible));
      return;
    }
    if (detail.action === "remove-response" && detail.responseId) {
      removeFrequencyResponse(detail.responseId);
      return;
    }
    if (detail.action === "rename-response" && detail.responseId) {
      updateFrequencyResponseName(detail.responseId, String(detail.value || "").trim());
      return;
    }
    if (detail.action === "set-response-target" && detail.responseId) {
      updateFrequencyResponseTarget(detail.responseId, detail.value || defaultMeasurementTarget());
      return;
    }
    if (detail.action === "set-response-angle" && detail.responseId) {
      const angle = parseNumericInputValue(detail.value);
      if (Number.isFinite(angle)) updateFrequencyResponseAngle(detail.responseId, angle);
      else renderMeasurementControls();
      return;
    }
    if (detail.action === "remove-candidate" && detail.candidateId) {
      removeFrequencyResponseCandidate(detail.candidateId);
    }
  }

  window.addEventListener("cabio:measurement-view-action", handleMeasurementViewAction);
  window.addEventListener("cabio:measurement-list-request", renderMeasurementControls);

  return { renderMeasurementControls };
}
