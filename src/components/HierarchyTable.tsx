"use client";

import { useEffect } from "react";
import type { Tree, TreeNode } from "@/lib/types";
import { useTreeStore } from "@/store/useTreeStore";

type Props = {
  initialTree: Tree;
  columns: string[];
};

export default function HierarchyTable({ initialTree, columns }: Props) {
  const { tree, expanded, initialize, toggleNode, removeNode } = useTreeStore(
    (s) => s,
  );

  useEffect(() => {
    initialize(initialTree);
  }, [initialTree, initialize]);

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="text-left p-2 w-8">{""}</th>
            {columns.map((c) => (
              <th key={c} className="text-left p-2 whitespace-nowrap">
                {c}
              </th>
            ))}
            <th className="p-2">delete</th>
          </tr>
        </thead>
        <tbody>
          {tree.map((node) => (
            <NodeRow
              key={node.uid}
              node={node}
              columns={columns}
              expanded={expanded}
              toggleNode={toggleNode}
              removeNode={removeNode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NodeRow({
  node,
  columns,
  expanded,
  toggleNode,
  removeNode,
}: {
  node: TreeNode;
  columns: string[];
  expanded: Set<string>;
  toggleNode: (uid: string) => void;
  removeNode: (uid: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.uid);
  const indent = node.depth * 16;

  return (
    <>
      <tr
        className={
          node.depth % 2 === 0
            ? "bg-[#111] text-gray-200"
            : "bg-[#1b1b1b] text-gray-100"
        }
      >
        <td className="p-2 align-top" style={{ paddingLeft: indent }}>
          {hasChildren ? (
            <button
              type="button"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              className="w-5 h-5 inline-flex items-center justify-center rounded bg-gray-700 text-white"
              onClick={() => toggleNode(node.uid)}
            >
              {isExpanded ? "▾" : "▸"}
            </button>
          ) : (
            <span className="inline-block w-5" />
          )}
        </td>
        {columns.map((c) => (
          <td key={c} className="p-2 align-top" style={{ paddingLeft: indent }}>
            {node.data[c] ?? ""}
          </td>
        ))}
        <td className="p-2 align-top" style={{ paddingLeft: indent }}>
          <button
            type="button"
            aria-label="Remove"
            className="text-red-400"
            onClick={() => removeNode(node.uid)}
          >
            ✕
          </button>
        </td>
      </tr>
      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <NodeRow
            key={child.uid}
            node={child}
            columns={columns}
            expanded={expanded}
            toggleNode={toggleNode}
            removeNode={removeNode}
          />
        ))}
    </>
  );
}
