import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import {
  Brain,
  LogOut,
  Bell,
  Home,
  Briefcase,
  FileText,
  TrendingUp,
  User,
  Calendar,
  GraduationCap,
  Settings,
  PanelLeft,
  PanelLeftClose,
  Menu,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

const STUDENT_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/applications", label: "Applications", icon: FileText },
  { to: "/skill-gap", label: "Skill Gap", icon: TrendingUp },
  { to: "/resume", label: "Resume", icon: GraduationCap },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const RECRUITER_NAV = [
  { to: "/recruiter", label: "Dashboard", icon: Home },
  { to: "/post-job", label: "Post a job", icon: Briefcase },
  { to: "/analytics", label: "Analytics", icon: TrendingUp },
  { to: "/recruiter-interviews", label: "Interviews", icon: Calendar },
  { to: "/compare", label: "Compare Candidates", icon: User },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const nav = profile?.role === "recruiter" ? RECRUITER_NAV : STUDENT_NAV;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Desktop Sidebar - Fixed */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border bg-background transition-all duration-300 fixed left-0 top-0 h-screen z-40 ${
          isCollapsed ? "w-16 cursor-pointer" : "w-64"
        }`}
        onClick={isCollapsed ? toggleSidebar : undefined}
      >
        {/* Fixed Header */}
        <div
          className="flex h-16 items-center justify-between border-b border-border px-4 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Link to="/" className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shrink-0">
              <Brain className="size-4" />
            </span>
            {!isCollapsed && (
              <span className="font-display text-sm font-semibold">HireSense AI</span>
            )}
          </Link>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleSidebar();
              }}
              className="h-8 w-8 p-0"
              title="Close sidebar"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          )}
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-1 p-2">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={(e) => {
                  if (isCollapsed) e.stopPropagation();
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground ${
                  isCollapsed ? "justify-center" : ""
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="size-4 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Fixed Bottom Section */}
        <div className="border-t border-border p-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className={`mb-3 ${isCollapsed ? "text-center" : ""}`}>
            {!isCollapsed ? (
              <>
                <p className="text-sm font-medium leading-tight truncate">
                  {profile?.full_name || profile?.email || "Account"}
                </p>
                <p className="text-xs capitalize text-muted-foreground">{profile?.role}</p>
              </>
            ) : (
              <div className="flex items-center justify-center">
                <User className="size-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className={`w-full ${isCollapsed ? "p-0 h-8" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              signOut();
            }}
            title={isCollapsed ? "Sign out" : undefined}
          >
            {isCollapsed ? (
              <LogOut className="size-4" />
            ) : (
              <>
                <LogOut className="mr-2 size-4" />
                Sign out
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={toggleMobile} />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-border bg-background transition-transform duration-300 lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2" onClick={toggleMobile}>
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Brain className="size-4" />
            </span>
            <span className="font-display text-sm font-semibold">HireSense AI</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={toggleMobile} className="h-8 w-8 p-0">
            <X className="size-4" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-1 p-4">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={toggleMobile}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Bottom Section */}
        <div className="border-t border-border p-4">
          <div className="mb-3">
            <p className="text-sm font-medium leading-tight">
              {profile?.full_name || profile?.email || "Account"}
            </p>
            <p className="text-xs capitalize text-muted-foreground">{profile?.role}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-h-0 transition-all duration-300 lg:ml-0 ${
          isCollapsed ? "lg:ml-16" : "lg:ml-64"
        }`}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur shrink-0">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobile}
                className="lg:hidden h-8 w-8 p-0"
              >
                <Menu className="size-4" />
              </Button>
              <h1 className="text-lg font-semibold sm:text-xl">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link
                  to={profile?.role === "recruiter" ? "/recruiter-notifications" : "/notifications"}
                >
                  <Bell className="size-4" />
                </Link>
              </Button>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight">
                  {profile?.full_name || profile?.email || "Account"}
                </p>
                <p className="text-xs capitalize text-muted-foreground">{profile?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 h-[calc(100vh-4rem)]">
          <div className="mb-8">
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">{actions}</div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
