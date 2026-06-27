export function createConfigBarController(deps) {
  const {
    activateDesign,
    assignDesignToConfigGroup,
    clearDropMarkers,
    compactDesignName,
    configBarList,
    configGroupCombinedColorIndex,
    createEyeIcon,
    cssEscape,
    deleteConfigGroup,
    deleteDesign,
    designColor,
    designColorForDesign,
    designDriverForName,
    designNameFromDriver,
    designPalette,
    duplicateDesign,
    getDropPlacement,
    getState,
    isConfigGroupCombinedRendered,
    isMobileLayout,
    measurementList,
    moveDesignToConfigGroup,
    moveFrequencyResponseToMeasurementGroup,
    readableTextColor,
    renameActiveDesign,
    setDesignColor,
    setDesignGraphVisibility,
    setDesignVisibility,
    setTooltip,
    UNGROUPED_CONFIG_GROUP_ID,
    UNGROUPED_MEASUREMENT_GROUP_ID,
    updateConfigGroup,
    updateMobileToolbarOffset,
  } = deps;

  let state = getState();
  let draggedConfigDesignId = "";
  let configPointerDrag = null;
  let draggedMeasurementResponseId = "";
  let measurementPointerDrag = null;

  function renderConfigBar() {
    state = getState();
    window.dispatchEvent(new CustomEvent("cabio:config-bar-sync", {
      detail: configBarSnapshot(),
    }));
    updateMobileToolbarOffset();
    window.requestAnimationFrame(updateMobileToolbarOffset);
  }

  function configBarSnapshot() {
    const groupOptions = state.configGroups.map((group) => ({ id: group.id, name: group.name }));
    return {
      ungroupedGroupId: UNGROUPED_CONFIG_GROUP_ID,
      groupOptions,
      palette: designPalette(),
      groups: [
        ...state.configGroups.map((group, index) => configGroupSnapshot(group, index)),
        ungroupedGroupSnapshot(),
      ],
    };
  }

  function configGroupSnapshot(group, index) {
    const groupColor = designColor(configGroupCombinedColorIndex(index));
    return {
      id: group.id,
      name: group.name,
      isUngrouped: false,
      showCombined: group.showCombined === true,
      combinedRendered: isConfigGroupCombinedRendered(group),
      combinedColor: groupColor,
      combinedText: readableTextColor(groupColor),
      designs: state.designs
        .map((design, designIndex) => ({ design, index: designIndex }))
        .filter(({ design }) => design.groupId === group.id)
        .map(({ design, index: designIndex }) => configDesignSnapshot(design, designIndex)),
    };
  }

  function ungroupedGroupSnapshot() {
    return {
      id: UNGROUPED_CONFIG_GROUP_ID,
      name: "No group",
      isUngrouped: true,
      designs: state.designs
        .map((design, designIndex) => ({ design, index: designIndex }))
        .filter(({ design }) => !design.groupId)
        .map(({ design, index: designIndex }) => configDesignSnapshot(design, designIndex)),
    };
  }

  function configDesignSnapshot(design, index) {
    const driverName = designNameFromDriver(designDriverForName(design));
    const displayName = String(driverName || design.name || "Config").replace(/\s+/g, " ").trim();
    return {
      id: design.id,
      name: design.name,
      groupId: design.groupId || "",
      active: design.id === state.activeDesignId,
      visible: design.visible !== false,
      graphVisible: design.graphVisible !== false,
      color: designColorForDesign(design, index),
      autoColor: designColor(index),
      customColor: Boolean(design.color),
      shortName: compactDesignName({ name: displayName }, displayName),
      fullName: displayName,
    };
  }
  
  function handleConfigChipDragStart(event) {
    const chip = event.target.closest(".config-chip");
    if (!chip || !configBarList.contains(chip)) return;
    if (isConfigChipInteractiveTarget(event.target)) {
      event.preventDefault();
      return;
    }
  
    cancelConfigChipPointerDrag();
    draggedConfigDesignId = chip.dataset.designId || "";
    if (!draggedConfigDesignId) {
      event.preventDefault();
      return;
    }
  
    closeConfigChipMenus();
    chip.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedConfigDesignId);
  }
  
  function handleConfigChipDragOver(event) {
    if (!draggedConfigDesignId) return;
    const dropZone = event.target.closest(".config-group-chips");
    if (!dropZone || !configBarList.contains(dropZone)) return;
  
    event.preventDefault();
    updateConfigChipDropPreview(event.target, event.clientX, event.clientY);
    event.dataTransfer.dropEffect = "move";
  }
  
  function handleConfigChipDragLeave(event) {
    const dropZone = event.target.closest(".config-group-chips");
    if (dropZone && !dropZone.contains(event.relatedTarget)) {
      dropZone.classList.remove("drop-target");
      clearDropMarkers(dropZone);
    }
  }
  
  function handleConfigChipDrop(event) {
    if (!draggedConfigDesignId) return;
    const dropZone = event.target.closest(".config-group-chips");
    if (!dropZone || !configBarList.contains(dropZone)) return;
  
    event.preventDefault();
    dropConfigChipAt(event.target, event.clientX, event.clientY);
    clearConfigChipDropMarkers();
  }
  
  function handleConfigChipDragEnd() {
    draggedConfigDesignId = "";
    clearConfigChipDropMarkers();
    configBarList.querySelectorAll(".is-dragging").forEach((item) => {
      item.classList.remove("is-dragging");
    });
  }
  
  function handleConfigChipPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const chip = event.target.closest(".config-chip");
    if (!chip || !configBarList.contains(chip) || isConfigChipInteractiveTarget(event.target)) return;
    const designId = chip.dataset.designId || "";
    if (!designId) return;
  
    configPointerDrag = {
      chip,
      designId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    document.addEventListener("pointermove", handleConfigChipPointerMove, { passive: false });
    document.addEventListener("pointerup", handleConfigChipPointerUp, { passive: false });
    document.addEventListener("pointercancel", cancelConfigChipPointerDrag, { passive: false });
  }
  
  function handleConfigChipPointerMove(event) {
    if (!configPointerDrag || event.pointerId !== configPointerDrag.pointerId) return;
    const distance = Math.hypot(event.clientX - configPointerDrag.startX, event.clientY - configPointerDrag.startY);
    if (!configPointerDrag.moved && distance < 7) return;
  
    event.preventDefault();
    if (!configPointerDrag.moved) {
      configPointerDrag.moved = true;
      draggedConfigDesignId = configPointerDrag.designId;
      closeConfigChipMenus();
      configPointerDrag.chip.classList.add("is-dragging");
    }
    updateConfigChipDropPreview(document.elementFromPoint(event.clientX, event.clientY), event.clientX, event.clientY);
  }
  
  function handleConfigChipPointerUp(event) {
    if (!configPointerDrag || event.pointerId !== configPointerDrag.pointerId) return;
    const drag = configPointerDrag;
    if (drag.moved) {
      event.preventDefault();
      drag.chip.dataset.justDragged = "true";
      window.setTimeout(() => {
        delete drag.chip.dataset.justDragged;
      }, 0);
      dropConfigChipAt(document.elementFromPoint(event.clientX, event.clientY), event.clientX, event.clientY);
    }
    cancelConfigChipPointerDrag();
  }
  
  function cancelConfigChipPointerDrag() {
    document.removeEventListener("pointermove", handleConfigChipPointerMove);
    document.removeEventListener("pointerup", handleConfigChipPointerUp);
    document.removeEventListener("pointercancel", cancelConfigChipPointerDrag);
    configPointerDrag?.chip.classList.remove("is-dragging");
    configPointerDrag = null;
    draggedConfigDesignId = "";
    clearConfigChipDropMarkers();
  }
  
  function updateConfigChipDropPreview(target, x, y) {
    const dropZone = target?.closest?.(".config-group-chips");
    if (!dropZone || !configBarList.contains(dropZone)) {
      clearConfigChipDropMarkers();
      return;
    }
  
    clearConfigChipDropMarkers();
    const targetChip = configDropTargetChip(target, dropZone);
    if (targetChip && targetChip.dataset.designId !== draggedConfigDesignId) {
      const placement = getDropPlacement(targetChip, x, y);
      targetChip.classList.add(placement === "before" ? "drop-before" : "drop-after");
    } else {
      dropZone.classList.add("drop-target");
    }
  }
  
  function dropConfigChipAt(target, x, y) {
    if (!draggedConfigDesignId) return;
    const dropZone = target?.closest?.(".config-group-chips");
    if (!dropZone || !configBarList.contains(dropZone)) return;
  
    const targetChip = configDropTargetChip(target, dropZone);
    if (targetChip?.dataset.designId === draggedConfigDesignId) return;
  
    let beforeDesignId = "";
    if (targetChip) {
      const placement = getDropPlacement(targetChip, x, y);
      beforeDesignId = placement === "before"
        ? targetChip.dataset.designId
        : nextConfigChipDesignId(targetChip);
    }
  
    moveDesignToConfigGroup(draggedConfigDesignId, dropZone.dataset.configGroupId || UNGROUPED_CONFIG_GROUP_ID, beforeDesignId);
  }
  
  function isConfigChipInteractiveTarget(target) {
    return Boolean(target.closest("button, input, select, textarea, label, .config-chip-menu"));
  }
  
  function configDropTargetChip(target, dropZone) {
    const chip = target.closest?.(".config-chip");
    return chip?.parentElement === dropZone ? chip : null;
  }
  
  function nextConfigChipDesignId(chip) {
    let next = chip.nextElementSibling;
    while (next) {
      if (next.classList?.contains("config-chip") && next.dataset.designId !== draggedConfigDesignId) {
        return next.dataset.designId || "";
      }
      next = next.nextElementSibling;
    }
    return "";
  }
  
  function clearConfigChipDropMarkers() {
    configBarList.querySelectorAll(".drop-before, .drop-after, .drop-target").forEach((item) => {
      item.classList.remove("drop-before", "drop-after", "drop-target");
    });
  }
  
  function handleMeasurementChipDragStart(event) {
    const chip = event.target.closest(".measurement-chip");
    if (!chip || !measurementList?.contains(chip)) return;
    if (isMeasurementChipInteractiveTarget(event.target)) {
      event.preventDefault();
      return;
    }
  
    cancelMeasurementPointerDrag();
    draggedMeasurementResponseId = chip.dataset.measurementId?.replace(/^response:/, "") || "";
    if (!draggedMeasurementResponseId) {
      event.preventDefault();
      return;
    }
  
    chip.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedMeasurementResponseId);
  }
  
  function handleMeasurementChipDragOver(event) {
    if (!draggedMeasurementResponseId) return;
    const dropZone = event.target.closest(".measurement-group-chips");
    if (!dropZone || !measurementList?.contains(dropZone)) return;
    event.preventDefault();
    updateMeasurementChipDropPreview(event.target, event.clientX, event.clientY);
    event.dataTransfer.dropEffect = "move";
  }
  
  function handleMeasurementChipDragLeave(event) {
    const dropZone = event.target.closest(".measurement-group-chips");
    if (dropZone && !dropZone.contains(event.relatedTarget)) {
      dropZone.classList.remove("drop-target");
      clearDropMarkers(dropZone);
    }
  }
  
  function handleMeasurementChipDrop(event) {
    if (!draggedMeasurementResponseId) return;
    const dropZone = event.target.closest(".measurement-group-chips");
    if (!dropZone || !measurementList?.contains(dropZone)) return;
    event.preventDefault();
    dropMeasurementChipAt(event.target, event.clientX, event.clientY);
    clearMeasurementChipDropMarkers();
  }
  
  function handleMeasurementChipDragEnd() {
    draggedMeasurementResponseId = "";
    clearMeasurementChipDropMarkers();
    measurementList?.querySelectorAll(".measurement-chip.is-dragging").forEach((item) => item.classList.remove("is-dragging"));
  }
  
  function handleMeasurementChipPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const chip = event.target.closest(".measurement-chip");
    if (!chip || !measurementList?.contains(chip) || isMeasurementChipInteractiveTarget(event.target)) return;
    const responseId = chip.dataset.measurementId?.replace(/^response:/, "") || "";
    if (!responseId) return;
  
    measurementPointerDrag = {
      chip,
      responseId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    document.addEventListener("pointermove", handleMeasurementChipPointerMove, { passive: false });
    document.addEventListener("pointerup", handleMeasurementChipPointerUp, { passive: false });
    document.addEventListener("pointercancel", cancelMeasurementPointerDrag, { passive: false });
  }
  
  function handleMeasurementChipPointerMove(event) {
    if (!measurementPointerDrag || event.pointerId !== measurementPointerDrag.pointerId) return;
    const distance = Math.hypot(event.clientX - measurementPointerDrag.startX, event.clientY - measurementPointerDrag.startY);
    if (!measurementPointerDrag.moved && distance < 7) return;
  
    event.preventDefault();
    if (!measurementPointerDrag.moved) {
      measurementPointerDrag.moved = true;
      draggedMeasurementResponseId = measurementPointerDrag.responseId;
      measurementPointerDrag.chip.classList.add("is-dragging");
    }
    updateMeasurementChipDropPreview(document.elementFromPoint(event.clientX, event.clientY), event.clientX, event.clientY);
  }
  
  function handleMeasurementChipPointerUp(event) {
    if (!measurementPointerDrag || event.pointerId !== measurementPointerDrag.pointerId) return;
    const drag = measurementPointerDrag;
    if (drag.moved) {
      event.preventDefault();
      drag.chip.dataset.justDragged = "true";
      window.setTimeout(() => {
        delete drag.chip.dataset.justDragged;
      }, 0);
      dropMeasurementChipAt(document.elementFromPoint(event.clientX, event.clientY), event.clientX, event.clientY);
    }
    cancelMeasurementPointerDrag();
  }
  
  function cancelMeasurementPointerDrag() {
    document.removeEventListener("pointermove", handleMeasurementChipPointerMove);
    document.removeEventListener("pointerup", handleMeasurementChipPointerUp);
    document.removeEventListener("pointercancel", cancelMeasurementPointerDrag);
    measurementPointerDrag?.chip.classList.remove("is-dragging");
    measurementPointerDrag = null;
    draggedMeasurementResponseId = "";
    clearMeasurementChipDropMarkers();
  }
  
  function updateMeasurementChipDropPreview(target, x, y) {
    const dropZone = target?.closest?.(".measurement-group-chips");
    if (!dropZone || !measurementList?.contains(dropZone)) {
      clearMeasurementChipDropMarkers();
      return;
    }
  
    clearMeasurementChipDropMarkers();
    const targetChip = measurementDropTargetChip(target, dropZone);
    if (targetChip && targetChip.dataset.measurementId !== `response:${draggedMeasurementResponseId}`) {
      const placement = getDropPlacement(targetChip, x, y);
      targetChip.classList.add(placement === "before" ? "drop-before" : "drop-after");
    } else {
      dropZone.classList.add("drop-target");
    }
  }
  
  function dropMeasurementChipAt(target, x, y) {
    if (!draggedMeasurementResponseId) return;
    const dropZone = target?.closest?.(".measurement-group-chips");
    if (!dropZone || !measurementList?.contains(dropZone)) return;
  
    const targetChip = measurementDropTargetChip(target, dropZone);
    if (targetChip?.dataset.measurementId === `response:${draggedMeasurementResponseId}`) return;
  
    let beforeResponseId = "";
    if (targetChip) {
      const placement = getDropPlacement(targetChip, x, y);
      beforeResponseId = placement === "before"
        ? targetChip.dataset.measurementId.replace(/^response:/, "")
        : nextMeasurementChipResponseId(targetChip);
    }
  
    moveFrequencyResponseToMeasurementGroup(
      draggedMeasurementResponseId,
      dropZone.dataset.measurementGroupId || UNGROUPED_MEASUREMENT_GROUP_ID,
      beforeResponseId,
    );
  }
  
  function isMeasurementChipInteractiveTarget(target) {
    return Boolean(target.closest("button, input, select, textarea, label"));
  }
  
  function measurementDropTargetChip(target, dropZone) {
    const chip = target.closest?.(".measurement-chip");
    return chip?.parentElement === dropZone ? chip : null;
  }
  
  function nextMeasurementChipResponseId(chip) {
    let next = chip.nextElementSibling;
    while (next) {
      if (next.classList?.contains("measurement-chip") && next.dataset.measurementId !== `response:${draggedMeasurementResponseId}`) {
        return next.dataset.measurementId.replace(/^response:/, "");
      }
      next = next.nextElementSibling;
    }
    return "";
  }
  
  function clearMeasurementChipDropMarkers() {
    measurementList?.querySelectorAll(".measurement-chip.drop-before, .measurement-chip.drop-after, .measurement-group-chips.drop-target").forEach((item) => {
      item.classList.remove("drop-before", "drop-after", "drop-target");
    });
  }
  
  function positionConfigChipMenu(menu) {
    const panel = menu.querySelector(".config-chip-menu-panel");
    const button = menu.querySelector(".config-menu-button");
    if (!panel || !button) return;
    const rect = button.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || 224;
    const panelHeight = panel.offsetHeight || 220;
    const gap = 6;
    const left = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, rect.right - panelWidth));
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = "";
    panel.style.bottom = "";
  
    if (isMobileLayout()) {
      const availableBelow = window.innerHeight - rect.bottom - gap - 8;
      const availableAbove = rect.top - gap - 8;
      const shouldOpenBelow = rect.top < window.innerHeight / 2 || availableBelow >= Math.min(panelHeight, 150);
      if (shouldOpenBelow) {
        const top = Math.max(8, Math.round(rect.bottom + gap));
        panel.style.top = `${top}px`;
        panel.style.maxHeight = `${Math.max(150, Math.round(window.innerHeight - top - 8))}px`;
      } else {
        const bottom = Math.max(8, Math.round(window.innerHeight - rect.top + gap));
        panel.style.bottom = `${bottom}px`;
        panel.style.maxHeight = `${Math.max(150, Math.round(availableAbove))}px`;
      }
      return;
    }
  
    const fromBottomBar = Boolean(menu.closest(".config-bar"));
    const shouldOpenBelow = !fromBottomBar && rect.top < window.innerHeight / 2 && rect.bottom + gap + panelHeight <= window.innerHeight;
    const top = shouldOpenBelow
      ? rect.bottom + gap
      : Math.max(8, rect.top - panelHeight - gap);
    panel.style.top = `${Math.round(top)}px`;
    panel.style.maxHeight = `${Math.max(160, Math.round(window.innerHeight - top - 8))}px`;
  }
  
  function toggleConfigChipMenu(menu, button = menu.querySelector(".config-menu-button")) {
    const willOpen = !menu.classList.contains("open");
    closeConfigChipMenus();
    menu.classList.toggle("open", willOpen);
    if (button) button.ariaExpanded = String(willOpen);
    if (willOpen) {
      positionConfigChipMenu(menu);
      requestAnimationFrame(() => positionConfigChipMenu(menu));
      window.setTimeout(() => positionConfigChipMenu(menu), 80);
    }
  }
  
  function closeConfigChipMenus() {
    document.querySelectorAll(".config-chip-menu.open").forEach((menu) => {
      menu.classList.remove("open");
      const button = menu.querySelector(".config-menu-button");
      if (button) button.ariaExpanded = "false";
    });
  }

  return {
    closeConfigChipMenus,
    handleConfigChipDragEnd,
    handleConfigChipDragLeave,
    handleConfigChipDragOver,
    handleConfigChipDragStart,
    handleConfigChipDrop,
    handleConfigChipPointerDown,
    handleMeasurementChipDragEnd,
    handleMeasurementChipDragLeave,
    handleMeasurementChipDragOver,
    handleMeasurementChipDragStart,
    handleMeasurementChipDrop,
    handleMeasurementChipPointerDown,
    positionConfigChipMenu,
    renderConfigBar,
    toggleConfigChipMenu,
  };
}
