#!/usr/bin/env node
// scripts/prepend-filepath.mjs 
import { exec } from "child_process";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const COMMENT_STYLES = {
  ".js": "//",
  ".jsx": "//",
  ".ts": "//",
  ".tsx": "//",
  ".mjs": "//",
  ".cjs": "//",
  ".css": "/*",
  ".scss": "/*",
  ".less": "/*",
  ".html": "<!--",
  ".md": "<!--",
  ".mdc": "<!--",
  ".py": "#",
  ".sh": "#",
  ".rb": "#",
  ".yml": "#",
  ".yaml": "#",
  ".json": null, // Can't have comments
  ".lock": null,
  ".ico": null,
  ".png": null,
  ".jpg": null,
  ".jpeg": null,
  ".gif": null,
  ".svg": "<!--",
};

const COMMENT_END_STYLES = {
  ".css": "*/",
  ".scss": "*/",
  ".less": "*/",
  ".html": "-->",
  ".md": "-->",
  ".mdc": "-->",
  ".svg": "-->",
};

async function getGitFiles() {
  try {
    const { stdout } = await execAsync("git ls-files");
    return stdout.trim().split("\n");
  } catch (error) {
    console.error("Error getting git files:", error);
    return [];
  }
}

async function processFile(filePath) {
  const extension = path.extname(filePath);
  const commentStart = COMMENT_STYLES[extension];
  const commentEnd = COMMENT_END_STYLES[extension] ?? "";

  if (commentStart === null) {
    // console.log(`Skipping binary or un-commentable file: ${filePath}`);
    return;
  }
  if (!commentStart) {
    // console.log(`Skipping file with unknown comment style: ${filePath}`);
    return;
  }

  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");
    const relativePath = path.relative(process.cwd(), filePath);
    const commentText = ` ${relativePath} `;
    const fullComment = `${commentStart}${commentText}${commentEnd}`;

    // Skip if file is empty
    if (content.trim() === "") {
      return;
    }

    // Skip if the file already has a path comment
    const firstLine = lines[0].trim();
    if (firstLine.includes(relativePath)) {
      // console.log(`Comment already exists in: ${filePath}`);
      return;
    }

    // Handle shebangs
    if (firstLine.startsWith("#!")) {
      // Check if second line has the comment
      if (lines.length > 1 && lines[1].trim().includes(relativePath)) {
        // console.log(`Comment already exists in: ${filePath}`);
        return;
      }
      lines.splice(1, 0, fullComment);
    } else {
      lines.unshift(fullComment);
    }

    await writeFile(filePath, lines.join("\n"));
    console.log(`Added comment to: ${filePath}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      // console.log(`File not found, skipping: ${filePath}`);
    } else if (error.message.includes("is a directory")) {
      // console.log(`Skipping directory: ${filePath}`);
    } else {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }
}

async function main() {
  const files = await getGitFiles();
  const promises = files.map(processFile);
  await Promise.all(promises);
  console.log("Done processing all files.");
}

main();
