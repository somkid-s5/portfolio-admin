"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase as supabaseClient } from "@/lib/supabaseClient";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseClient as any;
import Image from "next/image";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { TriangleAlertIcon } from "lucide-react";

type CertType = "exam" | "training" | "other";
type CertStatus = "planned" | "in_progress" | "passed" | "expired";

type CertCategoryRow = {
  id: string;
  name: string;
  slug: string;
};

export default function NewCertificationPage() {
  const router = useRouter();

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CertCategoryRow[]>([]);

  // form state
  const [certType, setCertType] = useState<CertType>("exam");
  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState<string>("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState<CertStatus>("planned");
  const [issueDate, setIssueDate] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [credentialId, setCredentialId] = useState("");
  const [credentialUrl, setCredentialUrl] = useState("");
  const [score, setScore] = useState<string>("");
  const [highlight, setHighlight] = useState(false);
  const [notes, setNotes] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [badgeFile, setBadgeFile] = useState<File | null>(null);
  const [badgePreview, setBadgePreview] = useState<string | null>(null);

  // Load categories derived from existing certifications (no cert_categories table)
  useEffect(() => {
    const load = async () => {
      setLoadingCategories(true);
      setError(null);
      try {
        const { data, error } = await supabase.from("certs").select("category");

        if (error) throw new Error(error.message);

        const usedIds = new Set(
          (data as { category: string | null }[])
            .map((c) => c.category)
            .filter((id): id is string => !!id)
        );
        const derived = Array.from(usedIds).map((id) => ({
          id,
          name: id,
          slug: id,
        }));
        setCategories(derived);
        setCategories(derived);
      } catch (e: unknown) {
        setError((e as Error).message || "Failed to load categories.");
      } finally {
        setLoadingCategories(false);
      }
    };
    load();
  }, []);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (!name.trim()) {
        setError("Please enter certification name.");
        setSaving(false);
        return;
      }
      if (!vendor.trim()) {
        setError("Please enter vendor / organization.");
        setSaving(false);
        return;
      }

      // Upload badge image if provided
      let badgeImageUrl: string | null = null;
      if (badgeFile) {
        const fileExt = badgeFile.name.split(".").pop() || "png";
        const safeName = name
          .toLowerCase()
          .replace(/[\s_]+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        const fileName = `badge-${safeName}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("cert-images")
          .upload(fileName, badgeFile, { upsert: true });
        if (uploadError) {
          setError("Upload badge image failed: " + uploadError.message);
          setSaving(false);
          return;
        }
        const { data: publicUrlData } = supabase.storage
          .from("cert-images")
          .getPublicUrl(uploadData.path);
        badgeImageUrl = publicUrlData.publicUrl;
      }

      const payload = {
        cert_type: certType,
        name: name.trim(),
        vendor: vendor.trim(),
        category: category || null,
        level: level || null,
        status,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        credential_id: credentialId || null,
        credential_url: credentialUrl || null,
        score: score ? Number(score) : null,
        highlight,
        notes: notes || null,
        badge_image_url: badgeImageUrl,
      };

      const { error: insertError } = await supabase
        .from("certs")
        .insert(payload);
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      router.push("/admin/certifications");
    } catch (err: unknown) {
      setError((err as Error).message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            New certification
          </h1>
          <p className="text-sm text-muted-foreground">
            Add a new certification or credential entry from exams or training.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/certifications")}
        >
          Back to list
        </Button>
      </div>

      <Card className="bg-card/90 border border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Certification details</CardTitle>
          <CardDescription>
            Track exam certifications and training / course completions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <Alert className="mb-2 bg-destructive/10 text-destructive border-none">
                <TriangleAlertIcon className="h-4 w-4" />
                <AlertTitle>Failed to create certification</AlertTitle>
                <AlertDescription className="text-destructive/80">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Type + Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-cert-type">Type</Label>
                <Select
                  name="certType"
                  value={certType}
                  onValueChange={(val) => setCertType(val as CertType)}
                >
                  <SelectTrigger id="new-cert-type" aria-label="Certification type" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="training">Training / Course</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Use <span className="font-medium">Exam</span> for real
                  certification records, and{" "}
                  <span className="font-medium">Training</span> for courses or
                  workshops.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-cert-status">Status</Label>
                <Select
                  name="status"
                  value={status}
                  onValueChange={(val) => setStatus(val as CertStatus)}
                >
                  <SelectTrigger id="new-cert-status" aria-label="Certification status" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Helps you plan what to study next and monitor expirations.
                </p>
              </div>
            </div>

            {/* Name + Vendor */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Certification name</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="off"
                  placeholder="e.g. CCNP ENCOR, OCI Foundations, ISC2 CC"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vendor">Vendor / Organization</Label>
                <Input
                  id="vendor"
                  name="vendor"
                  autoComplete="organization"
                  placeholder="Cisco, Oracle, ISC2, CompTIA, Microsoft..."
                  required
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                />
              </div>
            </div>

            {/* Category + Level */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-cert-category">Category</Label>
                <Select
                  name="category"
                  value={isCustomCategory ? "_custom_" : category || "none"}
                  onValueChange={(val) => {
                    if (val === "_custom_") {
                      setIsCustomCategory(true);
                      setCategory("");
                    } else {
                      setIsCustomCategory(false);
                      if (val === "none") setCategory("");
                      else setCategory(val);
                    }
                  }}
                  disabled={loadingCategories}
                >
                  <SelectTrigger id="new-cert-category" aria-label="Certification category" className="h-8 text-xs">
                    <SelectValue
                      placeholder={
                        loadingCategories
                          ? "Loading categories..."
                          : "Select category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    <SelectItem
                      value="_custom_"
                      className="font-medium text-primary"
                    >
                      + Create new category
                    </SelectItem>
                  </SelectContent>
                </Select>
                {isCustomCategory && (
                  <Input
                    id="new-cert-custom-category"
                    name="customCategory"
                    className="mt-2 h-8 text-xs"
                    placeholder="Enter new category name..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    autoFocus
                  />
                )}
                <p className="text-[11px] text-muted-foreground">
                  For example: Network, Cloud, Security, Database, System...
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="level">Level (optional)</Label>
                <Input
                  id="level"
                  name="level"
                  autoComplete="off"
                  placeholder="Foundations, Associate, Professional, Expert..."
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="issue">Issue date</Label>
                <Input
                  id="issue"
                  name="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expiry">Expiry date (optional)</Label>
                <Input
                  id="expiry"
                  name="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            {/* Credential info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="credId">Credential ID (optional)</Label>
                <Input
                  id="credId"
                  name="credentialId"
                  autoComplete="off"
                  placeholder="e.g. Certificate ID / Candidate ID"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="credUrl">Credential URL (optional)</Label>
                <Input
                  id="credUrl"
                  name="credentialUrl"
                  autoComplete="url"
                  placeholder="https://..."
                  value={credentialUrl}
                  onChange={(e) => setCredentialUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Score + Highlight */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="score">Score (optional)</Label>
                <Input
                  id="score"
                  name="score"
                  autoComplete="off"
                  placeholder="e.g. 850"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="highlight"
                  checked={highlight}
                  onCheckedChange={setHighlight}
                />
                <Label htmlFor="highlight">Highlight on dashboard</Label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                  id="notes"
                  name="notes"
                placeholder="Any additional information..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Badge image upload */}
            <div className="space-y-1.5">
              <Label htmlFor="new-cert-badge-image">Badge image (optional)</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-md border border-dashed border-border/60 flex items-center justify-center overflow-hidden bg-muted/30">
                  {badgePreview ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={badgePreview}
                        alt="Badge preview"
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground text-center px-1">
                      No image
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Input
                    id="new-cert-badge-image"
                    name="badgeImage"
                    type="file"
                    accept="image/*"
                    className="h-8"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        setBadgeFile(null);
                        setBadgePreview(null);
                        return;
                      }
                      setBadgeFile(file);

                      // Use FileReader to create a data URL (allowed by CSP) instead of blob:
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setBadgePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Upload a badge or logo for this certification.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/certifications")}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create certification"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
