import HierarchyTable from "@/components/HierarchyTable";
import {
  buildTree,
  collectAllColumns,
  parseUnknownToRawRecords,
} from "@/lib/transform";
import type { RawRecord } from "@/lib/types";
import data from "../../example-data.json";

export default function Home() {
  const raw = parseUnknownToRawRecords(data as unknown);
  const tree = buildTree(raw as RawRecord[]);
  const columns = collectAllColumns(tree);

  return (
    <div className="min-h-screen p-6">
      <HierarchyTable initialTree={tree} columns={columns} />
    </div>
  );
}
