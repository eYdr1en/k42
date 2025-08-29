import { z } from "zod";
import type { RawRecord, Tree, TreeNode } from "@/lib/types";

function generateUid(prefix: string, index: number): string {
  return `${prefix}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildTree(
  records: RawRecord[],
  depth = 0,
  relationshipName: string | null = null,
  uidPrefix = "root",
): Tree {
  return records.map((record, index) => {
    const uid = generateUid(uidPrefix, index);
    const childNodes: TreeNode[] = [];

    const children = record.children ?? {};
    for (const relName of Object.keys(children)) {
      const group = children[relName];
      const built = buildTree(
        group.records || [],
        depth + 1,
        relName,
        `${uid}.${relName}`,
      );
      childNodes.push(...built);
    }

    return {
      uid,
      relationshipName,
      depth,
      data: record.data,
      children: childNodes,
    } satisfies TreeNode;
  });
}

export function collectAllColumns(tree: Tree): string[] {
  const columnSet = new Set<string>();
  const visit = (node: TreeNode) => {
    for (const key of Object.keys(node.data)) columnSet.add(key);
    for (const child of node.children) visit(child);
  };
  for (const node of tree) visit(node);
  return Array.from(columnSet);
}

export function collectColumnsForNodes(nodes: TreeNode[]): string[] {
  const columnSet = new Set<string>();
  for (const node of nodes) {
    for (const key of Object.keys(node.data)) columnSet.add(key);
  }
  return Array.from(columnSet);
}

export function collectColumnsByDepth(tree: Tree): Record<number, string[]> {
  const depthToColumns = new Map<number, Set<string>>();
  const visit = (node: TreeNode) => {
    const set = depthToColumns.get(node.depth) ?? new Set<string>();
    for (const key of Object.keys(node.data)) set.add(key);
    depthToColumns.set(node.depth, set);
    for (const child of node.children) visit(child);
  };
  for (const node of tree) visit(node);
  const result: Record<number, string[]> = {};
  for (const [depth, set] of depthToColumns.entries()) {
    result[depth] = Array.from(set);
  }
  return result;
}

export function pruneTreeByUids(tree: Tree, uidsToRemove: Set<string>): Tree {
  const prune = (nodes: Tree): Tree => {
    const result: Tree = [];
    for (const node of nodes) {
      if (uidsToRemove.has(node.uid)) continue;
      const keptChildren = prune(node.children);
      result.push({ ...node, children: keptChildren });
    }
    return result;
  };
  return prune(tree);
}

export function getDescendantUids(node: TreeNode): string[] {
  const uids: string[] = [node.uid];
  const stack: TreeNode[] = [...node.children];
  while (stack.length) {
    const curr = stack.pop();
    if (!curr) continue;
    uids.push(curr.uid);
    if (curr.children.length) stack.push(...curr.children);
  }
  return uids;
}

// Flexible parser that accepts either the hierarchical RawRecord[] shape
// or a flat array of objects (like 64KB.json) and converts it into RawRecord[]
export function parseUnknownToRawRecords(input: unknown): RawRecord[] {
  const flatSchema = z.array(z.record(z.string(), z.any()));
  const hierarchicalSchema: z.ZodType<RawRecord[]> = z.array(
    z.object({
      data: z.record(z.string(), z.any()),
      children: z
        .record(z.string(), z.object({ records: z.array(z.any()) }))
        .default({}),
    }),
  );

  if (hierarchicalSchema.safeParse(input).success) {
    const arr = hierarchicalSchema.parse(input);
    return arr.map((x) => ({
      data: mapValuesToString(x.data),
      children: normalizeChildren(x.children),
    }));
  }

  if (flatSchema.safeParse(input).success) {
    const flat = flatSchema.parse(input);
    return flat.map((obj) => ({
      data: mapValuesToString(obj),
      children: {},
    }));
  }

  // Fallback: empty
  return [];
}

function mapValuesToString(
  obj: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) out[k] = "";
    else if (typeof v === "string") out[k] = v;
    else out[k] = String(v);
  }
  return out;
}

function normalizeChildren(
  children: Record<string, unknown>,
): RawRecord["children"] {
  const out: Record<string, { records: RawRecord[] }> = {};
  for (const [rel, group] of Object.entries(children || {})) {
    const typed = group as { records?: unknown } | null;
    const records = Array.isArray(typed?.records)
      ? (typed.records as unknown[])
      : [];
    out[rel] = {
      records: parseUnknownToRawRecords(records),
    };
  }
  return out;
}
