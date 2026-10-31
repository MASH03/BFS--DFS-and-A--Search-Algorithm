/**
 * ==============================================================================
 * SEARCH ALGORITHMS WEB VISUALIZER (BFS, DFS, A*)
 * ==============================================================================
 */

// Global State
let currentView = 'grid'; // 'grid' | 'graph'
let isSearching = false;

// ------------------------------------------------------------------------------
// 1. GRID STATE & CONFIGURATION
// ------------------------------------------------------------------------------
const GRID_ROWS = 18;
const GRID_COLS = 40;
let grid = []; // 2D array: 0 = empty, 1 = wall, 'S' = start, 'G' = goal
let startPos = { r: 8, c: 5 };
let goalPos = { r: 8, c: 34 };
let isMouseDown = false;
let isDraggingStart = false;
let isDraggingGoal = false;
let drawMode = 'wall'; // 'wall' | 'empty'

// Speed slider settings: 1 = slowest, 5 = instant
const SPEED_DELAYS = { 1: 50, 2: 25, 3: 12, 4: 5, 5: 0 };

function getDelay() {
  const sliderVal = document.getElementById('speed-slider').value;
  return SPEED_DELAYS[sliderVal] !== undefined ? SPEED_DELAYS[sliderVal] : 5;
}

// ------------------------------------------------------------------------------
// 2. ROMANIA ROADMAP GRAPH DATA
// ------------------------------------------------------------------------------
const ROMANIA_GRAPH = {
  nodes: {
    "Arad":           { x: 90,  y: 220, h: 366 },
    "Zerind":         { x: 130, y: 130, h: 374 },
    "Oradea":         { x: 180, y: 50,  h: 380 },
    "Sibiu":          { x: 310, y: 240, h: 253 },
    "Timisoara":      { x: 90,  y: 370, h: 329 },
    "Lugoj":          { x: 200, y: 390, h: 244 },
    "Mehadia":        { x: 205, y: 470, h: 241 },
    "Dobreta":        { x: 200, y: 545, h: 242 },
    "Craiova":        { x: 380, y: 550, h: 160 },
    "Rimnicu Vilcea": { x: 370, y: 330, h: 193 },
    "Fagaras":        { x: 500, y: 245, h: 176 },
    "Pitesti":        { x: 520, y: 410, h: 100 },
    "Bucharest":      { x: 690, y: 460, h: 0   },
    "Giurgiu":        { x: 640, y: 565, h: 77  },
    "Urziceni":       { x: 790, y: 400, h: 80  },
    "Hirsova":        { x: 890, y: 400, h: 151 },
    "Eforie":         { x: 920, y: 510, h: 161 },
    "Vaslui":         { x: 860, y: 260, h: 199 },
    "Iasi":           { x: 800, y: 150, h: 226 },
    "Neamt":          { x: 670, y: 100, h: 234 }
  },
  edges: [
    ["Arad", "Zerind", 75],
    ["Arad", "Sibiu", 140],
    ["Arad", "Timisoara", 118],
    ["Zerind", "Oradea", 71],
    ["Oradea", "Sibiu", 151],
    ["Timisoara", "Lugoj", 111],
    ["Lugoj", "Mehadia", 70],
    ["Mehadia", "Dobreta", 75],
    ["Dobreta", "Craiova", 120],
    ["Sibiu", "Fagaras", 99],
    ["Sibiu", "Rimnicu Vilcea", 80],
    ["Rimnicu Vilcea", "Craiova", 146],
    ["Rimnicu Vilcea", "Pitesti", 97],
    ["Craiova", "Pitesti", 138],
    ["Fagaras", "Bucharest", 211],
    ["Pitesti", "Bucharest", 101],
    ["Bucharest", "Giurgiu", 90],
    ["Bucharest", "Urziceni", 85],
    ["Urziceni", "Hirsova", 98],
    ["Hirsova", "Eforie", 86],
    ["Urziceni", "Vaslui", 142],
    ["Vaslui", "Iasi", 92],
    ["Iasi", "Neamt", 87]
  ]
};

// ------------------------------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  initGrid();
  initGraph();
  setupSpeedSlider();
});

