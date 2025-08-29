"use client";

import {
  type ColumnDef,
  type ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  type Row,
  useReactTable,
} from "@tanstack/react-table";
import { Fragment, useMemo, useState } from "react";
import { collectColumnsByDepth } from "@/lib/transform";
import type { Tree, TreeNode } from "@/lib/types";

type Props = {
  initialTree: Tree;
  columns: string[];
};

export default function HierarchyTable({ initialTree, columns }: Props) {
  const [data, setData] = useState<Tree>(initialTree);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const columnsByDepth = useMemo(() => collectColumnsByDepth(data), [data]);

  const columnDefs = useMemo<ColumnDef<TreeNode>[]>(
    () => [
      {
        id: "expander",
        header: () => "",
        cell: ({ row }) => {
          const canExpand = row.original.children.length > 0;
          const padding = row.depth * 16;
          return canExpand ? (
            <button
              type="button"
              aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
              className="w-5 h-5 inline-flex items-center justify-center text-white hover:text-emerald-300"
              onClick={row.getToggleExpandedHandler()}
              style={{ marginLeft: padding }}
            >
              {row.getIsExpanded() ? "▾" : "▸"}
            </button>
          ) : (
            <span className="inline-block" style={{ width: padding + 5 }} />
          );
        },
      },
      ...columns.map<ColumnDef<TreeNode>>((key) => ({
        id: key,
        header: () => key,
        cell: ({ row }) => row.original.data[key] ?? "",
      })),
      {
        id: "delete",
        header: () => "delete",
        cell: ({ row }) => (
          <button
            type="button"
            aria-label="Remove"
            className="text-red-400 hover:text-red-300"
            onClick={() => {
              const toRemove = new Set<string>();
              const dfs = (n: TreeNode) => {
                toRemove.add(n.uid);
                for (const c of n.children) dfs(c);
              };
              dfs(row.original);
              const prune = (nodes: Tree): Tree =>
                nodes
                  .filter((n) => !toRemove.has(n.uid))
                  .map((n) => ({ ...n, children: prune(n.children) }));
              setData((prev) => prune(prev));
            }}
          >
            ✕
          </button>
        ),
      },
    ],
    [columns],
  );

  const table = useReactTable({
    data,
    columns: columnDefs,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSubRows: (row) => row.children,
    getExpandedRowModel: getExpandedRowModel(),
  });

  const renderNestedTable = (parentRow: Row<TreeNode>) => {
    const childDepth = parentRow.depth + 1;
    const childCols = columnsByDepth[childDepth] ?? [];
    const children = parentRow.subRows;
    if (!children || children.length === 0) return null;
    return (
      <div className="inline-block pl-10 align-top">
        <table className="text-sm border-collapse table-auto">
          <thead>
            <tr className="bg-emerald-400 text-black">
              <th className="p-2 whitespace-nowrap text-center" />
              {childCols.map((col) => (
                <th
                  key={`child-h-${parentRow.id}-${col}`}
                  className="p-2 whitespace-nowrap text-center"
                >
                  {col}
                </th>
              ))}
              <th className="p-2 whitespace-nowrap text-center">delete</th>
            </tr>
          </thead>
          <tbody>
            {children.map((cRow, idx) => (
              <Fragment key={`child-frag-${cRow.id}`}>
                <tr
                  key={`child-row-${cRow.id}`}
                  className={
                    (childDepth + idx) % 2 === 0
                      ? "bg-[#111] text-gray-200"
                      : "bg-[#1b1b1b] text-gray-100"
                  }
                >
                  <td className="p-2 align-top text-center">
                    {cRow.original.children.length > 0 ? (
                      <button
                        type="button"
                        aria-label={
                          cRow.getIsExpanded() ? "Collapse" : "Expand"
                        }
                        className="w-5 h-5 inline-flex items-center justify-center text-white hover:text-emerald-300"
                        onClick={cRow.getToggleExpandedHandler()}
                      >
                        {cRow.getIsExpanded() ? "▾" : "▸"}
                      </button>
                    ) : null}
                  </td>
                  {childCols.map((col) => (
                    <td
                      key={`child-cell-${cRow.id}-${col}`}
                      className="p-2 align-center text-center"
                    >
                      {cRow.original.data[col] ?? ""}
                    </td>
                  ))}
                  <td className="p-2 align-center text-center">
                    <button
                      type="button"
                      aria-label="Remove"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => {
                        const toRemove = new Set<string>();
                        const dfs = (n: TreeNode) => {
                          toRemove.add(n.uid);
                          for (const cc of n.children) dfs(cc);
                        };
                        dfs(cRow.original);
                        const prune = (nodes: Tree): Tree =>
                          nodes
                            .filter((n) => !toRemove.has(n.uid))
                            .map((n) => ({
                              ...n,
                              children: prune(n.children),
                            }));
                        setData((prev) => prune(prev));
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                {cRow.getIsExpanded() && cRow.subRows?.length > 0 && (
                  <tr key={`child-sub-${cRow.id}`}>
                    <td
                      colSpan={1 + childCols.length + 1}
                      className="p-0 align-top"
                    >
                      {renderNestedTable(cRow)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-emerald-400 text-black">
            <th className="p-2 whitespace-nowrap text-center" />
            {(() => {
              const leafCols = table.getAllLeafColumns();
              const nonActionCols = leafCols.filter(
                (c) => c.id !== "expander" && c.id !== "delete",
              );
              const rootSet = new Set(columnsByDepth[0] ?? []);
              const presentCols = nonActionCols.filter((c) =>
                rootSet.has(c.id),
              );
              return (
                <>
                  {presentCols.map((col) => (
                    <th
                      key={`root-${col.id}`}
                      className="p-2 whitespace-nowrap text-center"
                    >
                      {col.id}
                    </th>
                  ))}
                  <th className="p-2 whitespace-nowrap text-center">delete</th>
                </>
              );
            })()}
          </tr>
        </thead>
        <tbody>
          {(() => {
            let prevDepth = -1;
            const leafCols = table.getAllLeafColumns();
            return table
              .getRowModel()
              .rows.filter((row) => row.depth === 0)
              .map((row, idx) => {
                const needsGroupHeader = row.depth > prevDepth && row.depth > 0;
                prevDepth = row.depth;
                const depthColumns = new Set(columnsByDepth[row.depth] ?? []);
                return (
                  <Fragment key={`root-frag-${row.id}`}>
                    {needsGroupHeader && (
                      <tr key={`hdr-${row.id}`} className=" text-black">
                        {(() => {
                          return (
                            <>
                              {leafCols.map((col) => {
                                if (col.id === "expander") {
                                  return Array.from(
                                    { length: row.depth },
                                    (_, i) => (
                                      <td
                                        key={`hdr-cell-${row.id}-expander-${i}`}
                                        className="p-2 font-semibold"
                                      />
                                    ),
                                  );
                                }
                                if (col.id === "delete") {
                                  return (
                                    <td
                                      key={`hdr-cell-${row.id}-delete`}
                                      className="p-2 font-semibold text-center bg-emerald-400"
                                    >
                                      delete
                                    </td>
                                  );
                                }
                                const isPresent = depthColumns.has(col.id);
                                return (
                                  isPresent && (
                                    <td
                                      key={`hdr-cell-${row.id}-${col.id}`}
                                      className="p-2 font-semibold text-center bg-emerald-400"
                                    >
                                      {col.id}
                                    </td>
                                  )
                                );
                              })}
                            </>
                          );
                        })()}
                      </tr>
                    )}
                    <tr
                      key={row.id}
                      className={
                        idx % 2 === 0
                          ? "bg-[#111] text-gray-200"
                          : "bg-[#1b1b1b] text-gray-100"
                      }
                    >
                      {row
                        .getVisibleCells()
                        .filter((cell) => {
                          const id = cell.column.id;
                          if (id === "expander" || id === "delete") return true;
                          return depthColumns.has(id);
                        })
                        .map((cell) => {
                          if (cell.column.id === "expander") {
                            return (
                              <Fragment key={`expander-frag-${row.id}`}>
                                {Array.from(
                                  { length: row.depth - 1 },
                                  (_, i) => (
                                    <td
                                      key={`pad-${row.id}-${i}`}
                                      className="p-2 align-center bg-transparent"
                                    />
                                  ),
                                )}
                                <td
                                  key={cell.id}
                                  className="p-2 align-center text-center"
                                >
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )}
                                </td>
                              </Fragment>
                            );
                          }
                          return (
                            <td
                              key={cell.id}
                              className="p-2 align-center text-center"
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </td>
                          );
                        })}
                    </tr>
                    {row.getIsExpanded() && row.subRows?.length > 0 && (
                      <tr className="bg-transparent">
                        <td colSpan={leafCols.length} className="p-0 align-top">
                          {renderNestedTable(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              });
          })()}
        </tbody>
      </table>
    </div>
  );
}
