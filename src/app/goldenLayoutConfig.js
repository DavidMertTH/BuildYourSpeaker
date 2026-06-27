import { cloneProject } from "../state.js";
import { GOLDEN_COMPONENT_TYPE, PANEL_IDS } from "./constants.js";
import { PANEL_LABELS } from "./tooltips.js";

const GOLDEN_LAYOUT_DIMENSIONS = {
  borderWidth: 0,
  borderGrabWidth: 18,
  headerHeight: 18,
  defaultMinItemWidth: "40px",
  defaultMinItemHeight: "36px",
  dragProxyWidth: 120,
  dragProxyHeight: 80,
};

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
    const nextConfig = LayoutConfig?.isResolved?.(config) ? LayoutConfig.fromResolved(config) : config;
    return pruneInvalidPanels(normalizeGoldenLayoutDimensions(nextConfig));
  } catch {
    return null;
  }
}

function normalizeGoldenLayoutDimensions(config) {
  const nextConfig = cloneProject(config);
  nextConfig.dimensions = {
    ...(nextConfig.dimensions || {}),
    ...GOLDEN_LAYOUT_DIMENSIONS,
  };
  return nextConfig;
}

function pruneInvalidPanels(config) {
  const nextConfig = cloneProject(config);
  const root = pruneLayoutItem(nextConfig.root);
  if (!root) return null;
  nextConfig.root = root;
  return nextConfig;
}

function pruneLayoutItem(item) {
  if (!item) return null;
  if (item.type === "component") {
    const panelId = item.componentState?.panelId;
    return PANEL_IDS.includes(panelId) ? item : null;
  }

  if (Array.isArray(item.content)) {
    const content = item.content.map(pruneLayoutItem).filter(Boolean);
    if (!content.length) return null;
    return { ...item, content };
  }

  return item;
}

export function buildGoldenLayoutConfig(panelIds = PANEL_IDS) {
  const uniquePanelIds = [...new Set(panelIds)].filter((panelId) => PANEL_IDS.includes(panelId));
  const visiblePanelIds = uniquePanelIds.length ? uniquePanelIds : [PANEL_IDS[0]];
  if (isDriverLayout(visiblePanelIds)) return buildDriverGoldenLayoutConfig();
  if (isBoxTwoPanelLayout(visiblePanelIds)) return buildBoxTwoPanelGoldenLayoutConfig(visiblePanelIds);
  if (isBoxStackedDetailLayout(visiblePanelIds)) return buildBoxStackedDetailGoldenLayoutConfig(visiblePanelIds);
  if (isRecordingLayout(visiblePanelIds)) return buildRecordingGoldenLayoutConfig();
  if (isCrossoverLayout(visiblePanelIds)) return buildCrossoverGoldenLayoutConfig();

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
    dimensions: { ...GOLDEN_LAYOUT_DIMENSIONS },
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

function isDriverLayout(panelIds) {
  const driverPanelIds = ["splPlot", "onAxisResponsePlot", "offAxisResponsePlot"];
  return panelIds.length === driverPanelIds.length && driverPanelIds.every((panelId) => panelIds.includes(panelId));
}

function isBoxStackedDetailLayout(panelIds) {
  const detailPanelIds = panelIds.filter((panelId) => panelId !== "splPlot");
  return panelIds.length === 3
    && panelIds.includes("splPlot")
    && detailPanelIds.every((panelId) => ["excursionPlot", "portPlot", "prExcursionPlot"].includes(panelId));
}

function isBoxTwoPanelLayout(panelIds) {
  return panelIds.length === 2 && panelIds.includes("splPlot") && (
    panelIds.includes("excursionPlot") || panelIds.includes("portPlot")
  );
}

function isRecordingLayout(panelIds) {
  const measurementPanelIds = ["onAxisResponsePlot", "offAxisResponsePlot"];
  return panelIds.length === measurementPanelIds.length && measurementPanelIds.every((panelId) => panelIds.includes(panelId));
}

function isCrossoverLayout(panelIds) {
  const crossoverPanelIds = ["crossoverSchematicPanel", "splPlot", "phasePlot", "impedancePlot"];
  return panelIds.length === crossoverPanelIds.length && crossoverPanelIds.every((panelId) => panelIds.includes(panelId));
}

function buildDriverGoldenLayoutConfig() {
  return {
    root: {
      type: "row",
      content: [
        componentStackConfig("splPlot", 66),
        {
          type: "column",
          size: "34%",
          content: [
            componentStackConfig("onAxisResponsePlot", 50),
            componentStackConfig("offAxisResponsePlot", 50),
          ],
        },
      ],
    },
    settings: {
      reorderEnabled: true,
      constrainDragToContainer: true,
      popoutWholeStack: false,
    },
    dimensions: { ...GOLDEN_LAYOUT_DIMENSIONS },
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

function buildBoxStackedDetailGoldenLayoutConfig(panelIds) {
  const detailPanelIds = panelIds.filter((panelId) => panelId !== "splPlot");
  return {
    root: {
      type: "row",
      content: [
        componentStackConfig("splPlot", 68),
        {
          type: "column",
          size: "32%",
          content: detailPanelIds.map((panelId) => componentStackConfig(panelId, 100 / detailPanelIds.length)),
        },
      ],
    },
    settings: {
      reorderEnabled: true,
      constrainDragToContainer: true,
      popoutWholeStack: false,
    },
    dimensions: { ...GOLDEN_LAYOUT_DIMENSIONS },
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

function buildBoxTwoPanelGoldenLayoutConfig(panelIds) {
  const secondaryPanelId = panelIds.find((panelId) => panelId !== "splPlot") || "excursionPlot";
  return {
    root: {
      type: "row",
      content: [
        componentStackConfig("splPlot", 68),
        componentStackConfig(secondaryPanelId, 32),
      ],
    },
    settings: {
      reorderEnabled: true,
      constrainDragToContainer: true,
      popoutWholeStack: false,
    },
    dimensions: { ...GOLDEN_LAYOUT_DIMENSIONS },
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

function buildRecordingGoldenLayoutConfig() {
  return {
    root: {
      type: "row",
      content: [
        componentStackConfig("onAxisResponsePlot", 50),
        componentStackConfig("offAxisResponsePlot", 50),
      ],
    },
    settings: {
      reorderEnabled: true,
      constrainDragToContainer: true,
      popoutWholeStack: false,
    },
    dimensions: { ...GOLDEN_LAYOUT_DIMENSIONS },
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

function buildCrossoverGoldenLayoutConfig() {
  return {
    root: {
      type: "column",
      content: [
        componentStackConfig("crossoverSchematicPanel", 64),
        {
          type: "row",
          size: "36%",
          content: [
            componentStackConfig("splPlot", 34),
            componentStackConfig("phasePlot", 33),
            componentStackConfig("impedancePlot", 33),
          ],
        },
      ],
    },
    settings: {
      reorderEnabled: true,
      constrainDragToContainer: true,
      popoutWholeStack: false,
    },
    dimensions: { ...GOLDEN_LAYOUT_DIMENSIONS },
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
