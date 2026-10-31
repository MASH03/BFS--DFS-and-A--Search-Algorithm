"""
================================================================================
SEARCH ALGORITHMS IMPLEMENTATION: BFS, DFS, AND A* (A-STAR)
================================================================================
Description:
    A comprehensive, modular implementation and comparison of three fundamental
    search algorithms in Artificial Intelligence:
      1. Breadth-First Search (BFS) - Explores level-by-level (FIFO queue)
      2. Depth-First Search (DFS)   - Explores deepest paths first (LIFO stack)
      3. A* Search (A-Star)         - Heuristic-informed search: f(n) = g(n) + h(n)

    Demonstrates both:
      A. Classic AI Weighted Graph Navigation (Romania Map benchmark: Arad -> Bucharest)
      B. 2D Grid / Maze Pathfinding with Visual Matrix Rendering & Obstacles
================================================================================
"""

import sys
import os
import time
from collections import deque
import heapq
from dataclasses import dataclass
from typing import Dict, List, Tuple, Set, Optional, Any

# Ensure UTF-8 output on Windows consoles if possible
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass



# ==============================================================================
# DATA STRUCTURES
# ==============================================================================

@dataclass
class SearchResult:
    """Holds the metrics and results of a search execution."""
    algorithm: str
    path: Optional[List[Any]]
    cost: float
    nodes_explored: int
    execution_time_ms: float
    order_of_visitation: List[Any]


# ==============================================================================
# 1. GRAPH SEARCH IMPLEMENTATION (Weighted Graph with Heuristics)
# ==============================================================================

