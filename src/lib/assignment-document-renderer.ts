/**
 * DocuMind Academic Assignment Document Cover Generator
 * Generates standards-compliant HTML with inline styling for all 10 academic cover templates.
 * Compatible with Word (.doc/.docx via HTML) and Browser Print / PDF export.
 */

import type { AssignmentMetadata } from "./assignment-types";
import { getDefaultAssignmentMetadata } from "./assignment-types";
import { getCoverTemplateById, generateDefaultCoverElements } from "./cover-templates-registry";

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateAssignmentCoverHtml(metadata?: AssignmentMetadata | null): string {
  const safeMeta = metadata || getDefaultAssignmentMetadata();
  const templateId = safeMeta.coverTemplateId || "classic-university";
  const accent = safeMeta.accentColor || "#1E3A8A";
  const isGroup = safeMeta.assignmentType === "group";

  // Priority 1: If custom cover elements exist OR if it's a Canva template archetype
  const hasCustomElements = Boolean(safeMeta.customCoverElements && safeMeta.customCoverElements.length > 0);
  const isCanvaTemplate = templateId.startsWith("canva-");

  if (hasCustomElements || isCanvaTemplate) {
    const rawElements = hasCustomElements
      ? safeMeta.customCoverElements!
      : generateDefaultCoverElements(getCoverTemplateById(templateId), safeMeta);

    const sorted = [...rawElements].sort((a, b) => a.zIndex - b.zIndex);

    const innerHtml = sorted
      .map((el) => {
        const leftPct = (el.x / 794) * 100;
        const topPct = (el.y / 1123) * 100;
        const widthPct = (el.width / 794) * 100;
        const heightPct = (el.height / 1123) * 100;

        let elBody = "";
        if (el.type === "text") {
          elBody = `<div style="width: 100%; height: 100%; font-family: ${el.fontFamily || 'sans-serif'}; font-size: ${el.fontSize || 14}px; font-weight: ${el.fontWeight || 'normal'}; color: ${el.textColor || '#0F172A'}; text-align: ${el.textAlign || 'left'}; line-height: ${el.lineHeight || 1.25}; letter-spacing: ${el.letterSpacing ? el.letterSpacing + 'px' : 'normal'}; display: flex; align-items: center; justify-content: ${el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start'}; white-space: pre-line;">${escapeHtml(el.text || '')}</div>`;
        } else if (el.type === "shape") {
          if (el.svgContent) {
            elBody = `<div style="width: 100%; height: 100%; opacity: ${el.opacity ?? 1};">${el.svgContent}</div>`;
          } else {
            elBody = `<div style="width: 100%; height: 100%; background-color: ${el.fillColor || 'transparent'}; border: ${el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor || 'transparent'}` : 'none'}; border-radius: ${el.shapeType === 'circle' ? '50%' : (el.borderRadius ? `${el.borderRadius}px` : '0')}; opacity: ${el.opacity ?? 1};"></div>`;
          }
        } else if (el.type === "divider") {
          elBody = `<div style="width: 100%; height: 100%; background-color: ${el.fillColor || '#CBD5E1'};"></div>`;
        } else if (el.type === "image" && el.imageUrl) {
          elBody = `<img src="${el.imageUrl}" alt="${escapeHtml(el.name || 'Logo')}" style="width: 100%; height: 100%; object-fit: ${el.imageFit || 'contain'}; opacity: ${el.opacity ?? 1};" />`;
        }

        return `<div style="position: absolute; left: ${leftPct.toFixed(2)}%; top: ${topPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%; height: ${heightPct.toFixed(2)}%; z-index: ${el.zIndex}; overflow: hidden; box-sizing: border-box;">${elBody}</div>`;
      })
      .join("\n");

    return `<div style="position: relative; width: 100%; height: 100%; min-height: 270mm; background: #FFFFFF; overflow: hidden; box-sizing: border-box;">${innerHtml}</div>`;
  }

  const title = escapeHtml(
    safeMeta.assignmentTitle?.trim() ||
      safeMeta.courseName?.trim() ||
      (isGroup ? "Group Assignment Submission" : "Individual Course Assignment"),
  );

  const course = escapeHtml(safeMeta.courseName?.trim() || "");
  const courseCode = escapeHtml(safeMeta.courseCode?.trim() || "");
  const instructor = escapeHtml(safeMeta.instructorName?.trim() || "Instructor Name");
  const university = escapeHtml(safeMeta.universityName?.trim() || "");
  const department = escapeHtml(safeMeta.department?.trim() || "");
  const faculty = escapeHtml(safeMeta.collegeOrFaculty?.trim() || "");
  const academicYear = escapeHtml(safeMeta.academicYear?.trim() || "");
  const semester = escapeHtml(safeMeta.semester?.trim() || "");
  const submissionDate = escapeHtml(safeMeta.submissionDate?.trim() || "");
  const instructions = escapeHtml(safeMeta.additionalInstructions?.trim() || "");
  const logo = safeMeta.logoDataUrl;

  const studentName = escapeHtml(
    safeMeta.studentName?.trim() || (isGroup ? "Group Project" : "Student Name"),
  );
  const studentId = escapeHtml(safeMeta.studentId?.trim() || "");

  const members =
    isGroup && Array.isArray(safeMeta.groupMembers) && safeMeta.groupMembers.length > 0
      ? safeMeta.groupMembers.filter((m) => m && (m.fullName?.trim() || m.studentId?.trim()))
      : [];

  const logoMarkup = logo
    ? `<div style="text-align: center; margin-bottom: 18px;">
        <img src="${logo}" alt="University Logo" style="max-height: 80px; max-width: 220px; object-fit: contain;" />
      </div>`
    : "";

  const renderStudentSection = (styleMode: "formal" | "minimal" | "table" | "cards" = "formal") => {
    if (isGroup) {
      if (styleMode === "cards") {
        return `<div style="margin: 25px 0;">
          <p style="font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: ${accent}; margin-bottom: 10px;">Group Members Directory</p>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${members
              .map(
                (m) => `<div style="padding: 10px 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; min-width: 180px;">
                  <div style="font-weight: 600; font-size: 10.5pt; color: #0f172a;">${escapeHtml(m.fullName)}</div>
                  <div style="font-family: monospace; font-size: 9.5pt; color: ${accent}; margin-top: 2px;">ID: ${escapeHtml(m.studentId)}</div>
                </div>`,
              )
              .join("")}
          </div>
        </div>`;
      }
      return `<div style="margin: 25px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5pt; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid ${accent}; background-color: #f8fafc;">
              <th style="padding: 8px 12px; font-weight: bold; color: #0f172a;">#</th>
              <th style="padding: 8px 12px; font-weight: bold; color: #0f172a;">Student Full Name</th>
              <th style="padding: 8px 12px; font-weight: bold; color: #0f172a;">Student ID</th>
            </tr>
          </thead>
          <tbody>
            ${members
              .map(
                (m, i) => `<tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 12px; color: #64748b; font-family: monospace;">0${i + 1}</td>
                  <td style="padding: 8px 12px; font-weight: 600; color: #1e293b;">${escapeHtml(m.fullName)}</td>
                  <td style="padding: 8px 12px; font-family: monospace; color: ${accent}; font-weight: bold;">${escapeHtml(m.studentId)}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
    }

    if (styleMode === "minimal") {
      return `<div style="margin: 24px 0;">
        <p style="font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 4px 0;">Submitted By</p>
        <p style="font-size: 14pt; font-weight: bold; color: #0f172a; margin: 0 0 2px 0;">${studentName}</p>
        <p style="font-size: 10.5pt; font-family: monospace; color: ${accent}; margin: 0;">Student ID: ${studentId}</p>
      </div>`;
    }

    return `<div style="margin: 30px auto; max-width: 420px; text-align: center; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 16px 0;">
      <p style="font-size: 9.5pt; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin: 0 0 6px 0;">Submitted By</p>
      <p style="font-size: 15pt; font-weight: bold; color: #0f172a; margin: 0 0 3px 0;">${studentName}</p>
      <p style="font-size: 11pt; font-family: monospace; color: ${accent}; font-weight: bold; margin: 0;">ID: ${studentId}</p>
    </div>`;
  };

  const renderEvaluatorAndDates = (align: "center" | "left" = "center") => {
    return `<div style="text-align: ${align}; font-size: 10.5pt; color: #475569; line-height: 1.6; margin-top: auto;">
      <p style="margin: 0 0 4px 0;"><strong>Submitted to:</strong> <span style="color: #0f172a; font-weight: 600;">${instructor}</span></p>
      ${academicYear || semester ? `<p style="margin: 0 0 4px 0;">${[academicYear, semester].filter(Boolean).join(" · ")}</p>` : ""}
      ${submissionDate ? `<p style="margin: 0;"><strong>Submission Date:</strong> ${submissionDate}</p>` : ""}
      ${instructions ? `<p style="margin: 8px 0 0 0; font-size: 9pt; font-style: italic; color: #64748b;">${instructions}</p>` : ""}
    </div>`;
  };

  switch (templateId) {
    // -------------------------------------------------------------
    // 1. CLASSIC UNIVERSITY
    // -------------------------------------------------------------
    case "classic-university":
      return `
        <div style="height: 100%; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; border: 3px double ${accent}; padding: 28px; box-sizing: border-box; font-family: Georgia, 'Times New Roman', serif;">
          <div style="text-align: center;">
            ${logoMarkup}
            ${university ? `<h2 style="font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; margin: 0 0 6px 0;">${university}</h2>` : ""}
            ${faculty || department ? `<p style="font-size: 10.5pt; color: #475569; margin: 0 0 14px 0;">${[faculty, department].filter(Boolean).join(" · ")}</p>` : ""}
            <div style="width: 80px; height: 2px; background-color: ${accent}; margin: 12px auto 24px auto;"></div>
            <h1 style="font-size: 24pt; font-weight: bold; color: #0f172a; margin: 0 0 10px 0; line-height: 1.25;">${title}</h1>
            ${course ? `<p style="font-size: 13pt; color: #334155; font-style: italic; margin: 0;">${courseCode ? courseCode + " — " : ""}${course}</p>` : ""}
          </div>
          <div>
            ${renderStudentSection("formal")}
          </div>
          <div>
            ${renderEvaluatorAndDates("center")}
          </div>
        </div>`;

    // -------------------------------------------------------------
    // 2. MODERN MINIMAL
    // -------------------------------------------------------------
    case "modern-minimal":
      return `
        <div style="height: 100%; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; border-left: 6px solid ${accent}; padding: 10px 0 10px 32px; box-sizing: border-box; font-family: 'Helvetica Neue', Arial, sans-serif;">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
              <div>
                ${university ? `<p style="font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: ${accent}; margin: 0 0 4px 0;">${university}</p>` : ""}
                ${department || faculty ? `<p style="font-size: 9.5pt; color: #64748b; margin: 0;">${[faculty, department].filter(Boolean).join(" / ")}</p>` : ""}
              </div>
              ${logo ? `<img src="${logo}" alt="Emblem" style="max-height: 55px; max-width: 150px; object-fit: contain;" />` : ""}
            </div>
            <div style="margin: 40px 0 20px 0;">
              <h1 style="font-size: 26pt; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; line-height: 1.2;">${title}</h1>
              ${course ? `<p style="font-size: 12.5pt; font-weight: 500; color: #334155; margin: 0;">${courseCode ? courseCode + " · " : ""}${course}</p>` : ""}
            </div>
          </div>
          <div>
            ${renderStudentSection("minimal")}
          </div>
          <div>
            ${renderEvaluatorAndDates("left")}
          </div>
        </div>`;

    // -------------------------------------------------------------
    // 3. FORMAL ACADEMIC
    // -------------------------------------------------------------
    case "formal-academic":
      return `
        <div style="height: 100%; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; border-top: 4px solid #0f172a; border-bottom: 4px solid #0f172a; padding: 24px 8px; box-sizing: border-box; font-family: 'Times New Roman', Times, serif;">
          <div style="text-align: center;">
            ${logoMarkup}
            ${university ? `<h2 style="font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin: 0 0 4px 0;">${university}</h2>` : ""}
            ${faculty || department ? `<p style="font-size: 10pt; text-transform: uppercase; color: #475569; margin: 0 0 20px 0;">${[faculty, department].filter(Boolean).join(" • ")}</p>` : ""}
            <div style="border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 24px 10px; margin: 20px 0;">
              <p style="font-size: 10pt; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin: 0 0 10px 0;">Coursework Submission</p>
              <h1 style="font-size: 22pt; font-weight: bold; color: #0f172a; margin: 0 0 8px 0;">${title}</h1>
              ${course ? `<p style="font-size: 12pt; color: #334155; margin: 0;">${courseCode ? courseCode + " — " : ""}${course}</p>` : ""}
            </div>
          </div>
          <div>
            ${renderStudentSection("table")}
          </div>
          <div>
            ${renderEvaluatorAndDates("center")}
          </div>
        </div>`;

    // -------------------------------------------------------------
    // 4. ELEGANT BLUE
    // -------------------------------------------------------------
    case "elegant-blue":
      return `
        <div style="height: 100%; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="background-color: ${accent}; color: #ffffff; padding: 28px 32px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <div>
                ${university ? `<h3 style="font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 4px 0; color: #ffffff;">${university}</h3>` : ""}
                ${department ? `<p style="font-size: 9.5pt; opacity: 0.9; margin: 0; color: #f1f5f9;">${department}</p>` : ""}
              </div>
              ${logo ? `<img src="${logo}" alt="Crest" style="max-height: 50px; max-width: 140px; object-fit: contain; background: #ffffff; padding: 4px; border-radius: 4px;" />` : ""}
            </div>
            <h1 style="font-size: 24pt; font-weight: bold; color: #ffffff; margin: 18px 0 8px 0; line-height: 1.2;">${title}</h1>
            ${course ? `<p style="font-size: 12pt; opacity: 0.95; margin: 0; color: #e2e8f0;">${courseCode ? courseCode + " · " : ""}${course}</p>` : ""}
          </div>
          <div style="padding: 24px 32px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              ${renderStudentSection("cards")}
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 18px;">
              ${renderEvaluatorAndDates("left")}
            </div>
          </div>
        </div>`;

    // -------------------------------------------------------------
    // 5. PROFESSIONAL NAVY
    // -------------------------------------------------------------
    case "professional-navy":
      return `
        <div style="height: 100%; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; padding: 10px; box-sizing: border-box; font-family: 'Trebuchet MS', Arial, sans-serif;">
          <div>
            <div style="background-color: #0f172a; color: #ffffff; padding: 20px 24px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
              <div>
                ${university ? `<p style="font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 3px 0;">${university}</p>` : ""}
                ${faculty ? `<p style="font-size: 9pt; color: #94a3b8; margin: 0;">${faculty}</p>` : ""}
              </div>
              ${logo ? `<img src="${logo}" alt="Emblem" style="max-height: 48px; max-width: 140px; object-fit: contain;" />` : ""}
            </div>
            <div style="margin: 40px 10px 20px 10px;">
              <p style="font-size: 9.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: ${accent}; margin: 0 0 8px 0;">Official Academic Submission</p>
              <h1 style="font-size: 25pt; font-weight: bold; color: #0f172a; margin: 0 0 10px 0; line-height: 1.25;">${title}</h1>
              ${course ? `<p style="font-size: 12.5pt; color: #475569; margin: 0;"><strong>Course:</strong> ${courseCode ? courseCode + " — " : ""}${course}</p>` : ""}
            </div>
          </div>
          <div style="margin: 0 10px;">
            ${renderStudentSection("table")}
          </div>
          <div style="margin: 0 10px; padding-top: 16px; border-top: 2px solid #e2e8f0;">
            ${renderEvaluatorAndDates("left")}
          </div>
        </div>`;

    // -------------------------------------------------------------
    // 6. CLEAN BLACK AND WHITE
    // -------------------------------------------------------------
    case "clean-black-white":
      return `
        <div style="height: 100%; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; border: 2px solid #000000; padding: 32px; box-sizing: border-box; font-family: 'Times New Roman', serif;">
          <div>
            ${logo ? `<div style="margin-bottom: 20px;"><img src="${logo}" alt="Logo" style="max-height: 60px; max-width: 160px; object-fit: contain; filter: grayscale(100%);" /></div>` : ""}
            ${university ? `<p style="font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #000000; margin: 0 0 4px 0;">${university}</p>` : ""}
            ${department ? `<p style="font-size: 10pt; color: #000000; margin: 0 0 24px 0;">${department}</p>` : ""}
            <div style="border-top: 2px solid #000000; margin: 24px 0 20px 0;"></div>
            <h1 style="font-size: 26pt; font-weight: bold; color: #000000; margin: 0 0 12px 0; line-height: 1.2;">${title}</h1>
            ${course ? `<p style="font-size: 13pt; font-style: italic; color: #000000; margin: 0;">${courseCode ? courseCode + " — " : ""}${course}</p>` : ""}
          </div>
          <div>
            ${renderStudentSection("minimal")}
          </div>
          <div style="border-top: 1px solid #000000; padding-top: 16px;">
            ${renderEvaluatorAndDates("left")}
          </div>
        </div>`;

    // -------------------------------------------------------------
    // 7. CONTEMPORARY EDITORIAL
    // -------------------------------------------------------------
    case "contemporary-editorial":
      return `
        <div style="height: 100%; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; padding: 24px; box-sizing: border-box; font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #cbd5e1; padding-bottom: 16px;">
              <div>
                ${university ? `<h3 style="font-size: 13pt; font-weight: bold; letter-spacing: 1px; color: #0f172a; margin: 0 0 4px 0;">${university}</h3>` : ""}
                ${faculty ? `<p style="font-size: 9.5pt; color: #64748b; margin: 0;">${faculty}</p>` : ""}
              </div>
              ${logo ? `<img src="${logo}" alt="Crest" style="max-height: 60px; max-width: 160px; object-fit: contain;" />` : ""}
            </div>
            <div style="margin: 45px 0 25px 0;">
              <p style="font-size: 10pt; font-family: sans-serif; text-transform: uppercase; letter-spacing: 2px; color: ${accent}; font-weight: bold; margin: 0 0 10px 0;">Research & Assignment Report</p>
              <h1 style="font-size: 27pt; font-weight: bold; color: #0f172a; margin: 0 0 12px 0; line-height: 1.15;">${title}</h1>
              ${course ? `<p style="font-size: 13pt; color: #334155; font-style: italic; margin: 0;">${courseCode ? courseCode + " — " : ""}${course}</p>` : ""}
            </div>
          </div>
          <div>
            ${renderStudentSection("cards")}
          </div>
          <div style="border-top: 1px solid #cbd5e1; padding-top: 18px;">
            ${renderEvaluatorAndDates("left")}
          </div>
        </div>`;

    // -------------------------------------------------------------
    // 8. UNIVERSITY BRANDING
    // -------------------------------------------------------------
    case "university-branding":
      return `
        <div style="height: 100%; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; border: 2px solid ${accent}; padding: 24px; box-sizing: border-box; font-family: 'Helvetica Neue', Arial, sans-serif;">
          <div style="text-align: center; border-bottom: 2px solid ${accent}; padding-bottom: 20px;">
            ${logoMarkup}
            ${university ? `<h2 style="font-size: 16pt; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: ${accent}; margin: 0 0 4px 0;">${university}</h2>` : ""}
            ${faculty || department ? `<p style="font-size: 10.5pt; font-weight: 500; color: #475569; margin: 0;">${[faculty, department].filter(Boolean).join(" · ")}</p>` : ""}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 9.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin: 0 0 8px 0;">Assignment Submission</p>
            <h1 style="font-size: 25pt; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; line-height: 1.2;">${title}</h1>
            ${course ? `<p style="font-size: 13pt; font-weight: 600; color: ${accent}; margin: 0;">${courseCode ? courseCode + " : " : ""}${course}</p>` : ""}
          </div>
          <div>
            ${renderStudentSection("formal")}
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 18px;">
            ${renderEvaluatorAndDates("center")}
          </div>
        </div>`;

    // -------------------------------------------------------------
    // 9. STRUCTURED RESEARCH
    // -------------------------------------------------------------
    case "structured-research":
      return `
        <div style="height: 100%; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #cbd5e1; padding: 24px; box-sizing: border-box; font-family: 'Courier New', Courier, monospace;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px;">
              <div>
                <span style="font-size: 10pt; font-weight: bold; background: #0f172a; color: #ffffff; padding: 2px 8px; border-radius: 2px;">DOSSIER / SPEC-A4</span>
                ${university ? `<span style="font-size: 10pt; font-weight: bold; margin-left: 10px; color: #0f172a;">${university}</span>` : ""}
              </div>
              ${logo ? `<img src="${logo}" alt="Emblem" style="max-height: 45px; max-width: 130px; object-fit: contain;" />` : ""}
            </div>
            <div style="margin: 20px 0;">
              <p style="font-size: 9pt; color: #64748b; margin: 0 0 6px 0;">DOCUMENT TITLE / TOPIC:</p>
              <h1 style="font-size: 22pt; font-weight: bold; color: #0f172a; margin: 0 0 8px 0; font-family: sans-serif;">${title}</h1>
              ${course ? `<p style="font-size: 11pt; color: #334155; margin: 0;">COURSE: ${courseCode ? courseCode + " — " : ""}${course}</p>` : ""}
            </div>
            <!-- 4-Cell Technical Matrix -->
            <table style="width: 100%; border: 1px solid #0f172a; border-collapse: collapse; margin: 24px 0; font-size: 10pt;">
              <tr>
                <td style="width: 50%; border: 1px solid #0f172a; padding: 12px; vertical-align: top;">
                  <strong style="color: #64748b; font-size: 8.5pt; text-transform: uppercase;">01. Department / Faculty</strong>
                  <div style="font-weight: bold; color: #0f172a; margin-top: 4px;">${department || faculty || "Academic Department"}</div>
                </td>
                <td style="width: 50%; border: 1px solid #0f172a; padding: 12px; vertical-align: top;">
                  <strong style="color: #64748b; font-size: 8.5pt; text-transform: uppercase;">02. Evaluator</strong>
                  <div style="font-weight: bold; color: #0f172a; margin-top: 4px;">${instructor}</div>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #0f172a; padding: 12px; vertical-align: top;">
                  <strong style="color: #64748b; font-size: 8.5pt; text-transform: uppercase;">03. Term / Session</strong>
                  <div style="font-weight: bold; color: #0f172a; margin-top: 4px;">${[academicYear, semester].filter(Boolean).join(" · ") || "Current Academic Term"}</div>
                </td>
                <td style="border: 1px solid #0f172a; padding: 12px; vertical-align: top;">
                  <strong style="color: #64748b; font-size: 8.5pt; text-transform: uppercase;">04. Date of Record</strong>
                  <div style="font-weight: bold; color: #0f172a; margin-top: 4px;">${submissionDate || "Pending Submission"}</div>
                </td>
              </tr>
            </table>
          </div>
          <div>
            ${renderStudentSection("table")}
          </div>
          <div style="font-size: 9pt; color: #64748b; border-top: 1px dotted #94a3b8; padding-top: 10px;">
            <span>DOCUMIND SPEC PROTOCOL · ACADEMIC ASSIGNMENT VERIFICATION</span>
          </div>
        </div>`;

    // -------------------------------------------------------------
    // 10. SIMPLE STUDENT ASSIGNMENT
    // -------------------------------------------------------------
    case "simple-student":
    case "simple-student-assignment":
      return `
        <div data-template-id="simple-student-assignment" style="height: 100%; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <div>
                ${university ? `<h3 style="font-size: 13pt; font-weight: bold; color: #0f172a; margin: 0 0 2px 0;">${university}</h3>` : ""}
                ${faculty ? `<p style="font-size: 9.5pt; color: #64748b; margin: 0;">${faculty}</p>` : ""}
              </div>
              ${logo ? `<img src="${logo}" alt="Logo" style="max-height: 50px; max-width: 140px; object-fit: contain;" />` : ""}
            </div>
            <div style="background-color: #f8fafc; border-left: 4px solid ${accent}; padding: 18px 20px; border-radius: 0 6px 6px 0; margin: 30px 0 20px 0;">
              <h1 style="font-size: 22pt; font-weight: bold; color: #0f172a; margin: 0 0 8px 0; line-height: 1.2;">${title}</h1>
              ${course ? `<p style="font-size: 12pt; color: #334155; margin: 0;">${courseCode ? courseCode + " — " : ""}${course}</p>` : ""}
            </div>
            ${isGroup && safeMeta.groupName?.trim() && safeMeta.groupNamePlacement !== "first-body-page" ? `<div style="background-color: #f1f5f9; border: 1px solid ${accent}; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 10pt; color: ${accent}; margin-top: 10px;">TEAM: ${escapeHtml(safeMeta.groupName.toUpperCase())}</div>` : ""}
          </div>
          <div>
            ${renderStudentSection("cards")}
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
            ${renderEvaluatorAndDates("left")}
          </div>
        </div>`;

    default: {
      const tmpl = getCoverTemplateById(templateId);
      const tmplAccent = safeMeta.accentColor || tmpl.defaultAccent || "#1E3A8A";
      const tmplSecondary = tmpl.secondaryColor || "#475569";
      const tmplFont = tmpl.fontFamily || "Inter, sans-serif";

      // Border style mapping
      let borderCss = "border: 1px solid #e2e8f0; padding: 32px;";
      if (tmpl.borderStyle === "double") {
        borderCss = `border: 3px double ${tmplAccent}; padding: 28px;`;
      } else if (tmpl.borderStyle === "frame") {
        borderCss = `border: 2px solid ${tmplAccent}; border-radius: 6px; padding: 28px;`;
      } else if (tmpl.borderStyle === "accent-bar") {
        borderCss = `border-left: 8px solid ${tmplAccent}; padding: 16px 24px 16px 36px;`;
      } else if (tmpl.borderStyle === "grid") {
        borderCss = `border: 2px solid #cbd5e1; background-image: radial-gradient(#e2e8f0 1px, transparent 1px); background-size: 24px 24px; padding: 28px;`;
      } else if (tmpl.borderStyle === "asymmetric") {
        borderCss = `border: 1px solid #cbd5e1; border-top: 12px solid ${tmplAccent}; padding: 24px 28px;`;
      }

      // Metadata alignment & layout mapping
      const align = tmpl.metadataLayout === "centered" ? "center" : "left";
      const sectionStyle =
        tmpl.metadataLayout === "card-frame"
          ? "cards"
          : tmpl.metadataLayout === "split-two-col"
            ? "table"
            : tmpl.metadataLayout === "left-stacked"
              ? "minimal"
              : "formal";

      return `
        <div data-template-id="${tmpl.id}" style="height: 100%; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; font-family: ${tmplFont}; ${borderCss}">
          <div>
            <div style="display: flex; justify-content: ${tmpl.logoPosition === 'top-center' ? 'center' : 'space-between'}; align-items: center; margin-bottom: 20px; text-align: ${align};">
              <div>
                ${tmpl.tagline ? `<div style="font-size: 8.5pt; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold; color: ${tmplAccent}; margin-bottom: 4px;">${escapeHtml(tmpl.tagline)}</div>` : ""}
                ${university ? `<h2 style="font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin: 0 0 2px 0;">${university}</h2>` : ""}
                ${faculty || department ? `<p style="font-size: 9.5pt; color: ${tmplSecondary}; margin: 0;">${[faculty, department].filter(Boolean).join(" • ")}</p>` : ""}
              </div>
              ${logo && tmpl.logoPosition !== 'top-center' ? `<img src="${logo}" alt="University Emblem" style="max-height: 55px; max-width: 140px; object-fit: contain;" />` : ""}
            </div>
            ${logo && tmpl.logoPosition === 'top-center' ? `<div style="text-align: center; margin-bottom: 16px;"><img src="${logo}" alt="University Emblem" style="max-height: 60px; max-width: 160px; object-fit: contain;" /></div>` : ""}

            <div style="margin: 36px 0 24px 0; text-align: ${align};">
              ${courseCode ? `<span style="display: inline-block; padding: 3px 10px; font-size: 9pt; font-family: monospace; font-weight: bold; text-transform: uppercase; border-radius: 4px; background-color: ${tmplAccent}; color: #ffffff; margin-bottom: 12px;">${courseCode}</span>` : ""}
              <h1 style="font-size: 24pt; font-weight: bold; color: #0f172a; margin: 0 0 10px 0; line-height: 1.25;">${title}</h1>
              ${course ? `<p style="font-size: 12.5pt; color: ${tmplSecondary}; font-weight: 500; margin: 0;">Course: ${course}</p>` : ""}
              ${isGroup && safeMeta.groupName?.trim() && safeMeta.groupNamePlacement !== "first-body-page" ? `<div style="display: inline-block; margin-top: 14px; background-color: #f1f5f9; border: 1.5px solid ${tmplAccent}; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 10.5pt; color: ${tmplAccent};">GROUP: ${escapeHtml(safeMeta.groupName.toUpperCase())}</div>` : ""}
            </div>
          </div>

          <div>
            ${renderStudentSection(sectionStyle)}
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: auto;">
            ${renderEvaluatorAndDates(align)}
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8pt; color: #94a3b8; font-family: monospace; margin-top: 12px; padding-top: 8px; border-top: 1px dotted #cbd5e1;">
              <span>DOCUMIND · TEMPLATE SPEC [${tmpl.id.toUpperCase()}]</span>
              <span>CATEGORY: ${escapeHtml(tmpl.category.toUpperCase())}</span>
            </div>
          </div>
        </div>`;
    }
  }
}
