import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocation, getToolMessage } from "../ToolInvocation";

afterEach(() => {
  cleanup();
});

// --- getToolMessage ---------------------------------------------------------

test("str_replace_editor create -> Creating <file>", () => {
  expect(
    getToolMessage("str_replace_editor", {
      command: "create",
      path: "/components/Card.jsx",
    })
  ).toBe("Creating Card.jsx");
});

test("str_replace_editor str_replace and insert -> Editing <file>", () => {
  expect(
    getToolMessage("str_replace_editor", {
      command: "str_replace",
      path: "/App.jsx",
    })
  ).toBe("Editing App.jsx");

  expect(
    getToolMessage("str_replace_editor", {
      command: "insert",
      path: "/utils/format.js",
    })
  ).toBe("Editing format.js");
});

test("str_replace_editor view and undo_edit messages", () => {
  expect(
    getToolMessage("str_replace_editor", { command: "view", path: "/App.jsx" })
  ).toBe("Viewing App.jsx");

  expect(
    getToolMessage("str_replace_editor", {
      command: "undo_edit",
      path: "/App.jsx",
    })
  ).toBe("Reverting changes in App.jsx");
});

test("str_replace_editor with unknown/missing command falls back to Modifying", () => {
  expect(
    getToolMessage("str_replace_editor", { path: "/App.jsx" })
  ).toBe("Modifying App.jsx");
});

test("file_manager rename -> Renaming <old> to <new>", () => {
  expect(
    getToolMessage("file_manager", {
      command: "rename",
      path: "/components/Old.jsx",
      new_path: "/components/New.jsx",
    })
  ).toBe("Renaming Old.jsx to New.jsx");
});

test("file_manager delete -> Deleting <file>", () => {
  expect(
    getToolMessage("file_manager", {
      command: "delete",
      path: "/components/Card.jsx",
    })
  ).toBe("Deleting Card.jsx");
});

test("unknown tool falls back to the raw tool name", () => {
  expect(getToolMessage("some_other_tool", { path: "/App.jsx" })).toBe(
    "some_other_tool"
  );
});

test("missing path renders a generic 'file' placeholder", () => {
  expect(getToolMessage("str_replace_editor", { command: "create" })).toBe(
    "Creating file"
  );
});

// --- ToolInvocation component ----------------------------------------------

test("renders the friendly message instead of the raw tool name", () => {
  render(
    <ToolInvocation
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "result",
        result: "File created",
        args: { command: "create", path: "/components/Card.jsx" },
      }}
    />
  );

  expect(screen.getByText("Creating Card.jsx")).toBeDefined();
  expect(screen.queryByText("str_replace_editor")).toBeNull();
});

test("shows a completion dot (no spinner) when the call has a result", () => {
  const { container } = render(
    <ToolInvocation
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "result",
        result: "ok",
        args: { command: "create", path: "/App.jsx" },
      }}
    />
  );

  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("shows a spinner while the call is still in progress", () => {
  const { container } = render(
    <ToolInvocation
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "call",
        args: { command: "create", path: "/App.jsx" },
      }}
    />
  );

  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows a spinner when state is result but result is empty", () => {
  const { container } = render(
    <ToolInvocation
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "result",
        result: "",
        args: { command: "create", path: "/App.jsx" },
      }}
    />
  );

  expect(container.querySelector(".animate-spin")).not.toBeNull();
});