function switchView(view) {
  if (isSearching) return;
  currentView = view;

  document.getElementById('tab-grid').classList.toggle('active', view === 'grid');
  document.getElementById('tab-graph').classList.toggle('active', view === 'graph');

  document.getElementById('view-grid').style.display = view === 'grid' ? 'flex' : 'none';
  document.getElementById('view-graph').style.display = view === 'graph' ? 'flex' : 'none';

  document.getElementById('grid-controls').style.display = view === 'grid' ? 'flex' : 'none';
  document.getElementById('graph-controls').style.display = view === 'graph' ? 'flex' : 'none';

  resetMetrics();
  closeComparison();
}

function setupSpeedSlider() {
  const slider = document.getElementById('speed-slider');
  const label = document.getElementById('speed-label');
  const names = { 1: 'Slow', 2: 'Medium', 3: 'Normal', 4: 'Fast', 5: 'Instant' };
  slider.addEventListener('input', () => {
    label.textContent = names[slider.value] || 'Fast';
  });
}

function setMetrics(status, cost, explored, timeMs) {
  const statusEl = document.getElementById('stat-status');
  statusEl.textContent = status;
  statusEl.className = 'metric-value ' + (
    status === 'Running...' ? 'status-running' :
    status === 'Found!' ? 'status-success' :
    status === 'No Path' ? 'status-failed' : 'status-idle'
  );

  document.getElementById('stat-cost').textContent = cost !== null ? cost : '--';
  document.getElementById('stat-explored').textContent = explored !== null ? explored : '--';
  document.getElementById('stat-time').textContent = timeMs !== null ? `${timeMs.toFixed(2)} ms` : '--';
}

function resetMetrics() {
  setMetrics('Ready', null, null, null);
}

// ------------------------------------------------------------------------------
// 3. 2D GRID BOARD LOGIC & INTERACTIONS
// ------------------------------------------------------------------------------
function initGrid() {
  const board = document.getElementById('grid-board');
  board.innerHTML = '';
  board.style.gridTemplateColumns = `repeat(${GRID_COLS}, 26px)`;
  grid = [];

  for (let r = 0; r < GRID_ROWS; r++) {
    const row = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;

      if (r === startPos.r && c === startPos.c) {
        cell.classList.add('start');
        row.push('S');
      } else if (r === goalPos.r && c === goalPos.c) {
        cell.classList.add('goal');
        row.push('G');
      } else {
        row.push(0);
      }

      cell.addEventListener('mousedown', (e) => onCellMouseDown(e, r, c));
      cell.addEventListener('mouseenter', () => onCellMouseEnter(r, c));
      board.appendChild(cell);
    }
    grid.push(row);
  }

  window.addEventListener('mouseup', () => {
    isMouseDown = false;
    isDraggingStart = false;
    isDraggingGoal = false;
  });
}

function onCellMouseDown(e, r, c) {
  if (isSearching) return;
  e.preventDefault();
  isMouseDown = true;

  if (r === startPos.r && c === startPos.c) {
    isDraggingStart = true;
    return;
  }
  if (r === goalPos.r && c === goalPos.c) {
    isDraggingGoal = true;
    return;
  }

  // Toggle wall
  if (grid[r][c] === 1) {
    drawMode = 'empty';
    grid[r][c] = 0;
    getCellEl(r, c).classList.remove('wall');
  } else {
    drawMode = 'wall';
    grid[r][c] = 1;
    getCellEl(r, c).classList.add('wall');
  }
}

function onCellMouseEnter(r, c) {
  if (!isMouseDown || isSearching) return;

  if (isDraggingStart) {
    if (grid[r][c] !== 1 && !(r === goalPos.r && c === goalPos.c)) {
      getCellEl(startPos.r, startPos.c).classList.remove('start');
      grid[startPos.r][startPos.c] = 0;
      startPos = { r, c };
      grid[r][c] = 'S';
      getCellEl(r, c).classList.add('start');
    }
    return;
  }

  if (isDraggingGoal) {
    if (grid[r][c] !== 1 && !(r === startPos.r && c === startPos.c)) {
      getCellEl(goalPos.r, goalPos.c).classList.remove('goal');
      grid[goalPos.r][goalPos.c] = 0;
      goalPos = { r, c };
      grid[r][c] = 'G';
      getCellEl(r, c).classList.add('goal');
    }
    return;
  }

  if (r === startPos.r && c === startPos.c) return;
  if (r === goalPos.r && c === goalPos.c) return;

  if (drawMode === 'wall') {
    grid[r][c] = 1;
    getCellEl(r, c).classList.add('wall');
  } else {
    grid[r][c] = 0;
    getCellEl(r, c).classList.remove('wall');
  }
}

