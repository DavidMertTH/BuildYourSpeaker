import { normalizeInventory } from "../core/planner/componentInventory.js";
import { normalizeMeasurementGroups, normalizeMeasurements } from "../core/measurements.js";
import { cloneProject, sampleProject } from "../state.js";
import { completeDriverParameters } from "./driverParameters.js";
import { UNGROUPED_CONFIG_GROUP_ID, UNGROUPED_MEASUREMENT_GROUP_ID } from "./constants.js";
import { completeBox } from "./boxModel.js";
import { normalizeGroupCrossover } from "./crossoverModel.js";
import { createConfigGroupId, createMeasurementGroupId } from "./idUtils.js";

export function normalizeProjectState(project, options = {}) {
  const nextState = cloneProject(project);
  const fallbackBox = completeBox(nextState.box || sampleProject.box);
  const fallbackMode = nextState.mode || "vented";
  nextState.inventory = normalizeInventory(nextState.inventory || sampleProject.inventory);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  nextState.configGroups = normalizeConfigGroups(nextState.configGroups);
  nextState.ungroupedCrossover = normalizeGroupCrossover(nextState.ungroupedCrossover);
  const defaultConfigGroupId = nextState.configGroups[0]?.id || UNGROUPED_CONFIG_GROUP_ID;
  const fallbackDriver = completeDriverParameters(sampleProject.driver, legacyProjectDriver(nextState));
  nextState.driver = fallbackDriver;
  delete nextState.driverGroups;
  delete nextState.activeDriverGroupId;

  if (!Array.isArray(nextState.designs)) {
    nextState.designs = [
      {
        id: nextState.activeDesignId || createDesignIdFallback(),
        name: options.designNameFromDriver?.(fallbackDriver) || "Custom driver",
        groupId: defaultConfigGroupId,
        mode: fallbackMode,
        visible: true,
        graphVisible: true,
        driver: cloneProject(fallbackDriver),
        box: fallbackBox,
      },
    ];
  } else if (nextState.designs.length === 0) {
    nextState.activeDesignId = "";
  } else {
    nextState.designs = nextState.designs.map((design, index) => {
      const mode = design.mode || fallbackMode;
      const box = completeBox(design.box || fallbackBox);
      const driver = completeDriverParameters(sampleProject.driver, legacyProjectDriver(design, fallbackDriver));
      const designForNaming = {
        mode,
        box,
        driver,
      };
      return {
        id: design.id || `design-${index + 1}`,
        name: options.normalizedDesignName?.(design.name, designForNaming) || String(design.name || "").trim() || "Custom driver",
        groupId: normalizeDesignConfigGroupId(design, nextState.configGroups),
        mode,
        visible: design.visible !== false,
        graphVisible: design.graphVisible !== false,
        color: isKnownPaletteColor(design.color) ? design.color : "",
        driver,
        box,
      };
    });
  }

  if (nextState.designs.length && !nextState.designs.some((design) => design.id === nextState.activeDesignId)) {
    nextState.activeDesignId = nextState.designs[0].id;
  }
  const fallbackMeasurementTarget = nextState.activeDesignId ? `design:${nextState.activeDesignId}` : `configGroup:${defaultConfigGroupId}`;
  nextState.measurements.recordingGroups = normalizeMeasurementGroups(nextState.measurements.recordingGroups).map((group) => {
    const groupedResponse = nextState.measurements.frequencyResponses.find((response) => response.recordingGroupId === group.id);
    return {
      ...group,
      target: group.target || groupedResponse?.target || fallbackMeasurementTarget,
    };
  });
  if (!nextState.measurements.recordingGroups.length) {
    nextState.measurements.recordingGroups = [{
      id: createMeasurementGroupId(),
      name: "Recording group",
      target: fallbackMeasurementTarget,
      kind: "manual",
      driverId: "",
    }];
  }
  nextState.measurements.frequencyResponses = nextState.measurements.frequencyResponses.map((response) => {
    const target = String(response.target || "");
    const nextResponse = { ...response };
    if (
      nextResponse.recordingGroupId
      && !nextState.measurements.recordingGroups.some((group) => group.id === nextResponse.recordingGroupId)
    ) {
      nextResponse.recordingGroupId = nextState.measurements.recordingGroups[0]?.id || UNGROUPED_MEASUREMENT_GROUP_ID;
    }
    if (!nextResponse.recordingGroupId) nextResponse.recordingGroupId = nextState.measurements.recordingGroups[0]?.id || UNGROUPED_MEASUREMENT_GROUP_ID;
    if (target === "design:" || target === "configGroup:") {
      return { ...nextResponse, target: fallbackMeasurementTarget };
    }
    if (target.startsWith("design:")) {
      const designId = target.slice("design:".length);
      return nextState.designs.some((design) => design.id === designId)
        ? nextResponse
        : { ...nextResponse, target: fallbackMeasurementTarget };
    }
    if (target.startsWith("configGroup:")) {
      const groupId = target.slice("configGroup:".length);
      return !groupId || nextState.configGroups.some((group) => group.id === groupId)
        ? nextResponse
        : { ...nextResponse, target: fallbackMeasurementTarget };
    }
    return { ...nextResponse, target: fallbackMeasurementTarget };
  });

  applyActiveDesignToProject(nextState);
  return nextState;
}