class Graph:
    """Represents a directed or undirected weighted graph with heuristic values."""

    def __init__(self):
        # adjacency list: node -> list of (neighbor, weight)
        self.adj: Dict[str, List[Tuple[str, float]]] = {}
        # heuristic values: node -> straight-line estimated cost to goal
        self.heuristics: Dict[str, float] = {}

    def add_edge(self, u: str, v: str, weight: float, bidirectional: bool = True):
        """Adds a weighted edge between u and v."""
        if u not in self.adj:
            self.adj[u] = []
        if v not in self.adj:
            self.adj[v] = []

        self.adj[u].append((v, weight))
        if bidirectional:
            self.adj[v].append((u, weight))

    def set_heuristics(self, heuristics: Dict[str, float]):
        """Sets heuristic estimated cost to goal for each node."""
        self.heuristics = heuristics

    def get_edge_weight(self, u: str, v: str) -> float:
        """Finds weight of edge between u and v."""
        for neighbor, weight in self.adj.get(u, []):
            if neighbor == v:
                return weight
        return float('inf')

    def calculate_path_cost(self, path: List[str]) -> float:
        """Calculates total cost along a path."""
        if not path or len(path) < 2:
            return 0.0
        total = 0.0
        for i in range(len(path) - 1):
            total += self.get_edge_weight(path[i], path[i + 1])
        return total

    # --------------------------------------------------------------------------
    # Breadth-First Search (BFS)
    # --------------------------------------------------------------------------
    def bfs(self, start: str, goal: str) -> SearchResult:
        """
        Breadth-First Search:
        - Uses FIFO queue (collections.deque)
        - Explores neighbors layer by layer
        - Optimal for unweighted graphs (fewest edges)
        """
        start_time = time.perf_counter()
        
        if start not in self.adj or goal not in self.adj:
            return SearchResult("BFS", None, 0.0, 0, 0.0, [])

        queue = deque([start])
        visited: Set[str] = {start}
        parent: Dict[str, Optional[str]] = {start: None}
        visitation_order: List[str] = []

        found = False
        while queue:
            current = queue.popleft()
            visitation_order.append(current)

            if current == goal:
                found = True
                break

            # Explore neighbors in alphabetical order for deterministic behavior
            neighbors = sorted(self.adj.get(current, []), key=lambda x: x[0])
            for neighbor, _ in neighbors:
                if neighbor not in visited:
                    visited.add(neighbor)
                    parent[neighbor] = current
                    queue.append(neighbor)

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        if not found:
            return SearchResult("BFS", None, 0.0, len(visitation_order), elapsed_ms, visitation_order)

        # Reconstruct path
        path = []
        curr: Optional[str] = goal
        while curr is not None:
            path.append(curr)
            curr = parent[curr]
        path.reverse()

        cost = self.calculate_path_cost(path)
        return SearchResult("BFS", path, cost, len(visitation_order), elapsed_ms, visitation_order)

    # --------------------------------------------------------------------------
    # Depth-First Search (DFS)
    # --------------------------------------------------------------------------
    def dfs(self, start: str, goal: str) -> SearchResult:
        """
        Depth-First Search:
        - Uses LIFO stack (Python list)
        - Explores along each branch as deeply as possible before backtracking
        - Not guaranteed to find shortest or lowest-cost path
        """
        start_time = time.perf_counter()

        if start not in self.adj or goal not in self.adj:
            return SearchResult("DFS", None, 0.0, 0, 0.0, [])

        stack = [start]
        visited: Set[str] = set()
        parent: Dict[str, Optional[str]] = {start: None}
        visitation_order: List[str] = []

        found = False
        while stack:
            current = stack.pop()

            if current in visited:
                continue

            visited.add(current)
            visitation_order.append(current)

            if current == goal:
                found = True
                break

            # Reverse alphabetical order so that alphabetical order is popped first
            neighbors = sorted(self.adj.get(current, []), key=lambda x: x[0], reverse=True)
            for neighbor, _ in neighbors:
                if neighbor not in visited:
                    parent[neighbor] = current
                    stack.append(neighbor)

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        if not found:
            return SearchResult("DFS", None, 0.0, len(visitation_order), elapsed_ms, visitation_order)

        # Reconstruct path
        path = []
        curr: Optional[str] = goal
        while curr is not None:
            path.append(curr)
            curr = parent[curr]
        path.reverse()

        cost = self.calculate_path_cost(path)
        return SearchResult("DFS", path, cost, len(visitation_order), elapsed_ms, visitation_order)

    # --------------------------------------------------------------------------
    # A* Search (A-Star)
    # --------------------------------------------------------------------------
    def astar(self, start: str, goal: str) -> SearchResult:
        """
        A* Search:
        - Evaluation function: f(n) = g(n) + h(n)
            g(n) = exact cost from start to node n
            h(n) = heuristic estimated cost from n to goal
        - Uses Priority Queue (heapq)
        - Guaranteed optimal when heuristic is admissible and consistent
        """
        start_time = time.perf_counter()

        if start not in self.adj or goal not in self.adj:
            return SearchResult("A*", None, 0.0, 0, 0.0, [])

        # Priority queue stores: (f_score, tie_breaker_counter, current_node)
        counter = 0
        open_set: List[Tuple[float, int, str]] = []
        
        # g_score: exact cost from start to node
        g_score: Dict[str, float] = {node: float('inf') for node in self.adj}
        g_score[start] = 0.0

        # f_score: g_score + heuristic
        start_h = self.heuristics.get(start, 0.0)
        heapq.heappush(open_set, (start_h, counter, start))

        parent: Dict[str, Optional[str]] = {start: None}
        closed_set: Set[str] = set()
        visitation_order: List[str] = []

        found = False
        while open_set:
            f, _, current = heapq.heappop(open_set)

            if current in closed_set:
                continue

            closed_set.add(current)
            visitation_order.append(current)

            if current == goal:
                found = True
                break

            for neighbor, weight in self.adj.get(current, []):
                tentative_g = g_score[current] + weight

                if tentative_g < g_score.get(neighbor, float('inf')):
                    g_score[neighbor] = tentative_g
                    parent[neighbor] = current
                    h = self.heuristics.get(neighbor, 0.0)
                    counter += 1
                    heapq.heappush(open_set, (tentative_g + h, counter, neighbor))

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        if not found:
            return SearchResult("A*", None, 0.0, len(visitation_order), elapsed_ms, visitation_order)

        # Reconstruct path
        path = []
        curr: Optional[str] = goal
        while curr is not None:
            path.append(curr)
            curr = parent[curr]
        path.reverse()

        cost = g_score[goal]
        return SearchResult("A*", path, cost, len(visitation_order), elapsed_ms, visitation_order)


# ==============================================================================
# CLASSIC AI BENCHMARK GRAPH: ROMANIA MAP (Arad to Bucharest)
# ==============================================================================