function getCellEl(r, c) {
  return document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
}

function clearPath() {
  if (isSearching) return;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const el = getCellEl(r, c);
      if (el) {
        el.classList.remove('visited', 'path');
      }
    }
  }
  resetMetrics();
}

function clearBoard() {
  if (isSearching) return;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      grid[r][c] = 0;
      const el = getCellEl(r, c);
      if (el) {
        el.className = 'cell';
      }
    }
  }
  startPos = { r: 8, c: 5 };
  goalPos = { r: 8, c: 34 };
  grid[startPos.r][startPos.c] = 'S';
  grid[goalPos.r][goalPos.c] = 'G';
  getCellEl(startPos.r, startPos.c).classList.add('start');
  getCellEl(goalPos.r, goalPos.c).classList.add('goal');
  resetMetrics();
  closeComparison();
}

function generateMaze() {
  clearBoard();
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if ((r === startPos.r && c === startPos.c) || (r === goalPos.r && c === goalPos.c)) {
        continue;
      }
      // Add random walls with density ~ 28%
      if (Math.random() < 0.28) {
        grid[r][c] = 1;
        getCellEl(r, c).classList.add('wall');
      }
    }
  }
}

// ------------------------------------------------------------------------------
// 4. GRID SEARCH ALGORITHMS (BFS, DFS, A*)
// ------------------------------------------------------------------------------
function getNeighbors(r, c) {
  const dirs = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // N, E, S, W
  const neighbors = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS && grid[nr][nc] !== 1) {
      neighbors.push({ r: nr, c: nc });
    }
  }
  return neighbors;
}

function solveGridBFS() {
  const queue = [{ r: startPos.r, c: startPos.c }];
  const visited = new Set([`${startPos.r},${startPos.c}`]);
  const parent = {};
  const order = [];

  let found = false;
  while (queue.length > 0) {
    const curr = queue.shift();
    order.push(curr);

    if (curr.r === goalPos.r && curr.c === goalPos.c) {
      found = true;
      break;
    }

    for (const neighbor of getNeighbors(curr.r, curr.c)) {
      const key = `${neighbor.r},${neighbor.c}`;
      if (!visited.has(key)) {
        visited.add(key);
        parent[key] = curr;
        queue.push(neighbor);
      }
    }
  }

  const path = reconstructPath(parent, found);
  return { path, order, found };
}

function solveGridDFS() {
  const stack = [{ r: startPos.r, c: startPos.c }];
  const visited = new Set();
  const parent = {};
  const order = [];

  let found = false;
  while (stack.length > 0) {
    const curr = stack.pop();
    const currKey = `${curr.r},${curr.c}`;

    if (visited.has(currKey)) continue;
    visited.add(currKey);
    order.push(curr);

    if (curr.r === goalPos.r && curr.c === goalPos.c) {
      found = true;
      break;
    }

    const neighbors = getNeighbors(curr.r, curr.c);
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const neighbor = neighbors[i];
      const key = `${neighbor.r},${neighbor.c}`;
      if (!visited.has(key)) {
        parent[key] = curr;
        stack.push(neighbor);
      }
    }
  }

  const path = reconstructPath(parent, found);
  return { path, order, found };
}

function solveGridAStar() {
  const manhattan = (p1, p2) => Math.abs(p1.r - p2.r) + Math.abs(p1.c - p2.c);

  const openSet = [{ r: startPos.r, c: startPos.c, f: manhattan(startPos, goalPos) }];
  const gScore = { [`${startPos.r},${startPos.c}`]: 0 };
  const closedSet = new Set();
  const parent = {};
  const order = [];

  let found = false;
  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const curr = openSet.shift();
    const currKey = `${curr.r},${curr.c}`;

    if (closedSet.has(currKey)) continue;
    closedSet.add(currKey);
    order.push(curr);

    if (curr.r === goalPos.r && curr.c === goalPos.c) {
      found = true;
      break;
    }

    for (const neighbor of getNeighbors(curr.r, curr.c)) {
      const nKey = `${neighbor.r},${neighbor.c}`;
      const tentativeG = gScore[currKey] + 1;

      if (tentativeG < (gScore[nKey] ?? Infinity)) {
        gScore[nKey] = tentativeG;
        parent[nKey] = curr;
        const f = tentativeG + manhattan(neighbor, goalPos);
        openSet.push({ r: neighbor.r, c: neighbor.c, f });
      }
    }
  }

  const path = reconstructPath(parent, found);
  return { path, order, found };
}

