"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { supabase } from "@/lib/supabaseClient";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TriangleAlertIcon, ExternalLink, Github } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProjectStatus = "draft" | "in_progress" | "done" | "archived";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function NewProjectPage() {
  const router = useRouter();

  // main fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("draft");
  const [techStack, setTechStack] = useState("");
  const [category, setCategory] = useState("");

  const [demoUrl, setDemoUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  // cover image
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // key features (array of strings)
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // preview modal
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleGenerateSlug = () => {
    if (!title) return;
    setSlug(slugify(title));
  };

  const handleAddFeature = () => {
    const trimmed = featureInput.trim();
    if (!trimmed) return;
    setKeyFeatures((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    setFeatureInput("");
  };

  const handleRemoveFeature = (feature: string) => {
    setKeyFeatures((prev) => prev.filter((f) => f !== feature));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let finalCoverUrl = coverImageUrl || null;

      // upload cover file if present
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const filePath = `covers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("project-images")
          .upload(filePath, coverFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload cover image failed: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("project-images").getPublicUrl(filePath);

        finalCoverUrl = publicUrl;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        title,
        slug: slug || slugify(title),
        description: description || null,
        status,
        tech_stack: techStack
          ? techStack
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : null,
        category: category || null,
        cover_image_url: finalCoverUrl,
        demo_url: demoUrl || null,
        github_url: githubUrl || null,
        key_features: keyFeatures.length > 0 ? keyFeatures : [], // text[] column
      };

      const { error } = await supabase.from("projects").insert(payload);

      if (error) {
        throw new Error(error.message);
      }

      router.push("/admin/projects");
    } catch (err: unknown) {
      setError((err as Error).message ?? "Unknown error");
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  const techArray = techStack
    ? techStack
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header + Preview button */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Project</h1>
          <p className="text-sm text-muted-foreground">
            Create a new project entry for your portfolio, lab, or internal
            work.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreviewOpen(true)}
          disabled={
            !title &&
            !description &&
            !coverImageUrl &&
            !coverFile &&
            keyFeatures.length === 0
          }
        >
          Preview
        </Button>
      </div>

      {/* Form card */}
      <Card className="bg-card/90 border border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Project details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <Alert className="mb-2 bg-destructive/10 text-destructive border-none">
                <TriangleAlertIcon className="h-4 w-4" />
                <AlertTitle>Failed to create project</AlertTitle>
                <AlertDescription className="text-destructive/80">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Title / Slug */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  autoComplete="off"
                  placeholder="e.g. Aritmatika Solver"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!slug) {
                      setSlug(slugify(e.target.value));
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    name="slug"
                    autoComplete="off"
                    placeholder="aritmatika-solver"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={handleGenerateSlug}
                  >
                    Auto
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Used for URLs and unique identifier.
                </p>
              </div>
            </div>

            {/* Category / Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category (optional)</Label>
                <Input
                  id="category"
                  name="category"
                  autoComplete="off"
                  placeholder="e.g. DevOps, Portfolio"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Used for grouping and filters.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="project-status">Status</Label>
                <Select
                  name="status"
                  value={status}
                  onValueChange={(value) => setStatus(value as ProjectStatus)}
                >
                  <SelectTrigger id="project-status" aria-label="Project status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="done">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Main paragraph shown under the title…"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Tech stack + cover */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="techStack">Tech Stack</Label>
                <Input
                  id="techStack"
                  name="techStack"
                  autoComplete="off"
                  placeholder="Python, FastAPI, Next.js"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Separate with commas. Used in “Technologies Used”.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coverImage">Cover image</Label>
                <Input
                  id="coverImage"
                  name="coverImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setCoverFile(file);
                    if (!file) return;
                    setCoverImageUrl("");
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Used as hero mockup image on the right.
                </p>
              </div>
            </div>

            {/* Links */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="demoUrl">Live demo URL</Label>
                <Input
                  id="demoUrl"
                  name="demoUrl"
                  autoComplete="url"
                  placeholder="https://your-demo-url.com"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="githubUrl">GitHub URL</Label>
                <Input
                  id="githubUrl"
                  name="githubUrl"
                  autoComplete="url"
                  placeholder="https://github.com/your/repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Key Features */}
            <div className="space-y-2">
              <Label htmlFor="featureInput">Key Features</Label>
              <p className="text-[11px] text-muted-foreground">
                Short bullet points that will be shown in the right panel of the
                project page.
              </p>
              <div className="flex gap-2">
                <Input
                  id="featureInput"
                  name="featureInput"
                  autoComplete="off"
                  placeholder="e.g. Solve arithmetic sequences automatically"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddFeature}
                >
                  Add
                </Button>
              </div>

              {keyFeatures.length > 0 && (
                <div className="mt-2 space-y-1">
                  {keyFeatures.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center justify-between text-sm bg-muted/40 rounded-md px-3 py-1.5"
                    >
                      <span className="text-xs">{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveFeature(feature)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/projects")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating…" : "Create project"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* PREVIEW MODAL (size B) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl gap-2 ">
          <DialogHeader>
            <DialogTitle>Project preview</DialogTitle>
          </DialogHeader>

          {/* 2x2 grid, กำหนดความสูงรวม */}
          <div className=" grid gap-4 md:grid-cols-2 md:grid-rows-2  ">
            {/* 1) Title + Description */}
            <div className="h-full flex flex-col">
              <h2 className="text-md md:text-lg font-semibold tracking-tight mb-3">
                {title || "Project title goes here"}
              </h2>
              <p className="text-xs leading-relaxed line-clamp-5  text-slate-700  pr-1">
                {description ||
                  "This is where your main project description lives. Describe what the app does and who it is for."}
              </p>
            </div>

            {/* 2) Cover image */}
            <div className="h-full flex items-center justify-center">
              <div className="relative w-full max-w-md aspect-video rounded-2xl bg-slate-900/80 border border-slate-700 overflow-hidden">
                {coverFile ? (
                  <Image
                    src={URL.createObjectURL(coverFile)}
                    alt="Cover preview"
                    fill
                    sizes="(max-width: 768px) 100vw, 448px"
                    className="object-cover"
                  />
                ) : coverImageUrl ? (
                  <Image
                    src={coverImageUrl}
                    alt="Cover preview"
                    fill
                    sizes="(max-width: 768px) 100vw, 448px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-500 text-xs">
                    Cover image preview
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/40 to-transparent" />
              </div>
            </div>

            {/* 3) CTA + Tech */}
            <div className=" flex flex-col justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                {demoUrl && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-sky-500 hover:bg-sky-600 text-white"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Live Demo
                  </Button>
                )}
                {githubUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-slate-600 bg-slate-900/60 text-slate-50 hover:bg-slate-800"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </Button>
                )}
              </div>

              {techArray.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold">Technologies Used</p>
                  <div className="flex flex-wrap gap-1.5">
                    {techArray.map((tech) => (
                      <Badge
                        key={tech}
                        variant="outline"
                        className="border-slate-600/70 bg-slate-900/70 text-[11px]"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4) Key Features */}
            <div className=" flex flex-col">
              {keyFeatures.length > 0 && (
                <>
                  <p className="text-xs font-bold mb-2">Key Features</p>
                  <ul className="space-y-2 text-xs text-slate-700 overflow-y-auto pr-1">
                    {keyFeatures.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
