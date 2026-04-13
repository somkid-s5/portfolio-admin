"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FolderGit2, Award, ArrowRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectStatus = "draft" | "in_progress" | "done" | "archived" | string;
type CertStatus = "planned" | "in_progress" | "passed" | "expired" | string;

type ProjectRow = {
  id: string;
  title: string;
  status: ProjectStatus;
  updated_at: string;
  created_at: string;
};

type CertRow = {
  id: string;
  name: string;
  vendor: string;
  status: CertStatus;
  updated_at: string;
  created_at: string;
};

type DashboardStats = {
  totalProjects: number;
  totalCertsPassed: number;
};

type StatusCounts = Record<string, number>;

type ActivityItemType = "project" | "cert";

type ActivityItem = {
  id: string;
  type: ActivityItemType;
  title: string;
  subtitle: string;
  at: string;
};

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalCertsPassed: 0,
  });

  const [projectStatusCounts, setProjectStatusCounts] = useState<StatusCounts>(
    {}
  );
  const [certStatusCounts, setCertStatusCounts] = useState<StatusCounts>({});
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const [projectsRes, certsRes] = await Promise.all([
          supabase
            .from("projects")
            .select("id, title, status, updated_at, created_at")
            .order("updated_at", { ascending: false }),
          supabase
            .from("certs")
            .select("id, name, vendor, status, updated_at, created_at")
            .order("updated_at", { ascending: false }),
        ]);

        if (projectsRes.error) throw projectsRes.error;
        if (certsRes.error) throw certsRes.error;

        const projects = (projectsRes.data ?? []) as ProjectRow[];
        const certs = (certsRes.data ?? []) as CertRow[];

        setStats({
          totalProjects: projects.length,
          totalCertsPassed: certs.filter((c) => c.status === "passed").length,
        });

        const projCounts: StatusCounts = {};
        for (const p of projects) {
          projCounts[p.status] = (projCounts[p.status] ?? 0) + 1;
        }
        setProjectStatusCounts(projCounts);

        const certCounts: StatusCounts = {};
        for (const c of certs) {
          certCounts[c.status] = (certCounts[c.status] ?? 0) + 1;
        }
        setCertStatusCounts(certCounts);

        const projActivities: ActivityItem[] = projects.slice(0, 10).map((p) => ({
          id: p.id,
          type: "project",
          title: p.title,
          subtitle: `Project • ${p.status}`,
          at: p.updated_at || p.created_at,
        }));

        const certActivities: ActivityItem[] = certs.slice(0, 10).map((c) => ({
          id: c.id,
          type: "cert",
          title: c.name,
          subtitle: `Cert • ${c.vendor} • ${c.status}`,
          at: c.updated_at || c.created_at,
        }));

        setActivities(
          [...projActivities, ...certActivities]
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
            .slice(0, 12)
        );
      } catch (err: unknown) {
        console.error(err);
        setError((err as Error).message ?? "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your projects and certifications.
        </p>
        {error && (
          <p className="text-xs text-destructive">
            Failed to load data: {error}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="bg-card/90 border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Projects
            </CardTitle>
            <FolderGit2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold">
              {loading ? "..." : stats.totalProjects}
            </div>
            <p className="text-xs text-muted-foreground">
              Total tracked projects
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/90 border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Certifications (passed)
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold">
              {loading ? "..." : stats.totalCertsPassed}
            </div>
            <p className="text-xs text-muted-foreground">
              Exams you've already achieved
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Quick actions</p>
          <div className="grid gap-2">
            <Link href="/admin/projects/new">
              <button className="w-full inline-flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-xs hover:bg-background/90 transition">
                <span className="flex items-center gap-2">
                  <FolderGit2 className="h-3.5 w-3.5 text-primary" />
                  <span>New project</span>
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            </Link>

            <Link href="/admin/certifications/new">
              <button className="w-full inline-flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-xs hover:bg-background/90 transition">
                <span className="flex items-center gap-2">
                  <Award className="h-3.5 w-3.5 text-primary" />
                  <span>Add certification</span>
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card/90 border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Recent activity
            </CardTitle>
            {!loading && activities.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                Last {activities.length} changes
              </Badge>
            )}
          </CardHeader>
          <CardContent className="text-sm">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading activity...</p>
            ) : activities.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No activity yet. Create a project or certification to see the
                timeline here.
              </p>
            ) : (
              <ul className="space-y-3">
                {activities.map((item) => (
                  <li key={`${item.type}-${item.id}`} className="flex gap-3">
                    <div className="pt-1">
                      <Circle
                        className={cn(
                          "h-2.5 w-2.5",
                          item.type === "project" && "text-primary",
                          item.type === "cert" && "text-amber-400"
                        )}
                        fill="currentColor"
                      />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-[13px] leading-tight">
                          {item.title}
                        </p>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDateTime(item.at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {item.subtitle}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-card/90 border border-border/60">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Completion overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <p className="font-medium text-[11px] text-muted-foreground">
                  Projects status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["draft", "in_progress", "done", "archived"].map((status) => {
                    const count = projectStatusCounts[status] ?? 0;
                    if (count === 0) return null;
                    return (
                      <Badge
                        key={status}
                        variant="outline"
                        className="text-[10px] flex items-center gap-1"
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            status === "done" && "bg-emerald-400",
                            status === "in_progress" && "bg-sky-400",
                            status === "draft" && "bg-zinc-500",
                            status === "archived" && "bg-zinc-700"
                          )}
                        />
                        <span>{status}</span>
                        <span className="opacity-70">· {count}</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-border/60" />

              <div className="space-y-1.5">
                <p className="font-medium text-[11px] text-muted-foreground">
                  Certifications status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["planned", "in_progress", "passed", "expired"].map((status) => {
                    const count = certStatusCounts[status] ?? 0;
                    if (count === 0) return null;
                    return (
                      <Badge
                        key={status}
                        variant="outline"
                        className="text-[10px] flex items-center gap-1"
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            status === "passed" && "bg-emerald-400",
                            status === "in_progress" && "bg-sky-400",
                            status === "planned" && "bg-zinc-500",
                            status === "expired" && "bg-red-500"
                          )}
                        />
                        <span>{status}</span>
                        <span className="opacity-70">· {count}</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
