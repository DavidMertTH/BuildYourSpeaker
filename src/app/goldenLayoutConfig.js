import { cloneProject } from "../state.js";
import { GOLDEN_COMPONENT_TYPE, PANEL_IDS } from "./constants.js";
import { PANEL_LABELS } from "./tooltips.js";

export function makeGoldenLayoutTabsClosable(config) {
  const nextConfig = cloneProject(config);
  const visit = (item) => {
    if (!item) return;
    if (item.type === "component" && item.componentType === GOLDEN_COMPONENT_TYPE) {
      item.isClosable = true;
    }
    (item.content || []).forEach(visit);
  };
  visit(nextConfig.root);
  return nextConfig;
}

export function goldenLayoutConfigFromResolved(config) {
  if (!config) return null;
  const LayoutConfig = globalThis.goldenLayout?.LayoutConfig;
  try {
    return LayoutConfig?.isResolved?.(config) ? LayoutConfig.fromResolved(config) : config;
  } catch {
    return null;
  }
}

export function buildGoldenLayoutConfig(panelIds = PANEL_IDS) {
  const uniquePanelIds = [...new Set(panelIds)].filter((panelId) => PANEL_IDS.includes(panelId));
  const visiblePanelIds = uniquePanelIds.length ? uniquePanelIds : [PANEL_IDS[0]];
  const columnCount = visiblePanelIds.length <= 1 ? 1 : visiblePanelIds.length <= 4 ? 2 : 3;
  const columns = Array.from({ length: columnCount }, () => []);
  visiblePanelIds.forEach((panelId, index) => {
    columns[index % columnCount].push(panelId);
  });

  const root =
    columnCount === 1
      ? columnConfig(columns[0], 100)
      : {
          type: "row",
          content: columns
            .filter((column) => column.length)
            .map((column) => columnConfig(column, 100 / columnCount)),
        };

  return {
    root,
    settings: {
      reorderEnabled: true,
      constrainDragToContainer: true,
      popoutWholeStack: false,
    },
    dimensions: {
      borderWidth: 7,
      borderGrabWidth: 8,
      headerHeight: 24,
      defaultMinItemWidth: "180px",
      defaultMinItemHeight: "150px",
    },
    header: {
      show: "top",
      close: "hide",
      maximise: "maximise",
      minimise: "minimise",
      popout: "popout",
      tabDropdown: "tabs",
    },
  };
}

function columnConfig(panelIds, width) {
  const content = panelIds.map((panelId) => componentStackConfig(panelId, 100 / panelIds.length));
  if (content.length === 1) return { ...content[0], size: `${width}%` };
  return {
    type: "column",
    size: `${width}%`,
    content,
  };
}

function componentStackConfig(panelId, height) {
  return {
    type: "stack",
    size: `${height}%`,
    content: [
      {
        type: "component",
        componentType: GOLDEN_COMPONENT_TYPE,
        title: PANEL_LABELS[panelId] || panelId,
        componentState: { panelId },
        isClosable: true,
      },
    ],
  };
}

export function panelIdsFromLayoutConfig(config) {
  const ids = [];
  const visit = (item) => {
    if (!item) return;
    if (item.type === "component") {
      const panelId = item.componentState?.panelId;
      if (PANEL_IDS.includes(panelId) && !ids.includes(panelId)) ids.push(panelId);
    }
    item.content?.forEach(visit);
  };
  visit(config?.root);
  return ids;
}

export function appendPanelsToGoldenConfig(config, panelIds) {
  if (!config?.root || !Array.isArray(panelIds) || panelIds.length === 0) return config;
  const nextConfig = cloneProject(config);
  const panels = panelIds.filter((panelId) => PANEL_IDS.includes(panelId));
  if (!panels.length) return nextConfig;

  const panelStacks = panels.map((panelId) => componentStackConfig(panelId, 100 / panels.length));
  if (nextConfig.root.type === "row" || nextConfig.root.type === "column") {
    nextConfig.root.content = [...(nextConfig.root.content || []), ...panelStacks];
    return nextConfig;
  }

  nextConfig.root = {
    type: "row",
    content: [
      nextConfig.root,
      ...panelStacks,
    ],
  };
  return nextConfig;
}
