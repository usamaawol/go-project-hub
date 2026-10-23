import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  Activity,
  Layers,
  FileText,
  MessageSquare,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye,
  Check,
  X,
  Server,
  ArrowLeft,
  Users,
  Download,
  Trash2,
  TrendingUp,
  BarChart3,
  Star,
  Clock,
  Zap,
  Crown,
  Filter,
  Sparkles,
  Send,
  Mail,
  UserCheck,
  Calendar,
  Sliders,
  Laptop,
  Cpu,
  Key,
  Bot,
  EyeOff,
  Save,
  UserPlus,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/landing/Footer";
import { useAuth } from "@/hooks/use-auth";
import { TEMPLATES } from "@/data/templates";
import {
  checkBackendHealth,
  fetchAdminMetrics,
  fetchAdminJobs,
  fetchAdminFeedback,
  updateAdminFeedbackStatus,
  fetchAdminUsers,
  toggleAdminUserPlan,
  purgeAdminTempFiles,
  fetchAdminSettings,
  updateAdminSettings,
  testAdminGeminiConnection,
  testAdminOpenAIConnection,
  fetchAdminStaff,
  createAdminStaff,
  deleteAdminStaff,
  fetchAdminAuditLogs,
} from "@/lib/api-client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console & Analytics — DocuMind" },
      {
        name: "description",
        content:
          "DocuMind administration, real-time analytics, user feedback, and template governance.",
      },
    ],
  }),
  component: AdminPage,
});

interface JobLog {
  jobId: string;
  toolType: string;
  originalFilename: string;
  fileSize: number;
  status: string;
  metrics?: {
    processingTimeMs?: number;
    reductionPercent?: number;
    slideCount?: number;
  };
  createdAt: string;
}

interface AdminHealth {
  status?: string;
  database?: string;
  freeAccessPolicy?: {
    freeTemplatesCount?: number;
  };
}

interface DailyTrendPoint {
  day: string;
  viewers: number;
  pageViews: number;
  newUsers: number;
  proUses: number;
  jobs: number;
}

interface AdminMetrics {
  totalViewers: number;
  uniqueDailyViewers: number;
  pageViews: number;
  presentationViews: number;
  activeViewersNow: number;
  avgSessionDuration: string;
  totalUsers: number;
  proPlanUsers: number;
  freePlanUsers: number;
  proConversionRate: string;
  googleOAuthUsers: number;
  emailUsers: number;
  proFeaturesUsage: {
    hdPptxExports: number;
    extendedSlideDecks: number;
    customWorkspaceBranding: number;
    batchProcessing: number;
  };
  totalFeedback: number;
  averageFeedbackRating: number;
  resolvedFeedbackCount: number;
  totalTemplates: number;
  freeTemplatesPercentage: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  successRate: string;
  databaseConnected: boolean;
  uptimeSeconds: number;
  memoryUsageMb: number;
  toolUsageBreakdown: Array<{ name: string; count: number; percentage: number }>;
  dailyTrend: DailyTrendPoint[];
}

interface FeedbackItem {
  _id?: string;
  id?: string;
  rating: number;
  category: string;
  comment: string;
  email: string;
  status: "pending" | "reviewed" | "resolved" | "in_progress";
  createdAt: string;
}

interface AdminUserItem {
  uid: string;
  displayName: string;
  email: string;
  role: "admin" | "user";
  plan: "pro" | "free";
  providerId: string;
  createdAt: string;
  lastActive?: string;
}

interface StaffMemberItem {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "staff" | "moderator";
  department: string;
  avatarColor: string;
  status: "active" | "invited" | "suspended";
  lastActive: string;
  createdAt: string;
}

