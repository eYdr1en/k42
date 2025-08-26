"use client";
import { create } from "zustand";
import { getDescendantUids, pruneTreeByUids } from "@/lib/transform";
import type { Tree, TreeNode } from "@/lib/types";

type TreeStore = {
  tree: Tree;
  expanded: Set<string>;
  initialize: (tree: Tree) => void;
  toggleNode: (uid: string) => void;
  removeNode: (uid: string) => void;
};

export const useTreeStore = create<TreeStore>((set, get) => ({
  tree: [],
  expanded: new Set<string>(),
  initialize: (tree: Tree) => set({ tree, expanded: new Set<string>() }),
  toggleNode: (uid: string) => {
    const next = new Set(get().expanded);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    set({ expanded: next });
  },
  removeNode: (uid: string) => {
    const findNode = (nodes: Tree): TreeNode | null => {
      const stack = [...nodes];
      while (stack.length) {
        const n = stack.pop();
        if (!n) continue;
        if (n.uid === uid) return n;
        if (n.children.length) stack.push(...n.children);
      }
      return null;
    };

    const target = findNode(get().tree);
    if (!target) return;
    const uidsToRemove = new Set<string>(getDescendantUids(target));
    const nextTree = pruneTreeByUids(get().tree, uidsToRemove);
    const nextExpanded = new Set(
      [...get().expanded].filter((id) => !uidsToRemove.has(id)),
    );
    set({ tree: nextTree, expanded: nextExpanded });
  },
}));