export function normalizeConfigGroups(groupsInput) {
  const sourceGroups = Array.isArray(groupsInput)
    ? groupsInput
    : sampleProject.configGroups;
  const groups = sourceGroups.map((group, index) => ({
    id: group.id || createConfigGroupId(),
    name: String(group.name || `Config group ${index + 1}`).trim() || `Config group ${index + 1}`,
    showMembers: true,
    showCombined: group.showCombined === true,
    crossover: normalizeGroupCrossover(group.crossover),
  }));
  return groups;
}

export function normalizeDesignConfigGroupId(design, groups) {
  const validGroupIds = new Set(groups.map((group) => group.id));
  if (validGroupIds.has(design.groupId)) return design.groupId;
  if (Object.prototype.hasOwnProperty.call(design, "groupId") && !design.groupId) return UNGROUPED_CONFIG_GROUP_ID;
  return groups[0]?.id || UNGROUPED_CONFIG_GROUP_ID;
}

function legacyProjectDriver(project, fallbackDriver = sampleProject.driver) {
  const activeGroup = Array.isArray(project?.driverGroups)
    ? project.driverGroups.find((group) => group.id === project.activeDriverGroupId) || project.driverGroups[0]
    : null;
  return project?.driver || activeGroup?.driver || fallbackDriver;
}

export function getActiveDesign(project) {
  return project.designs.find((design) => design.id === project.activeDesignId) || project.designs[0];
}

export function applyActiveDesignToProject(project) {
  const design = getActiveDesign(project);
  if (!design) return project;
  project.mode = design.mode;
  project.box = completeBox(design.box);
  project.driver = completeDriverParameters(sampleProject.driver, legacyProjectDriver(design, project.driver || sampleProject.driver));
  delete project.driverGroups;
  delete project.activeDriverGroupId;
  return project;
}

export function syncActiveDesignFromProject(project, options = {}) {
  const design = getActiveDesign(project);
  if (!design) return project;
  const previousAutoName = options.designNameFromBox?.(design.mode, design.box);
  const previousLegacyName = options.legacyDesignNameFromBox?.(design.mode, design.box);
  const previousDriverName = options.designNameFromDriver?.(options.designDriverForName?.(design));
  const shouldUpdateName = !design.name || design.name === previousAutoName || design.name === previousLegacyName || design.name === previousDriverName;
  design.mode = project.mode;
  design.box = completeBox(project.box);
  design.driver = completeDriverParameters(sampleProject.driver, project.driver);
  delete design.driverGroups;
  delete design.activeDriverGroupId;
  if (shouldUpdateName) {
    design.name = options.designNameFromDriver?.(options.designDriverForName?.(design)) || design.name || "Custom driver";
  }
  return project;
}

function isKnownPaletteColor(color) {
  return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color);
}

function createDesignIdFallback() {
  return `design-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