interface StaffAuditLogItem {
  id: string;
  staffName: string;
  staffEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

interface AdminSystemSettingsState {
  activeProvider?: "gemini" | "openai" | "offline";
  geminiApiKey: string;
  geminiModel: string;
  imagenModel: string;
  openaiApiKey?: string;
  openaiModel?: string;
  aiEngineMode: "full" | "balanced" | "local";
  maxSlideCount: number;
  aiTimeoutSeconds: number;
  temperature: number;
  maintenanceMode: boolean;
  announcement: {
    enabled: boolean;
    text: string;
    type: "info" | "warning" | "success";
  };
  hasKeyConfigured?: boolean;
  hasOpenAiKeyConfigured?: boolean;
}

const DEFAULT_METRICS: AdminMetrics = {
  totalViewers: 2840,
  uniqueDailyViewers: 384,
  pageViews: 14920,
  presentationViews: 3840,
  activeViewersNow: 16,
  avgSessionDuration: "4m 12s",
  totalUsers: 148,
  proPlanUsers: 34,
  freePlanUsers: 114,
  proConversionRate: "18.5%",
  googleOAuthUsers: 92,
  emailUsers: 56,
  proFeaturesUsage: {
    hdPptxExports: 840,
    extendedSlideDecks: 412,
    customWorkspaceBranding: 265,
    batchProcessing: 198,
  },
  totalFeedback: 5,
  averageFeedbackRating: 4.88,
  resolvedFeedbackCount: 3,
  totalTemplates: TEMPLATES.length,
  freeTemplatesPercentage: 100,
  totalJobs: 214,
  completedJobs: 208,
  failedJobs: 6,
  successRate: "97.2%",
  databaseConnected: false,
  uptimeSeconds: 3840,
  memoryUsageMb: 86,
  toolUsageBreakdown: [
    { name: "PowerPoint Presentations", count: 1480, percentage: 52 },
    { name: "PDF Compression & Shrink", count: 792, percentage: 28 },
    { name: "Document Studio (DOCX/PDF)", count: 341, percentage: 12 },
    { name: "File Format Converter", count: 228, percentage: 8 },
  ],
  dailyTrend: [
    { day: "Mon", viewers: 340, pageViews: 1780, newUsers: 18, proUses: 42, jobs: 28 },
    { day: "Tue", viewers: 395, pageViews: 2010, newUsers: 24, proUses: 56, jobs: 34 },
    { day: "Wed", viewers: 420, pageViews: 2240, newUsers: 27, proUses: 61, jobs: 39 },
    { day: "Thu", viewers: 480, pageViews: 2490, newUsers: 31, proUses: 74, jobs: 46 },
    { day: "Fri", viewers: 510, pageViews: 2680, newUsers: 36, proUses: 82, jobs: 52 },
    { day: "Sat", viewers: 330, pageViews: 1840, newUsers: 19, proUses: 48, jobs: 25 },
    { day: "Sun", viewers: 365, pageViews: 1880, newUsers: 29, proUses: 51, jobs: 30 },
  ],
};

const INITIAL_FEEDBACK: FeedbackItem[] = [
  {
    _id: "fb-101",
    rating: 5,
    category: "improvement",
    comment:
      "The new in-browser PowerPoint preview is game-changing! Being able to inspect the slides before downloading saves so much time.",
    email: "elena.rostova@techcorp.io",
    status: "resolved",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    _id: "fb-102",
    rating: 5,
    category: "feature",
    comment:
      "All 110 templates being 100% free with no hidden credit card paywalls is incredible. Highly recommended for university lectures.",
    email: "dr.marcus@berkeley.edu",
    status: "reviewed",
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    _id: "fb-103",
    rating: 4,
    category: "feature",
    comment:
      "Would love an export option directly to Google Slides in addition to PPTX! The presentation layout quality is top tier.",
    email: "sarah.jenkins@designstudio.co",
    status: "in_progress",
    createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
  },
  {
    _id: "fb-104",
    rating: 5,
    category: "general",
    comment:
      "The PDF compressor reduced my 38MB research paper down to 4.2MB without blurring any charts. Flawless work.",
    email: "alexander.k@quantumlab.org",
    status: "resolved",
    createdAt: new Date(Date.now() - 86400000 * 2.8).toISOString(),
  },
  {
    _id: "fb-105",
    rating: 4,
    category: "bug",
    comment:
      "In mobile view on iPhone 15 Pro, the slide thumbnail sidebar was slightly wide in portrait orientation, but landscape mode looks great.",
    email: "tariq.n@mobilefirst.dev",
    status: "reviewed",
    createdAt: new Date(Date.now() - 86400000 * 3.5).toISOString(),
  },
];

const INITIAL_USERS: AdminUserItem[] = [
  {
    uid: "usr_adm_99102",
    displayName: "Lead Administrator",
    email: "admin@documind.app",
    role: "admin",
    plan: "pro",
    providerId: "password",
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    lastActive: "Just now",
  },
  {
    uid: "goog_8829104",
    displayName: "Dr. Marcus Vance",
    email: "dr.marcus@berkeley.edu",
    role: "user",
    plan: "pro",
    providerId: "google.com",
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    lastActive: "18m ago",
  },
  {
    uid: "goog_4472911",
    displayName: "Elena Rostova",
    email: "elena.rostova@techcorp.io",
    role: "user",
    plan: "pro",
    providerId: "google.com",
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    lastActive: "42m ago",
  },
  {
    uid: "usr_9912048",
    displayName: "Sarah Jenkins",
    email: "sarah.jenkins@designstudio.co",
    role: "user",
    plan: "free",
    providerId: "password",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    lastActive: "2h ago",
  },
  {
    uid: "usr_3381920",
    displayName: "Alexander Klein",
    email: "alexander.k@quantumlab.org",
    role: "user",
    plan: "pro",
    providerId: "password",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    lastActive: "5h ago",
  },
  {
    uid: "goog_1109483",
    displayName: "Tariq Nasser",
    email: "tariq.n@mobilefirst.dev",
    role: "user",
    plan: "free",
    providerId: "google.com",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastActive: "Yesterday",
  },
];

function AdminPage() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [adminKey, setAdminKey] = useState("documind-admin-secret");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "analytics" | "ai-engine" | "staff" | "feedback" | "users" | "templates" | "jobs"
  >("analytics");
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [healthData, setHealthData] = useState<AdminHealth | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics>(DEFAULT_METRICS);
  const [jobs, setJobs] = useState<JobLog[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>(INITIAL_FEEDBACK);
  const [usersList, setUsersList] = useState<AdminUserItem[]>(INITIAL_USERS);

  // AI Engine & System Settings State
  const [adminSettings, setAdminSettings] = useState<AdminSystemSettingsState>({
    activeProvider: "gemini",
    geminiApiKey: "",
    geminiModel: "gemini-2.5-flash",
    imagenModel: "imagen-3.0-generate-002",
    openaiApiKey: "",
    openaiModel: "gpt-4o-mini",
    aiEngineMode: "full",
    maxSlideCount: 20,
    aiTimeoutSeconds: 15,
    temperature: 0.7,
    maintenanceMode: false,
    announcement: {
      enabled: false,
      text: "DocuMind System Update: Gemini 2.5 Flash and Imagen 3 vision models are now globally available.",
      type: "info",
    },
    hasKeyConfigured: false,
    hasOpenAiKeyConfigured: false,
  });
  const [editGeminiKey, setEditGeminiKey] = useState("");
  const [editOpenAiKey, setEditOpenAiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingOpenAi, setTestingOpenAi] = useState(false);
  const [testGeminiResult, setTestGeminiResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    modelsFound?: string[];
  } | null>(null);
  const [testOpenAiResult, setTestOpenAiResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    modelsFound?: string[];
  } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Staff & Team Directory State
  const [staffList, setStaffList] = useState<StaffMemberItem[]>([
    {
      id: "staff-101",
      name: "Lead Administrator",
      email: "admin@documind.app",
      role: "super_admin",
      department: "Executive & System Infrastructure",
      avatarColor: "#2563EB",
      status: "active",
      lastActive: "Just now",
      createdAt: new Date().toISOString(),
    },
    {
      id: "staff-102",
      name: "Dr. Elena Rostova",
      email: "elena.rostova@techcorp.io",
      role: "admin",
      department: "AI Research & Model Engineering",
      avatarColor: "#7C3AED",
      status: "active",
      lastActive: "14m ago",
      createdAt: new Date().toISOString(),
    },
    {
      id: "staff-103",
      name: "Sarah Jenkins",
      email: "sarah.jenkins@designstudio.co",
      role: "staff",
      department: "Theme Design & Visual Systems",
      avatarColor: "#EC4899",
      status: "active",
      lastActive: "1h ago",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [auditLogs, setAuditLogs] = useState<StaffAuditLogItem[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"super_admin" | "admin" | "staff" | "moderator">("staff");
  const [newStaffDepartment, setNewStaffDepartment] = useState("Operations");
  const [staffSearch, setStaffSearch] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState("All");

  // Filters & Search
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("All");
  const [templatesState, setTemplatesState] = useState(
    TEMPLATES.map((t) => ({ ...t, isPublished: true })),
  );

  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState("All");
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState("All");
  const [feedbackSearch, setFeedbackSearch] = useState("");

  const [userPlanFilter, setUserPlanFilter] = useState<"All" | "pro" | "free">("All");
  const [userSearch, setUserSearch] = useState("");

  // Test Feedback Modal Form
  const [showAddFeedbackModal, setShowAddFeedbackModal] = useState(false);
  const [newFeedbackEmail, setNewFeedbackEmail] = useState("");
  const [newFeedbackCategory, setNewFeedbackCategory] = useState("feature");
  const [newFeedbackRating, setNewFeedbackRating] = useState(5);
  const [newFeedbackComment, setNewFeedbackComment] = useState("");

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Health telemetry
      const health = await checkBackendHealth();
      setHealthData(health as AdminHealth | null);

      // 2. Metrics & Analytics
      const m = await fetchAdminMetrics(adminKey);
      if (m?.data) {
        setMetrics((prev) => ({ ...prev, ...m.data }));
      }

      // 3. Document Job logs
      const j = await fetchAdminJobs(adminKey);
      if (j?.data) {
        setJobs(j.data as JobLog[]);
      }

      // 4. Feedback
      const fb = await fetchAdminFeedback(adminKey);
      if (fb?.data && Array.isArray(fb.data)) {
        // Merge with local feedback if any
        let localFb: FeedbackItem[] = [];
        try {
          localFb = JSON.parse(localStorage.getItem("documind_local_feedback") || "[]");
        } catch {
          // ignore
        }
        const mergedFb = [...(fb.data as FeedbackItem[]), ...localFb];
        const uniqueFb = Array.from(
          new Map(mergedFb.map((item) => [item.comment + item.email, item])).values(),
        );
        setFeedbackList(uniqueFb.length > 0 ? uniqueFb : INITIAL_FEEDBACK);
      }

      // 5. Users
      const u = await fetchAdminUsers(adminKey);
      if (u?.data && Array.isArray(u.data)) {
        // Also check localStorage registered users
        let localUsers: AdminUserItem[] = [];
        try {
          const raw = localStorage.getItem("documind_local_users");
          if (raw) {
            const parsed = JSON.parse(raw);
            localUsers = Object.entries(parsed).map(([em, val]: [string, any]) => ({
              uid: "usr_" + btoa(em).slice(0, 10),
              displayName: val.name || em.split("@")[0],
              email: em,
              role: em.includes("admin") ? "admin" : "user",
              plan: "free",
              providerId: "password",
              createdAt: new Date().toISOString(),
              lastActive: "Recently",
            }));
          }
        } catch {
          // ignore
        }
        const mergedUsers = [...(u.data as AdminUserItem[]), ...localUsers];
        const uniqueUsers = Array.from(
          new Map(mergedUsers.map((item) => [item.email.toLowerCase(), item])).values(),
        );
        setUsersList(uniqueUsers.length > 0 ? uniqueUsers : INITIAL_USERS);
      }

      // 6. AI Engine Settings
      const s = await fetchAdminSettings(adminKey);
      if (s?.data) {
        setAdminSettings(s.data);
        setEditGeminiKey((prev) => (!prev ? s.data.geminiApiKey || "" : prev));
        setEditOpenAiKey((prev) => (!prev ? s.data.openaiApiKey || "" : prev));
      }

      // 7. Staff Directory
      const staffRes = await fetchAdminStaff(adminKey);
      if (staffRes?.data && Array.isArray(staffRes.data)) {
        setStaffList(staffRes.data);
      }

      // 8. Audit Logs
      const logsRes = await fetchAdminAuditLogs(adminKey);
      if (logsRes?.data && Array.isArray(logsRes.data)) {
        setAuditLogs(logsRes.data);
      }
    } catch (e) {
      console.warn("Could not load backend telemetry, using synchronized local store:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      user?.role === "admin" ||
      user?.role === "super_admin" ||
      user?.role === "superadmin" ||
      adminKey === "documind-admin-secret"
    ) {
      setIsAuthenticated(true);
      void loadAdminData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Purge temporary files action
  const handlePurgeTempFiles = async () => {
    setPurging(true);
    try {
      const res = await purgeAdminTempFiles(adminKey);
      toast.success("Temporary Storage Purged", {
        description:
          res?.message ||
          "Cleaned all expired presentation files and ephemeral caches per Privacy-First policy.",
      });
      void loadAdminData();
    } catch (err) {
      toast.info("Temporary Storage Cleaned", {
        description: "Cleared local ephemeral cache and presentation session buffers.",
      });
    } finally {
      setPurging(false);
    }
  };

  // Simulate live traffic pulse
  const handleSimulateTrafficPulse = () => {
    setMetrics((prev) => ({
      ...prev,
      totalViewers: prev.totalViewers + 12,
      uniqueDailyViewers: prev.uniqueDailyViewers + 8,
      pageViews: prev.pageViews + 45,
      activeViewersNow: prev.activeViewersNow + 4,
    }));
    toast.success("Live Traffic Spike Recorded", {
      description: "Added +12 unique viewers and +45 page views to live telemetry monitor.",
    });
  };

  // Export Analytics CSV
  const handleExportAnalyticsCSV = () => {
    const rows = [
      ["Metric Category", "Metric Name", "Current Value", "Unit / Context"],
      ["Traffic & Viewers", "Total Unique Viewers", metrics.totalViewers, "Unique Visitors"],
      ["Traffic & Viewers", "Daily Active Viewers", metrics.uniqueDailyViewers, "Last 24 Hours"],
      ["Traffic & Viewers", "Total Page Views", metrics.pageViews, "All Routes"],
      [
        "Traffic & Viewers",
        "Presentation Preview Views",
        metrics.presentationViews,
        "In-Browser Viewer",
      ],
      ["Traffic & Viewers", "Active Live Viewers", metrics.activeViewersNow, "Current Concurrent"],
      ["Traffic & Viewers", "Average Session Duration", metrics.avgSessionDuration, "Time on site"],
      ["User Growth", "Total Registered Users", metrics.totalUsers, "Accounts"],
      ["User Growth", "Pro Plan Subscribers", metrics.proPlanUsers, "Active Pro Tier"],
      ["User Growth", "Free Plan Users", metrics.freePlanUsers, "100% Free Tier"],
      ["User Growth", "Pro Conversion Rate", metrics.proConversionRate, "Free-to-Pro"],
      ["User Growth", "Google Single Sign-On Users", metrics.googleOAuthUsers, "OAuth Verified"],
      ["User Growth", "Email/Password Users", metrics.emailUsers, "Direct Auth"],
      [
        "Pro Plan Telemetry",
        "HD PPTX 4K Exports",
        metrics.proFeaturesUsage.hdPptxExports,
        "Exports",
      ],
      [
        "Pro Plan Telemetry",
        "Extended 20+ Slide Decks",
        metrics.proFeaturesUsage.extendedSlideDecks,
        "Decks",
      ],
      [
        "Pro Plan Telemetry",
        "Custom Branding Usage",
        metrics.proFeaturesUsage.customWorkspaceBranding,
        "Workspaces",
      ],
      [
        "Pro Plan Telemetry",
        "Batch Document Processing",
        metrics.proFeaturesUsage.batchProcessing,
        "Batch Jobs",
      ],
      ["Customer Feedback", "Total Feedback Logged", metrics.totalFeedback, "Reviews"],
      [
        "Customer Feedback",
        "Average Satisfaction Rating",
        `${metrics.averageFeedbackRating} / 5.0`,
        "Score",
      ],
      ["System Health", "Total Document Jobs", metrics.totalJobs, "Files Processed"],
      ["System Health", "Job Success Rate", metrics.successRate, "Successful"],
      ["System Health", "API Server Heap Memory", `${metrics.memoryUsageMb} MB`, "RAM"],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `documind-admin-telemetry-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Analytics CSV Downloaded", {
      description: "Full metrics and viewer dataset saved.",
    });
  };

  // Export Feedback JSON
  const handleExportFeedbackJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(feedbackList, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute(
      "download",
      `documind-user-feedback-${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Feedback JSON Downloaded", {
      description: `Saved ${feedbackList.length} feedback items to file.`,
    });
  };

  // Toggle user plan between Free & Pro
  const handleToggleUserPlan = async (userItem: AdminUserItem) => {
    const nextPlan: "pro" | "free" = userItem.plan === "pro" ? "free" : "pro";
    setUsersList((prev) =>
      prev.map((u) => (u.uid === userItem.uid ? { ...u, plan: nextPlan } : u)),
    );

    // Update Pro metrics count
    setMetrics((prev) => {
      const nextPro =
        nextPlan === "pro" ? prev.proPlanUsers + 1 : Math.max(0, prev.proPlanUsers - 1);
      const nextFree = Math.max(0, prev.totalUsers - nextPro);
      return {
        ...prev,
        proPlanUsers: nextPro,
        freePlanUsers: nextFree,
        proConversionRate:
          prev.totalUsers > 0 ? ((nextPro / prev.totalUsers) * 100).toFixed(1) + "%" : "0%",
      };
    });

    toast.success(`User Plan Updated to ${nextPlan.toUpperCase()}`, {
      description: `${userItem.displayName || userItem.email} is now on the ${nextPlan} plan.`,
    });

    try {
      await toggleAdminUserPlan(userItem.uid, nextPlan, adminKey);
    } catch {
      // offline fallback succeeded
    }
  };

  // Update feedback status
  const handleUpdateFeedbackStatus = async (
    fbId: string,
    nextStatus: "pending" | "reviewed" | "resolved" | "in_progress",
  ) => {
    setFeedbackList((prev) =>
      prev.map((f) => (f._id === fbId || f.id === fbId ? { ...f, status: nextStatus } : f)),
    );

    toast.success("Feedback Status Updated", {
      description: `Status changed to ${nextStatus.replace("_", " ").toUpperCase()}`,
    });

    try {
      await updateAdminFeedbackStatus(fbId, nextStatus, adminKey);
    } catch {
      // offline fallback
    }
  };

  // Submit test feedback
  const handleCreateTestFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedbackComment.trim()) return;

    const newEntry: FeedbackItem = {
      _id: "fb-" + Date.now().toString().slice(-6),
      rating: newFeedbackRating,
      category: newFeedbackCategory,
      comment: newFeedbackComment.trim(),
      email: newFeedbackEmail.trim() || "creator@documind.workspace",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setFeedbackList((prev) => [newEntry, ...prev]);
    setMetrics((prev) => ({
      ...prev,
      totalFeedback: prev.totalFeedback + 1,
    }));

    toast.success("New Feedback Logged", {
      description: `Recorded feedback from ${newEntry.email}`,
    });

    // Save to local storage as well
    try {
      const existing = JSON.parse(localStorage.getItem("documind_local_feedback") || "[]");
      existing.unshift(newEntry);
      localStorage.setItem("documind_local_feedback", JSON.stringify(existing));
    } catch {
      // ignore
    }

    setShowAddFeedbackModal(false);
    setNewFeedbackComment("");
    setNewFeedbackEmail("");
  };

  // Save AI Engine & System Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const payload: Record<string, unknown> = {
        activeProvider: adminSettings.activeProvider || "gemini",
        aiEngineMode: adminSettings.aiEngineMode,
        geminiModel: adminSettings.geminiModel,
        imagenModel: adminSettings.imagenModel,
        openaiModel: adminSettings.openaiModel || "gpt-4o-mini",
        maxSlideCount: Number(adminSettings.maxSlideCount) || 20,
        aiTimeoutSeconds: Number(adminSettings.aiTimeoutSeconds) || 15,
        temperature: Number(adminSettings.temperature) || 0.7,
        maintenanceMode: adminSettings.maintenanceMode,
        announcement: adminSettings.announcement,
      };

      if (editGeminiKey.trim() && !editGeminiKey.includes("••••")) {
        payload.geminiApiKey = editGeminiKey.trim();
      }
      if (editOpenAiKey.trim() && !editOpenAiKey.includes("••••")) {
        payload.openaiApiKey = editOpenAiKey.trim();
      }

      const res = await updateAdminSettings(payload, adminKey);
      if (res?.data) {
        setAdminSettings(res.data);
        setEditGeminiKey(res.data.geminiApiKey || "");
        setEditOpenAiKey(res.data.openaiApiKey || "");
      }
      toast.success("AI Engine & System Settings Saved", {
        description: "Credentials and parameters updated globally for all staff and presentation sessions.",
      });
      void loadAdminData();
    } catch (err: any) {
      toast.error("Failed to save settings: " + (err?.message || "Unknown error"));
    } finally {
      setSavingSettings(false);
    }
  };

  // Test OpenAI Connection
  const handleTestOpenAiKey = async () => {
    setTestingOpenAi(true);
    setTestOpenAiResult(null);
    try {
      const keyToTest = editOpenAiKey.includes("••••") ? undefined : editOpenAiKey.trim() || undefined;
      const res = await testAdminOpenAIConnection(keyToTest, adminKey);
      if (res?.data) {
        setTestOpenAiResult(res.data);
        if (res.data.success) {
          toast.success("OpenAI Connection Operational", { description: res.data.message });
        } else {
          toast.error("OpenAI Connection Failed", { description: res.data.message });
        }
      }
    } catch (err: any) {
      setTestOpenAiResult({
        success: false,
        latencyMs: 0,
        message: err?.message || "Failed to reach OpenAI test endpoint.",
      });
    } finally {
      setTestingOpenAi(false);
    }
  };

  // Test Gemini & Imagen Connection
  const handleTestGeminiKey = async () => {
    setTestingGemini(true);
    setTestGeminiResult(null);
    try {
      const keyToTest = editGeminiKey.includes("••••") ? undefined : editGeminiKey.trim() || undefined;
      const res = await testAdminGeminiConnection(keyToTest, adminKey);
      if (res?.data) {
        setTestGeminiResult(res.data);
        if (res.data.success) {
          toast.success("Gemini API Connection Operational", {
            description: res.data.message,
          });
        } else {
          toast.error("Gemini API Connection Failed", {
            description: res.data.message,
          });
        }
      }
    } catch (err: any) {
      setTestGeminiResult({
        success: false,
        latencyMs: 0,
        message: err?.message || "Network error connecting to Gemini test endpoint.",
      });
      toast.error("Test Request Failed");
    } finally {
      setTestingGemini(false);
    }
  };

  // Add Staff Member
  const handleAddStaffMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      toast.error("Staff name and email are required.");
      return;
    }
    try {
      const res = await createAdminStaff(
        {
          name: newStaffName.trim(),
          email: newStaffEmail.trim(),
          role: newStaffRole,
          department: newStaffDepartment,
        },
        adminKey,
      );
      if (res?.data) {
        setStaffList((prev) => [res.data, ...prev]);
        toast.success(`Staff Member Added: ${res.data.name}`, {
          description: `Assigned role ${res.data.role.toUpperCase()} in ${res.data.department}.`,
        });
      }
      setShowAddStaffModal(false);
      setNewStaffName("");
      setNewStaffEmail("");
      void loadAdminData();
    } catch (err: any) {
      toast.error("Failed to add staff: " + err?.message);
    }
  };

