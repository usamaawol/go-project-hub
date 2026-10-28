import { describe, expect, it, beforeEach } from "vitest";
import {
  getWorkspaceJobs,
  addWorkspaceJob,
  clearWorkspaceHistory,
  eraseWorkspaceJobsOnDownload,
  isHistoryRetentionOptedIn,
  setHistoryRetentionOptIn,
} from "@/lib/workspace-history";

describe("Ephemeral Privacy & Zero-Retention On Download", () => {
  beforeEach(() => {
    clearWorkspaceHistory();
    setHistoryRetentionOptIn(false);
  });

  it("defaults to ephemeral privacy (zero retention on account)", () => {
    expect(isHistoryRetentionOptedIn()).toBe(false);
  });

  it("erases all workspace jobs and history when eraseWorkspaceJobsOnDownload is invoked", () => {
    // Add job to session
    addWorkspaceJob({
      name: "Internet_Programming_ll_Nextjs_Assignment_converted.doc",
      tool: "File Converter",
      format: "DOCX",
      originalSize: "47.7 KB",
      resultSize: "0.5 KB",
    });

    // Erase on download
    eraseWorkspaceJobsOnDownload();

    // Verify history is 100% empty
    expect(getWorkspaceJobs().length).toBe(0);
  });

  it("automatically purges old persistent storage items when retention is not opted in", () => {
    // Simulate legacy storage containing stale jobs
    localStorage.setItem(
      "documind_workspace_history",
      JSON.stringify([
        {
          id: "stale-1",
          name: "DocuMind_Presentation_Maker___Co.doc",
          tool: "Document Studio",
          format: "DOCX",
          originalSize: "87 Sections",
          date: "Yesterday",
          timestamp: Date.now() - 50000,
          status: "completed",
        },
      ]),
    );

    // In ephemeral mode (retention not opted in), getWorkspaceJobs returns empty and purges localStorage
    const jobs = getWorkspaceJobs();
    expect(jobs.length).toBe(0);
    expect(localStorage.getItem("documind_workspace_history")).toBeNull();
  });
});
