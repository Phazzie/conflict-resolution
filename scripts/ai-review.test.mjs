import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  clipDiff,
  commentArgs,
  commentDestination,
  main,
  publish,
  reviewDecision,
  reviewPrompt,
} from "./ai-review.mjs";

const scriptPath = fileURLToPath(new URL("./ai-review.mjs", import.meta.url));

test("skips when XAI_API_KEY is missing", () => {
  assert.deepEqual(reviewDecision({}), { action: "skip", reason: "XAI_API_KEY is not set" });
  assert.deepEqual(reviewDecision({ XAI_API_KEY: "   " }), {
    action: "skip",
    reason: "XAI_API_KEY is not set",
  });
  assert.deepEqual(reviewDecision({ XAI_API_KEY: "present" }), { action: "review" });
});

test("the script process exits 0 when the key is missing", () => {
  const result = spawnSync(process.execPath, [scriptPath], {
    env: { ...process.env, XAI_API_KEY: "" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /AI review skipped: XAI_API_KEY is not set/);
});

test("clips long diffs and addresses the session app", () => {
  const clipped = clipDiff(`PREFIX${"y".repeat(20_000)}`);
  assert.match(clipped, /^PREFIX/);
  assert.match(clipped, /\[diff truncated\]$/);
  assert.ok(clipped.length < 20_000);
  const prompt = reviewPrompt("changed line");
  assert.match(prompt, /conflict-resolution session app/);
  assert.match(prompt, /changed line/);
});

test("mktemp accepts an options object as its second argument", () => {
  const file = execFileSync("mktemp", { encoding: "utf8" }).trim();
  assert.match(file, /^\//);
  execFileSync("rm", ["-f", file]);
});

test("prints the review and exits cleanly when the Origin CLI fails", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-review-fail-"));
  const body = "<!-- conflict-resolution-ai-review -->\n**Grok review**\n\nnote";
  const logs = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (line) => logs.push(String(line));
  console.error = (line) => logs.push(String(line));
  try {
    const result = await publish({ PR_NUMBER: "12" }, body, (cmd, args) => {
      if (cmd === "mktemp") {
        const file = path.join(dir, "body.md");
        writeFileSync(file, "");
        return `${file}\n`;
      }
      if (cmd === "origin") throw new Error("spawn origin ENOENT");
      assert.equal(cmd, "rm");
      assert.equal(args[0], "-f");
      return "";
    });
    assert.deepEqual(result, { posted: false });
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  const logged = logs.join("\n");
  assert.match(logged, /Origin CLI is missing or the comment failed/);
  assert.match(logged, /Grok review/);
  assert.match(logged, /\nnote/);
  assert.deepEqual(commentDestination({ PR_NUMBER: "12" }), "origin");
  assert.deepEqual(commentDestination({}), "stdout");
  assert.deepEqual(commentArgs(12, "/tmp/body"), [
    "pr",
    "comment",
    "12",
    "--body-file",
    "/tmp/body",
    "--edit-last",
    "--create-if-none",
  ]);
});

test("main skips an empty diff without calling xAI", async () => {
  let called = false;
  const logs = [];
  const originalLog = console.log;
  console.log = (line) => logs.push(String(line));
  try {
    await main(
      { XAI_API_KEY: "test-key", GITHUB_BASE_REF: "main" },
      {
        run(_cmd, args) {
          if (args[0] === "diff") return "   \n";
          return "";
        },
        fetchImpl() {
          called = true;
          throw new Error("should not call xAI");
        },
      },
    );
  } finally {
    console.log = originalLog;
  }
  assert.equal(called, false);
  assert.match(logs.join("\n"), /empty diff/);
});

test("main does not review the last commit when the pull request diff cannot be read", async () => {
  let called = false;
  const logs = [];
  const originalLog = console.log;
  console.log = (line) => logs.push(String(line));
  try {
    await main(
      { XAI_API_KEY: "test-key", GITHUB_BASE_REF: "main" },
      {
        run(_cmd, args) {
          if (args[0] === "diff") throw new Error("maxBuffer exceeded");
          return "";
        },
        fetchImpl() {
          called = true;
          throw new Error("should not call xAI");
        },
      },
    );
  } finally {
    console.log = originalLog;
  }
  assert.equal(called, false);
  assert.match(logs.join("\n"), /could not read the pull request diff/);
  assert.doesNotMatch(logs.join("\n"), /HEAD~1/);
});

test("main posts through origin when the key and CLI are present", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-review-"));
  const calls = [];
  await main(
    { XAI_API_KEY: "test-key", PR_NUMBER: "7", GITHUB_BASE_REF: "main" },
    {
      run(cmd, args) {
        calls.push([cmd, args]);
        if (cmd === "git" && args[0] === "diff") return "diff --git a/file b/file\n+change\n";
        if (cmd === "mktemp") {
          const file = path.join(dir, "body.md");
          writeFileSync(file, "");
          return `${file}\n`;
        }
        return "";
      },
      async fetchImpl() {
        return {
          ok: true,
          async json() {
            return { choices: [{ message: { content: "No functional issues." } }] };
          },
        };
      },
    },
  );
  const originCall = calls.find(([cmd]) => cmd === "origin");
  assert.ok(originCall, "expected an origin pr comment invocation");
  assert.deepEqual(originCall[1].slice(0, 3), ["pr", "comment", "7"]);
  assert.ok(originCall[1].includes("--edit-last"));
  assert.ok(originCall[1].includes("--create-if-none"));
});