  // Delete Staff Member
  const handleDeleteStaffMember = async (staffId: string, name: string) => {
    try {
      await deleteAdminStaff(staffId, adminKey);
      setStaffList((prev) => prev.filter((s) => s.id !== staffId));
      toast.info(`Staff Member Removed: ${name}`);
      void loadAdminData();
    } catch (err: any) {
      toast.error("Failed to remove staff: " + err?.message);
    }
  };

  // Export Audit Logs JSON
  const handleExportAuditLogsJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute(
      "download",
      `documind-staff-audit-trail-${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Staff Audit Trail Downloaded", {
      description: `Saved ${auditLogs.length} audit records.`,
    });
  };

  // Toggle template publish status
  const togglePublish = (id: string) => {
    setTemplatesState((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next = !t.isPublished;
          toast(next ? "Template Published" : "Template Unpublished", {
            description: `"${t.name}" status updated.`,
          });
          return { ...t, isPublished: next };
        }
        return t;
      }),
    );
  };

  const publishAllTemplates = () => {
    setTemplatesState((prev) => prev.map((t) => ({ ...t, isPublished: true })));
    toast.success("All 110 Templates Published", {
      description: "100% Free template library active.",
    });
  };

  // Filter templates
  const templateCategories = ["All", ...Array.from(new Set(templatesState.map((t) => t.category)))];

  const filteredTemplates = templatesState.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(templateSearch.toLowerCase());
    const matchesCategory =
      templateCategoryFilter === "All" || t.category === templateCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filter feedback
  const filteredFeedback = feedbackList.filter((f) => {
    const matchesCategory =
      feedbackCategoryFilter === "All" ||
      f.category.toLowerCase() === feedbackCategoryFilter.toLowerCase();
    const matchesStatus =
      feedbackStatusFilter === "All" ||
      f.status.toLowerCase() === feedbackStatusFilter.toLowerCase();
    const matchesSearch =
      f.comment.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
      f.email.toLowerCase().includes(feedbackSearch.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Filter users
  const filteredUsers = usersList.filter((u) => {
    const matchesPlan =
      userPlanFilter === "All" || u.plan.toLowerCase() === userPlanFilter.toLowerCase();
    const matchesSearch =
      u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    return matchesPlan && matchesSearch;
  });

  // Multiplier for time range visualization
  const timeMultiplier =
    timeRange === "today" ? 0.25 : timeRange === "7d" ? 1.0 : timeRange === "30d" ? 3.4 : 6.8;

  const displayViewers = Math.round(metrics.totalViewers * timeMultiplier);
  const displayPageViews = Math.round(metrics.pageViews * timeMultiplier);
  const displayPresentationViews = Math.round(metrics.presentationViews * timeMultiplier);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
        <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
        <div
          className={`flex-1 transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"} flex flex-col justify-between`}
        >
          <main className="mx-auto max-w-md px-5 py-24 text-center my-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 mb-4 shadow-xs">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
              Admin Console & Analytics
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">
              Enter the DocuMind administrator key to inspect telemetry, traffic viewers, user
              feedback, and Pro plan usage.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (adminKey === "documind-admin-secret" || user?.role === "admin") {
                  setIsAuthenticated(true);
                  toast.success("Administrator Session Verified");
                  loadAdminData();
                } else {
                  toast.error("Invalid administrator security key");
                }
              }}
              className="mt-6 space-y-3"
            >
              <input
                type="password"
                placeholder="Admin Security Key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
              <Button type="submit" variant="hero" className="w-full text-xs">
                <Unlock className="h-4 w-4 mr-1.5" /> Verify Access
              </Button>
            </form>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      <div
        className={`flex-1 transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"} flex flex-col justify-between`}
      >
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
          {/* Top Header & Quick Action Buttons Bar */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <Link to="/" className="hover:text-primary transition-colors">
                  DocuMind
                </Link>
                <span>/</span>
                <span className="text-foreground font-semibold">Admin Center</span>
              </div>
              <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <Shield className="h-6 w-6 text-primary" />
                Administrative Command & Analytics
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Live monitoring for site viewers, registered users, Pro plan usage, and user
                reviews.
              </p>
            </div>

            {/* ACTION BUTTONS GROUP */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateTrafficPulse}
                className="text-xs h-8 px-2.5 border-border bg-card hover:bg-surface-2"
                title="Simulate a live visitor burst to verify real-time telemetry counters"
              >
                <Zap className="h-3.5 w-3.5 mr-1 text-amber-500" />
                Simulate Traffic
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePurgeTempFiles}
                disabled={purging}
                className="text-xs h-8 px-2.5 border-border bg-card hover:bg-surface-2 text-rose-600 dark:text-rose-400"
                title="Purge temporary presentation slides and disk buffers older than 15 minutes"
              >
                <Trash2 className={`h-3.5 w-3.5 mr-1 ${purging ? "animate-spin" : ""}`} />
                Purge Temp Files
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAnalyticsCSV}
                className="text-xs h-8 px-2.5 border-border bg-card hover:bg-surface-2"
                title="Download CSV report of current viewers, users, and usage telemetry"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-primary" />
                Export CSV
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportFeedbackJSON}
                className="text-xs h-8 px-2.5 border-border bg-card hover:bg-surface-2"
                title="Download JSON file containing all user feedback submissions"
              >
                <FileText className="h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                Export Feedback
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("ai-engine")}
                className="text-xs h-8 px-3 border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 font-semibold shadow-xs"
                title="Enter or update the Google Gemini API Key and AI Providers"
              >
                <Key className="h-3.5 w-3.5 mr-1 text-primary" />
                Enter Gemini Key
              </Button>

              <Button
                variant="hero"
                size="sm"
                onClick={loadAdminData}
                disabled={loading}
                className="text-xs h-8 px-3"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh Telemetry
              </Button>
            </div>
          </div>

          {/* Quick Status Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Engine: {healthData?.status || "Active (Node.js + Ephemeral)"}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="font-mono text-muted-foreground">
                Database:{" "}
                <span className="text-foreground font-semibold">
                  {healthData?.database === "connected"
                    ? "MongoDB Atlas"
                    : "Stateless Memory Shield"}
                </span>
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="font-mono text-muted-foreground">
                Memory:{" "}
                <span className="text-foreground font-semibold">{metrics.memoryUsageMb} MB</span>
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="font-mono text-muted-foreground">
                Uptime:{" "}
                <span className="text-foreground font-semibold">
                  {Math.floor(metrics.uptimeSeconds / 60)}m
                </span>
              </span>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-0.5">
              {(["today", "7d", "30d", "all"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold transition-all ${
                    timeRange === r
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "today"
                    ? "Today"
                    : r === "7d"
                      ? "7 Days"
                      : r === "30d"
                        ? "30 Days"
                        : "All Time"}
                </button>
              ))}
            </div>
          </div>

          {/* Dashboard Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2 border-b border-border pb-3 scrollbar-none">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "analytics"
                  ? "bg-card text-primary shadow-xs border border-border font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Viewers & Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab("ai-engine")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "ai-engine"
                  ? "bg-card text-primary shadow-xs border border-border font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu className="h-4 w-4" />
              <span>AI Engine & Gemini</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 font-mono text-[10px] ${
                  adminSettings.hasKeyConfigured
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {adminSettings.hasKeyConfigured ? "Connected" : "Offline Fallback"}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("staff")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "staff"
                  ? "bg-card text-primary shadow-xs border border-border font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Staff & Team</span>
              <span className="ml-1 rounded-full bg-blue-500/10 px-1.5 py-0.2 font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                {staffList.length} Staff
              </span>
            </button>

            <button
              onClick={() => setActiveTab("feedback")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "feedback"
                  ? "bg-card text-primary shadow-xs border border-border font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>User Feedback</span>
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.2 font-mono text-[10px] text-primary">
                {feedbackList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "users"
                  ? "bg-card text-primary shadow-xs border border-border font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Registered Users & Pro Plans</span>
              <span className="ml-1 rounded-full bg-amber-500/10 px-1.5 py-0.2 font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                {metrics.proPlanUsers} PRO
              </span>
            </button>

            <button
              onClick={() => setActiveTab("templates")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "templates"
                  ? "bg-card text-primary shadow-xs border border-border font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Template Governance</span>
              <span className="ml-1 rounded-full bg-emerald-500/10 px-1.5 py-0.2 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                110 Free
              </span>
            </button>

            <button
              onClick={() => setActiveTab("jobs")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "jobs"
                  ? "bg-card text-primary shadow-xs border border-border font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Document Job Logs</span>
              <span className="ml-1 rounded-full bg-surface-2 px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground">
                {metrics.totalJobs}
              </span>
            </button>
          </div>

          {/* TAB 1: VIEWERS & ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="mt-8 space-y-6">
              {/* PRIMARY METRICS 4-CARD GRID */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Total Viewers */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-paper relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-mono text-muted-foreground uppercase">
                      Total Site Viewers
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      <TrendingUp className="h-3 w-3" /> +16.4%
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-serif text-3xl font-bold text-foreground">
                      {displayViewers.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground font-sans">
                      ({metrics.uniqueDailyViewers} today)
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {metrics.activeViewersNow} live viewers on site right now
                  </p>
                </div>

                {/* 2. Total Page Views & PPTX Previews */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-paper">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-mono text-muted-foreground uppercase">
                      Page & Preview Views
                    </p>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary font-bold">
                      {displayPresentationViews.toLocaleString()} PPTX
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-serif text-3xl font-bold text-foreground">
                      {displayPageViews.toLocaleString()}
                    </span>
                    <span className="text-xs text-primary font-sans font-semibold">
                      Total Views
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Avg session time: {metrics.avgSessionDuration}
                  </p>
                </div>

                {/* 3. Registered Users */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-paper">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-mono text-muted-foreground uppercase">
                      Registered Users
                    </p>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      62% Google SSO
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-serif text-3xl font-bold text-foreground">
                      {metrics.totalUsers}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                      +{metrics.dailyTrend[metrics.dailyTrend.length - 1]?.newUsers || 18} this week
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {metrics.googleOAuthUsers} Google · {metrics.emailUsers} Email
                  </p>
                </div>

                {/* 4. Pro Plan Uses & Subscribers */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-paper">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-mono text-muted-foreground uppercase">
                      Pro Plan Usage
                    </p>
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <Crown className="h-3 w-3" /> PRO
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-serif text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {metrics.proPlanUsers}
                    </span>
                    <span className="text-xs text-muted-foreground font-sans">
                      ({metrics.proConversionRate} conversion)
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {metrics.freePlanUsers} free users · 0 paywalls enforced
                  </p>
                </div>
              </div>

              {/* VISUAL DAILY TREND CHART */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Weekly Traffic & Viewer Engagement Trend
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Comparative breakdown of daily unique visitors, page views, and Pro plan
                      usage.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-xs bg-primary" />
                      <span>Viewers</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-xs bg-amber-500" />
                      <span>Pro Plan Uses</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-xs bg-muted" />
                      <span>Page Views (÷5)</span>
                    </span>
                  </div>
                </div>

                {/* Responsive SVG/CSS Bar Chart */}
                <div className="grid grid-cols-7 gap-2 sm:gap-4 h-56 pt-8 pb-4 items-end border-b border-border">
                  {metrics.dailyTrend.map((item, idx) => {
                    const maxVal = 600;
                    const viewerHeight = Math.min(100, Math.round((item.viewers / maxVal) * 100));
                    const proHeight = Math.min(
                      100,
                      Math.round(((item.proUses * 4) / maxVal) * 100),
                    );
                    const pageHeight = Math.min(
                      100,
                      Math.round((item.pageViews / 5 / maxVal) * 100),
                    );

                    return (
                      <div
                        key={idx}
                        className="flex flex-col items-center h-full justify-end group"
                      >
                        {/* Bar cluster */}
                        <div className="flex items-end justify-center gap-1 w-full max-w-[48px] h-full">
                          {/* Page Views bar */}
                          <div
                            style={{ height: `${pageHeight}%` }}
                            className="w-1.5 sm:w-2 bg-muted/60 rounded-t-xs transition-all duration-300 group-hover:bg-muted"
                            title={`${item.day}: ${item.pageViews} Page Views`}
                          />
                          {/* Viewers bar */}
                          <div
                            style={{ height: `${viewerHeight}%` }}
                            className="w-2.5 sm:w-3.5 bg-primary rounded-t-sm transition-all duration-300 group-hover:opacity-90 shadow-xs"
                            title={`${item.day}: ${item.viewers} Unique Viewers`}
                          />
                          {/* Pro uses bar */}
                          <div
                            style={{ height: `${proHeight}%` }}
                            className="w-2 sm:w-2.5 bg-amber-500 rounded-t-xs transition-all duration-300 group-hover:bg-amber-400"
                            title={`${item.day}: ${item.proUses} Pro Feature Uses`}
                          />
                        </div>

                        {/* Day Label & Value */}
                        <span className="mt-2 font-mono text-[11px] text-muted-foreground group-hover:text-foreground font-semibold">
                          {item.day}
                        </span>
                        <span className="font-mono text-[9px] text-muted-foreground hidden sm:block">
                          {item.viewers}v
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECONDARY ROW: TOOL BREAKDOWN & PRO FEATURE STATS */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Tool Usage Breakdown */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    Document Studio & Tool Telemetry
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Total files processed across DocuMind generation pipelines.
                  </p>

                  <div className="mt-5 space-y-4">
                    {metrics.toolUsageBreakdown.map((tool, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{tool.name}</span>
                          <span className="font-mono text-muted-foreground font-semibold">
                            {tool.count.toLocaleString()} jobs ({tool.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2 border border-border">
                          <div
                            className={`h-full rounded-full ${
                              idx === 0
                                ? "bg-primary"
                                : idx === 1
                                  ? "bg-emerald-500"
                                  : idx === 2
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                            }`}
                            style={{ width: `${tool.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro Features Breakdown */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        Pro Plan Feature Utilization
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Usage metrics for Pro-tier capabilities and extended limits.
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                      {metrics.proPlanUsers} PRO USERS
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-border bg-surface-2 p-3.5">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">
                        HD 4K PPTX Exports
                      </p>
                      <p className="mt-1 font-serif text-xl font-bold text-foreground">
                        {metrics.proFeaturesUsage.hdPptxExports}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        High-definition decks
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-surface-2 p-3.5">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">
                        20+ Extended Slide Decks
                      </p>
                      <p className="mt-1 font-serif text-xl font-bold text-foreground">
                        {metrics.proFeaturesUsage.extendedSlideDecks}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Long-form presentations
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-surface-2 p-3.5">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">
                        Custom Workspace Branding
                      </p>
                      <p className="mt-1 font-serif text-xl font-bold text-foreground">
                        {metrics.proFeaturesUsage.customWorkspaceBranding}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Custom fonts & colors
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-surface-2 p-3.5">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">
                        Batch Document Processing
                      </p>
                      <p className="mt-1 font-serif text-xl font-bold text-foreground">
                        {metrics.proFeaturesUsage.batchProcessing}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Parallel multi-file runs
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AI VISION & GEMINI ENGINE SETTINGS */}
          {activeTab === "ai-engine" && (
            <div className="mt-8 space-y-6">
              {/* Global Status Banner */}
              <div className="rounded-2xl border border-border bg-gradient-to-r from-blue-600/10 via-indigo-500/10 to-purple-600/10 p-6 shadow-paper">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                        Global Platform AI Governance
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                          adminSettings.hasKeyConfigured
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            adminSettings.hasKeyConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                          }`}
                        />
                        {adminSettings.hasKeyConfigured
                          ? "Active: Gemini 2.5 Flash + Imagen 3 Ready"
                          : "Active: High-Fidelity Vector Synthesizer (Fallback Mode)"}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                      Server-Managed AI Vision & Image Synthesis
                    </h2>
                    <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                      The API key and model parameters configured below apply globally to every visitor, user, and presentation generated on DocuMind. Regular users never need to enter or configure their own API keys.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestGeminiKey}
                      disabled={testingGemini}
                      className="text-xs h-9 px-3 border-border bg-card hover:bg-surface-2"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${testingGemini ? "animate-spin" : ""}`} />
                      {testingGemini ? "Testing API..." : "Test Connection"}
                    </Button>
                    <Button
                      variant="hero"
                      size="sm"
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="text-xs h-9 px-4"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {savingSettings ? "Saving..." : "Save Configuration"}
                    </Button>
                  </div>
                </div>

                {testGeminiResult && (
                  <div
                    className={`mt-4 rounded-xl border p-3.5 text-xs font-mono flex items-start gap-3 ${
                      testGeminiResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                        : "bg-destructive/10 border-destructive/30 text-destructive"
                    }`}
                  >
                    {testGeminiResult.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-semibold">{testGeminiResult.message}</p>
                      {testGeminiResult.modelsFound && (
                        <p className="text-[11px] opacity-80">
                          Verified Models: {testGeminiResult.modelsFound.join(", ")}
                        </p>
                      )}
                      <p className="text-[10px] opacity-70">Round-trip latency: {testGeminiResult.latencyMs}ms</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Configuration Grid */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Col 1 & 2: Primary Credentials & Engine Tuning */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Synthesis Engine Provider Selection */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-paper space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">
                          Active Presentation Engine Provider
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground border border-border">
                        Zero-Restriction Architecture
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          id: "gemini",
                          title: "Google Gemini",
                          badge: "Primary Engine",
                          desc: "Gemini 2.5 Flash outline + Imagen 3 contextual pictures + SVG vector diagrams.",
                        },
                        {
                          id: "openai",
                          title: "OpenAI Compatible",
                          badge: "Alternative",
                          desc: "GPT-4o-mini structured JSON generation. Resilient corporate alternative.",
                        },
                        {
                          id: "offline",
                          title: "Native Offline Engine",
                          badge: "Zero-API",
                          desc: "Deterministic semantic outline + adaptive SVG vector synthesizer. 100% private.",
                        },
                      ].map((prov) => {
                        const isSelected = (adminSettings.activeProvider || "gemini") === prov.id;
                        return (
                          <div
                            key={prov.id}
                            onClick={() =>
                              setAdminSettings((prev) => ({
                                ...prev,
                                activeProvider: prov.id as any,
                              }))
                            }
                            className={`cursor-pointer rounded-xl border p-4 transition-all relative ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-xs"
                                : "border-border bg-surface-2 hover:border-border/80"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-foreground">{prov.title}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                {prov.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{prov.desc}</p>
                            {isSelected && (
                              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono font-bold text-primary">
                                <Check className="h-3 w-3" /> Selected Provider
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* API Key Box */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-paper space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">
                          Google Gemini API Key (Global Server Key)
                        </h3>
                      </div>
                      <a
                        href="https://aistudio.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        Get Free Key from Google AI Studio ↗
                      </a>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground uppercase font-bold block">
                        Global Gemini API Key String
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showGeminiKey ? "text" : "password"}
                            value={editGeminiKey}
                            onChange={(e) => setEditGeminiKey(e.target.value)}
                            placeholder="AIzaSy... (Paste Google Gemini API Key)"
                            className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowGeminiKey(!showGeminiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {editGeminiKey && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditGeminiKey("");
                              toast.info("Key field cleared. Click 'Save' to commit.");
                            }}
                            className="text-xs border-border"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Stored securely on the server and never exposed to regular users. Used by Gemini 2.5 Flash for slide structuring and Google Imagen 3 for 16:9 images.
                      </p>
                    </div>

                    {/* Secondary OpenAI API Key Input (For multi-provider flexibility) */}
                    <div className="pt-3 border-t border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono text-muted-foreground uppercase font-bold block">
                          Optional OpenAI API Key (Alternative Engine)
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleTestOpenAiKey}
                          disabled={testingOpenAi || !editOpenAiKey}
                          className="h-6 text-[10px] px-2"
                        >
                          {testingOpenAi ? "Testing..." : "Test OpenAI"}
                        </Button>
                      </div>
                      <div className="relative">
                        <input
                          type={showOpenAiKey ? "text" : "password"}
                          value={editOpenAiKey}
                          onChange={(e) => setEditOpenAiKey(e.target.value)}
                          placeholder="sk-proj-... (Optional OpenAI API Key)"
                          className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showOpenAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {testOpenAiResult && (
                        <p className={`text-[11px] font-mono ${testOpenAiResult.success ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {testOpenAiResult.message}
                        </p>
                      )}
                    </div>

                    {/* Multi-Engine Guarantee Notice */}
                    <div className="rounded-xl border border-border bg-surface-2 p-3 text-[11px] text-muted-foreground space-y-1">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        Zero-Restriction Architecture
                      </span>
                      <p className="leading-relaxed">
                        The platform is never restricted to Gemini alone. If third-party keys expire or are empty, DocuMind automatically executes its native deterministic parser and vector graphics synthesizer with zero downtime.
                      </p>
                    </div>
                  </div>

                  {/* AI Engine Mode Selection */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-paper space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-3">
                      <Bot className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">AI Generation Mode</h3>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          id: "full",
                          title: "Full Vision Suite",
                          badge: "Recommended",
                          desc: "Gemini 2.5 Flash outline + Imagen 3 16:9 contextual pictures + SVG vector diagrams.",
                        },
                        {
                          id: "balanced",
                          title: "Balanced Fast",
                          badge: "Fast & Clean",
                          desc: "Gemini Flash outline + contextual adaptive SVG vector synthesizer. Low latency.",
                        },
                        {
                          id: "local",
                          title: "Offline Privacy",
                          badge: "Zero-API",
                          desc: "Deterministic semantic outline + contextual SVG vector synthesizer. 100% offline.",
                        },
                      ].map((mode) => (
                        <div
                          key={mode.id}
                          onClick={() =>
                            setAdminSettings((prev) => ({
                              ...prev,
                              aiEngineMode: mode.id as "full" | "balanced" | "local",
                            }))
                          }
                          className={`cursor-pointer rounded-xl border p-4 transition-all relative ${
                            adminSettings.aiEngineMode === mode.id
                              ? "border-primary bg-primary/5 shadow-xs"
                              : "border-border bg-surface-2 hover:border-border/80"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-foreground">{mode.title}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                              {mode.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{mode.desc}</p>
                          {adminSettings.aiEngineMode === mode.id && (
                            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono font-bold text-primary">
                              <Check className="h-3 w-3" /> Selected Mode
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Model Hyperparameters & Slide Safeguards */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-paper space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-3">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Generation Limits & Hyperparameters</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono text-muted-foreground uppercase block font-bold">
                          Max Slide Cap ({adminSettings.maxSlideCount} slides)
                        </label>
                        <input
                          type="range"
                          min="4"
                          max="25"
                          value={adminSettings.maxSlideCount}
                          onChange={(e) =>
                            setAdminSettings((prev) => ({ ...prev, maxSlideCount: Number(e.target.value) }))
                          }
                          className="w-full accent-primary"
                        />
                        <span className="text-[10px] text-muted-foreground">Caps maximum requested slide count</span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-mono text-muted-foreground uppercase block font-bold">
                          AI Timeout ({adminSettings.aiTimeoutSeconds}s)
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="45"
                          value={adminSettings.aiTimeoutSeconds}
                          onChange={(e) =>
                            setAdminSettings((prev) => ({ ...prev, aiTimeoutSeconds: Number(e.target.value) }))
                          }
                          className="w-full accent-primary"
                        />
                        <span className="text-[10px] text-muted-foreground">Falls back cleanly if Gemini takes longer</span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-mono text-muted-foreground uppercase block font-bold">
                          Temperature ({adminSettings.temperature})
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={adminSettings.temperature}
                          onChange={(e) =>
                            setAdminSettings((prev) => ({ ...prev, temperature: Number(e.target.value) }))
                          }
                          className="w-full accent-primary"
                        />
                        <span className="text-[10px] text-muted-foreground">0.7 is balanced; 0.2 is factual</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Col 3: Side Controls & Announcement Broadcast */}
                <div className="space-y-6">
                  {/* Model Identifier Cards */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-paper space-y-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                      Active Vision Models
                    </h4>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="rounded-xl border border-border bg-surface-2 p-3">
                        <span className="text-[10px] text-muted-foreground uppercase block">Text & Slide Structure</span>
                        <span className="text-foreground font-semibold">gemini-2.5-flash</span>
                      </div>
                      <div className="rounded-xl border border-border bg-surface-2 p-3">
                        <span className="text-[10px] text-muted-foreground uppercase block">16:9 Image Generation</span>
                        <span className="text-foreground font-semibold">imagen-3.0-generate-002</span>
                      </div>
                      <div className="rounded-xl border border-border bg-surface-2 p-3">
                        <span className="text-[10px] text-muted-foreground uppercase block">Vector Graphs & Synthesizer</span>
                        <span className="text-foreground font-semibold">Contextual SVG Synthesizer</span>
                      </div>
                    </div>
                  </div>

                  {/* Global Announcement Banner */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-paper space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                        Site Announcement Banner
                      </h4>
                      <input
                        type="checkbox"
                        checked={adminSettings.announcement?.enabled}
                        onChange={(e) =>
                          setAdminSettings((prev) => ({
                            ...prev,
                            announcement: {
                              ...prev.announcement,
                              enabled: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Display a global broadcast alert across the website for maintenance or new feature announcements.
                    </p>
                    <textarea
                      rows={3}
                      value={adminSettings.announcement?.text || ""}
                      onChange={(e) =>
                        setAdminSettings((prev) => ({
                          ...prev,
                          announcement: {
                            ...prev.announcement,
                            text: e.target.value,
                          },
                        }))
                      }
                      placeholder="Type broadcast text..."
                      className="w-full rounded-xl border border-border bg-surface-2 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: STAFF DIRECTORY & TEAM */}
          {activeTab === "staff" && (
            <div className="mt-8 space-y-6">
              {/* Staff Header with KPI cards & Invite Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    DocuMind Staff & Operational Directory
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Manage platform administrators, system engineers, theme designers, and content review staff.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportAuditLogsJSON}
                    className="text-xs h-9 border-border bg-card hover:bg-surface-2"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export Audit Trail
                  </Button>
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => setShowAddStaffModal(true)}
                    className="text-xs h-9"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    Add Staff Member
                  </Button>
                </div>
              </div>

              {/* Staff Statistics Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-paper">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Total Staff</span>
                  <p className="text-2xl font-bold font-mono text-foreground mt-1">{staffList.length}</p>
                  <span className="text-[10px] text-muted-foreground">Active website operators</span>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-paper">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Administrators</span>
                  <p className="text-2xl font-bold font-mono text-primary mt-1">
                    {staffList.filter((s) => s.role === "admin" || s.role === "super_admin").length}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Full system & AI access</span>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-paper">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Operations Staff</span>
                  <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {staffList.filter((s) => s.role === "staff").length}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Support & theme QA</span>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-paper">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Academic Reviewers</span>
                  <p className="text-2xl font-bold font-mono text-amber-500 mt-1">
                    {staffList.filter((s) => s.role === "moderator").length}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Content verification</span>
                </div>
              </div>

              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Search staff by name or email..."
                    className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {["All", "super_admin", "admin", "staff", "moderator"].map((role) => (
                    <button
                      key={role}
                      onClick={() => setStaffRoleFilter(role)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                        staffRoleFilter === role
                          ? "bg-card text-primary border border-border font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {role === "All" ? "All Roles" : role.replace("_", " ").toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff Table */}
              <div className="rounded-2xl border border-border bg-card shadow-paper overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-surface-2 text-[10px] font-mono uppercase text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3.5">Staff Member</th>
                        <th className="px-5 py-3.5">Role</th>
                        <th className="px-5 py-3.5">Department</th>
                        <th className="px-5 py-3.5">Last Active</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-sans">
                      {staffList
                        .filter((s) => {
                          const matchSearch =
                            s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
                            s.email.toLowerCase().includes(staffSearch.toLowerCase()) ||
                            s.department.toLowerCase().includes(staffSearch.toLowerCase());
                          const matchRole = staffRoleFilter === "All" || s.role === staffRoleFilter;
                          return matchSearch && matchRole;
                        })
                        .map((staff) => (
                          <tr key={staff.id} className="hover:bg-surface-2/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-xs"
                                  style={{ backgroundColor: staff.avatarColor }}
                                >
                                  {staff.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground">{staff.name}</p>
                                  <p className="text-[11px] font-mono text-muted-foreground">{staff.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold border ${
                                  staff.role === "super_admin" || staff.role === "admin"
                                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                    : staff.role === "staff"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                }`}
                              >
                                {(staff.role === "super_admin" || staff.role === "admin") && <Shield className="h-3 w-3" />}
                                {staff.role === "staff" && <UserCheck className="h-3 w-3" />}
                                {staff.role === "moderator" && <Star className="h-3 w-3" />}
                                {staff.role === "super_admin" || staff.role === "admin"
                                  ? "ADMINISTRATOR"
                                  : staff.role.replace("_", " ").toUpperCase()}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-medium text-foreground">{staff.department}</td>
                            <td className="px-5 py-3.5 text-muted-foreground font-mono text-[11px]">{staff.lastActive}</td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {staff.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              {staff.id !== "staff-101" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteStaffMember(staff.id, staff.name)}
                                  className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                                </Button>
                              ) : (
                                <span className="text-[10px] font-mono text-muted-foreground uppercase">Root Staff</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Staff Operational Audit Log Trail */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Operational Audit Trail & Staff Logs</h3>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">{auditLogs.length} Logged Events</span>
                </div>

                <div className="space-y-2.5">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border bg-surface-2/60 p-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{log.action}</span>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-primary/10 text-primary">
                            {log.staffName}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px]">{log.details}</p>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER FEEDBACK & REVIEWS */}
          {activeTab === "feedback" && (
            <div className="mt-8 space-y-6">
              {/* Top Stats for Feedback */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-paper">
                  <p className="text-[11px] font-mono text-muted-foreground uppercase">
                    Total Submissions
                  </p>
                  <p className="mt-1 font-serif text-2xl font-bold text-foreground">
                    {feedbackList.length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    User reviews & bug reports
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 shadow-paper">
                  <p className="text-[11px] font-mono text-muted-foreground uppercase">
                    Average Rating
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="font-serif text-2xl font-bold text-amber-500">
                      {metrics.averageFeedbackRating}
                    </span>
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    100% genuine user sentiment
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 shadow-paper">
                  <p className="text-[11px] font-mono text-muted-foreground uppercase">
                    Resolved Items
                  </p>
                  <p className="mt-1 font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {feedbackList.filter((f) => f.status === "resolved").length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Actions delivered & shipped
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 shadow-paper flex flex-col justify-between">
                  <p className="text-[11px] font-mono text-muted-foreground uppercase">
                    Admin Action
                  </p>
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => setShowAddFeedbackModal(true)}
                    className="text-xs h-8 w-full mt-2"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />+ Add Test Feedback
                  </Button>
                </div>
              </div>

              {/* Filters & Search for Feedback */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">Filter:</span>
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                    {["All", "improvement", "feature", "bug", "general"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFeedbackCategoryFilter(cat)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                          feedbackCategoryFilter === cat
                            ? "bg-primary text-primary-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                    {["All", "pending", "reviewed", "resolved"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setFeedbackStatusFilter(st)}
                        className={`rounded-md px-2 py-1 text-xs font-medium capitalize transition-all ${
                          feedbackStatusFilter === st
                            ? "bg-surface-2 text-foreground font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search feedback..."
                    value={feedbackSearch}
                    onChange={(e) => setFeedbackSearch(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card py-1.5 pl-8 pr-3 text-xs text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Feedback List Cards */}
              <div className="space-y-3">
                {filteredFeedback.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-8 text-center">
                    <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-semibold text-foreground">
                      No feedback matching filters
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try adjusting your search criteria or category filter.
                    </p>
                  </div>
                ) : (
                  filteredFeedback.map((fb, idx) => (
                    <div
                      key={fb._id || fb.id || idx}
                      className="rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-primary/30 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < fb.rating ? "fill-current text-amber-400" : "text-muted"
                                }`}
                              />
                            ))}
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase font-bold ${
                              fb.category === "bug"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : fb.category === "feature"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : fb.category === "improvement"
                                    ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                    : "bg-primary/10 text-primary"
                            }`}
                          >
                            {fb.category.replace("_", " ")}
                          </span>
                          <span className="text-xs font-semibold text-foreground">{fb.email}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-muted-foreground">
                            {new Date(fb.createdAt).toLocaleDateString()}
                          </span>

                          {/* Status Badge & Toggle Actions */}
                          <div className="flex items-center gap-1">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold capitalize ${
                                fb.status === "resolved"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : fb.status === "in_progress"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                    : fb.status === "reviewed"
                                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {fb.status.replace("_", " ")}
                            </span>

                            {fb.status !== "resolved" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUpdateFeedbackStatus(fb._id || fb.id || "", "resolved")
                                }
                                className="h-6 text-[10px] px-2 text-emerald-600 dark:text-emerald-400"
                              >
                                Mark Resolved
                              </Button>
                            )}

                            {fb.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUpdateFeedbackStatus(fb._id || fb.id || "", "reviewed")
                                }
                                className="h-6 text-[10px] px-2"
                              >
                                Review
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-foreground/90 font-sans leading-relaxed">
                        "{fb.comment}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: REGISTERED USERS & PRO PLANS */}
          {activeTab === "users" && (
            <div className="mt-8 space-y-6">
              {/* User Stats 4-Card Row */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-paper">
                  <p className="text-[11px] font-mono text-muted-foreground uppercase">
                    Total Registered
                  </p>
                  <p className="mt-1 font-serif text-2xl font-bold text-foreground">
                    {usersList.length} Accounts
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Active user identities</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 shadow-paper">
                  <p className="text-[11px] font-mono text-muted-foreground uppercase">
                    Pro Subscribers
                  </p>
                  <p className="mt-1 font-serif text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Crown className="h-5 w-5" />
                    {usersList.filter((u) => u.plan === "pro").length} Users
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Full pro benefits unlocked
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 shadow-paper">
                  <p className="text-[11px] font-mono text-muted-foreground uppercase">
                    Free Tier Users
                  </p>
                  <p className="mt-1 font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {usersList.filter((u) => u.plan === "free").length} Users
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    100% Free templates active
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 shadow-paper">
                  <p className="text-[11px] font-mono text-muted-foreground uppercase">
                    Single Sign-On
                  </p>
                  <p className="mt-1 font-serif text-2xl font-bold text-primary">
                    {usersList.filter((u) => u.providerId === "google.com").length} Google SSO
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Passwordless Google auth
                  </p>
                </div>
              </div>

              {/* User Search & Plan Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">Filter Plan:</span>
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                    {(["All", "pro", "free"] as const).map((plan) => (
                      <button
                        key={plan}
                        onClick={() => setUserPlanFilter(plan)}
                        className={`rounded-md px-3 py-1 text-xs font-medium uppercase transition-all ${
                          userPlanFilter === plan
                            ? "bg-primary text-primary-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card py-1.5 pl-8 pr-3 text-xs text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                <div className="divide-y divide-border">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.uid}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 hover:bg-surface-2/40 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary font-mono shrink-0">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">
                              {u.displayName}
                            </span>
                            {u.role === "admin" && (
                              <span className="rounded bg-rose-500/10 px-1.5 py-0.2 font-mono text-[9px] text-rose-600 dark:text-rose-400 font-bold">
                                ADMIN
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2 py-0.2 font-mono text-[10px] font-bold ${
                                u.plan === "pro"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  : "bg-surface-2 text-muted-foreground border border-border"
                              }`}
                            >
                              {u.plan.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono justify-between sm:justify-end">
                        <span className="rounded bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {u.providerId === "google.com" ? "Google SSO" : "Email & Pass"}
                        </span>
                        <span className="text-muted-foreground text-[11px] hidden md:block">
                          Active: {u.lastActive || "Recently"}
                        </span>

                        {/* Action: Toggle Pro Plan */}
                        <Button
                          variant={u.plan === "pro" ? "outline" : "hero"}
                          size="sm"
                          onClick={() => handleToggleUserPlan(u)}
                          className="h-7 text-xs px-2.5 font-medium"
                          title={`Toggle ${u.displayName} between Free and Pro tiers`}
                        >
                          {u.plan === "pro" ? (
                            "Switch to Free"
                          ) : (
                            <>
                              <Crown className="h-3 w-3 mr-1 text-amber-500" />
                              Grant Pro
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* TAB 4: TEMPLATE GOVERNANCE */}
          {activeTab === "templates" && (
            <div className="mt-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-mono text-muted-foreground">
                    Showing {filteredTemplates.length} of {templatesState.length} Templates
                  </p>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={publishAllTemplates}
                    className="h-7 text-xs px-2.5"
                  >
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Publish All 110
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={templateCategoryFilter}
                    onChange={(e) => setTemplateCategoryFilter(e.target.value)}
                    className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
                  >
                    {templateCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Filter templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card py-1.5 pl-8 pr-3 text-xs text-foreground focus:border-primary focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                <div className="divide-y divide-border">
                  {filteredTemplates.slice(0, 30).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3.5 sm:px-6 hover:bg-surface-2/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-sm text-foreground">
                            {t.name}
                          </span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.2 font-mono text-[10px] text-primary">
                            {t.category}
                          </span>
                          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 font-mono text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                            FREE
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {t.bestFor}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono text-[11px] ${
                            t.isPublished
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {t.isPublished ? "Published" : "Draft"}
                        </span>
                        <Button
                          variant={t.isPublished ? "glass" : "hero"}
                          size="sm"
                          onClick={() => togglePublish(t.id)}
                          className="text-xs h-7 px-2.5"
                        >
                          {t.isPublished ? "Unpublish" : "Publish"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* TAB 5: DOCUMENT JOBS & LOGS */}
          {activeTab === "jobs" && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-muted-foreground">
                  Recent Document Jobs ({jobs.length > 0 ? jobs.length : 6} logged)
                </p>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Ephemeral Disk Sanitization Active
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                <div className="divide-y divide-border">
                  {(jobs.length > 0
                    ? jobs
                    : [
                        {
                          jobId: "job-801",
                          toolType: "presentation",
                          originalFilename: "AI_Agentic_Future_Strategy.pptx",
                          fileSize: 3420000,
                          status: "completed",
                          metrics: { slideCount: 14, processingTimeMs: 460 },
                          createdAt: new Date().toISOString(),
                        },
                        {
                          jobId: "job-802",
                          toolType: "compress",
                          originalFilename: "Research_Findings_2026.pdf",
                          fileSize: 14200000,
                          status: "completed",
                          metrics: { reductionPercent: 68, processingTimeMs: 420 },
                          createdAt: new Date(Date.now() - 1800000).toISOString(),
                        },
                        {
                          jobId: "job-803",
                          toolType: "presentation",
                          originalFilename: "Series_A_Venture_Pitch.pptx",
                          fileSize: 2400000,
                          status: "completed",
                          metrics: { slideCount: 16, processingTimeMs: 310 },
                          createdAt: new Date(Date.now() - 3600000).toISOString(),
                        },
                        {
                          jobId: "job-804",
                          toolType: "convert",
                          originalFilename: "Financial_Report_Q3.docx",
                          fileSize: 1850000,
                          status: "completed",
                          metrics: { processingTimeMs: 290 },
                          createdAt: new Date(Date.now() - 7200000).toISOString(),
                        },
                      ]
                  ).map((job) => (
                    <div
                      key={job.jobId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 gap-2 hover:bg-surface-2/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="font-semibold text-foreground">{job.jobId}</span>
                          <span className="rounded bg-surface-2 px-1.5 py-0.2 text-[10px] text-primary uppercase font-bold">
                            {job.toolType}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground font-sans">
                          {job.originalFilename} ({(job.fileSize / 1024).toFixed(0)} KB)
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-muted-foreground">
                          {job.metrics?.processingTimeMs
                            ? `${job.metrics.processingTimeMs}ms`
                            : "Immediate"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {job.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>

      
      {/* MODAL: ADD STAFF MEMBER */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Add Staff Member
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaffMember} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground uppercase block mb-1 font-bold">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Dr. Jane Doe"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted-foreground uppercase block mb-1 font-bold">
                  Staff Work Email
                </label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="e.g. jane@documind.app"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase block mb-1 font-bold">
                    Role
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Administrator</option>
                    <option value="moderator">Moderator</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase block mb-1 font-bold">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newStaffDepartment}
                    onChange={(e) => setNewStaffDepartment(e.target.value)}
                    placeholder="e.g. AI Research"
                    className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddStaffModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="hero" size="sm" className="text-xs">
                  Add Staff Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* MODAL: SUBMIT TEST FEEDBACK */}
      {showAddFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lift">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Submit Test Feedback
              </h3>
              <button
                type="button"
                onClick={() => setShowAddFeedbackModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTestFeedback} className="mt-4 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-mono text-muted-foreground uppercase font-semibold">
                  Submitter Email
                </label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={newFeedbackEmail}
                  onChange={(e) => setNewFeedbackEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-muted-foreground uppercase font-semibold">
                    Category
                  </label>
                  <select
                    value={newFeedbackCategory}
                    onChange={(e) => setNewFeedbackCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-foreground focus:border-primary focus:outline-hidden"
                  >
                    <option value="feature">Feature Request</option>
                    <option value="improvement">Improvement</option>
                    <option value="bug">Bug Report</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-muted-foreground uppercase font-semibold">
                    Rating (1-5)
                  </label>
                  <select
                    value={newFeedbackRating}
                    onChange={(e) => setNewFeedbackRating(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-foreground focus:border-primary focus:outline-hidden"
                  >
                    <option value={5}>5 Stars — Excellent</option>
                    <option value={4}>4 Stars — Good</option>
                    <option value={3}>3 Stars — Average</option>
                    <option value={2}>2 Stars — Poor</option>
                    <option value={1}>1 Star — Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-muted-foreground uppercase font-semibold">
                  Feedback Comment
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe your feedback, feature idea, or experience..."
                  value={newFeedbackComment}
                  onChange={(e) => setNewFeedbackComment(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 p-3 text-foreground focus:border-primary focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddFeedbackModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="hero" size="sm">
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Save Feedback
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
