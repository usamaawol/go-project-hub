import React from "react";
import {
  LayoutDashboard,
  Cpu,
  Image as ImageIcon,
  Users,
  Presentation,
  SlidersHorizontal,
  Activity,
  Settings,
  ShieldCheck,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { AdminTab } from "./types";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  readyProvidersCount: number;
}

export function AdminSidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  readyProvidersCount,
}: AdminSidebarProps) {
  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
    badgeColor?: string;
  }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    {
      id: "providers",
      label: "AI Providers",
      icon: Cpu,
      badge: `${readyProvidersCount}/5`,
      badgeColor: readyProvidersCount > 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    { id: "image-gen", label: "Image Generation", icon: ImageIcon },
    { id: "users", label: "Users & Accounts", icon: Users },
    { id: "presentations", label: "Presentations", icon: Presentation },
    { id: "limits", label: "Usage & Limits", icon: SlidersHorizontal },
    { id: "activity-logs", label: "Activity Logs", icon: Activity },
    { id: "settings", label: "Feature Settings", icon: Settings },
    { id: "security", label: "Security & Access", icon: ShieldCheck },
    { id: "health", label: "System Health", icon: HeartPulse },
  ];

  return (
    <aside
      className={`border-r border-border bg-card/95 backdrop-blur-md transition-all duration-300 flex flex-col justify-between shrink-0 select-none z-20 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="font-serif text-base font-bold tracking-tight text-foreground block leading-tight">
                  DocuMind
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block font-semibold">
                  Admin Console
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              <Sparkles className="h-4 w-4" />
            </div>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hidden sm:flex"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation List */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                } ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between text-left truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border font-semibold ml-2 ${
                          isActive
                            ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                            : item.badgeColor || "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Status */}
      {!collapsed && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono font-medium text-muted-foreground">
              Master System Active
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/80 mt-1">
            Zero-Storage Privacy Enforced
          </p>
        </div>
      )}
    </aside>
  );
}
