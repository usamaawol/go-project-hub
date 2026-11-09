/**
 * DocuMind Academic Assignment Information Form
 * Supports Individual & Group modes, logo upload, field validation,
 * repeatable group members, and non-intrusive extracted metadata suggestions.
 */

import React, { useState, useRef } from "react";
import type { AssignmentMetadata, AssignmentType, StudentMember } from "@/lib/assignment-types";
import type { ExtractedAssignmentSuggestions } from "@/lib/assignment-metadata-extractor";
import { Button } from "@/components/ui/button";
import {
  User,
  Users,
  Upload,
  X,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Building,
  GraduationCap,
  Calendar,
  BookOpen,
  FileText,
  AlertCircle,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Sliders,
  Palette,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

interface AssignmentInformationFormProps {
  metadata: AssignmentMetadata;
  onChange: (updated: AssignmentMetadata) => void;
  extractedSuggestions?: ExtractedAssignmentSuggestions | null;
  onApplySuggestions?: (s: ExtractedAssignmentSuggestions) => void;
  onDismissSuggestions?: () => void;
  onOpenCanvasEditor?: () => void;
}

const MAX_LOGO_SIZE_MB = 5;

export function AssignmentInformationForm({
  metadata,
  onChange,
  extractedSuggestions,
  onApplySuggestions,
  onDismissSuggestions,
  onOpenCanvasEditor,
}: AssignmentInformationFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const safeMetadata = metadata || {
    isAssignment: true,
    assignmentType: "individual" as const,
    studentName: "",
    studentId: "",
    groupMembers: [
      { id: "member-1", fullName: "", studentId: "" },
      { id: "member-2", fullName: "", studentId: "" },
    ],
    courseName: "",
    instructorName: "",
    coverTemplateId: "classic-university",
  };

  const isGroup = safeMetadata.assignmentType === "group";
  const groupMembers = safeMetadata.groupMembers || [];

  // Mode Switch
  const handleTypeChange = (newType: AssignmentType) => {
    onChange({
      ...safeMetadata,
      assignmentType: newType,
    });
  };

  // Field change helper
  const updateField = (key: keyof AssignmentMetadata, value: any) => {
    onChange({
      ...safeMetadata,
      [key]: value,
    });
  };

  // Group Members helpers
  const handleAddMember = () => {
    const newId = `member-${Date.now()}-${groupMembers.length + 1}`;
    const updated = [...groupMembers, { id: newId, fullName: "", studentId: "" }];
    updateField("groupMembers", updated);
  };

  const handleUpdateMember = (index: number, key: keyof StudentMember, val: string) => {
    const updated = groupMembers.map((m, i) => (i === index ? { ...m, [key]: val } : m));
    updateField("groupMembers", updated);
  };

  const handleRemoveMember = (index: number) => {
    if (groupMembers.length <= 1) {
      toast.error("At least one group member is required for group assignments.");
      return;
    }
    const updated = groupMembers.filter((_, i) => i !== index);
    updateField("groupMembers", updated);
  };

  const handleMoveMemberUp = (index: number) => {
    if (index === 0) return;
    const updated = [...groupMembers];
    const temp = updated[index - 1]!;
    updated[index - 1] = updated[index]!;
    updated[index] = temp;
    updateField("groupMembers", updated);
  };

  const handleMoveMemberDown = (index: number) => {
    if (index >= groupMembers.length - 1) return;
    const updated = [...groupMembers];
    const temp = updated[index + 1]!;
    updated[index + 1] = updated[index]!;
    updated[index] = temp;
    updateField("groupMembers", updated);
  };

  // Logo Upload handler
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError(null);

    // Validate type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setLogoError("Please upload a PNG, JPG, or WebP university logo image.");
      return;
    }

    // Validate size (max 5MB)
    if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
      setLogoError(`Logo image must be smaller than ${MAX_LOGO_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateField("logoDataUrl", dataUrl);
      updateField("logoFileName", file.name);
      toast.success("University logo attached", {
        description: `Preserving native transparency and aspect ratio (${file.name}).`,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    updateField("logoDataUrl", undefined);
    updateField("logoFileName", undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("University logo removed");
  };

  return (
    <div className="w-full space-y-6">
      {/* Extracted Suggestions Banner (if detected) */}
      {extractedSuggestions?.hasSuggestions && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-foreground">
                Document Assignment Details Detected
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                We identified potential assignment details in your content:{" "}
                <span className="font-medium text-foreground">
                  {[
                    extractedSuggestions.studentName && `Student: ${extractedSuggestions.studentName}`,
                    extractedSuggestions.studentId && `ID: ${extractedSuggestions.studentId}`,
                    extractedSuggestions.courseName && `Course: ${extractedSuggestions.courseName}`,
                    extractedSuggestions.instructorName && `Instructor: ${extractedSuggestions.instructorName}`,
                    extractedSuggestions.universityName && `University: ${extractedSuggestions.universityName}`,
                  ]
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(" • ")}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => onApplySuggestions?.(extractedSuggestions)}
              className="text-xs h-7 px-3 gap-1"
            >
              <Check className="h-3 w-3" /> Apply Details
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onDismissSuggestions?.()}
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Choice: Individual vs Group Assignment */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Assignment Mode Selection <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Individual Option */}
          <button
            type="button"
            onClick={() => handleTypeChange("individual")}
            className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
              !isGroup
                ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-xs"
                : "border-border bg-card hover:border-border/80 hover:bg-surface-2/40"
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                !isGroup ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
              }`}
            >
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-foreground">Individual Assignment</h4>
                {!isGroup && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Single student submission with full name, student ID, course details, and instructor credentials.
              </p>
            </div>
          </button>

          {/* Group Option */}
          <button
            type="button"
            onClick={() => handleTypeChange("group")}
            className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
              isGroup
                ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-xs"
                : "border-border bg-card hover:border-border/80 hover:bg-surface-2/40"
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                isGroup ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
              }`}
            >
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-foreground">Group Assignment</h4>
                {isGroup && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Multi-student team project with repeatable member directory, individual IDs, and team project title.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* University Logo Upload Section */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Building className="h-4 w-4 text-primary" />
              University or Institutional Logo (Optional)
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Upload your official university, college, or faculty emblem. Formats: PNG, JPG, WebP (up to 5MB).
            </p>
          </div>
          {metadata.logoDataUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveLogo}
              className="text-xs h-7 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3 mr-1" /> Remove Logo
            </Button>
          )}
        </div>

        {logoError && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{logoError}</span>
          </div>
        )}

        {metadata.logoDataUrl ? (
          <div className="space-y-3 p-3.5 rounded-xl bg-surface-2/60 border border-border">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-md bg-white p-1.5 border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                <img
                  src={metadata.logoDataUrl}
                  alt="Selected Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {metadata.logoFileName || "Attached University Emblem"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Transparency preserved • Native aspect ratio maintained • Embedded in cover
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs p-0 h-auto text-primary"
                  >
                    Replace logo
                  </Button>
                  <span className="text-muted-foreground text-xs">•</span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-xs p-0 h-auto text-destructive hover:underline"
                  >
                    Remove logo
                  </Button>
                </div>
              </div>
            </div>

            {/* Logo Placement & Size Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Logo Placement on Cover
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateField("logoPlacement", "top-left")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                      metadata.logoPlacement !== "top-right"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:bg-surface-2"
                    }`}
                  >
                    Upper-Left
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("logoPlacement", "top-right")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                      metadata.logoPlacement === "top-right"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:bg-surface-2"
                    }`}
                  >
                    Upper-Right
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Logo Dimensions
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["small", "medium", "large"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateField("logoSize", s)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium capitalize border text-center transition-all cursor-pointer ${
                        (metadata.logoSize || "medium") === s
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background text-muted-foreground border-border hover:bg-surface-2"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-5 text-center cursor-pointer transition-colors bg-surface-2/30 hover:bg-surface-2/60"
          >
            <div className="flex flex-col items-center justify-center gap-1.5">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Upload className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-foreground">
                <span className="text-primary font-semibold">Click to upload university emblem</span> or drag and drop
              </p>
              <p className="text-[10px] text-muted-foreground">
                Clean academic layout guaranteed if omitted • No broken image placeholders
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleLogoFileChange}
          className="hidden"
        />
      </div>

      {/* Primary Required & Optional Fields Form */}
      <div className="space-y-4">
        {/* SECTION 1: Required Student / Group Credentials */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
          <div className="border-b border-border pb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              {isGroup ? <Users className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
              {isGroup ? "Group Identification & Members" : "Student Identification"}
            </h4>
            <span className="text-[10px] text-destructive font-mono font-bold">* Required Fields</span>
          </div>

          {/* If Individual: Assignment Title + Student Name + Student ID */}
          {!isGroup ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Assignment Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Analysis of Machine Learning Architectures in Edge Computing"
                  value={metadata.assignmentTitle || ""}
                  onChange={(e) => updateField("assignmentTitle", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Student's Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Alex Johnson"
                    value={metadata.studentName || ""}
                    onChange={(e) => updateField("studentName", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Student ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., STU-2025-8841"
                    value={metadata.studentId || ""}
                    onChange={(e) => updateField("studentId", e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>
              </div>
            </div>
          ) : (
            /* If Group: Group Title + Group Name + Repeatable Members */
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Group Assignment Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Distributed Systems Scalability Analysis"
                    value={metadata.assignmentTitle || ""}
                    onChange={(e) => updateField("assignmentTitle", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Group or Team Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Team Alpha, Systems Syndicate"
                    value={metadata.groupName || ""}
                    onChange={(e) => updateField("groupName", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Repeatable Members List with Re-Ordering */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Team Members Directory (At least 1 required)
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMember}
                    className="text-xs h-7 px-2.5 gap-1 text-primary border-primary/30 hover:bg-primary/5"
                  >
                    <Plus className="h-3 w-3" /> Add Group Member
                  </Button>
                </div>

                <div className="space-y-2">
                  {(safeMetadata.groupMembers || []).map((member, idx) => (
                    <div
                      key={member.id || idx}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-2/60 border border-border"
                    >
                      <span className="h-6 w-6 rounded bg-card border border-border flex items-center justify-center font-mono text-[10px] text-muted-foreground shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Member Full Name *"
                          value={member.fullName || ""}
                          onChange={(e) => handleUpdateMember(idx, "fullName", e.target.value)}
                          className="px-2.5 py-1.5 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="text"
                          placeholder="Student ID *"
                          value={member.studentId || ""}
                          onChange={(e) => handleUpdateMember(idx, "studentId", e.target.value)}
                          className="px-2.5 py-1.5 text-xs font-mono rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveMemberUp(idx)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:pointer-events-none transition-colors"
                          title="Move member up in directory"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx >= (safeMetadata.groupMembers || []).length - 1}
                          onClick={() => handleMoveMemberDown(idx)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:pointer-events-none transition-colors"
                          title="Move member down in directory"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        {(safeMetadata.groupMembers || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(idx)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors ml-1"
                            title="Remove member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Course Name & Instructor Name (Both required for both modes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Course Name or Subject <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Computer Architecture & Systems"
                value={metadata.courseName || ""}
                onChange={(e) => updateField("courseName", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Submitted To: Instructor's Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Dr. Eleanor Vance, Ph.D."
                value={metadata.instructorName || ""}
                onChange={(e) => updateField("instructorName", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>
          </div>

          {/* Information & Identity Placement Decision */}
          <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-2.5 mt-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-primary/20 pb-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-primary" />
                Information & Identity Placement Decision <span className="text-destructive">*</span>
              </span>
              <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded font-semibold w-fit">
                Layout Control
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Choose where student credentials, IDs, instructor, and course details will appear in the document:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              {/* Option 1: Cover Page Only */}
              <button
                type="button"
                onClick={() => {
                  updateField("identityPlacement", "cover-only");
                  updateField("groupNamePlacement", "cover");
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  metadata.identityPlacement === "cover-only"
                    ? "border-primary bg-background ring-2 ring-primary/30 shadow-xs"
                    : "border-border bg-card/60 hover:bg-card"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                    metadata.identityPlacement === "cover-only"
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}>
                    {metadata.identityPlacement === "cover-only" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-xs font-bold text-foreground">Cover Page Only</span>
                </div>
                <p className="text-[10.5px] text-muted-foreground mt-1.5 pl-5 leading-relaxed">
                  Credentials are styled exclusively on the Cover Page (Page 1). The first body page starts cleanly without redundant headings.
                </p>
              </button>

              {/* Option 2: First Page of Body Only */}
              <button
                type="button"
                onClick={() => {
                  updateField("identityPlacement", "first-body-page-only");
                  updateField("groupNamePlacement", "first-body-page");
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  metadata.identityPlacement === "first-body-page-only" || metadata.groupNamePlacement === "first-body-page"
                    ? "border-primary bg-background ring-2 ring-primary/30 shadow-xs"
                    : "border-border bg-card/60 hover:bg-card"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                    metadata.identityPlacement === "first-body-page-only" || metadata.groupNamePlacement === "first-body-page"
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}>
                    {(metadata.identityPlacement === "first-body-page-only" || metadata.groupNamePlacement === "first-body-page") && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-foreground">First Body Page Only</span>
                </div>
                <p className="text-[10.5px] text-muted-foreground mt-1.5 pl-5 leading-relaxed">
                  Cover displays the document branding cleanly. An official submission header block with names, IDs, and course details is formatted at the top of Page 2.
                </p>
              </button>

              {/* Option 3: Both Cover & First Body Page */}
              <button
                type="button"
                onClick={() => {
                  updateField("identityPlacement", "both");
                  updateField("groupNamePlacement", "both");
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  metadata.identityPlacement === "both" || (!metadata.identityPlacement && metadata.groupNamePlacement !== "first-body-page")
                    ? "border-primary bg-background ring-2 ring-primary/30 shadow-xs"
                    : "border-border bg-card/60 hover:bg-card"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                    metadata.identityPlacement === "both" || (!metadata.identityPlacement && metadata.groupNamePlacement !== "first-body-page")
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}>
                    {(metadata.identityPlacement === "both" || (!metadata.identityPlacement && metadata.groupNamePlacement !== "first-body-page")) && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-foreground">Both Cover & Body</span>
                </div>
                <p className="text-[10.5px] text-muted-foreground mt-1.5 pl-5 leading-relaxed">
                  Full credentials appear on the Canva cover page, and an institutional running header block is also rendered at the top of the document body.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: Optional Institutional & Course Context */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
          <div className="border-b border-border pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-primary" />
              Institutional & Academic Details (Optional)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                University / Institution
              </label>
              <input
                type="text"
                placeholder="e.g., Stanford University"
                value={metadata.universityName || ""}
                onChange={(e) => updateField("universityName", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                College or Faculty
              </label>
              <input
                type="text"
                placeholder="e.g., School of Engineering"
                value={metadata.collegeOrFaculty || ""}
                onChange={(e) => updateField("collegeOrFaculty", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Department
              </label>
              <input
                type="text"
                placeholder="e.g., Department of Computer Science"
                value={metadata.department || ""}
                onChange={(e) => updateField("department", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Course Code
              </label>
              <input
                type="text"
                placeholder="e.g., CS-301"
                value={metadata.courseCode || ""}
                onChange={(e) => updateField("courseCode", e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Academic Year
              </label>
              <input
                type="text"
                placeholder="e.g., 2024–2025"
                value={metadata.academicYear || ""}
                onChange={(e) => updateField("academicYear", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Semester
              </label>
              <input
                type="text"
                placeholder="e.g., Spring Semester"
                value={metadata.semester || ""}
                onChange={(e) => updateField("semester", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Submission Date
              </label>
              <input
                type="date"
                value={metadata.submissionDate || ""}
                onChange={(e) => updateField("submissionDate", e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {!isGroup && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Assignment Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Quantum Algorithm Complexity & Verification"
                value={metadata.assignmentTitle || ""}
                onChange={(e) => updateField("assignmentTitle", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Additional Instructions or Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Final semester capstone project submitted in partial fulfillment of bachelor's degree requirements."
              value={metadata.additionalInstructions || ""}
              onChange={(e) => updateField("additionalInstructions", e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
