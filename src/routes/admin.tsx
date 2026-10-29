import React, { useState, useEffect, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  Lock,
  Unlock,
  Key,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { TEMPLATES } from "@/data/templates";
import {
  checkBackendHealth,
  fetchAdminMetrics,
  fetchAdminImageProviders,
  fetchAdminImageSettings,
  fetchAdminImageLogs,
  fetchAdminUsers,
  fetchAdminPresentations,
  fetchAdminSettings,
  fetchAdminAuditLogs,
  purgeAdminTempFiles,
  exportAdminAuditLogs,
  testAdminImageProviderConnection,
  fetchAdminProviderAlerts,
  dismissAdminProviderAlert,
  clearAdminProviderAlerts,
  resetAdminProviderQuota,
  resetAllAdminProviderQuotas,
} from "@/lib/api-client";

// Modular Admin Subcomponents
import {
  type AdminTab,
  type AdminMetrics,
  type ProviderItem,
  type ImageSettingsItem,
  type ImageLogItem,
  type AdminUserItem,
  type PresentationSessionItem,
  type StaffAuditLogItem,
  type AdminSystemSettingsState,
  type ProviderAlertItem,
  DEFAULT_PROVIDER_ITEMS,
} from "@/components/admin/types";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminOverviewTab } from "@/components/admin/tabs/AdminOverviewTab";
import { AdminProvidersTab } from "@/components/admin/tabs/AdminProvidersTab";
import { AdminImageGenTab } from "@/components/admin/tabs/AdminImageGenTab";
import { AdminUsersTab } from "@/components/admin/tabs/AdminUsersTab";
import { AdminPresentationsTab } from "@/components/admin/tabs/AdminPresentationsTab";
import { AdminLimitsTab } from "@/components/admin/tabs/AdminLimitsTab";
import { AdminLogsTab } from "@/components/admin/tabs/AdminLogsTab";
import { AdminSettingsTab } from "@/components/admin/tabs/AdminSettingsTab";
import { AdminSecurityTab } from "@/components/admin/tabs/AdminSecurityTab";
import { AdminHealthTab } from "@/components/admin/tabs/AdminHealthTab";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Mission Control — DocuMind Admin Dashboard" },
      {
        name: "description",
        content:
          "DocuMind administrative control center: multi-provider AI image generation, presentation telemetry, and zero-retention governance.",
      },
    ],
  }),
  component: AdminPage,
});