def create_romania_graph() -> Graph:
    """
    Creates the classic Russell & Norvig AI textbook Romania Roadmap.
    Straight-line distances to Bucharest are used as admissible heuristics.
    """
    g = Graph()

    # Distances between Romanian cities (edge weights)
    edges = [
        ("Arad", "Zerind", 75),
        ("Arad", "Sibiu", 140),
        ("Arad", "Timisoara", 118),
        ("Zerind", "Oradea", 71),
        ("Oradea", "Sibiu", 151),
        ("Timisoara", "Lugoj", 111),
        ("Lugoj", "Mehadia", 70),
        ("Mehadia", "Dobreta", 75),
        ("Dobreta", "Craiova", 120),
        ("Sibiu", "Fagaras", 99),
        ("Sibiu", "Rimnicu Vilcea", 80),
        ("Rimnicu Vilcea", "Craiova", 146),
        ("Rimnicu Vilcea", "Pitesti", 97),
        ("Craiova", "Pitesti", 138),
        ("Fagaras", "Bucharest", 211),
        ("Pitesti", "Bucharest", 101),
        ("Bucharest", "Giurgiu", 90),
        ("Bucharest", "Urziceni", 85),
        ("Urziceni", "Hirsova", 98),
        ("Hirsova", "Eforie", 86),
        ("Urziceni", "Vaslui", 142),
        ("Vaslui", "Iasi", 92),
        ("Iasi", "Neamt", 87),
    ]

    for u, v, w in edges:
        g.add_edge(u, v, w)

    # Straight-line distance heuristics to Bucharest
    heuristics_to_bucharest = {
        "Arad": 366,
        "Bucharest": 0,
        "Craiova": 160,
        "Dobreta": 242,
        "Eforie": 161,
        "Fagaras": 176,
        "Giurgiu": 77,
        "Hirsova": 151,
        "Iasi": 226,
        "Lugoj": 244,
        "Mehadia": 241,
        "Neamt": 234,
        "Oradea": 380,
        "Pitesti": 100,
        "Rimnicu Vilcea": 193,
        "Sibiu": 253,
        "Timisoara": 329,
        "Urziceni": 80,
        "Vaslui": 199,
        "Zerind": 374,
    }
    g.set_heuristics(heuristics_to_bucharest)
    return g


# ==============================================================================
# 2. 2D GRID / MAZE PATHFINDING IMPLEMENTATION
# ==============================================================================

class GridMaze:
    """Represents a 2D grid labyrinth with obstacles, start, and goal."""

    def __init__(self, ascii_map: List[str]):
        self.grid = [list(row) for row in ascii_map]
        self.rows = len(self.grid)
        self.cols = len(self.grid[0])
        self.start: Tuple[int, int] = (0, 0)
        self.goal: Tuple[int, int] = (0, 0)

        # Locate S (Start) and G (Goal)
        for r in range(self.rows):
            for c in range(self.cols):
                if self.grid[r][c] == 'S':
                    self.start = (r, c)
                elif self.grid[r][c] == 'G':
                    self.goal = (r, c)

    def is_valid(self, r: int, c: int) -> bool:
        """Checks if cell (r, c) is inside bounds and not a wall."""
        return 0 <= r < self.rows and 0 <= c < self.cols and self.grid[r][c] != '#'

    def get_neighbors(self, r: int, c: int) -> List[Tuple[int, int]]:
        """Returns 4-directional adjacent neighbors (Up, Right, Down, Left)."""
        directions = [(-1, 0), (0, 1), (1, 0), (0, -1)]  # N, E, S, W
        neighbors = []
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if self.is_valid(nr, nc):
                neighbors.append((nr, nc))
        return neighbors

    def manhattan_distance(self, p1: Tuple[int, int], p2: Tuple[int, int]) -> float:
        """Heuristic for 4-directional grid: |r1 - r2| + |c1 - c2|."""
        return abs(p1[0] - p2[0]) + abs(p1[1] - p2[1])

    # --------------------------------------------------------------------------
    # Grid BFS
    # --------------------------------------------------------------------------
    def bfs(self) -> SearchResult:
        start_time = time.perf_counter()
        queue = deque([self.start])
        visited = {self.start}
        parent = {self.start: None}
        visitation_order = []

        found = False
        while queue:
            curr = queue.popleft()
            visitation_order.append(curr)

            if curr == self.goal:
                found = True
                break

            for neighbor in self.get_neighbors(*curr):
                if neighbor not in visited:
                    visited.add(neighbor)
                    parent[neighbor] = curr
                    queue.append(neighbor)

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        if not found:
            return SearchResult("BFS (Grid)", None, 0.0, len(visitation_order), elapsed_ms, visitation_order)

        path = []
        cur = self.goal
        while cur is not None:
            path.append(cur)
            cur = parent[cur]
        path.reverse()

        return SearchResult("BFS (Grid)", path, float(len(path) - 1), len(visitation_order), elapsed_ms, visitation_order)

    # --------------------------------------------------------------------------
    # Grid DFS
    # --------------------------------------------------------------------------
    def dfs(self) -> SearchResult:
        start_time = time.perf_counter()
        stack = [self.start]
        visited = set()
        parent = {self.start: None}
        visitation_order = []

        found = False
        while stack:
            curr = stack.pop()
            if curr in visited:
                continue

            visited.add(curr)
            visitation_order.append(curr)

            if curr == self.goal:
                found = True
                break

            for neighbor in reversed(self.get_neighbors(*curr)):
                if neighbor not in visited:
                    parent[neighbor] = curr
                    stack.append(neighbor)

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        if not found:
            return SearchResult("DFS (Grid)", None, 0.0, len(visitation_order), elapsed_ms, visitation_order)

        path = []
        cur = self.goal
        while cur is not None:
            path.append(cur)
            cur = parent[cur]
        path.reverse()

        return SearchResult("DFS (Grid)", path, float(len(path) - 1), len(visitation_order), elapsed_ms, visitation_order)

    # --------------------------------------------------------------------------
    # Grid A* Search
    # --------------------------------------------------------------------------
    def astar(self) -> SearchResult:
        start_time = time.perf_counter()
        counter = 0
        open_set: List[Tuple[float, int, Tuple[int, int]]] = []

        g_score: Dict[Tuple[int, int], float] = {self.start: 0.0}
        h_start = self.manhattan_distance(self.start, self.goal)
        heapq.heappush(open_set, (h_start, counter, self.start))

        parent = {self.start: None}
        closed_set = set()
        visitation_order = []

        found = False
        while open_set:
            _, _, curr = heapq.heappop(open_set)

            if curr in closed_set:
                continue

            closed_set.add(curr)
            visitation_order.append(curr)

            if curr == self.goal:
                found = True
                break

            for neighbor in self.get_neighbors(*curr):
                tentative_g = g_score[curr] + 1.0

                if tentative_g < g_score.get(neighbor, float('inf')):
                    g_score[neighbor] = tentative_g
                    parent[neighbor] = curr
                    h = self.manhattan_distance(neighbor, self.goal)
                    counter += 1
                    heapq.heappush(open_set, (tentative_g + h, counter, neighbor))

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        if not found:
            return SearchResult("A* (Grid)", None, 0.0, len(visitation_order), elapsed_ms, visitation_order)

        path = []
        cur = self.goal
        while cur is not None:
            path.append(cur)
            cur = parent[cur]
        path.reverse()

        return SearchResult("A* (Grid)", path, float(len(path) - 1), len(visitation_order), elapsed_ms, visitation_order)

    def render_path(self, path: Optional[List[Tuple[int, int]]]) -> str:
        """Renders grid with '*' showing path steps, preserving S, G, and walls."""
        path_set = set(path) if path else set()
        rendered_rows = []
        for r in range(self.rows):
            line = []
            for c in range(self.cols):
                coord = (r, c)
                if coord == self.start:
                    line.append("S")
                elif coord == self.goal:
                    line.append("G")
                elif coord in path_set:
                    line.append("*")
                elif self.grid[r][c] == '#':
                    line.append("#")
                else:
                    line.append(".")
            rendered_rows.append(" ".join(line))
        return "\n".join(rendered_rows)