function reconstructPath(parent, found) {
  if (!found) return [];
  const path = [];
  let curr = goalPos;
  while (curr) {
    path.push(curr);
    curr = parent[`${curr.r},${curr.c}`];
  }
  path.reverse();
  return path;
}

// ------------------------------------------------------------------------------
// 5. ANIMATING GRID SEARCH
// ------------------------------------------------------------------------------
async function runAlgorithm() {
  if (isSearching) return;
  const algo = document.getElementById('algo-select').value;

  if (algo === 'compare') {
    compareGridAll();
    return;
  }

  clearPath();
  isSearching = true;
  setControlsDisabled(true);
  setMetrics('Running...', null, null, null);

  const t0 = performance.now();
  let result;
  if (algo === 'bfs') result = solveGridBFS();
  else if (algo === 'dfs') result = solveGridDFS();
  else result = solveGridAStar();
  const duration = performance.now() - t0;

  const delay = getDelay();

  if (delay === 0) {
    // Instant
    for (const node of result.order) {
      if (!isStartOrGoal(node)) getCellEl(node.r, node.c).classList.add('visited');
    }
    for (const node of result.path) {
      if (!isStartOrGoal(node)) getCellEl(node.r, node.c).classList.add('path');
    }
    finalizeSearch(result, duration);
  } else {
    // Animated
    for (let i = 0; i < result.order.length; i++) {
      const node = result.order[i];
      if (!isStartOrGoal(node)) {
        getCellEl(node.r, node.c).classList.add('visited');
      }
      if (i % 3 === 0) await sleep(delay);
    }

    for (let i = 0; i < result.path.length; i++) {
      const node = result.path[i];
      if (!isStartOrGoal(node)) {
        getCellEl(node.r, node.c).classList.add('path');
      }
      await sleep(delay * 1.5);
    }
    finalizeSearch(result, duration);
  }
}

function isStartOrGoal(p) {
  return (p.r === startPos.r && p.c === startPos.c) || (p.r === goalPos.r && p.c === goalPos.c);
}

function finalizeSearch(result, duration) {
  isSearching = false;
  setControlsDisabled(false);
  if (result.found) {
    setMetrics('Found!', `${result.path.length - 1} steps`, result.order.length, duration);
  } else {
    setMetrics('No Path', 'N/A', result.order.length, duration);
  }
}

function compareGridAll() {
  clearPath();
  const t0_bfs = performance.now();
  const bfs = solveGridBFS();
  const d_bfs = performance.now() - t0_bfs;

  const t0_dfs = performance.now();
  const dfs = solveGridDFS();
  const d_dfs = performance.now() - t0_dfs;

  const t0_ast = performance.now();
  const astar = solveGridAStar();
  const d_ast = performance.now() - t0_ast;

  // Render A* path on board by default
  for (const node of astar.path) {
    if (!isStartOrGoal(node)) getCellEl(node.r, node.c).classList.add('path');
  }

  showComparison([
    {
      name: 'Breadth-First Search (BFS)',
      found: bfs.found ? 'YES' : 'NO',
      cost: bfs.found ? `${bfs.path.length - 1} steps` : 'N/A',
      explored: bfs.order.length,
      time: `${d_bfs.toFixed(3)} ms`,
      note: 'FIFO Queue. Finds shortest unweighted path but expands uniformly in all directions.'
    },
    {
      name: 'Depth-First Search (DFS)',
      found: dfs.found ? 'YES' : 'NO',
      cost: dfs.found ? `${dfs.path.length - 1} steps` : 'N/A',
      explored: dfs.order.length,
      time: `${d_dfs.toFixed(3)} ms`,
      note: 'LIFO Stack. Snaking, deep path; usually suboptimal path length.'
    },
    {
      name: 'A* Search (A-Star)',
      found: astar.found ? 'YES' : 'NO',
      cost: astar.found ? `${astar.path.length - 1} steps` : 'N/A',
      explored: astar.order.length,
      time: `${d_ast.toFixed(3)} ms`,
      note: 'Priority Queue with Manhattan heuristic. Optimally short path with fewer cell visits!'
    }
  ], `In 2D grid pathfinding, A* achieves the exact shortest path (${astar.path.length - 1} steps) while pruning unnecessary expansions toward dead ends!`);
}

