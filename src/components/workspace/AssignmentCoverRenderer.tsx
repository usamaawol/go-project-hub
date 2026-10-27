/**
 * DocuMind Universal Assignment Cover Page & Slide Renderer
 * Renders all 10 academic cover templates for:
 * 1. Presentation Cover Slide (16:9 widescreen)
 * 2. Document Cover Page (A4 portrait)
 * 3. Gallery Thumbnail Previews
 */

import React from "react";
import type { AssignmentMetadata } from "@/lib/assignment-types";
import { COVER_TEMPLATES, getDefaultAssignmentMetadata } from "@/lib/assignment-types";
import { getCoverTemplateById, generateDefaultCoverElements } from "@/lib/cover-templates-registry";
import { GraduationCap, Users, User, Calendar, BookOpen, Building, Award } from "lucide-react";

interface AssignmentCoverRendererProps {
  metadata?: AssignmentMetadata | null;
  aspectRatio?: "16:9" | "a4" | "thumbnail";
  className?: string;
  isThumbnail?: boolean;
}

export function AssignmentCoverRenderer({
  metadata,
  aspectRatio = "16:9",
  className = "",
  isThumbnail = false,
}: AssignmentCoverRendererProps) {
  const safeMeta = metadata || getDefaultAssignmentMetadata();
  const templateId = safeMeta.coverTemplateId || "classic-university";
  const accent = safeMeta.accentColor || "#1E3A8A";
  const isGroup = safeMeta.assignmentType === "group";

  // Fallbacks for display
  const title =
    safeMeta.assignmentTitle?.trim() ||
    safeMeta.courseName?.trim() ||
    (isGroup ? "Group Assignment Submission" : "Individual Course Assignment");

  const course = safeMeta.courseName?.trim() || "Course Name Not Specified";
  const instructor = safeMeta.instructorName?.trim() || "Instructor Name";
  const university = safeMeta.universityName?.trim() || "";
  const department = safeMeta.department?.trim() || "";
  const faculty = safeMeta.collegeOrFaculty?.trim() || "";
  const courseCode = safeMeta.courseCode?.trim() || "";
  const academicYear = safeMeta.academicYear?.trim() || "";
  const semester = safeMeta.semester?.trim() || "";
  const date = safeMeta.submissionDate?.trim() || "";
  const logo = safeMeta.logoDataUrl;

  const members =
    isGroup && Array.isArray(safeMeta.groupMembers) && safeMeta.groupMembers.length > 0
      ? safeMeta.groupMembers.filter((m) => m && (m.fullName?.trim() || m.studentId?.trim()))
      : [];

  const studentName = safeMeta.studentName?.trim() || (isGroup ? "Group Project" : "Student Name");
  const studentId = safeMeta.studentId?.trim() || (isGroup ? "" : "Student ID");

  // Container styling depending on aspect ratio
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    boxSizing: "border-box",
  };

  // Base font sizing helper based on thumbnail vs presentation vs document
  const scale = isThumbnail ? 0.38 : aspectRatio === "16:9" ? 0.95 : 1.0;

  // Priority 1: If custom cover elements exist OR if it's a Canva template archetype
  const hasCustomElements = Boolean(safeMeta.customCoverElements && safeMeta.customCoverElements.length > 0);
  const isCanvaTemplate = templateId.startsWith("canva-");

  if (hasCustomElements || isCanvaTemplate) {
    const rawElements = hasCustomElements
      ? safeMeta.customCoverElements!
      : generateDefaultCoverElements(getCoverTemplateById(templateId), safeMeta);

    const sorted = [...rawElements].sort((a, b) => a.zIndex - b.zIndex);

    return (
      <div
        className={`bg-white text-slate-900 select-none ${className}`}
        style={{ ...containerStyle, position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
      >
        {sorted.map((el) => {
          const leftPct = (el.x / 794) * 100;
          const topPct = (el.y / 1123) * 100;
          const widthPct = (el.width / 794) * 100;
          const heightPct = (el.height / 1123) * 100;

          return (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                zIndex: el.zIndex,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              {el.type === "text" && (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    fontFamily: el.fontFamily,
                    fontSize: `${(el.fontSize || 14) * scale}px`,
                    fontWeight: el.fontWeight || "normal",
                    fontStyle: el.fontStyle || "normal",
                    textAlign: el.textAlign || "left",
                    color: el.textColor || "#0F172A",
                    textTransform: el.textTransform || "none",
                    letterSpacing: el.letterSpacing ? `${el.letterSpacing * scale}px` : undefined,
                    lineHeight: el.lineHeight || 1.25,
                    backgroundColor: el.fillColor || "transparent",
                    borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                    padding: el.fillColor ? "2px 6px" : undefined,
                    boxSizing: "border-box",
                    wordBreak: "break-word",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      el.textAlign === "center"
                        ? "center"
                        : el.textAlign === "right"
                          ? "flex-end"
                          : "flex-start",
                    whiteSpace: "pre-line",
                  }}
                >
                  {el.text}
                </div>
              )}

              {el.type === "shape" && (
                el.svgContent ? (
                  <div
                    style={{ width: "100%", height: "100%", opacity: el.opacity ?? 1 }}
                    dangerouslySetInnerHTML={{ __html: el.svgContent }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: el.fillColor || "transparent",
                      borderColor: el.borderColor || "transparent",
                      borderWidth: el.borderWidth ? `${el.borderWidth}px` : 0,
                      borderStyle: el.borderWidth ? "solid" : "none",
                      borderRadius:
                        el.shapeType === "circle"
                          ? "50%"
                          : el.borderRadius
                            ? `${el.borderRadius}px`
                            : 0,
                      opacity: el.opacity ?? 1,
                    }}
                  />
                )
              )}

              {el.type === "divider" && (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: el.fillColor || "#CBD5E1",
                  }}
                />
              )}

              {el.type === "image" && el.imageUrl && (
                <img
                  src={el.imageUrl}
                  alt={el.name || "Cover Image"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: el.imageFit || "contain",
                    opacity: el.opacity ?? 1,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Render individual template layouts
  switch (templateId) {
    // -------------------------------------------------------------
    // 1. CLASSIC UNIVERSITY (Traditional Academic Heritage)
    // -------------------------------------------------------------
    case "classic-university":
      return (
        <div
          className={`bg-white text-slate-900 flex flex-col justify-between p-6 sm:p-10 select-none ${className}`}
          style={{ ...containerStyle, fontFamily: "Georgia, 'Playfair Display', serif" }}
        >
          {/* Ornate Frame Border */}
          <div
            className="absolute inset-3 border-2 pointer-events-none"
            style={{ borderColor: accent }}
          >
            <div
              className="absolute inset-1 border pointer-events-none"
              style={{ borderColor: accent, opacity: 0.4 }}
            />
          </div>

          {/* Header */}
          <div className="relative z-10 text-center pt-2">
            {logo ? (
              <div className="flex justify-center mb-2">
                <img
                  src={logo}
                  alt="University Crest"
                  className="max-h-12 sm:max-h-16 object-contain"
                />
              </div>
            ) : university ? (
              <div className="inline-flex items-center gap-1.5 justify-center mb-1 text-xs font-serif uppercase tracking-widest text-slate-600">
                <GraduationCap className="h-4 w-4" style={{ color: accent }} />
                <span>{university}</span>
              </div>
            ) : null}

            {university && logo && (
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-widest text-slate-800">
                {university}
              </h2>
            )}

            {(faculty || department) && (
              <p className="text-[10px] sm:text-xs text-slate-600 tracking-wide mt-0.5">
                {[faculty, department].filter(Boolean).join(" • ")}
              </p>
            )}

            <div className="w-16 h-0.5 mx-auto mt-2" style={{ backgroundColor: accent }} />
          </div>

          {/* Title Hero */}
          <div className="relative z-10 text-center my-auto py-2">
            {courseCode && (
              <span
                className="inline-block px-2.5 py-0.5 rounded text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-wider mb-2 text-white"
                style={{ backgroundColor: accent }}
              >
                {courseCode}
              </span>
            )}
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight max-w-2xl mx-auto">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 italic mt-1 font-serif">
              Course: <span className="font-semibold">{course}</span>
            </p>
          </div>

          {/* Footer Metadata Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-[11px] sm:text-xs">
            {/* Student or Group Block */}
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500 mb-1">
                {isGroup ? "Group Members:" : "Submitted By:"}
              </p>
              {isGroup && members.length > 0 ? (
                <ul className="space-y-0.5 text-slate-800">
                  {members.slice(0, 4).map((m, i) => (
                    <li key={i} className="flex justify-between text-[10px] sm:text-xs">
                      <span className="font-medium">{m.fullName || `Member ${i + 1}`}</span>
                      <span className="font-mono text-slate-500">{m.studentId}</span>
                    </li>
                  ))}
                  {members.length > 4 && (
                    <li className="text-[9px] text-slate-500 italic">
                      + {members.length - 4} more members
                    </li>
                  )}
                </ul>
              ) : (
                <div className="text-slate-800">
                  <p className="font-semibold text-xs sm:text-sm">{studentName}</p>
                  {studentId && <p className="font-mono text-slate-600 text-[11px]">ID: {studentId}</p>}
                </div>
              )}
            </div>

            {/* Instructor & Date Block */}
            <div className="text-right">
              <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500 mb-1">
                Submitted To:
              </p>
              <p className="font-semibold text-slate-800 text-xs sm:text-sm">{instructor}</p>
              <div className="mt-1 space-y-0.5 text-[10px] text-slate-600 font-sans">
                {academicYear && <p>Academic Year: {academicYear}</p>}
                {semester && <p>Semester: {semester}</p>}
                {date && <p>Date: {date}</p>}
              </div>
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------
    // 2. MODERN MINIMAL (Contemporary Clean Sans)
    // -------------------------------------------------------------
    case "modern-minimal":
      return (
        <div
          className={`bg-slate-50 text-slate-900 flex flex-col justify-between p-6 sm:p-10 select-none ${className}`}
          style={{ ...containerStyle, fontFamily: "Inter, sans-serif" }}
        >
          {/* Sleek Left Vertical Accent Bar */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2.5 sm:w-3.5"
            style={{ backgroundColor: accent }}
          />

          {/* Top Row: Logo & Course Tag */}
          <div className="pl-3 sm:pl-4 flex items-center justify-between">
            {logo ? (
              <img src={logo} alt="Logo" className="max-h-10 sm:max-h-12 object-contain" />
            ) : university ? (
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                {university}
              </span>
            ) : (
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">
                Assignment
              </span>
            )}

            <div className="flex items-center gap-2">
              {courseCode && (
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-mono font-bold bg-white border border-slate-200 rounded text-slate-700">
                  {courseCode}
                </span>
              )}
              {date && <span className="text-[10px] sm:text-xs text-slate-500 font-mono">{date}</span>}
            </div>
          </div>

          {/* Hero Section */}
          <div className="pl-3 sm:pl-4 my-auto py-4">
            <span
              className="text-[11px] sm:text-xs font-bold uppercase tracking-widest block mb-1"
              style={{ color: accent }}
            >
              {course}
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>
            {(department || faculty) && (
              <p className="text-xs text-slate-500 mt-2">
                {[department, faculty, university].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {/* Bottom Clean Cards */}
          <div className="pl-3 sm:pl-4 grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                {isGroup ? "Group Submission" : "Student"}
              </span>
              {isGroup && members.length > 0 ? (
                <div className="space-y-0.5">
                  {members.slice(0, 3).map((m, i) => (
                    <p key={i} className="text-xs font-semibold text-slate-800 flex justify-between">
                      <span>{m.fullName || `Member ${i + 1}`}</span>
                      <span className="font-mono text-slate-500 text-[10px]">{m.studentId}</span>
                    </p>
                  ))}
                  {members.length > 3 && (
                    <span className="text-[9px] text-slate-500">+{members.length - 3} more</span>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">{studentName}</p>
                  {studentId && (
                    <p className="text-[10px] sm:text-xs font-mono text-slate-500">{studentId}</p>
                  )}
                </>
              )}
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                Faculty Evaluator
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800">{instructor}</p>
              {(academicYear || semester) && (
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {[academicYear, semester].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------
    // 3. FORMAL ACADEMIC (Double-Ruled Border & Institutional Grid)
    // -------------------------------------------------------------
    case "formal-academic":
      return (
        <div
          className={`bg-white text-slate-900 flex flex-col justify-between p-6 sm:p-9 select-none ${className}`}
          style={{ ...containerStyle, fontFamily: "Merriweather, Georgia, serif" }}
        >
          {/* Double Ruled Outer Border */}
          <div className="absolute inset-2.5 border-[3px] border-slate-900 pointer-events-none">
            <div className="absolute inset-1 border border-slate-900 pointer-events-none" />
          </div>

          {/* Institutional Top Header */}
          <div className="relative z-10 text-center pt-2">
            {logo && (
              <div className="flex justify-center mb-1.5">
                <img src={logo} alt="Crest" className="max-h-12 object-contain" />
              </div>
            )}
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-900">
              {university || "INSTITUTIONAL FACULTY BOARD"}
            </h2>
            {(faculty || department) && (
              <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 font-sans">
                {[faculty, department].filter(Boolean).join(" — ")}
              </p>
            )}
            <div className="w-24 h-[1px] bg-slate-900 mx-auto my-2" />
          </div>

          {/* Central Topic */}
          <div className="relative z-10 text-center my-auto py-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block mb-1">
              Academic Term Assignment
            </span>
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {title}
            </h1>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded text-xs font-mono font-semibold text-slate-800">
              <span>{course}</span>
              {courseCode && <span>[{courseCode}]</span>}
            </div>
          </div>

          {/* Formal Split Grid Box */}
          <div className="relative z-10 grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-300 text-xs">
            <div>
              <p className="font-sans font-bold uppercase text-[9px] text-slate-500 tracking-wider mb-1">
                {isGroup ? "Candidate Group:" : "Candidate Information:"}
              </p>
              {isGroup && members.length > 0 ? (
                <div className="space-y-0.5">
                  {members.slice(0, 4).map((m, i) => (
                    <div key={i} className="flex justify-between text-[10px] font-sans">
                      <span className="font-semibold text-slate-800">{m.fullName || `Member ${i + 1}`}</span>
                      <span className="font-mono text-slate-600">{m.studentId}</span>
                    </div>
                  ))}
                  {members.length > 4 && (
                    <span className="text-[9px] text-slate-500 italic">
                      + {members.length - 4} more students
                    </span>
                  )}
                </div>
              ) : (
                <div className="font-sans">
                  <p className="font-bold text-slate-900">{studentName}</p>
                  {studentId && <p className="font-mono text-slate-600 text-[11px]">ID: {studentId}</p>}
                </div>
              )}
            </div>

            <div className="border-l border-slate-300 pl-3">
              <p className="font-sans font-bold uppercase text-[9px] text-slate-500 tracking-wider mb-1">
                Faculty Evaluator:
              </p>
              <p className="font-bold text-slate-900 font-sans">{instructor}</p>
              <div className="mt-1 space-y-0.5 text-[10px] text-slate-600 font-sans">
                {academicYear && <p>Academic Session: {academicYear}</p>}
                {semester && <p>Semester: {semester}</p>}
                {date && <p>Submission Date: {date}</p>}
              </div>
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------
    // 4. ELEGANT BLUE (Refined Royal Framing)
    // -------------------------------------------------------------
    case "elegant-blue":
      return (
        <div
          className={`bg-slate-900 text-white flex flex-col justify-between p-6 sm:p-10 select-none ${className}`}
          style={{ ...containerStyle, fontFamily: "Montserrat, sans-serif" }}
        >
          {/* Subtle Ambient Background Gradient */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background: `radial-gradient(circle at top right, ${accent}, transparent 65%)`,
            }}
          />

          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              {logo ? (
                <img src={logo} alt="Logo" className="max-h-10 object-contain" />
              ) : (
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: accent }}
                >
                  <Award className="h-4 w-4 text-white" />
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white">
                  {university || "Academic Presentation"}
                </p>
                {(faculty || department) && (
                  <p className="text-[10px] text-slate-400">
                    {[faculty, department].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>

            {courseCode && (
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wide"
                style={{ backgroundColor: `${accent}33`, color: "#93C5FD", border: `1px solid ${accent}66` }}
              >
                {courseCode}
              </span>
            )}
          </div>

          {/* Central Title Card */}
          <div className="relative z-10 my-auto py-4">
            <span
              className="text-[11px] font-mono font-bold uppercase tracking-widest block mb-1 text-blue-400"
            >
              {course}
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {title}
            </h1>
          </div>

          {/* Bottom Card Frame */}
          <div className="relative z-10 grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-xs">
            <div>
              <p className="text-[10px] font-mono uppercase text-blue-300 mb-1">
                {isGroup ? "Group Contributors" : "Student Candidate"}
              </p>
              {isGroup && members.length > 0 ? (
                <div className="space-y-0.5">
                  {members.slice(0, 3).map((m, i) => (
                    <p key={i} className="text-xs text-slate-200 flex justify-between">
                      <span className="font-medium">{m.fullName || `Member ${i + 1}`}</span>
                      <span className="font-mono text-slate-400 text-[10px]">{m.studentId}</span>
                    </p>
                  ))}
                  {members.length > 3 && (
                    <span className="text-[9px] text-slate-400">+{members.length - 3} more</span>
                  )}
                </div>
              ) : (
                <>
                  <p className="font-bold text-white text-xs sm:text-sm">{studentName}</p>
                  {studentId && <p className="font-mono text-slate-400 text-[11px]">ID: {studentId}</p>}
                </>
              )}
            </div>

            <div className="text-right">
              <p className="text-[10px] font-mono uppercase text-blue-300 mb-1">Evaluated By</p>
              <p className="font-bold text-white text-xs sm:text-sm">{instructor}</p>
              <div className="mt-1 text-[10px] text-slate-400 font-mono space-y-0.5">
                {academicYear && <p>{academicYear}</p>}
                {date && <p>{date}</p>}
              </div>
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------
    // 5. PROFESSIONAL NAVY (Executive Banner & Corporate Academic)
    // -------------------------------------------------------------
    case "professional-navy":
      return (
        <div
          className={`bg-white text-slate-900 flex flex-col justify-between select-none ${className}`}
          style={{ ...containerStyle, fontFamily: "Calibri, system-ui, sans-serif" }}
        >
          {/* Top Navy Banner */}
          <div className="bg-slate-900 text-white p-5 sm:p-7 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logo && <img src={logo} alt="Logo" className="max-h-11 object-contain" />}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  {university || "Faculty Board of Study"}
                </h2>
                <p className="text-[10px] text-slate-400">
                  {[faculty, department].filter(Boolean).join(" | ") || "Official Academic Paper"}
                </p>
              </div>
            </div>
            {courseCode && (
              <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-xs font-bold text-slate-200">
                {courseCode}
              </span>
            )}
          </div>

          {/* Body Section */}
          <div className="p-6 sm:p-8 my-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Course Assignment: {course}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {title}
            </h1>
          </div>

          {/* Bottom Grid */}
          <div className="p-5 sm:p-7 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                {isGroup ? "Student Group" : "Student Name"}
              </p>
              {isGroup && members.length > 0 ? (
                <div className="space-y-0.5">
                  {members.slice(0, 3).map((m, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{m.fullName || `Member ${i + 1}`}</span>
                      <span className="font-mono text-slate-500">{m.studentId}</span>
                    </div>
                  ))}
                  {members.length > 3 && (
                    <span className="text-[9px] text-slate-500">+{members.length - 3} more</span>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-bold text-slate-900 text-sm">{studentName}</p>
                  {studentId && <p className="font-mono text-slate-600 text-xs">ID: {studentId}</p>}
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Submitted To
              </p>
              <p className="font-bold text-slate-900 text-sm">{instructor}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {[academicYear, semester, date].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------
    // 6. CLEAN BLACK AND WHITE (High Contrast Monochrome)
    // -------------------------------------------------------------
    case "clean-black-white":
      return (
        <div
          className={`bg-white text-black flex flex-col justify-between p-6 sm:p-10 select-none ${className}`}
          style={{ ...containerStyle, fontFamily: "Inter, Helvetica, sans-serif" }}
        >
          {/* Top Monochrome Rule */}
          <div className="border-b-2 border-black pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {logo && <img src={logo} alt="Logo" className="max-h-10 grayscale object-contain" />}
              <span className="text-xs font-mono font-bold uppercase tracking-widest">
                {university || "ACADEMIC ASSIGNMENT"}
              </span>
            </div>
            {courseCode && (
              <span className="font-mono text-xs font-bold border border-black px-2 py-0.5">
                {courseCode}
              </span>
            )}
          </div>

          {/* Title Hero */}
          <div className="my-auto py-4">
            <span className="text-[11px] font-mono uppercase tracking-wider block mb-1 text-slate-600">
              {course}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-black leading-none">
              {title}
            </h1>
            {(department || faculty) && (
              <p className="text-xs font-mono text-slate-600 mt-2">
                {[department, faculty].filter(Boolean).join(" / ")}
              </p>
            )}
          </div>

          {/* Bottom Dual Block */}
          <div className="border-t-2 border-black pt-3 grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <p className="font-bold uppercase text-[10px] text-slate-500 mb-1">
                {isGroup ? "[GROUP MEMBERS]" : "[STUDENT]"}
              </p>
              {isGroup && members.length > 0 ? (
                <div className="space-y-0.5">
                  {members.slice(0, 3).map((m, i) => (
                    <p key={i} className="text-xs flex justify-between">
                      <span className="font-bold">{m.fullName || `Member ${i + 1}`}</span>
                      <span>{m.studentId}</span>
                    </p>
                  ))}
                  {members.length > 3 && (
                    <span className="text-[9px] text-slate-500">+{members.length - 3} more</span>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-bold text-sm text-black">{studentName}</p>
                  {studentId && <p className="text-xs text-slate-600">ID: {studentId}</p>}
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="font-bold uppercase text-[10px] text-slate-500 mb-1">
                [INSTRUCTOR]
              </p>
              <p className="font-bold text-sm text-black">{instructor}</p>
              <div className="text-[10px] text-slate-600 mt-1">
                {date && <p>DATE: {date}</p>}
                {academicYear && <p>YEAR: {academicYear}</p>}
              </div>
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------
    // 7. CONTEMPORARY EDITORIAL (Journal & Magazine Layout)
    // -------------------------------------------------------------
    case "contemporary-editorial":
      return (
        <div
          className={`bg-[#FAFAF9] text-stone-900 flex flex-col justify-between p-6 sm:p-10 select-none ${className}`}
          style={{ ...containerStyle, fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {/* Top Journal Demarcation */}
          <div className="flex items-center justify-between border-b border-stone-300 pb-2.5">
            <div className="flex items-center gap-2">
              {logo && <img src={logo} alt="Logo" className="max-h-10 object-contain" />}
              <span className="text-xs font-serif font-bold italic tracking-wide text-stone-700">
                {university || "Academic Paper Series"}
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
              {[semester, academicYear].filter(Boolean).join(" · ") || "Submission"}
            </span>
          </div>

          {/* Large Title & Abstract Style */}
          <div className="my-auto py-3">
            <span
              className="text-[11px] font-sans font-bold uppercase tracking-widest block mb-1"
              style={{ color: accent }}
            >
              {course} {courseCode ? `(${courseCode})` : ""}
            </span>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-stone-900 leading-tight">
              {title}
            </h1>
            {(department || faculty) && (
              <p className="text-xs font-sans text-stone-500 mt-2">
                {[department, faculty].filter(Boolean).join(" • ")}
              </p>
            )}
          </div>

          {/* Footer Metadata Split */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-stone-300 font-sans text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                {isGroup ? "Authors (Group)" : "Author"}
              </p>
              {isGroup && members.length > 0 ? (
                <div className="space-y-0.5">
                  {members.slice(0, 3).map((m, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="font-semibold text-stone-800">{m.fullName || `Member ${i + 1}`}</span>
                      <span className="font-mono text-stone-500">{m.studentId}</span>
                    </div>
                  ))}
                  {members.length > 3 && (
                    <span className="text-[9px] text-stone-500">+{members.length - 3} more</span>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-bold text-stone-900 text-sm font-serif">{studentName}</p>
                  {studentId && <p className="font-mono text-stone-500 text-xs">ID: {studentId}</p>}
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Supervisor / Instructor
              </p>
              <p className="font-bold text-stone-900 text-sm font-serif">{instructor}</p>
              {date && <p className="text-[10px] text-stone-500 font-mono mt-1">{date}</p>}
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------
    // 8. UNIVERSITY BRANDING (Hero Emblem & Official Crest)
    // -------------------------------------------------------------
    case "university-branding":
      return (
        <div
          className={`bg-white text-slate-900 flex flex-col justify-between p-6 sm:p-9 select-none ${className}`}
          style={{ ...containerStyle, fontFamily: "Merriweather, serif" }}
        >
          {/* Top Hero Crest Section */}
          <div className="text-center pt-2">
            <div className="flex justify-center mb-2">
              {logo ? (
                <img src={logo} alt="Emblem" className="max-h-16 object-contain" />
              ) : (
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center text-white mx-auto shadow-sm"
                  style={{ backgroundColor: accent }}
                >
                  <Building className="h-7 w-7 text-white" />
                </div>
              )}
            </div>

            <h2 className="text-sm sm:text-base font-bold uppercase tracking-widest text-slate-900">
              {university || "STATE UNIVERSITY OF HIGHER LEARNING"}
            </h2>
            {(faculty || department) && (
              <p className="text-[10px] sm:text-xs text-slate-600 font-sans mt-0.5">
                {[faculty, department].filter(Boolean).join(" · ")}
              </p>
            )}

            <div className="inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: accent }}
            >
              Official Submission
            </div>
          </div>

          {/* Central Title */}
          <div className="text-center my-auto py-2">
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm font-sans font-medium text-slate-600 mt-1">
              Course: <span className="font-semibold">{course}</span> {courseCode ? `(${courseCode})` : ""}
            </p>
          </div>

          {/* Bottom Card */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 grid grid-cols-2 gap-3 text-xs font-sans">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                {isGroup ? "Group Candidates:" : "Submitted by Candidate:"}
              </p>
              {isGroup && members.length > 0 ? (
                <div className="space-y-0.5">
                  {members.slice(0, 3).map((m, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{m.fullName || `Member ${i + 1}`}</span>
                      <span className="font-mono text-slate-500">{m.studentId}</span>
                    </div>
                  ))}
                  {members.length > 3 && (
                    <span className="text-[9px] text-slate-500">+{members.length - 3} more</span>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-bold text-slate-900 text-sm">{studentName}</p>
                  {studentId && <p className="font-mono text-slate-600 text-xs">ID: {studentId}</p>}
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                Submitted To:
              </p>
              <p className="font-bold text-slate-900 text-sm">{instructor}</p>
              <div className="mt-1 text-[10px] text-slate-600 font-mono">
                {date && <p>Date: {date}</p>}
                {academicYear && <p>Year: {academicYear}</p>}
              </div>
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------
    // 9. STRUCTURED RESEARCH (Matrix & Box Grid)
    // -------------------------------------------------------------
    case "structured-research":
      return (
        <div
          className={`bg-slate-50 text-slate-900 flex flex-col justify-between p-6 sm:p-9 select-none ${className}`}
          style={{ ...containerStyle, fontFamily: "Roboto, system-ui, sans-serif" }}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-300 pb-2.5">
            <div className="flex items-center gap-2">
              {logo && <img src={logo} alt="Logo" className="max-h-10 object-contain" />}
              <div>
                <span className="font-bold text-xs uppercase tracking-wide text-slate-900">
                  {university || "TECHNICAL & SCIENTIFIC RESEARCH"}
                </span>
                {(faculty || department) && (
                  <p className="text-[10px] text-slate-500">
                    {[faculty, department].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            {courseCode && (
              <span
                className="px-2.5 py-1 rounded font-mono text-xs font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {courseCode}
              </span>
            )}
          </div>

          {/* Research Title */}
          <div className="my-auto py-2">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
              Subject: {course}
            </span>
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {title}
            </h1>
          </div>

          {/* 4-Box Technical Matrix Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded border border-slate-300">
              <span className="text-[9px] font-mono uppercase text-slate-400 block mb-0.5">
                {isGroup ? "Group Register" : "Student Register"}
              </span>
              {isGroup && members.length > 0 ? (
                <div className="space-y-0.5">
                  {members.slice(0, 2).map((m, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{m.fullName || `Member ${i + 1}`}</span>
                      <span className="font-mono text-slate-500 text-[10px]">{m.studentId}</span>
                    </div>
                  ))}
                  {members.length > 2 && (
                    <span className="text-[9px] text-slate-500">+{members.length - 2} more</span>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-bold text-slate-800 text-xs sm:text-sm">{studentName}</p>
                  {studentId && <p className="font-mono text-slate-500 text-[11px]">ID: {studentId}</p>}
                </div>
              )}
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-300">
              <span className="text-[9px] font-mono uppercase text-slate-400 block mb-0.5">
                Faculty Instructor
              </span>
              <p className="font-bold text-slate-800 text-xs sm:text-sm">{instructor}</p>
              {department && <p className="text-[10px] text-slate-500">{department}</p>}
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-300">
              <span className="text-[9px] font-mono uppercase text-slate-400 block mb-0.5">
                Academic Session
              </span>
              <p className="font-bold text-slate-800 text-xs">{academicYear || "Current Year"}</p>
              {semester && <p className="text-[10px] text-slate-500">{semester}</p>}
            </div>

            <div className="bg-white p-2.5 rounded border border-slate-300">
              <span className="text-[9px] font-mono uppercase text-slate-400 block mb-0.5">
                Submission Timestamp
              </span>
              <p className="font-bold text-slate-800 text-xs">{date || "Upon Due Date"}</p>
              <p className="text-[10px] text-slate-500 font-mono">Format: Verified</p>
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------
    // 10. SIMPLE STUDENT ASSIGNMENT (Approachable & Lightweight)
    // -------------------------------------------------------------
    case "simple-student-assignment":
    case "simple-student":
      return (
        <div
          className={`bg-white text-slate-900 flex flex-col justify-between p-6 sm:p-9 select-none ${className}`}
          style={{ ...containerStyle, fontFamily: "Inter, sans-serif" }}
        >
          {/* Top simple header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              {logo ? (
                <img src={logo} alt="Logo" className="max-h-10 object-contain" />
              ) : (
                <div
                  className="h-8 w-8 rounded flex items-center justify-center font-bold text-white text-xs"
                  style={{ backgroundColor: accent }}
                >
                  <BookOpen className="h-4 w-4" />
                </div>
              )}
              <span className="text-xs font-semibold text-slate-700">
                {university || "Course Assignment"}
              </span>
            </div>
            {courseCode && (
              <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-100 rounded text-slate-700">
                {courseCode}
              </span>
            )}
          </div>

          {/* Central Title Card */}
          <div className="my-auto py-3 text-center">
            <span
              className="text-xs font-bold uppercase tracking-wider block mb-1"
              style={{ color: accent }}
            >
              {course}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {title}
            </h1>
          </div>

          {/* Simple Info Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                {isGroup ? "Group Members" : "Student Details"}
              </p>
              {isGroup && members.length > 0 ? (
                <div className="space-y-0.5">
                  {members.slice(0, 3).map((m, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{m.fullName || `Member ${i + 1}`}</span>
                      <span className="font-mono text-slate-500">{m.studentId}</span>
                    </div>
                  ))}
                  {members.length > 3 && (
                    <span className="text-[9px] text-slate-500">+{members.length - 3} more</span>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-bold text-slate-900 text-sm">{studentName}</p>
                  {studentId && <p className="font-mono text-slate-500 text-xs">ID: {studentId}</p>}
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Submitted To</p>
              <p className="font-bold text-slate-900 text-sm">{instructor}</p>
              <div className="mt-1 text-[10px] text-slate-500 font-mono">
                {date && <p>Date: {date}</p>}
                {academicYear && <p>Year: {academicYear}</p>}
              </div>
            </div>
          </div>
        </div>
      );

    default: {
      const tmpl = getCoverTemplateById(templateId);
      const tmplAccent = safeMeta.accentColor || tmpl.defaultAccent || "#1E3A8A";
      const isSerif = tmpl.fontFamily.toLowerCase().includes("serif") || tmpl.fontFamily.toLowerCase().includes("playfair");
      const isCentered = tmpl.metadataLayout === "centered";

      return (
        <div
          className={`bg-white text-slate-900 flex flex-col justify-between p-6 sm:p-8 select-none ${className}`}
          style={{
            ...containerStyle,
            fontFamily: tmpl.fontFamily,
            borderLeft: tmpl.borderStyle === "accent-bar" ? `6px solid ${tmplAccent}` : undefined,
            borderTop: tmpl.borderStyle === "asymmetric" ? `8px solid ${tmplAccent}` : undefined,
          }}
        >
          {tmpl.borderStyle === "double" && (
            <div
              className="absolute inset-2.5 border-2 pointer-events-none"
              style={{ borderColor: tmplAccent }}
            >
              <div
                className="absolute inset-1 border pointer-events-none"
                style={{ borderColor: tmplAccent, opacity: 0.4 }}
              />
            </div>
          )}

          {tmpl.borderStyle === "frame" && (
            <div
              className="absolute inset-3 border-2 rounded-md pointer-events-none"
              style={{ borderColor: tmplAccent }}
            />
          )}

          {/* Header */}
          <div className={`relative z-10 ${isCentered ? "text-center" : "text-left"}`}>
            <div className={`flex items-center gap-2 ${isCentered ? "justify-center" : "justify-between"}`}>
              <div>
                {tmpl.tagline && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest block mb-0.5"
                    style={{ color: tmplAccent }}
                  >
                    {tmpl.tagline}
                  </span>
                )}
                {university && (
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                    {university}
                  </h3>
                )}
                {(faculty || department) && (
                  <p className="text-[10px] text-slate-500">
                    {[faculty, department].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {logo && (
                <img
                  src={logo}
                  alt="Logo"
                  className="max-h-8 sm:max-h-11 max-w-[100px] object-contain shrink-0"
                />
              )}
            </div>
            <div
              className={`h-0.5 mt-2 ${isCentered ? "mx-auto w-16" : "w-16"}`}
              style={{ backgroundColor: tmplAccent }}
            />
          </div>

          {/* Center Title Hero */}
          <div className={`relative z-10 my-auto py-3 ${isCentered ? "text-center" : "text-left"}`}>
            {courseCode && (
              <span
                className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide text-white mb-1.5"
                style={{ backgroundColor: tmplAccent }}
              >
                {courseCode}
              </span>
            )}
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug"
              style={{ fontFamily: isSerif ? "Georgia, serif" : undefined }}
            >
              {title}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Course: <span className="font-semibold">{course}</span>
            </p>
            {isGroup && safeMeta.groupName?.trim() && safeMeta.groupNamePlacement !== "first-body-page" && (
              <div
                className={`mt-2 inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border`}
                style={{ borderColor: tmplAccent, color: tmplAccent, backgroundColor: `${tmplAccent}10` }}
              >
                Team: {safeMeta.groupName}
              </div>
            )}
          </div>

          {/* Footer Credentials */}
          <div className="relative z-10 grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs">
            <div>
              <p
                className="font-bold uppercase tracking-wider text-[9.5px] mb-1"
                style={{ color: tmplAccent }}
              >
                {isGroup ? "Group Members" : "Submitted By"}
              </p>
              {isGroup && members.length > 0 ? (
                <div className="space-y-0.5">
                  {members.slice(0, 3).map((m, i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="font-medium text-slate-800">{m.fullName || `Member ${i + 1}`}</span>
                      <span className="font-mono text-slate-500 text-[10px]">{m.studentId}</span>
                    </div>
                  ))}
                  {members.length > 3 && (
                    <span className="text-[9px] text-slate-400">+{members.length - 3} more</span>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-bold text-slate-800 text-xs">{studentName}</p>
                  {studentId && <p className="font-mono text-slate-500 text-[10px]">ID: {studentId}</p>}
                </div>
              )}
            </div>

            <div className="text-right">
              <p
                className="font-bold uppercase tracking-wider text-[9.5px] mb-1"
                style={{ color: tmplAccent }}
              >
                Submitted To
              </p>
              <p className="font-semibold text-slate-800 text-xs">{instructor}</p>
              <div className="mt-1 text-[10px] text-slate-500 font-mono">
                {date && <p>Date: {date}</p>}
                {academicYear && <p>{academicYear}</p>}
              </div>
            </div>
          </div>
        </div>
      );
    }
  }
}
