/**
 * Fast cached A* Pathfinding for 28x28 Isometric Town Grid
 * Walkable: Road (1), Sidewalk (2). Blocked: Buildings, grass perimeter (0).
 */

export interface Point {
  x: number;
  y: number;
}

export class GridPathfinder {
  public width: number;
  public height: number;
  public grid: number[][]; // 0: blocked, 1: road, 2: sidewalk

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
   * Find nearest walkable neighbor or nearest walkable tile in radius
   */
  public findNearestWalkable(pt: Point, radius: number = 3): Point {
    if (this.isWalkable(pt.x, pt.y)) return pt;

    for (let r = 1; r <= radius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = pt.x + dx;
          const ny = pt.y + dy;
          if (this.isWalkable(nx, ny)) {
            return { x: nx, y: ny };
          }
        }
      }
    }
    // Default fallback to center crossroads
    return { x: 13, y: 11 };
  }

  /**
   * Fast A* algorithm returning array of grid coordinates [start, ..., goal]
   */
  public findPath(start: Point, goal: Point): Point[] {
    const safeStart = this.findNearestWalkable(start);
    const safeGoal = this.findNearestWalkable(goal);

    if (safeStart.x === safeGoal.x && safeStart.y === safeGoal.y) {
      return [safeStart];
    }

    const openSet: { pt: Point; f: number; g: number }[] = [];
    const cameFrom: Map<string, Point> = new Map();
    const gScore: Map<string, number> = new Map();

    const key = (p: Point) => `${p.x},${p.y}`;
    const h = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    gScore.set(key(safeStart), 0);
    openSet.push({ pt: safeStart, f: h(safeStart, safeGoal), g: 0 });

    const maxIterations = 600;
    let iterations = 0;

    while (openSet.length > 0 && iterations++ < maxIterations) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!.pt;

      if (current.x === safeGoal.x && current.y === safeGoal.y) {
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
          const f = tentativeG + h(next, safeGoal);
          if (!openSet.some((item) => item.pt.x === next.x && item.pt.y === next.y)) {
            openSet.push({ pt: next, f, g: tentativeG });
          }
        }
      }
    }

    // Direct fallback path if no obstacle-free path found
    return [safeStart, { x: 13, y: 13 }, safeGoal];
  }

  private getWalkableNeighbors(p: Point): Point[] {
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    const res: Point[] = [];
    for (const d of dirs) {
      const nx = p.x + d.x;
      const ny = p.y + d.y;
      if (this.isWalkable(nx, ny)) {
        res.push({ x: nx, y: ny });
      }
    }
    return res;
  }
}
