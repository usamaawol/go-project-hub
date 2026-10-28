import React from "react";
import type { AssignmentMetadata, IdentityPlacement } from "@/lib/assignment-types";
import { Users, User, GraduationCap, Calendar, BookOpen, Building, ShieldCheck } from "lucide-react";

export interface AcademicIdentityHeaderProps {
  metadata?: AssignmentMetadata;
  docTitle?: string;
  docSubtitle?: string;
  authorName?: string;
  institution?: string;
  dateStr?: string;
  className?: string;
}

export function AcademicIdentityHeader({
  metadata,
  docTitle,
  docSubtitle,
  authorName,
  institution,
  dateStr,
  className = "",
}: AcademicIdentityHeaderProps) {
  const isAssignment = Boolean(metadata?.isAssignment);
  const isGroup = isAssignment && metadata?.assignmentType === "group";

  // Determine placement: default to "both" if not specified, or respect legacy groupNamePlacement
  const placement: IdentityPlacement =
    metadata?.identityPlacement ||
    (metadata?.groupNamePlacement === "first-body-page" ? "first-body-page-only" : "both");

  const showDetailsOnBody = placement === "first-body-page-only" || placement === "both";

  const effectiveTitle = metadata?.assignmentTitle || docTitle || "Document Workspace";
  const effectiveSubtitle = metadata?.courseName ? `${metadata.courseName}${metadata.courseCode ? ` · ${metadata.courseCode}` : ""}` : docSubtitle;
  const effectiveInst = metadata?.universityName || institution || "";
  const effectiveDept = metadata?.department || metadata?.collegeOrFaculty || "";
  const effectiveDate = metadata?.submissionDate || dateStr || "";

  return (
    <div className={`mb-6 space-y-3 pb-4 border-b border-border/40 select-text ${className}`}>
      {/* 1. INSTITUTION & FACULTY PILL */}
      {effectiveInst && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
            <Building className="h-3 w-3" />
            {effectiveInst}
            {effectiveDept ? ` · ${effectiveDept}` : ""}
          </span>
          {metadata?.academicYear && (
            <span className="font-mono text-[10px] text-muted-foreground bg-surface-2 border border-border/60 px-2 py-0.5 rounded">
              {metadata.academicYear} {metadata.semester ? `· ${metadata.semester}` : ""}
            </span>
          )}
        </div>
      )}

      {/* 2. DOCUMENT / ASSIGNMENT TITLE & SUBTITLE */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-foreground">
          {effectiveTitle}
        </h1>
        {effectiveSubtitle && (
          <p className="text-sm text-muted-foreground font-normal italic mt-0.5">
            {effectiveSubtitle}
          </p>
        )}
      </div>

      {/* 3. CONDITIONAL IDENTITY BLOCK (WHEN PLACEMENT IS 'first-body-page-only' OR 'both') */}
      {showDetailsOnBody ? (
        <div className="rounded-xl border border-border/80 bg-surface-2/60 p-3.5 text-xs text-foreground/90 space-y-2 mt-2">
          {isGroup ? (
            /* GROUP ASSIGNMENT IDENTITY DETAILS */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <Users className="h-3.5 w-3.5" />
                  <span>Group: {metadata?.groupName?.trim() || "Assignment Project Team"}</span>
                </div>
                {metadata?.groupMembers && metadata.groupMembers.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-border/40">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      Team Members & Student IDs
                    </p>
                    <ul className="space-y-0.5 pl-1">
                      {metadata.groupMembers.map((m, idx) => (
                        <li key={m.id || idx} className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-foreground">
                            {idx + 1}. {m.fullName || `Member ${idx + 1}`}
                            {m.role ? ` (${m.role})` : ""}
                          </span>
                          {m.studentId && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              ID: {m.studentId}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-right md:text-right border-t md:border-t-0 md:border-l border-border/40 pt-2 md:pt-0 md:pl-3">
                {metadata?.courseName && (
                  <p className="text-[11px]">
                    <strong className="text-foreground">Course:</strong> {metadata.courseName}
                    {metadata.courseCode ? ` (${metadata.courseCode})` : ""}
                  </p>
                )}
                {metadata?.instructorName && (
                  <p className="text-[11px]">
                    <strong className="text-foreground">Submitted To:</strong> {metadata.instructorName}
                  </p>
                )}
                {effectiveDate && (
                  <p className="text-[11px] text-muted-foreground flex items-center justify-end gap-1">
                    <Calendar className="h-3 w-3" /> {effectiveDate}
                  </p>
                )}
              </div>
            </div>
          ) : isAssignment ? (
            /* INDIVIDUAL ASSIGNMENT IDENTITY DETAILS */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 font-medium text-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <strong>Student:</strong> {metadata?.studentName || authorName || "Student Name"}
                  {metadata?.studentId && (
                    <span className="font-mono text-[10.5px] text-muted-foreground">
                      (ID: {metadata.studentId})
                    </span>
                  )}
                </p>
                {metadata?.department && (
                  <p className="text-muted-foreground pl-5 text-[11px]">
                    {metadata.department}
                  </p>
                )}
              </div>

              <div className="space-y-1 text-left sm:text-right">
                {metadata?.courseName && (
                  <p className="text-[11px]">
                    <strong className="text-foreground">Course:</strong> {metadata.courseName}
                    {metadata.courseCode ? ` (${metadata.courseCode})` : ""}
                  </p>
                )}
                {metadata?.instructorName && (
                  <p className="text-[11px]">
                    <strong className="text-foreground">Submitted To:</strong> {metadata.instructorName}
                  </p>
                )}
                {effectiveDate && (
                  <p className="text-[11px] text-muted-foreground flex items-center justify-start sm:justify-end gap-1">
                    <Calendar className="h-3 w-3" /> {effectiveDate}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* STANDARD NON-ACADEMIC DOCUMENT HEADER */
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground font-sans">
              {(authorName || metadata?.studentName) && (
                <span className="font-medium text-foreground">
                  Prepared By: {authorName || metadata?.studentName}
                </span>
              )}
              {effectiveDate && <span>Date: {effectiveDate}</span>}
            </div>
          )}
        </div>
      ) : (
        /* CLEAN MINIMALIST HEADER WHEN PLACEMENT IS 'cover-only' (AVOIDS DUPLICATE HEADINGS) */
        effectiveDate ? (
          <div className="text-[11px] text-muted-foreground/80 font-mono">
            <span>{effectiveDate}</span>
          </div>
        ) : null
      )}
    </div>
  );
}

/**
 * Generates standalone HTML for the first body page identity header
 */
export function generateAcademicIdentityHeaderHtml(
  metadata?: AssignmentMetadata,
  docTitle?: string,
  docSubtitle?: string,
  authorName?: string,
  institution?: string,
  dateStr?: string,
): string {
  const isAssignment = Boolean(metadata?.isAssignment);
  const isGroup = isAssignment && metadata?.assignmentType === "group";

  const placement: IdentityPlacement =
    metadata?.identityPlacement ||
    (metadata?.groupNamePlacement === "first-body-page" ? "first-body-page-only" : "both");

  const showDetailsOnBody = placement === "first-body-page-only" || placement === "both";

  const effectiveTitle = escapeHtml(metadata?.assignmentTitle || docTitle || "Document Workspace");
  const effectiveSubtitle = escapeHtml(
    metadata?.courseName ? `${metadata.courseName}${metadata.courseCode ? ` · ${metadata.courseCode}` : ""}` : docSubtitle || "",
  );
  const effectiveInst = escapeHtml(metadata?.universityName || institution || "");
  const effectiveDept = escapeHtml(metadata?.department || metadata?.collegeOrFaculty || "");
  const effectiveDate = escapeHtml(metadata?.submissionDate || dateStr || "");

  let html = `<div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">`;

  if (effectiveInst) {
    html += `<div style="margin-bottom: 6px;">
      <span style="font-family: monospace; font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; padding: 2px 8px; background-color: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; border-radius: 4px;">
        ${effectiveInst}${effectiveDept ? ` · ${effectiveDept}` : ""}
      </span>
    </div>`;
  }

  html += `<h1 style="font-size: 1.85rem; font-weight: bold; color: #0f172a; margin-top: 4px; margin-bottom: 4px; line-height: 1.25;">${effectiveTitle}</h1>`;

  if (effectiveSubtitle) {
    html += `<p style="font-size: 1.05rem; color: #64748b; font-style: italic; margin-top: 0; margin-bottom: 12px;">${effectiveSubtitle}</p>`;
  }

  if (showDetailsOnBody) {
    html += `<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-top: 10px; font-size: 9.5pt;">`;

    if (isGroup) {
      html += `<div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="flex: 1; min-width: 200px;">
          <div style="font-weight: bold; color: #059669; margin-bottom: 4px; text-transform: uppercase; font-size: 9pt;">
            GROUP: ${escapeHtml(metadata?.groupName || "Assignment Team")}
          </div>
          <div style="font-size: 8.5pt; color: #64748b; margin-top: 4px;">`;
      for (const m of metadata?.groupMembers || []) {
        html += `<div style="margin-bottom: 2px;">• <strong>${escapeHtml(m.fullName || "Member")}</strong>${m.studentId ? ` (ID: ${escapeHtml(m.studentId)})` : ""}${m.role ? ` — <em>${escapeHtml(m.role)}</em>` : ""}</div>`;
      }
      html += `</div></div>
        <div style="text-align: right; font-size: 9pt; color: #334155;">
          ${metadata?.courseName ? `<div><strong>Course:</strong> ${escapeHtml(metadata.courseName)}${metadata.courseCode ? ` (${escapeHtml(metadata.courseCode)})` : ""}</div>` : ""}
          ${metadata?.instructorName ? `<div><strong>Submitted To:</strong> ${escapeHtml(metadata.instructorName)}</div>` : ""}
          ${effectiveDate ? `<div><strong>Date:</strong> ${effectiveDate}</div>` : ""}
        </div>
      </div>`;
    } else if (isAssignment) {
      html += `<div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div>
          <div><strong>Student:</strong> ${escapeHtml(metadata?.studentName || authorName || "")}${metadata?.studentId ? ` <span style="font-family: monospace; color: #64748b;">(ID: ${escapeHtml(metadata.studentId)})</span>` : ""}</div>
          ${metadata?.department ? `<div style="color: #64748b; font-size: 8.5pt; margin-top: 2px;">${escapeHtml(metadata.department)}</div>` : ""}
        </div>
        <div style="text-align: right; font-size: 9pt; color: #334155;">
          ${metadata?.courseName ? `<div><strong>Course:</strong> ${escapeHtml(metadata.courseName)}${metadata.courseCode ? ` (${escapeHtml(metadata.courseCode)})` : ""}</div>` : ""}
          ${metadata?.instructorName ? `<div><strong>Submitted To:</strong> ${escapeHtml(metadata.instructorName)}</div>` : ""}
          ${effectiveDate ? `<div><strong>Date:</strong> ${effectiveDate}</div>` : ""}
        </div>
      </div>`;
    } else {
      html += `<div style="display: flex; justify-content: space-between; color: #64748b;">
        <span><strong>Prepared By:</strong> ${escapeHtml(authorName || "")}</span>
        <span>${effectiveDate}</span>
      </div>`;
    }

    html += `</div>`;
  } else if (effectiveDate) {
    html += `<div style="font-size: 9pt; color: #64748b; font-family: monospace; margin-top: 4px;">${effectiveDate}</div>`;
  }

  html += `</div>`;
  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
