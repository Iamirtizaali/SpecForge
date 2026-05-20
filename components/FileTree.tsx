"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { GeneratedFile } from "@/lib/types";

export interface FileTreeProps {
  files: GeneratedFile[];
  selectedPath?: string;
  onSelect: (path: string) => void;
}

type TreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children: Map<string, TreeNode>;
};

function buildTree(files: GeneratedFile[]): TreeNode {
  const root: TreeNode = {
    name: "",
    path: "",
    type: "directory",
    children: new Map(),
  };

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    let cursor = root;
    let accumulated = "";

    segments.forEach((segment, idx) => {
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;
      const isLast = idx === segments.length - 1;

      if (!cursor.children.has(segment)) {
        cursor.children.set(segment, {
          name: segment,
          path: accumulated,
          type: isLast ? "file" : "directory",
          children: new Map(),
        });
      }
      cursor = cursor.children.get(segment)!;
    });
  }

  return root;
}

function sortChildren(node: TreeNode): TreeNode[] {
  return [...node.children.values()].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

interface NodeRowProps {
  node: TreeNode;
  depth: number;
  selectedPath?: string;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

function NodeRow({
  node,
  depth,
  selectedPath,
  expanded,
  onToggle,
  onSelect,
}: NodeRowProps) {
  if (node.type === "file") {
    const isSelected = node.path === selectedPath;
    return (
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition",
          isSelected
            ? "bg-purple-500/20 text-purple-100"
            : "text-zinc-300 hover:bg-white/5 hover:text-white"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <FileText className="size-3.5 shrink-0 text-zinc-500" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  const isOpen = expanded.has(node.path);
  const children = sortChildren(node);

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(node.path)}
        className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-xs text-zinc-200 transition hover:bg-white/5"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {isOpen ? (
          <ChevronDown className="size-3.5 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-zinc-500" />
        )}
        {isOpen ? (
          <FolderOpen className="size-3.5 shrink-0 text-amber-300/80" />
        ) : (
          <Folder className="size-3.5 shrink-0 text-amber-300/80" />
        )}
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {isOpen && (
        <div>
          {children.map((child) => (
            <NodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ files, selectedPath, onSelect }: FileTreeProps) {
  const root = useMemo(() => buildTree(files), [files]);

  // Expand top-level folders by default
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const child of root.children.values()) {
      if (child.type === "directory") initial.add(child.path);
    }
    // Expand the .kiro top-level and its direct subdirs
    const kiro = root.children.get(".kiro");
    if (kiro) {
      initial.add(kiro.path);
      for (const sub of kiro.children.values()) {
        if (sub.type === "directory") initial.add(sub.path);
      }
    }
    return initial;
  });

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  const children = sortChildren(root);

  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/60 p-2 backdrop-blur">
      <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-zinc-500">
        Generated files
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        {children.map((child) => (
          <NodeRow
            key={child.path}
            node={child}
            depth={0}
            selectedPath={selectedPath}
            expanded={expanded}
            onToggle={toggle}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
