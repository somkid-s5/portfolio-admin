"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FolderGit2,
  PlusCircle,
  LayoutGrid,
  List,
  Search,
  SquarePen,
  Trash2,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ProjectStatus = "draft" | "in_progress" | "done" | "archived";

type ProjectItem = {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  tech_stack: string[] | null;
  updated_at: string;
  cover_image_url: string | null;
  category: string | null;
};

const statusLabel: Record<ProjectStatus, string> = {
  draft: "Draft",
  in_progress: "In progress",
  done: "Completed",
  archived: "Archived",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const db = supabase;

  // --- LOGIC ---
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [category, setCategory] = useState("all");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // 🧠 (1) สร้าง State ใหม่ เพื่อ "เก็บ" Category ที่มีทั้งหมด
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const router = useRouter();

  // --- Effect สำหรับ Debounce (รอ 300ms ค่อยค้นหา) ---
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // 🧠 (2) สร้าง Effect ใหม่: ทำงาน "ครั้งเดียว" ตอนโหลดหน้า
  // เพื่อ "สรุป" Category ทั้งหมดที่มีในตาราง
  useEffect(() => {
    const fetchCategories = async () => {
      // (ดึงแค่คอลัมน์ category มาก็พอ)
      const { data, error } = await db.from("projects").select("category");

      if (data) {
        // 1. ดึง Category ทั้งหมด: ["react", "devops", "react", null, "nextjs"]
        const allCategories = data
          .map((project: { category: string | null }) => project.category)
          .filter(Boolean) as string[]; // filter(Boolean) = กรอง null, undefined ออก

        // 2. "สรุป" (De-duplicate) ให้เหลือตัวเดียว: ["react", "devops", "nextjs"]
        const uniqueCategories = [...new Set(allCategories)];

        // 3. เรียงตามตัวอักษร
        uniqueCategories.sort();

        // 4. เก็บเข้า State
        setAvailableCategories(uniqueCategories);
      } else if (error) {
        console.error("Failed to fetch categories:", error.message);
      }
    };

    fetchCategories();
  }, [db]); // 👈 วงเล็บว่าง = ทำงานแค่ครั้งเดียวตอนโหลด

  // --- Effect สำหรับ Fetch ข้อมูล Projects (กรองข้อมูล) ---
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);

      let query = db
        .from("projects")
        .select(
          "id, title, description, status, tech_stack, updated_at, cover_image_url, category"
        );

      if (debouncedSearchTerm) {
        query = query.ilike("title", `%${debouncedSearchTerm}%`);
      }
      if (category !== "all") {
        query = query.eq("category", category);
      }
      if (sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      } else if (sortBy === "popular") {
        query = query.order("updated_at", { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setProjects(
        (data || []).map((row: unknown) => {
          const r = row as {
            id: string;
            title: string;
            description: string | null;
            status: ProjectStatus;
            tech_stack: string[] | null;
            updated_at: string;
            cover_image_url: string | null;
            category: string | null;
          };
          return {
            id: r.id,
            title: r.title,
            description: r.description,
            status: r.status,
            tech_stack: r.tech_stack,
            updated_at: r.updated_at,
            cover_image_url: r.cover_image_url,
            category: r.category,
          };
        })
      );
      setLoading(false);
    };

    fetchProjects();
  }, [debouncedSearchTerm, sortBy, category, db]);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    const id = projectToDelete;
    setDeleteDialogOpen(false); // Close dialog immediately

    // Find the project to get the image URL
    const project = projects.find((p) => p.id === id);

    const deleteOperation = async () => {
      try {
        // 1. Delete image from Storage if it exists
        if (project?.cover_image_url) {
          try {
            // Extract path from URL: .../project-images/covers/filename.ext
            // We need "covers/filename.ext"
            const url = project.cover_image_url;
            const bucketName = "project-images";

            // Check if URL contains the bucket name
            if (url.includes(bucketName)) {
              const path = url.split(`${bucketName}/`)[1];
              if (path) {
                console.log("🔴 Deleting image from storage:", path);
                const { error: storageError } = await db.storage
                  .from(bucketName)
                  .remove([path]);

                if (storageError) {
                  console.error("🔴 Storage Delete Error:", storageError);
                  // We continue even if storage delete fails, to ensure DB record is removed
                }
              }
            }
          } catch (storageErr) {
            console.error("🔴 Error processing image deletion:", storageErr);
          }
        }

        // 2. Delete record from Database
        const { error } = await db.from("projects").delete().eq("id", id);
        if (error) {
          console.error("🔴 Supabase Error:", error);
          throw error;
        }
        return true;
      } catch (err) {
        console.error("🔴 Unexpected Error:", err);
        throw err;
      }
    };

    toast.promise(deleteOperation(), {
      loading: "Deleting project...",
      success: () => {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        return "Project deleted successfully";
      },
      error: (err: unknown) => {
        return `Failed to delete project: ${(err as Error).message}`;
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">
            Manage and track your DevOps, system, and portfolio projects.
            </p>
          </div>
          <div className="shrink-0">
            <Button
              type="button"
              className="inline-flex items-center gap-2 text-white hover:bg-transparent hover:bg-opacity-75 outline-2 outline-green-500"
              onClick={() => router.push("/admin/projects/new")}
            >
              <PlusCircle className="h-4 w-4" />
              New project
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          {/* Left: Dropdowns */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger
                className="h-9 w-auto text-xs"
                aria-label="Sort options"
              >
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Sort: by newest</SelectItem>
                <SelectItem value="popular">Sort: by popular</SelectItem>
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                className="h-9 w-auto text-xs"
                aria-label="Filter by category"
              >
                <SelectValue placeholder="Category: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Category: All</SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    Category: {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right: Search, Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="projects-search"
                name="projects-search"
                placeholder="Search projects..."
                aria-label="Search projects"
                autoComplete="off"
                className="h-9 w-full md:w-[150px] lg:w-[250px] pl-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(val) =>
                val && setViewMode(val as "card" | "list")
              }
              className="border border-border/60 rounded-md px-1 py-0.5"
            >
              <ToggleGroupItem
                value="card"
                aria-label="Card view"
                className="h-8 w-8"
              >
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="list"
                aria-label="List view"
                className="h-8 w-8"
              >
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      <Separator className="bg-border/60" />

      {/* Loading / Error / Empty / List */}
      {loading ? (
        viewMode === "card" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card
                key={i}
                className="bg-card/90 border border-border/60 flex flex-col overflow-hidden gap-1 py-0"
              >
                <Skeleton className="w-full aspect-video" />
                <div className="flex flex-col gap-2 flex-1 min-h-[130px] p-2 pb-0">
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <div className="flex gap-1 mt-auto pb-1">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 p-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card
                key={i}
                className="bg-card/90 border border-border/60 p-0 gap-0"
              >
                <CardContent className="pt-3 px-4 flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-2/3" />
                    <div className="flex gap-1 mt-1">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                  <Skeleton className="h-7 w-16" />
                </CardContent>
                <div className="flex justify-end px-4 pb-1">
                  <Skeleton className="h-3 w-24" />
                </div>
              </Card>
            ))}
          </div>
        )
      ) : error ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">
            Failed to load projects: {error}
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/80">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <FolderGit2 className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No projects found</p>
            <p className="text-xs text-muted-foreground mb-4">
              Try adjusting your search or filters.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "card" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="bg-card/90 border border-border/60 flex flex-col overflow-hidden gap-1 py-0"
            >
              <div className="flex flex-col gap-2 flex-1 min-h-[130px] p-2 pb-0">
                <div className="flex gap-2">
                  <StatusBadge status={project.status} />
                  {project.category && (
                    <Badge variant="outline" className="text-muted-foreground">
                      {project.category.charAt(0).toUpperCase() +
                        project.category.slice(1)}
                    </Badge>
                  )}
                </div>

                <CardTitle className="text-sm font-semibold leading-snug line-clamp-2">
                  {project.title}
                </CardTitle>

                <p className="text-[10px] text-muted-foreground line-clamp-3">
                  {project.description || "No description provided yet."}
                </p>

                {project.tech_stack && project.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-auto pb-1">
                    {project.tech_stack.map((tech) => (
                      <Badge
                        key={tech}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border/60 p-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Updated:{" "}
                    {format(
                      new Date(project.updated_at.replace(" ", "T")),
                      "dd MMM yyyy"
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Link href={`/admin/projects/${project.id}`} passHref>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      type="button"
                    >
                      <SquarePen className="text-muted-foreground" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                    type="button"
                    onClick={(e) => handleDeleteClick(e, project.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="bg-card/90 border border-border/60 p-0 gap-0"
            >
              <CardContent className="pt-3 px-4 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{project.title}</span>
                    <StatusBadge status={project.status} />
                    {project.category && (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        {project.category.charAt(0).toUpperCase() +
                          project.category.slice(1)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {project.description || "No description provided yet."}
                  </p>
                  {project.tech_stack && project.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {project.tech_stack.map((tech) => (
                        <Badge
                          key={tech}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Link href={`/admin/projects/${project.id}`} passHref>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      type="button"
                    >
                      <SquarePen className="text-muted-foreground" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                    type="button"
                    onClick={(e) => handleDeleteClick(e, project.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
              <div className="flex justify-end px-4 pb-1">
                <span className="text-[11px] text-muted-foreground">
                  Updated:{" "}
                  {format(
                    new Date(project.updated_at.replace(" ", "T")),
                    "dd MMM yyyy"
                  )}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              project and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// (ส่วน StatusBadge เหมือนเดิมเป๊ะ)
type ProjectStatusProps = {
  status: ProjectStatus;
};

function StatusBadge({ status }: ProjectStatusProps) {
  const color = {
    draft: "bg-muted text-muted-foreground",
    in_progress: "bg-primary/10 text-primary border-primary/40",
    done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
    archived: "bg-muted text-muted-foreground/80 border-muted-foreground/20",
  }[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "border px-2 py-0 text-[10px] font-medium rounded-full",
        color
      )}
    >
      {statusLabel[status]}
    </Badge>
  );
}
