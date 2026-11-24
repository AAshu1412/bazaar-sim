/**
 * Fast cached A* Pathfinding for 28x28 Isometric Town Grid
 * Walkable: Road (1), Sidewalk (2). Blocked: Buildings, grass perimeter (0).
 */

export interface Point {
  x: number;
  y: number;
}

export class GridPathfinder {
  private width: number;
  private height: number;
  private grid: number[][]; // 0: blocked, 1: road, 2: sidewalk

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.grid = Array(height)
      .fill(0)
      .map(() => Array(width).fill(0));
  }

  public setTile(x: number, y: number, type: number) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.grid[y][x] = type;
    }
  }

  public isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.grid[y][x] > 0;
  }

  /**
   * Fast A* algorithm returning array of grid coordinates [start, ..., goal]
   */
  public findPath(start: Point, goal: Point): Point[] {
    if (!this.isWalkable(goal.x, goal.y)) {
      // Find nearest walkable neighbor to goal
      const neighbors = this.getWalkableNeighbors(goal);
      if (neighbors.length > 0) {
        goal = neighbors[0];
      } else {
        return [start];
      }
    }

    if (start.x === goal.x && start.y === goal.y) return [start];

    const openSet: { pt: Point; f: number; g: number }[] = [];
    const cameFrom: Map<string, Point> = new Map();
    const gScore: Map<string, number> = new Map();

    const key = (p: Point) => `${p.x},${p.y}`;
    const h = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    gScore.set(key(start), 0);
    openSet.push({ pt: start, f: h(start, goal), g: 0 });

    while (openSet.length > 0) {
      // Pick lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!.pt;

      if (current.x === goal.x && current.y === goal.y) {
        // Reconstruct path
        const path: Point[] = [current];
        let currKey = key(current);
        while (cameFrom.has(currKey)) {
          const prev = cameFrom.get(currKey)!;
          path.unshift(prev);
          currKey = key(prev);
        }
        return path;
      }

      const neighbors = this.getWalkableNeighbors(current);
      for (const next of neighbors) {
        const tentativeG = (gScore.get(key(current)) ?? Infinity) + 1;
        const nextKey = key(next);

        if (tentativeG < (gScore.get(nextKey) ?? Infinity)) {
          cameFrom.set(nextKey, current);
          gScore.set(nextKey, tentativeG);
          const f = tentativeG + h(next, goal);

          if (!openSet.some((item) => item.pt.x === next.x && item.pt.y === next.y)) {
            openSet.push({ pt: next, f, g: tentativeG });
          }
        }
      }
    }

    return [start];
  }

  private getWalkableNeighbors(pt: Point): Point[] {
    const res: Point[] = [];
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    for (const d of dirs) {
      const nx = pt.x + d.x;
      const ny = pt.y + d.y;
      if (this.isWalkable(nx, ny)) {
        res.push({ x: nx, y: ny });
      }
    }
    return res;
  }
}