# ==============================================================================
# DISPLAY & BENCHMARK HELPERS
# ==============================================================================

def print_banner(title: str):
    print("\n" + "=" * 78)
    print(f" {title.upper()}")
    print("=" * 78)


def display_results_table(results: List[SearchResult]):
    """Prints a neatly formatted comparative summary table."""
    print("\n" + "-" * 78)
    print(f"{'Algorithm':<12} | {'Found?':<7} | {'Path Cost':<10} | {'Nodes Explored':<16} | {'Time (ms)':<10}")
    print("-" * 78)
    for res in results:
        found_str = "YES" if res.path else "NO"
        cost_str = f"{res.cost:,.1f}" if res.path else "N/A"
        time_str = f"{res.execution_time_ms:.4f}"
        print(f"{res.algorithm:<12} | {found_str:<7} | {cost_str:<10} | {res.nodes_explored:<16} | {time_str:<10}")
    print("-" * 78)


def run_graph_demonstration(graph: Graph, start: str, goal: str):
    """Runs and compares BFS, DFS, and A* on the roadmap graph."""
    print_banner(f"Roadmap Graph Search Benchmark: {start} -> {goal}")
    print(f"Goal: Find route from '{start}' to '{goal}' in Romania Map")
    print(f"A* uses Straight-Line Distance to '{goal}' as Heuristic h(n).\n")

    bfs_res = graph.bfs(start, goal)
    dfs_res = graph.dfs(start, goal)
    astar_res = graph.astar(start, goal)

    algorithms = [bfs_res, dfs_res, astar_res]

    for res in algorithms:
        print(f"--- {res.algorithm} ---")
        if res.path:
            print(f"  Path: {' -> '.join(res.path)}")
            print(f"  Total Cost       : {res.cost:.1f} km")
            print(f"  Path Hop Count   : {len(res.path) - 1} edges")
        else:
            print("  Path             : No path found")
        print(f"  Nodes Explored   : {res.nodes_explored}")
        print(f"  Exploration Order: {', '.join(res.order_of_visitation[:10])}{' ...' if len(res.order_of_visitation) > 10 else ''}")
        print(f"  Execution Time   : {res.execution_time_ms:.4f} ms\n")

    display_results_table(algorithms)

    print("\nKey Takeaways:")
    print("  - BFS finds the path with fewest hops (unweighted shortest path).")
    print("  - DFS dives deep along one branch, which often results in suboptimal path cost.")
    print("  - A* uses f(n) = g(n) + h(n) to find the provably OPTIMAL least-cost path while")
    print("    pruning away unpromising branches using the heuristic.")


