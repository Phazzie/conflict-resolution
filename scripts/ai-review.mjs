#!/usr/bin/env node
/**
 * Pull-request review via the xAI chat API.
 * Skips cleanly when XAI_API_KEY is unset so CI stays green before the owner
 * adds the secret. Posts or updates one Origin comment, and prints the note
 * to the log when the Origin CLI is missing or the comment fails.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const MARKER = "<!-- conflict-resolution-ai-review -->";
const DIFF_CAP = 14_000;

export function reviewDecision(env) {
  if (!env.XAI_API_KEY?.trim()) return { action: "skip", reason: "XAI_API_KEY is not set" };
  return { action: "review" };
}

export function clipDiff(diff) {
  const text = diff.trim();
  if (text.length <= DIFF_CAP) return text;
  return `${text.slice(0, DIFF_CAP)}\n\n[diff truncated]`;
}

export function reviewPrompt(diff) {
  return [
    "You are reviewing a pull request for a conflict-resolution session app built with React and Vite.",
    "Parties agree on an issue, steelman each other, discuss, and record a resolution.",
    "Comment only on real bugs, security issues, broken session state, or data leaks.",
    "Skip style nits. Use short paragraphs. If nothing is wrong, say so in one sentence.",
    "",
    clipDiff(diff),
  ].join("\n");
}

export function pullRequestNumber(env) {
  if (env.PR_NUMBER) return String(env.PR_NUMBER);
  if (!env.GITHUB_EVENT_PATH) return "";
  try {
    const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
    return event.pull_request?.number ? String(event.pull_request.number) : "";
  } catch {
    return "";
  }
}

export function commentDestination(env) {
  if (pullRequestNumber(env)) return "origin";
  return "stdout";
}

export function commentArgs(number, file) {
  return ["pr", "comment", String(number), "--body-file", file, "--edit-last", "--create-if-none"];
}

const COMMAND_TIMEOUT_MS = 30_000;

function diffAgainstBase(env, run = execFileSync) {
  const base = env.GITHUB_BASE_REF || env.BASE_REF || "main";
  try {
    run("git", ["fetch", "origin", base, "--depth", "50"], {
      stdio: "ignore",
      timeout: COMMAND_TIMEOUT_MS,
    });
  } catch {
    // The checkout may already contain the base, or the fetch timed out.
  }
  return run("git", ["diff", `origin/${base}...HEAD`], {
    encoding: "utf8",
    maxBuffer: 8_000_000,
    timeout: COMMAND_TIMEOUT_MS,
  });
}

async function askGrok(apiKey, diff, fetchImpl = fetch) {
  const res = await fetchImpl("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      max_tokens: 500,
      messages: [
        { role: "system", content: "You review code diffs. Be specific and brief." },
        { role: "user", content: reviewPrompt(diff) },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`xAI review failed (${res.status})`);
  const body = await res.json();
  const text = body?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("xAI review returned an empty note");
  return text;
}

function publishOnOrigin(number, body, run = execFileSync) {
  const file = run("mktemp", { encoding: "utf8" }).trim();
  try {
    writeFileSync(file, body);
    run("origin", commentArgs(number, file), { stdio: "inherit", timeout: COMMAND_TIMEOUT_MS });
  } finally {
    try {
      run("rm", ["-f", file]);
    } catch {
      /* the temp file is only the review text */
    }
  }
}

export async function publish(env, body, run = execFileSync) {
  const number = pullRequestNumber(env);
  const destination = commentDestination(env);
  if (destination === "stdout") {
    console.log(body);
    console.log("AI review printed locally. Set PR_NUMBER to comment on the Origin pull request.");
    return { posted: false };
  }
  try {
    publishOnOrigin(number, body, run);
    return { posted: true };
  } catch (error) {
    console.log(body);
    console.error(error instanceof Error ? error.message : error);
    console.log("Origin CLI is missing or the comment failed. The review is in the log above.");
    return { posted: false };
  }
}

export async function main(env = process.env, deps = {}) {
  const run = deps.run ?? execFileSync;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const decision = reviewDecision(env);
  if (decision.action === "skip") {
    console.log(`AI review skipped: ${decision.reason}`);
    return;
  }
  let diff;
  try {
    diff = diffAgainstBase(env, run);
  } catch (error) {
    const detail = error instanceof Error ? error.message : error;
    console.log(`AI review skipped: could not read the pull request diff (${detail})`);
    return;
  }
  if (!diff.trim()) {
    console.log("AI review skipped: empty diff");
    return;
  }
  const note = await askGrok(env.XAI_API_KEY.trim(), diff, fetchImpl);
  const body = `${MARKER}\n**Grok review**\n\n${note}`;
  await publish(env, body, run);
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
