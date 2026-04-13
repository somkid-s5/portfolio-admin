"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  Award,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabaseClient";
import { syncAdminSessionCookie } from "@/lib/adminSessionCookie";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

const navItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/projects",
    label: "Projects",
    icon: FolderGit2,
  },
  {
    href: "/admin/certifications",
    label: "Certifications",
    icon: Award,
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          await syncAdminSessionCookie(null);
          toast.error("Session check failed, please sign in again.");
          router.replace("/login");
          return;
        }

        if (!data.user) {
          await syncAdminSessionCookie(null);
          router.replace("/login");
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        await syncAdminSessionCookie(
          session?.access_token ?? null,
          session?.expires_at
        );

        setChecking(false);
      } catch (err) {
        await syncAdminSessionCookie(null);
        const message =
          err instanceof Error ? err.message : "Unable to verify session";
        toast.error(message);
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await syncAdminSessionCookie(null);
    router.replace("/login");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="space-y-2 text-center">
          <div className="h-6 w-40 mx-auto bg-muted animate-pulse rounded-md" />
          <p className="text-sm text-muted-foreground">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="flex  h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-solid border-gray-alpha-400 bg-[hsla(0,0%,9%,1)]">
              <Image
                src="/sdo_logo.png"
                alt="SDO Logo"
                width={80}
                height={80}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold text-sidebar-foreground">
                Admin Panel
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] uppercase tracking-wide"
          >
            Internal
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    "text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    active &&
                      "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="border-t border-sidebar-border px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[11px]">SD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-sidebar-foreground">
                Admin
              </span>
              <span className="text-[11px] text-muted-foreground">
                Single user
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Admin /</span>
            <span className="text-sm font-medium">
              {getCurrentPageLabel(pathname)}
            </span>
          </div>
          {/* ตรงนี้คุณจะเอาไว้ใส่ search / theme-toggle / status อะไรก็ได้ทีหลัง */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Environment:</span>
            <Badge variant="outline" className="text-[10px]">
              Dev Lab
            </Badge>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function getCurrentPageLabel(pathname: string) {
  const item = navItems.find((i) => pathname.startsWith(i.href));
  return item?.label ?? "Dashboard";
}