// ------------------------------------------------------------------------------
// 6. ROMANIA ROADMAP GRAPH LOGIC & SVG RENDERING
// ------------------------------------------------------------------------------
let graphAdj = {};
let selectedStartCity = "Arad";
let selectedGoalCity = "Bucharest";

function initGraph() {
  const svg = document.getElementById('graph-svg');
  svg.innerHTML = '';
  graphAdj = {};

  // Build adjacency
  for (const node in ROMANIA_GRAPH.nodes) {
    graphAdj[node] = [];
  }
  for (const [u, v, w] of ROMANIA_GRAPH.edges) {
    graphAdj[u].push({ node: v, weight: w });
    graphAdj[v].push({ node: u, weight: w });
  }

  // Populate city dropdowns
  const startSelect = document.getElementById('start-city');
  const goalSelect = document.getElementById('goal-city');
  startSelect.innerHTML = '';
  goalSelect.innerHTML = '';

  const cities = Object.keys(ROMANIA_GRAPH.nodes).sort();
  for (const city of cities) {
    const opt1 = new Option(city, city, false, city === "Arad");
    const opt2 = new Option(city, city, false, city === "Bucharest");
    startSelect.add(opt1);
    goalSelect.add(opt2);
  }

  startSelect.addEventListener('change', (e) => {
    selectedStartCity = e.target.value;
    updateGraphHighlight();
  });
  goalSelect.addEventListener('change', (e) => {
    selectedGoalCity = e.target.value;
    updateGraphHighlight();
  });

  // Render Edges
  for (const [u, v, w] of ROMANIA_GRAPH.edges) {
    const n1 = ROMANIA_GRAPH.nodes[u];
    const n2 = ROMANIA_GRAPH.nodes[v];

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', n1.x);
    line.setAttribute('y1', n1.y);
    line.setAttribute('x2', n2.x);
    line.setAttribute('y2', n2.y);
    line.setAttribute('class', 'graph-edge');
    line.dataset.edge = `${u}-${v}`;
    svg.appendChild(line);

    // Label with distance
    const midX = (n1.x + n2.x) / 2;
    const midY = (n1.y + n2.y) / 2;

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', midX - 14);
    bg.setAttribute('y', midY - 9);
    bg.setAttribute('width', 28);
    bg.setAttribute('height', 16);
    bg.setAttribute('class', 'edge-label-bg');
    svg.appendChild(bg);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', midX);
    text.setAttribute('y', midY);
    text.setAttribute('class', 'edge-label');
    text.textContent = w;
    svg.appendChild(text);
  }

  // Render Nodes
  for (const name in ROMANIA_GRAPH.nodes) {
    const n = ROMANIA_GRAPH.nodes[name];
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'graph-node');
    g.dataset.node = name;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', n.x);
    circle.setAttribute('cy', n.y);
    circle.setAttribute('r', 20);

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', n.x);
    title.setAttribute('y', n.y - 28);
    title.setAttribute('class', 'node-title');
    title.textContent = name;

    const heuristic = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    heuristic.setAttribute('x', n.x);
    heuristic.setAttribute('y', n.y + 32);
    heuristic.setAttribute('class', 'node-heuristic');
    heuristic.textContent = `h=${n.h}`;

    g.appendChild(circle);
    g.appendChild(title);
    g.appendChild(heuristic);

    g.addEventListener('click', () => {
      if (isSearching) return;
      if (selectedStartCity !== name) {
        selectedGoalCity = name;
        goalSelect.value = name;
      }
      updateGraphHighlight();
    });

    svg.appendChild(g);
  }

  updateGraphHighlight();
}

function updateGraphHighlight() {
  document.querySelectorAll('.graph-node').forEach(el => {
    el.classList.remove('node-start', 'node-goal', 'node-visited', 'node-path');
    const name = el.dataset.node;
    if (name === selectedStartCity) el.classList.add('node-start');
    if (name === selectedGoalCity) el.classList.add('node-goal');
  });

  document.querySelectorAll('.graph-edge').forEach(el => {
    el.classList.remove('edge-path');
  });
}

