import { normalizeInventory } from "../core/planner/componentInventory.js";
import { normalizeMeasurementGroups, normalizeMeasurements } from "../core/measurements.js";
import { cloneProject, sampleProject } from "../state.js";
import { completeDriverParameters } from "./driverParameters.js";
import { UNGROUPED_CONFIG_GROUP_ID, UNGROUPED_MEASUREMENT_GROUP_ID } from "./constants.js";
import { completeBox } from "./boxModel.js";
import { normalizeGroupCrossover } from "./crossoverModel.js";
import { createConfigGroupId, createDriverGroupId, createMeasurementGroupId } from "./idUtils.js";

export function normalizeProjectState(project, options = {}) {
  const nextState = cloneProject(project);
  const fallbackBox = completeBox(nextState.box || sampleProject.box);
  const fallbackMode = nextState.mode || "vented";
  nextState.inventory = normalizeInventory(nextState.inventory || sampleProject.inventory);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  nextState.configGroups = normalizeConfigGroups(nextState.configGroups);
  const defaultConfigGroupId = nextState.configGroups[0]?.id || UNGROUPED_CONFIG_GROUP_ID;
  nextState.driverGroups = normalizeDriverGroups(nextState, fallbackBox);
  if (!nextState.driverGroups.some((group) => group.id === nextState.activeDriverGroupId)) {
    nextState.activeDriverGroupId = nextState.driverGroups[0]?.id;
  }
  syncProjectDriverFromActiveGroup(nextState);
  syncBoxDriverArrayFromActiveGroup(nextState);
  const fallbackDriver = completeDriverParameters(sampleProject.driver, nextState.driver);
  const fallbackDriverGroups = cloneProject(nextState.driverGroups);
  const fallbackActiveDriverGroupId = nextState.activeDriverGroupId;

  if (!Array.isArray(nextState.designs) || nextState.designs.length === 0) {
    nextState.designs = [
      {
        id: nextState.activeDesignId || createDesignIdFallback(),
        name: options.designNameFromDriver?.(fallbackDriver) || "Custom driver",
        groupId: defaultConfigGroupId,
        mode: fallbackMode,
        visible: true,
        graphVisible: true,
        driver: cloneProject(fallbackDriver),
        driverGroups: cloneProject(fallbackDriverGroups),
        activeDriverGroupId: fallbackActiveDriverGroupId,
        box: fallbackBox,
      },
    ];
  } else {
    nextState.designs = nextState.designs.map((design, index) => {
      const mode = design.mode || fallbackMode;
      const box = completeBox(design.box || fallbackBox);
      const driver = completeDriverParameters(sampleProject.driver, design.driver || fallbackDriver);
      const driverGroups = normalizeDriverGroups({ ...nextState, driver, driverGroups: design.driverGroups || fallbackDriverGroups }, box);
      const activeDriverGroupId = driverGroups.some((group) => group.id === design.activeDriverGroupId)
        ? design.activeDriverGroupId
        : driverGroups[0]?.id;
      const designForNaming = {
        mode,
        box,
        driver,
        driverGroups,
        activeDriverGroupId,
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
        driverGroups,
        activeDriverGroupId,
        box,
      };
    });
  }

  if (!nextState.designs.some((design) => design.id === nextState.activeDesignId)) {
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

export function normalizeDriverGroups(project, fallbackBox = completeBox(project.box || sampleProject.box)) {
  const sourceGroups = Array.isArray(project.driverGroups) && project.driverGroups.length
    ? project.driverGroups
    : [
        {
          id: "group-main",
          name: "Main drivers",
          driver: project.driver || sampleProject.driver,
          count: fallbackBox.driverCount || 1,
          wiring: fallbackBox.driverWiring || "parallel",
          chamberId: "main",
        },
      ];

  return sourceGroups.map((group, index) => ({
    id: group.id || createDriverGroupId(),
    name: String(group.name || `Group ${index + 1}`).trim() || `Group ${index + 1}`,
    driver: completeDriverParameters(sampleProject.driver, group.driver || project.driver || sampleProject.driver),
    count: Math.max(1, Math.min(16, Math.round(Number(group.count) || 1))),
    wiring: group.wiring === "series" ? "series" : "parallel",
    chamberId: group.chamberId || "main",
  }));
}

export function getActiveDesign(project) {
  return project.designs.find((design) => design.id === project.activeDesignId) || project.designs[0];
}

export function applyActiveDesignToProject(project) {
  const design = getActiveDesign(project);
  project.mode = design.mode;
  project.box = completeBox(design.box);
  project.driver = completeDriverParameters(sampleProject.driver, design.driver || project.driver || sampleProject.driver);
  project.driverGroups = normalizeDriverGroups({ ...project, driverGroups: design.driverGroups || project.driverGroups, driver: project.driver }, project.box);
  project.activeDriverGroupId = project.driverGroups.some((group) => group.id === design.activeDriverGroupId)
    ? design.activeDriverGroupId
    : project.driverGroups[0]?.id;
  syncProjectDriverFromActiveGroup(project);
  syncBoxDriverArrayFromActiveGroup(project);
  return project;
}

export function getActiveDriverGroup(project) {
  return project.driverGroups?.find((group) => group.id === project.activeDriverGroupId) || project.driverGroups?.[0];
}

export function syncProjectDriverFromActiveGroup(project) {
  const group = getActiveDriverGroup(project);
  project.driver = completeDriverParameters(sampleProject.driver, group?.driver || project.driver || sampleProject.driver);
  return project;
}

export function syncActiveDriverGroupFromProject(project) {
  const group = getActiveDriverGroup(project);
  if (group) group.driver = completeDriverParameters(sampleProject.driver, project.driver);
  return project;
}

export function syncActiveDriverGroupArrayFromBox(project) {
  const group = getActiveDriverGroup(project);
  if (!group) return project;
  const box = completeBox(project.box);
  group.count = box.driverCount;
  group.wiring = box.driverWiring;
  return project;
}

export function syncBoxDriverArrayFromActiveGroup(project) {
  const group = getActiveDriverGroup(project);
  if (!group) return project;
  project.box = completeBox(project.box);
  project.box.driverCount = Math.max(1, Math.min(16, Math.round(Number(group.count) || 1)));
  project.box.driverWiring = group.wiring === "series" ? "series" : "parallel";
  return project;
}

export function syncActiveDesignFromProject(project, options = {}) {
  const design = getActiveDesign(project);
  const previousAutoName = options.designNameFromBox?.(design.mode, design.box);
  const previousLegacyName = options.legacyDesignNameFromBox?.(design.mode, design.box);
  const previousDriverName = options.designNameFromDriver?.(options.designDriverForName?.(design));
  const shouldUpdateName = !design.name || design.name === previousAutoName || design.name === previousLegacyName || design.name === previousDriverName;
  design.mode = project.mode;
  design.box = completeBox(project.box);
  design.driver = completeDriverParameters(sampleProject.driver, project.driver);
  design.driverGroups = cloneProject(project.driverGroups || []);
  design.activeDriverGroupId = project.activeDriverGroupId;
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
