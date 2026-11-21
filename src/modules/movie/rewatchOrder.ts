import type { PrerequisiteGraph } from "./movie.interface";

interface Frame {
  id: number;
  nextIndex: number; // which prerequisite of this movie we look at next
}

// Returns every movie id needed before `targetId`, each once, where every
// movie comes after its own prerequisites. The target is not included.
export const buildRewatchOrder = (
  targetId: number,
  graph: PrerequisiteGraph,
): number[] => {
  const order: number[] = [];
  const visited = new Set<number>([targetId]);
  const stack: Frame[] = [{ id: targetId, nextIndex: 0 }];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (!frame) break;

    const prerequisite = (graph.get(frame.id) ?? [])[frame.nextIndex];

    if (prerequisite !== undefined) {
      // go deeper into the next unvisited prerequisite
      frame.nextIndex += 1;
      if (!visited.has(prerequisite)) {
        visited.add(prerequisite);
        stack.push({ id: prerequisite, nextIndex: 0 });
      }
      continue;
    }

    // all prerequisites of this movie are done, so add it (post-order)
    stack.pop();
    if (frame.id !== targetId) {
      order.push(frame.id);
    }
  }

  return order;
};
