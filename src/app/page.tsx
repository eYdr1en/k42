import data from "@/app/example-data.json";
import HierarchyTable from "@/components/HierarchyTable";
import {
  buildTree,
  collectAllColumns,
  parseUnknownToRawRecords,
} from "@/lib/transform";
import type { RawRecord } from "@/lib/types";

export default function Home() {
  const raw = parseUnknownToRawRecords(data as unknown);
  const tree = buildTree(raw as RawRecord[]);
  const columns = collectAllColumns(tree);

  return (
    <div className="min-h-screen">
      <HierarchyTable initialTree={tree} columns={columns} />
    </div>
  );
}