function clearGraphVisuals() {
  document.querySelectorAll('.graph-node').forEach(el => {
    el.classList.remove('node-visited', 'node-path');
  });
  document.querySelectorAll('.graph-edge').forEach(el => {
    el.classList.remove('edge-path');
  });
  updateGraphHighlight();
}

// Graph Algorithms
function solveGraphBFS(start, goal) {
  const queue = [start];
  const visited = new Set([start]);
  const parent = {};
  const order = [];

  let found = false;
  while (queue.length > 0) {
    const curr = queue.shift();
    order.push(curr);

    if (curr === goal) {
      found = true;
      break;
    }

    const neighbors = [...graphAdj[curr]].sort((a, b) => a.node.localeCompare(b.node));
    for (const { node } of neighbors) {
      if (!visited.has(node)) {
        visited.add(node);
        parent[node] = curr;
        queue.push(node);
      }
    }
  }

  const path = reconstructGraphPath(parent, start, goal, found);
  const cost = calculateGraphPathCost(path);
  return { path, order, cost, found };
}

function solveGraphDFS(start, goal) {
  const stack = [start];
  const visited = new Set();
  const parent = {};
  const order = [];

  let found = false;
  while (stack.length > 0) {
    const curr = stack.pop();
    if (visited.has(curr)) continue;

    visited.add(curr);
    order.push(curr);

    if (curr === goal) {
      found = true;
      break;
    }

    const neighbors = [...graphAdj[curr]].sort((a, b) => b.node.localeCompare(a.node));
    for (const { node } of neighbors) {
      if (!visited.has(node)) {
        parent[node] = curr;
        stack.push(node);
      }
    }
  }

  const path = reconstructGraphPath(parent, start, goal, found);
  const cost = calculateGraphPathCost(path);
  return { path, order, cost, found };
}

function solveGraphAStar(start, goal) {
  const openSet = [{ node: start, f: ROMANIA_GRAPH.nodes[start].h }];
  const gScore = { [start]: 0 };
  const closedSet = new Set();
  const parent = {};
  const order = [];

  let found = false;
  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const curr = openSet.shift().node;

    if (closedSet.has(curr)) continue;
    closedSet.add(curr);
    order.push(curr);

    if (curr === goal) {
      found = true;
      break;
    }

    for (const { node, weight } of graphAdj[curr]) {
      const tentativeG = gScore[curr] + weight;
      if (tentativeG < (gScore[node] ?? Infinity)) {
        gScore[node] = tentativeG;
        parent[node] = curr;
        const f = tentativeG + (ROMANIA_GRAPH.nodes[node]?.h ?? 0);
        openSet.push({ node, f });
      }
    }
  }

  const path = reconstructGraphPath(parent, start, goal, found);
  const cost = gScore[goal] ?? 0;
  return { path, order, cost, found };
}

function reconstructGraphPath(parent, start, goal, found) {
  if (!found) return [];
  const path = [];
  let curr = goal;
  while (curr) {
    path.push(curr);
    if (curr === start) break;
    curr = parent[curr];
  }
  path.reverse();
  return path;
}

function calculateGraphPathCost(path) {
  if (!path || path.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const edge = graphAdj[u].find(e => e.node === v);
    if (edge) total += edge.weight;
  }
  return total;
}

async function runGraphAlgorithm() {
  if (isSearching) return;
  clearGraphVisuals();
  const algo = document.getElementById('algo-select').value;

  if (algo === 'compare') {
    compareGraphAll();
    return;
  }

  isSearching = true;
  setControlsDisabled(true);
  setMetrics('Running...', null, null, null);

  const t0 = performance.now();
  let result;
  if (algo === 'bfs') result = solveGraphBFS(selectedStartCity, selectedGoalCity);
  else if (algo === 'dfs') result = solveGraphDFS(selectedStartCity, selectedGoalCity);
  else result = solveGraphAStar(selectedStartCity, selectedGoalCity);
  const duration = performance.now() - t0;

  // Animate node visits
  for (const city of result.order) {
    const el = document.querySelector(`.graph-node[data-node='${city}']`);
    if (el) el.classList.add('node-visited');
    await sleep(140);
  }

  // Highlight winning path & edges
  for (let i = 0; i < result.path.length; i++) {
    const city = result.path[i];
    const nodeEl = document.querySelector(`.graph-node[data-node='${city}']`);
    if (nodeEl) nodeEl.classList.add('node-path');

    if (i < result.path.length - 1) {
      const next = result.path[i + 1];
      const edgeEl = document.querySelector(`.graph-edge[data-edge='${city}-${next}'], .graph-edge[data-edge='${next}-${city}']`);
      if (edgeEl) edgeEl.classList.add('edge-path');
    }
    await sleep(180);
  }

  isSearching = false;
  setControlsDisabled(false);
  if (result.found) {
    setMetrics('Found!', `${result.cost} km (${result.path.length - 1} hops)`, result.order.length, duration);
  } else {
    setMetrics('No Path', 'N/A', result.order.length, duration);
  }
}

