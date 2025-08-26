export type DataRecord = Record<string, string>;

// Raw input types reflect the provided example JSON shape
export type RawRecord = {
  data: DataRecord;
  children: RawChildren;
};

export type RawChildren = {
  [relationshipName: string]: {
    records: RawRecord[];
  };
};

// Tree model used by the app
export type TreeNode = {
  uid: string;
  relationshipName: string | null;
  depth: number;
  data: DataRecord;
  children: TreeNode[];
};

export type Tree = TreeNode[];

export type ExpandState = Set<string>;