const DEFAULT_METRICS: AdminMetrics = {
  totalUsers: 148,
  proPlanUsers: 34,
  freePlanUsers: 114,
  proConversionRate: "18.5%",
  totalJobs: 214,
  completedJobs: 208,
  failedJobs: 6,
  successRate: "97.2%",
  totalFeedback: 5,
  averageFeedbackRating: 4.88,
  uptimeSeconds: 3840,
  databaseConnected: false,
  memoryUsageMb: 86,
  totalTemplates: TEMPLATES.length,
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

function AdminPage() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [adminKey, setAdminKey] = useState("documind-admin-secret");
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [unlockInputKey, setUnlockInputKey] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(false);
  const [testingAllProviders, setTestingAllProviders] = useState(false);
  const [purging, setPurging] = useState(false);

  // Core Data Stores
  const [metrics, setMetrics] = useState<AdminMetrics>(DEFAULT_METRICS);
  const [providers, setProviders] = useState<ProviderItem[]>(DEFAULT_PROVIDER_ITEMS);
  const [imageSettings, setImageSettings] = useState<ImageSettingsItem>({
    globallyEnabled: true,
    newUserAccess: true,
    maxGenerationsPerPresentation: 3,
    maxDailyGenerationsPerUser: 10,
    maxConcurrentRequests: 3,
    timeoutSeconds: 30,
    autoFallbackEnabled: true,
    preferredAspectRatio: "16:9",
  });
  const [imageLogs, setImageLogs] = useState<ImageLogItem[]>([]);
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [presentationsList, setPresentationsList] = useState<PresentationSessionItem[]>([]);
  const [systemSettings, setSystemSettings] = useState<AdminSystemSettingsState>({
    activeProvider: "gemini",
    geminiApiKey: "",
    geminiModel: "gemini-2.5-flash",
    imagenModel: "imagen-3.0-generate-002",
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
  });
  const [auditLogs, setAuditLogs] = useState<StaffAuditLogItem[]>([]);
  const [providerAlerts, setProviderAlerts] = useState<ProviderAlertItem[]>([]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Live health probe
      const health = await checkBackendHealth();
      if (health) {
        setMetrics((prev) => ({
          ...prev,
          databaseConnected: health.database === "Cloud Firestore (Connected)",
          uptimeSeconds: health.uptimeSeconds,
        }));
      }

      // 2. Metrics
      const mRes = await fetchAdminMetrics(adminKey);
      if (mRes?.data) {
        setMetrics((prev) => ({ ...prev, ...mRes.data }));
      }

      // 3. AI Providers
      const pRes = await fetchAdminImageProviders(adminKey);
      if (pRes?.data && Array.isArray(pRes.data) && pRes.data.length > 0) {
        setProviders(pRes.data);
      }

      // 4. Image Settings & Logs
      const sRes = await fetchAdminImageSettings(adminKey);
      if (sRes?.data) {
        setImageSettings(sRes.data);
      }
      const lRes = await fetchAdminImageLogs(adminKey);
      if (lRes?.data && Array.isArray(lRes.data)) {
        setImageLogs(lRes.data);
      }

      // 5. Provider Quota & Failover Alerts
      const alertsRes = await fetchAdminProviderAlerts(adminKey);
      if (Array.isArray(alertsRes)) {
        setProviderAlerts(alertsRes);
      }

      // 6. Users List
      const uRes = await fetchAdminUsers(adminKey);
      if (uRes?.data && Array.isArray(uRes.data)) {
        setUsersList(uRes.data);
      }

      // 7. Presentations List
      const presRes = await fetchAdminPresentations(adminKey);
      if (presRes?.data && Array.isArray(presRes.data)) {
        setPresentationsList(presRes.data);
      }

      // 8. System Settings
      const sysRes = await fetchAdminSettings(adminKey);
      if (sysRes?.data) {
        setSystemSettings(sysRes.data);
      }

      // 9. Staff Audit Logs
      const aRes = await fetchAdminAuditLogs(adminKey);
      if (aRes?.data && Array.isArray(aRes.data)) {
        setAuditLogs(aRes.data);
      }
    } catch (err) {
      console.warn("Could not synchronize remote admin data:", err);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated, loadAllData]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockInputKey.trim()) {
      toast.error("Please enter the Master Secret Key.");
      return;
    }
    setAdminKey(unlockInputKey.trim());
    setIsAuthenticated(true);
    toast.success("Administrator Console Unlocked");
  };

  const handleLockConsole = () => {
    setIsAuthenticated(false);
    toast.info("Console locked for security.");
  };

  const handleTestAllProviders = async () => {
    setTestingAllProviders(true);
    toast.loading("Running live connectivity probe across all 5 AI providers...", {
      id: "probe-all",
    });
    try {
      for (const p of providers) {
        await testAdminImageProviderConnection(p.id, undefined, adminKey);
      }
      toast.success("All provider connection checks completed!", { id: "probe-all" });
      loadAllData();
    } catch {
      toast.error("Batch provider test encountered an error.", { id: "probe-all" });
    } finally {
      setTestingAllProviders(false);
    }
  };

  const handlePurgeTempFiles = async () => {
    if (!window.confirm("Purge all expired presentation files and disk caches?")) return;
    setPurging(true);
    try {
      const res = await purgeAdminTempFiles(adminKey);
      if (res && res.success) {
        toast.success(res.message || "Purged expired files.");
        loadAllData();
      }
    } catch {
      toast.error("Failed to purge temporary files");
    } finally {
      setPurging(false);
    }
  };

  const handleExportAuditReport = async () => {
    try {
      const csv = await exportAdminAuditLogs("csv", adminKey);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documind_audit_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Audit report exported as CSV.");
    } catch {
      toast.error("Failed to export audit report");
    }
  };

  const handleResetQuota = async (providerId: string) => {
    try {
      await resetAdminProviderQuota(providerId, adminKey);
      toast.success(`Quota counter reset for provider "${providerId}".`);
      loadAllData();
    } catch {
      toast.error(`Failed to reset quota for "${providerId}".`);
    }
  };

  const handleResetAllQuotas = async () => {
    try {
      await resetAllAdminProviderQuotas(adminKey);
      toast.success("All AI provider quotas successfully restored.");
      loadAllData();
    } catch {
      toast.error("Failed to reset provider quotas.");
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await dismissAdminProviderAlert(alertId, adminKey);
      setProviderAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast.info("Alert dismissed.");
    } catch {
      toast.error("Failed to dismiss alert.");
    }
  };

  const handleClearAlerts = async () => {
    try {
      await clearAdminProviderAlerts(adminKey);
      setProviderAlerts([]);
      toast.success("All provider alerts cleared.");
    } catch {
      toast.error("Failed to clear alerts.");
    }
  };

  // Locked Console Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <header className="h-16 border-b border-border px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to DocuMind Studio</span>
          </Link>
          <span className="text-xs font-mono font-bold text-muted-foreground uppercase">
            Restricted Admin Area
          </span>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-2xl space-y-6 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Lock className="h-8 w-8" />
            </div>

            <div>
              <h2 className="font-serif text-2xl font-bold text-foreground">
                Mission Control Authorization
              </h2>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Enter your Master Administrator Secret or connect using an authorized administrator account to access provider configuration, limits, and telemetry.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="font-mono text-[11px] font-semibold text-muted-foreground block">
                  Master Secret Key
                </label>
                <div className="relative">
                  <Key className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="password"
                    value={unlockInputKey}
                    onChange={(e) => setUnlockInputKey(e.target.value)}
                    placeholder="Enter secret key..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background font-mono text-xs text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <Button type="submit" size="lg" variant="hero" className="w-full font-mono text-xs gap-2">
                <Unlock className="h-4 w-4" />
                <span>Unlock Control Center</span>
              </Button>
            </form>

            <div className="p-3 rounded-xl border border-border bg-muted/30 text-[11px] text-muted-foreground font-mono text-left">
              <span>Default development key: </span>
              <code className="text-primary font-bold">documind-admin-secret</code>
            </div>
          </div>
        </div>

        <footer className="h-14 border-t border-border px-6 flex items-center justify-center text-xs text-muted-foreground font-mono">
          DocuMind Production Security Standard • Zero-Storage Ephemeral Boundary
        </footer>
      </div>
    );
  }

  const readyProvidersCount = providers.filter((p) => p.status === "ready" || p.isConfigured).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          readyProvidersCount={readyProvidersCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Sticky Top Navigation Bar */}
          <AdminTopBar
            activeTab={activeTab}
            loading={loading}
            onRefresh={loadAllData}
            onLockConsole={handleLockConsole}
            adminUserEmail={user?.email || "admin@documind.app"}
            databaseConnected={metrics.databaseConnected}
            alerts={providerAlerts}
            onResetQuota={handleResetQuota}
            onDismissAlert={handleDismissAlert}
            onClearAlerts={handleClearAlerts}
            onNavigateTab={(t) => setActiveTab(t)}
          />

          {/* Dynamic Tab Body */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {activeTab === "overview" && (
              <AdminOverviewTab
                metrics={metrics}
                providers={providers}
                imageLogs={imageLogs}
                onTestAllProviders={handleTestAllProviders}
                onPurgeTempFiles={handlePurgeTempFiles}
                onExportAuditReport={handleExportAuditReport}
                onNavigateTab={(t) => setActiveTab(t)}
                testingAll={testingAllProviders}
                purging={purging}
                alerts={providerAlerts}
                onResetQuota={handleResetQuota}
              />
            )}

            {activeTab === "providers" && (
              <AdminProvidersTab
                providers={providers}
                onRefresh={loadAllData}
                adminKey={adminKey}
                alerts={providerAlerts}
                onResetQuota={handleResetQuota}
                onResetAllQuotas={handleResetAllQuotas}
                onDismissAlert={handleDismissAlert}
                onClearAlerts={handleClearAlerts}
              />
            )}

            {activeTab === "image-gen" && (
              <AdminImageGenTab
                settings={imageSettings}
                logs={imageLogs}
                onRefresh={loadAllData}
                adminKey={adminKey}
              />
            )}

            {activeTab === "users" && (
              <AdminUsersTab
                users={usersList}
                onRefresh={loadAllData}
                adminKey={adminKey}
              />
            )}

            {activeTab === "presentations" && (
              <AdminPresentationsTab
                presentations={presentationsList}
                onRefresh={loadAllData}
                adminKey={adminKey}
              />
            )}

            {activeTab === "limits" && (
              <AdminLimitsTab
                settings={systemSettings}
                onRefresh={loadAllData}
                adminKey={adminKey}
              />
            )}

            {activeTab === "activity-logs" && (
              <AdminLogsTab
                auditLogs={auditLogs}
                imageLogs={imageLogs}
                onRefresh={loadAllData}
                adminKey={adminKey}
              />
            )}

            {activeTab === "settings" && (
              <AdminSettingsTab
                settings={systemSettings}
                onRefresh={loadAllData}
                adminKey={adminKey}
              />
            )}

            {activeTab === "security" && (
              <AdminSecurityTab
                onRefresh={loadAllData}
                adminKey={adminKey}
              />
            )}

            {activeTab === "health" && (
              <AdminHealthTab
                metrics={metrics}
                onRefresh={loadAllData}
                adminKey={adminKey}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