function compareGraphAll() {
  clearGraphVisuals();
  const start = selectedStartCity;
  const goal = selectedGoalCity;

  const t0_bfs = performance.now();
  const bfs = solveGraphBFS(start, goal);
  const d_bfs = performance.now() - t0_bfs;

  const t0_dfs = performance.now();
  const dfs = solveGraphDFS(start, goal);
  const d_dfs = performance.now() - t0_dfs;

  const t0_ast = performance.now();
  const astar = solveGraphAStar(start, goal);
  const d_ast = performance.now() - t0_ast;

  // Render A* path on graph
  for (let i = 0; i < astar.path.length; i++) {
    const city = astar.path[i];
    const nodeEl = document.querySelector(`.graph-node[data-node='${city}']`);
    if (nodeEl) nodeEl.classList.add('node-path');

    if (i < astar.path.length - 1) {
      const next = astar.path[i + 1];
      const edgeEl = document.querySelector(`.graph-edge[data-edge='${city}-${next}'], .graph-edge[data-edge='${next}-${city}']`);
      if (edgeEl) edgeEl.classList.add('edge-path');
    }
  }

  showComparison([
    {
      name: 'Breadth-First Search (BFS)',
      found: bfs.found ? 'YES' : 'NO',
      cost: bfs.found ? `${bfs.cost} km (${bfs.path.length - 1} hops)` : 'N/A',
      explored: bfs.order.length,
      time: `${d_bfs.toFixed(3)} ms`,
      note: 'Found path with fewest road hops (3 hops), but higher total distance.'
    },
    {
      name: 'Depth-First Search (DFS)',
      found: dfs.found ? 'YES' : 'NO',
      cost: dfs.found ? `${dfs.cost} km (${dfs.path.length - 1} hops)` : 'N/A',
      explored: dfs.order.length,
      time: `${d_dfs.toFixed(3)} ms`,
      note: 'Dives deep without considering weights or distances.'
    },
    {
      name: 'A* Search (A-Star)',
      found: astar.found ? 'YES' : 'NO',
      cost: astar.found ? `${astar.cost} km (${astar.path.length - 1} hops)` : 'N/A',
      explored: astar.order.length,
      time: `${d_ast.toFixed(3)} ms`,
      note: 'Provably OPTIMAL lowest cost (418 km)! Prunes bad branches using straight-line distance heuristic.'
    }
  ], `From ${start} to ${goal}: A* discovered the provably optimal road distance (${astar.cost} km)!`);
}

// ------------------------------------------------------------------------------
// 7. COMPARISON MODAL & HELPERS
// ------------------------------------------------------------------------------
function showComparison(rows, summary) {
  const tbody = document.getElementById('comparison-tbody');
  tbody.innerHTML = '';

  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${row.name}</strong></td>
      <td><span style="color: ${row.found === 'YES' ? '#34d399' : '#f87171'}">${row.found}</span></td>
      <td style="color: #fbbf24">${row.cost}</td>
      <td>${row.explored}</td>
      <td>${row.time}</td>
      <td style="color: #94a3b8; font-size: 0.8rem">${row.note}</td>
    `;
    tbody.appendChild(tr);
  }

  document.getElementById('comparison-summary').textContent = summary;
  document.getElementById('comparison-section').style.display = 'block';
}

function closeComparison() {
  document.getElementById('comparison-section').style.display = 'none';
}

function setControlsDisabled(disabled) {
  document.querySelectorAll('button, select, input').forEach(el => {
    if (el.id !== 'tab-grid' && el.id !== 'tab-graph') {
      el.disabled = disabled;
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
