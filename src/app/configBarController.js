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
    const openDesignId = document.querySelector(".config-chip-menu.open")?.dataset.designId || "";
    configBarList.replaceChildren();
    state.configGroups.forEach((group, index) => {
      configBarList.append(createConfigGroupBlock(group, index));
    });
    configBarList.append(createUngroupedConfigBlock());
    if (openDesignId) restoreOpenConfigChipMenu(openDesignId);
    updateMobileToolbarOffset();
    window.requestAnimationFrame(updateMobileToolbarOffset);
  }
  
  function createConfigGroupBlock(group, index) {
    const groupBlock = document.createElement("article");
    groupBlock.className = "config-group-block";
    groupBlock.dataset.groupId = group.id;
    setTooltip(groupBlock, "Configs in this group.");
  
    const header = document.createElement("div");
    header.className = "config-group-header";
    header.append(...createConfigGroupControls(group, index));
  
    const chips = createConfigChipDropZone(group.id);
    state.designs
      .map((design, designIndex) => ({ design, index: designIndex }))
      .filter(({ design }) => design.groupId === group.id)
      .forEach(({ design, index: designIndex }) => chips.append(createConfigChip(design, designIndex)));
  
    groupBlock.append(header, chips);
    return groupBlock;
  }
  
  function createUngroupedConfigBlock() {
    const groupBlock = document.createElement("article");
    groupBlock.className = "config-group-block config-group-block-ungrouped";
    groupBlock.dataset.groupId = UNGROUPED_CONFIG_GROUP_ID;
    setTooltip(groupBlock, "Configs without a group.");
  
    const header = document.createElement("div");
    header.className = "config-group-header";
    const label = document.createElement("span");
    label.className = "config-group-static-label";
    label.textContent = "No group";
    header.append(label);
  
    const chips = createConfigChipDropZone(UNGROUPED_CONFIG_GROUP_ID);
    state.designs
      .map((design, designIndex) => ({ design, index: designIndex }))
      .filter(({ design }) => !design.groupId)
      .forEach(({ design, index: designIndex }) => chips.append(createConfigChip(design, designIndex)));
  
    groupBlock.append(header, chips);
    return groupBlock;
  }
  
  function createConfigChipDropZone(groupId) {
    const chips = document.createElement("div");
    chips.className = "config-group-chips";
    chips.dataset.configGroupId = groupId || UNGROUPED_CONFIG_GROUP_ID;
    chips.dataset.emptyLabel = groupId ? "Empty" : "No configs";
    return chips;
  }
  
  function restoreOpenConfigChipMenu(designId) {
    const menu = configBarList.querySelector(`.config-chip-menu[data-design-id="${cssEscape(designId)}"]`);
    const button = menu?.querySelector(".config-menu-button");
    if (!menu || !button) return;
    menu.classList.add("open");
    button.ariaExpanded = "true";
    requestAnimationFrame(() => positionConfigChipMenu(menu));
    window.setTimeout(() => positionConfigChipMenu(menu), 80);
  }
  
  function createConfigGroupControls(group, groupIndex) {
    const name = document.createElement("input");
    name.type = "text";
    name.value = group.name;
    name.ariaLabel = "Config group name";
    setTooltip(name, "Rename this config group.");
    name.addEventListener("click", (event) => event.stopPropagation());
    name.addEventListener("keydown", (event) => event.stopPropagation());
    name.addEventListener("change", () => updateConfigGroup(group.id, { name: name.value.trim() || group.name }));
  
    const combined = document.createElement("button");
    combined.type = "button";
    combined.className = "config-group-combined-toggle";
    combined.classList.toggle("active", group.showCombined === true);
    combined.classList.toggle("rendered", isConfigGroupCombinedRendered(group));
    const groupColor = designColor(configGroupCombinedColorIndex(groupIndex));
    combined.style.setProperty("--config-group-combined-color", groupColor);
    combined.style.setProperty("--config-group-combined-text", readableTextColor(groupColor));
    combined.textContent = "Σ";
    combined.ariaLabel = `${group.showCombined === true ? "Hide" : "Show"} combined group curve`;
    setTooltip(combined, "Show or hide the acoustically summed curve for this group.");
    combined.addEventListener("click", (event) => {
      event.stopPropagation();
      updateConfigGroup(group.id, { showCombined: group.showCombined !== true });
    });
  
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "x";
    remove.ariaLabel = `Remove ${group.name}`;
    setTooltip(remove, "Remove this group and move its configs to the next group.");
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteConfigGroup(group.id);
    });
  
    return [name, combined, remove];
  }
  
  function createConfigChip(design, index) {
    const chip = document.createElement("div");
    chip.className = "config-chip";
    chip.tabIndex = 0;
    chip.role = "button";
    chip.draggable = true;
    chip.dataset.designId = design.id;
    chip.dataset.configGroupId = design.groupId || UNGROUPED_CONFIG_GROUP_ID;
    chip.classList.toggle("active", design.id === state.activeDesignId);
    chip.classList.toggle("muted", design.visible === false);
    chip.classList.toggle("graph-hidden", design.graphVisible === false);
    chip.dataset.shortName = compactDesignName(design, designNameFromDriver(designDriverForName(design)));
    setTooltip(chip, "Select this config for editing.");
    chip.addEventListener("click", (event) => {
      if (chip.dataset.justDragged === "true") {
        delete chip.dataset.justDragged;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.target.closest("button, input, select, textarea, label, .config-chip-menu")) return;
      activateDesign(design.id);
    });
    chip.addEventListener("keydown", (event) => {
      if (event.target !== chip || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      activateDesign(design.id);
    });
  
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = design.visible !== false;
    checkbox.ariaLabel = `${design.visible === false ? "Activate" : "Deactivate"} ${design.name}`;
    setTooltip(checkbox, "Activate or deactivate this config.");
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", () => setDesignVisibility(design.id, checkbox.checked));
  
    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.background = designColorForDesign(design, index);
    setTooltip(swatch, "Graph color for this config.");
  
    const name = design.id === state.activeDesignId ? document.createElement("input") : document.createElement("span");
    name.className = "config-name";
    if (design.id === state.activeDesignId) {
      name.type = "text";
      name.value = design.name;
      name.ariaLabel = "Active config name";
      setTooltip(name, "Rename the active config.");
      name.addEventListener("click", (event) => event.stopPropagation());
      name.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (event.key === "Enter") name.blur();
        if (event.key === "Escape") {
          name.value = design.name;
          name.blur();
        }
      });
      name.addEventListener("change", () => renameActiveDesign(name.value));
    } else {
      name.textContent = design.name;
    }
  
    const visibility = createConfigVisibilityToggle(design);
  
    const menu = createConfigChipMenu(design, index);
  
    chip.append(checkbox, visibility, swatch, name, menu);
    return chip;
  }
  
  function createConfigVisibilityToggle(design) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "config-visibility-toggle";
    button.classList.toggle("active", design.graphVisible !== false);
    button.ariaLabel = `${design.graphVisible === false ? "Show" : "Hide"} ${design.name} curve`;
    button.setAttribute("aria-pressed", String(design.graphVisible !== false));
    setTooltip(button, "Show or hide only this config's individual graph curve.");
    button.append(createEyeIcon(design.graphVisible !== false));
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setDesignGraphVisibility(design.id, design.graphVisible === false);
    });
    return button;
  }
  
  function createConfigChipMenu(design, index) {
    const menu = document.createElement("div");
    menu.className = "config-chip-menu";
    menu.dataset.designId = design.id;
    menu.addEventListener("pointerdown", (event) => event.stopPropagation());
    menu.addEventListener("click", (event) => event.stopPropagation());
  
    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "config-menu-button";
    menuButton.ariaLabel = `${design.name} config menu`;
    menuButton.ariaExpanded = "false";
    menuButton.textContent = "\u22ee";
    setTooltip(menuButton, "Config actions.");
  
    const panel = document.createElement("div");
    panel.className = "config-chip-menu-panel";
  
    const groupLabel = document.createElement("label");
    groupLabel.className = "config-menu-field";
    const groupText = document.createElement("span");
    groupText.textContent = "Group";
    const groupSelect = document.createElement("select");
    groupSelect.ariaLabel = `${design.name} group`;
    const noGroupOption = document.createElement("option");
    noGroupOption.value = UNGROUPED_CONFIG_GROUP_ID;
    noGroupOption.textContent = "No group";
    groupSelect.append(noGroupOption);
    state.configGroups.forEach((group) => {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.name;
      groupSelect.append(option);
    });
    groupSelect.value = design.groupId || UNGROUPED_CONFIG_GROUP_ID;
    groupSelect.addEventListener("change", () => {
      assignDesignToConfigGroup(design.id, groupSelect.value);
      menu.classList.remove("open");
    });
    groupLabel.append(groupText, groupSelect);
  
    const colorBlock = document.createElement("div");
    colorBlock.className = "config-menu-field";
    const colorText = document.createElement("span");
    colorText.textContent = "Color";
    const colorGrid = document.createElement("div");
    colorGrid.className = "config-color-grid";
    const autoColor = designColor(index);
    const autoButton = document.createElement("button");
    autoButton.type = "button";
    autoButton.className = "config-color-swatch";
    autoButton.classList.toggle("active", !design.color);
    autoButton.style.background = `linear-gradient(135deg, ${autoColor} 0 45%, transparent 45% 55%, ${autoColor} 55%)`;
    autoButton.ariaLabel = "Use automatic color";
    setTooltip(autoButton, "Use automatic color from the palette.");
    autoButton.addEventListener("click", () => {
      setDesignColor(design.id, "");
      menu.classList.remove("open");
    });
    colorGrid.append(autoButton);
    designPalette().forEach((color) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "config-color-swatch";
      button.classList.toggle("active", designColorForDesign(design, index) === color && Boolean(design.color));
      button.style.background = color;
      button.ariaLabel = `Set color ${color}`;
      button.addEventListener("click", () => {
        setDesignColor(design.id, color);
        menu.classList.remove("open");
      });
      colorGrid.append(button);
    });
    colorBlock.append(colorText, colorGrid);
  
    const duplicate = document.createElement("button");
    duplicate.type = "button";
    duplicate.textContent = "Duplicate";
    duplicate.addEventListener("click", () => {
      duplicateDesign(design.id);
      menu.classList.remove("open");
    });
  
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.className = "danger";
    setTooltip(remove, "Delete this config.");
    remove.addEventListener("click", () => {
      deleteDesign(design.id);
      menu.classList.remove("open");
    });
  
    panel.append(groupLabel, colorBlock, duplicate, remove);
    menu.append(menuButton, panel);
    return menu;
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
