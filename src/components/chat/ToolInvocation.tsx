"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocationData {
  toolName: string;
  state: string;
  args?: Record<string, any>;
  result?: unknown;
}

function getFileName(path?: string): string {
  if (!path) return "file";
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] || path;
}

export function getToolMessage(
  toolName: string,
  args?: Record<string, any>
): string {
  const fileName = getFileName(args?.path);

  if (toolName === "str_replace_editor") {
    switch (args?.command) {
      case "create":
        return `Creating ${fileName}`;
      case "str_replace":
      case "insert":
        return `Editing ${fileName}`;
      case "view":
        return `Viewing ${fileName}`;
      case "undo_edit":
        return `Reverting changes in ${fileName}`;
      default:
        return `Modifying ${fileName}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args?.command) {
      case "rename":
        return `Renaming ${fileName} to ${getFileName(args?.new_path)}`;
      case "delete":
        return `Deleting ${fileName}`;
      default:
        return `Updating ${fileName}`;
    }
  }

  // Fall back to the raw tool name for unknown tools
  return toolName;
}

export function ToolInvocation({
  toolInvocation,
}: {
  toolInvocation: ToolInvocationData;
}) {
  const { toolName, state, args, result } = toolInvocation;
  const isComplete = state === "result" && Boolean(result);
  const message = getToolMessage(toolName, args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{message}</span>
    </div>
  );
}