def run_maze_demonstration():
    """Runs and compares BFS, DFS, and A* on a 2D labyrinth."""
    ascii_map = [
        "S . . . # . . . . .",
        ". # # . # . # # # .",
        ". . # . . . . . # .",
        "# . # # # # # . # .",
        ". . . . . . # . . .",
        ". # # # # . # # # .",
        ". . . . # . . . # G",
    ]
    maze = GridMaze(ascii_map)

    print_banner("2D Labyrinth / Grid Pathfinding Demonstration")
    print("Legend: 'S' = Start, 'G' = Goal, '#' = Wall/Obstacle, '*' = Path, '.' = Open Cell\n")
    print("Original Maze Layout:")
    print(maze.render_path(None))
    print()

    bfs_res = maze.bfs()
    dfs_res = maze.dfs()
    astar_res = maze.astar()


    maze_results = [bfs_res, dfs_res, astar_res]

    for res in maze_results:
        print(f"\n--- {res.algorithm} Visualization ---")
        print(maze.render_path(res.path))
        print(f"Steps (Cost): {res.cost:.0f} | Explored Cells: {res.nodes_explored} | Time: {res.execution_time_ms:.4f} ms")

    display_results_table(maze_results)


# ==============================================================================
# INTERACTIVE CLI
# ==============================================================================

def interactive_menu():
    """Interactive command-line menu."""
    romania_graph = create_romania_graph()

    while True:
        print("\n" + "=" * 50)
        print("    AI SEARCH ALGORITHMS (BFS, DFS, A*)")
        print("=" * 50)
        print("  1. Run Romania Graph Benchmark (Arad -> Bucharest)")
        print("  2. Run 2D Maze / Grid Pathfinding Benchmark")
        print("  3. Custom Query on Romania Graph (Choose Start & Goal)")
        print("  4. Run Full Demonstration (Graph + Maze)")
        print("  5. Exit")
        print("=" * 50)

        choice = input("Select an option (1-5): ").strip()

        if choice == "1":
            run_graph_demonstration(romania_graph, "Arad", "Bucharest")
        elif choice == "2":
            run_maze_demonstration()
        elif choice == "3":
            cities = sorted(list(romania_graph.adj.keys()))
            print(f"\nAvailable Cities:\n{', '.join(cities)}")
            start = input("\nEnter Start City (default 'Arad'): ").strip() or "Arad"
            goal = input("Enter Goal City  (default 'Bucharest'): ").strip() or "Bucharest"

            if start not in romania_graph.adj:
                print(f"Error: '{start}' is not in the graph.")
                continue
            if goal not in romania_graph.adj:
                print(f"Error: '{goal}' is not in the graph.")
                continue

            run_graph_demonstration(romania_graph, start, goal)
        elif choice == "4":
            run_graph_demonstration(romania_graph, "Arad", "Bucharest")
            run_maze_demonstration()
        elif choice == "5" or choice.lower() in ("q", "quit", "exit"):
            print("Exiting. Happy coding!")
            break
        else:
            print("Invalid selection. Please choose 1, 2, 3, 4, or 5.")


# ==============================================================================
# MAIN ENTRY POINT
# ==============================================================================

if __name__ == "__main__":
    # If run in non-interactive environment or with flag --all, run complete demo
    if len(sys.argv) > 1 and sys.argv[1] in ("--all", "-a", "--demo"):
        romania_graph = create_romania_graph()
        run_graph_demonstration(romania_graph, "Arad", "Bucharest")
        run_maze_demonstration()
    elif not sys.stdin.isatty():
        # Non-interactive shell / piped input
        romania_graph = create_romania_graph()
        run_graph_demonstration(romania_graph, "Arad", "Bucharest")
        run_maze_demonstration()
    else:
        interactive_menu()
