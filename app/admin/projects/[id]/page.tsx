"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function EditProjectPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // form fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("draft");
  const [techStack, setTechStack] = useState("");

  const [demoUrl, setDemoUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");

  // cover
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // preview modal
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleAddFeature = () => {
    const trimmed = featureInput.trim();
    if (!trimmed) return;
    if (!keyFeatures.includes(trimmed)) {
      setKeyFeatures([...keyFeatures, trimmed]);
    }
    setFeatureInput("");
  };

  const handleRemoveFeature = (feature: string) => {
    setKeyFeatures(keyFeatures.filter((f) => f !== feature));
  };

  // fetch project
  useEffect(() => {
    const loadProject = async () => {
      const { data, error } = await db
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setTitle(data.title);
      setSlug(data.slug);
      setDescription(data.description ?? "");
      setCategory(data.category ?? "");
      setStatus(data.status);
      setTechStack(
        data.tech_stack && Array.isArray(data.tech_stack)
          ? data.tech_stack.join(", ")
          : ""
      );
      setCoverImageUrl(data.cover_image_url ?? "");
      setCoverPreviewUrl(data.cover_image_url ?? null);
      setDemoUrl(data.demo_url ?? "");
      setGithubUrl(data.github_url ?? "");
      setKeyFeatures(data.key_features ?? []);

      setLoading(false);
    };

    loadProject();
  }, [id, db]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      let finalCoverUrl = coverImageUrl;

      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const filePath = `covers/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("project-images")
          .upload(filePath, coverFile);

        if (uploadErr) throw uploadErr;

        const {
          data: { publicUrl },
        } = supabase.storage.from("project-images").getPublicUrl(filePath);

        finalCoverUrl = publicUrl;
      }

      const payload = {
        title,
        slug: slug || slugify(title),
        description: description || null,
        status,
        category: category || null,
        tech_stack: techStack
          ? techStack.split(",").map((t) => t.trim())
          : null,
        demo_url: demoUrl || null,
        github_url: githubUrl || null,
        key_features: keyFeatures,
        cover_image_url: finalCoverUrl,
      };

      const { error } = await db.from("projects").update(payload).eq("id", id);

      if (error) throw error;

      router.push("/admin/projects");
    } catch (err: unknown) {
      setError((err as Error).message);
      setSaving(false);
      return;
    }

    setSaving(false);
  };

  const techArray = techStack ? techStack.split(",").map((t) => t.trim()) : [];

  if (loading)
    return <p className="text-sm text-muted-foreground">Loading project…</p>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit Project</h1>
          <p className="text-sm text-muted-foreground">
            Modify project details and update content.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreviewOpen(true)}
        >
          Preview
        </Button>
      </div>

      <Card className="bg-card/90 border border-border/60">
        <CardHeader>
          <CardTitle>Project details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <Alert className="bg-destructive/10 text-destructive">
                <TriangleAlertIcon className="h-4 w-4" />
                <AlertTitle>Failed to update project</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Title / Slug */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="edit-project-title">Title</Label>
                <Input
                  id="edit-project-title"
                  name="title"
                  autoComplete="off"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-project-slug">Slug</Label>
                <Input id="edit-project-slug" name="slug" autoComplete="off" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
            </div>

            {/* Category / status */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="edit-project-category">Category</Label>
                <Input
                  id="edit-project-category"
                  name="category"
                  autoComplete="off"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-project-status">Status</Label>
                <Select
                  name="status"
                  value={status}
                  onValueChange={(v) => setStatus(v as ProjectStatus)}
                >
                  <SelectTrigger id="edit-project-status" aria-label="Project status">
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
            <div>
              <Label htmlFor="edit-project-description">Description</Label>
              <Textarea
                id="edit-project-description"
                name="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Tech + Cover */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="edit-project-tech-stack">Tech Stack</Label>
                <Input
                  id="edit-project-tech-stack"
                  name="techStack"
                  autoComplete="off"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-project-cover-image">Cover Image</Label>
                <Input
                  id="edit-project-cover-image"
                  name="coverImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setCoverFile(f);
                    if (f) {
                      const url = URL.createObjectURL(f);
                      setCoverPreviewUrl(url);
                      // ไม่ต้อง setCoverImageUrl ที่นี่ ปล่อยให้ใช้ของเดิมจนกว่าจะ save
                    } else {
                      // ถ้าเคลียร์ไฟล์ ให้กลับไปใช้รูปจาก DB ถ้ามี
                      setCoverPreviewUrl(coverImageUrl || null);
                    }
                  }}
                />

                {coverPreviewUrl ? (
                  <div className="mt-2 relative w-full max-w-xs aspect-video rounded-md border border-border/60 bg-muted overflow-hidden">
                    <Image
                      src={coverPreviewUrl}
                      alt="Cover preview"
                      fill
                      sizes="(max-width: 768px) 100vw, 320px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    No cover image yet.
                  </p>
                )}
              </div>
            </div>

            {/* URLs */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="edit-project-demo-url">Live Demo URL</Label>
                <Input
                  id="edit-project-demo-url"
                  name="demoUrl"
                  autoComplete="url"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-project-github-url">GitHub URL</Label>
                <Input
                  id="edit-project-github-url"
                  name="githubUrl"
                  autoComplete="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Key Features */}
            <div>
              <Label htmlFor="edit-project-feature-input">Key Features</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="edit-project-feature-input"
                  name="featureInput"
                  autoComplete="off"
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

              <div className="mt-2 space-y-1">
                {keyFeatures.map((f) => (
                  <div
                    key={f}
                    className="flex justify-between items-center px-3 py-1.5 bg-muted/30 rounded-md"
                  >
                    <span className="text-xs">{f}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveFeature(f)}
                      className="h-6 w-6"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/projects")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Project preview</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2 md:grid-rows-2">
            {/* Title + Description */}
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold mb-2">{title}</h2>
              <p className="text-xs text-slate-700 line-clamp-5">
                {description}
              </p>
            </div>

            {/* Cover */}
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-md aspect-video rounded-xl bg-slate-900/40 border border-slate-700 overflow-hidden">
                {coverFile ? (
                  <Image
                    src={URL.createObjectURL(coverFile)}
                    alt="cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 448px"
                    className="object-cover"
                  />
                ) : coverImageUrl ? (
                  <Image
                    src={coverImageUrl}
                    alt="cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 448px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-500 text-xs">
                    No cover image
                  </div>
                )}
              </div>
            </div>

            {/* CTA + Tech */}
            <div className="flex flex-col justify-between">
              <div className="flex flex-wrap gap-2">
                {demoUrl && (
                  <Button size="sm" className="bg-sky-500 text-white">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Live Demo
                  </Button>
                )}
                {githubUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-200"
                  >
                    <Github className="h-4 w-4 mr-2" />
                    GitHub
                  </Button>
                )}
              </div>

              {techArray.length > 0 && (
                <div>
                  <p className="text-xs font-bold">Technologies Used</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {techArray.map((tech) => (
                      <Badge
                        key={tech}
                        variant="outline"
                        className="text-[11px]"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Key Features */}
            <div className="flex flex-col">
              <p className="text-xs font-bold mb-2">Key Features</p>
              <ul className="text-xs space-y-1">
                {keyFeatures.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400"></span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
