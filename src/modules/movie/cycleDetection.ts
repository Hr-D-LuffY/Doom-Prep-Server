import { PrerequisiteGraph } from "./movie.interface";

// Saving `newPrerequisites` for `movieId` creates a cycle if `movieId`
// is reachable from any of them by following prerequisite links.
export const wouldCreateCycle = (
  movieId: number,
  newPrerequisites: number[],
  graph: PrerequisiteGraph,
): boolean => {
  const visited = new Set<number>();
  const stack = [...newPrerequisites];

  while (stack.length > 0) {
    const current = stack.pop() as number;
    if (current === movieId) return true; // also covers a movie listing itself
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of graph.get(current) ?? []) {
      stack.push(next);
    }
  }
  return false;
};