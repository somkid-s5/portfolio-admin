"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

type CertRow = {
  id: string;
  cert_type: CertType;
  name: string;
  vendor: string;
  category: string | null;
  level: string | null;
  status: CertStatus;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  score: number | null;
  highlight: boolean;
  notes: string | null;
  badge_image_url: string | null;
};

export default function EditCertificationPage() {
  const router = useRouter();
  const params = useParams();
  const certId = params.id as string;

  const [loading, setLoading] = useState(true);
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

  // รูป badge เดิม + ใหม่
  const [currentBadgeUrl, setCurrentBadgeUrl] = useState<string | null>(null);
  const [badgeFile, setBadgeFile] = useState<File | null>(null);
  const [badgePreview, setBadgePreview] = useState<string | null>(null);
  const [clearBadge, setClearBadge] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch the specific certification
        const { data: certData, error: certError } = await supabase
          .from("certs")
          .select("*")
          .eq("id", certId)
          .maybeSingle();

        if (certError) throw new Error(certError.message);
        if (!certData) throw new Error("Certification not found.");

        // 2. Fetch all certs to derive categories
        const { data: allCerts, error: allCertsError } = await supabase
          .from("certs")
          .select("category");

        if (allCertsError) throw new Error(allCertsError.message);

        // Derive categories
        const usedIds = new Set(
          (allCerts as { category: string | null }[])
            .map((c) => c.category)
            .filter((id): id is string => !!id)
        );
        const derivedCategories = Array.from(usedIds).map((id) => ({
          id,
          name: id,
          slug: id,
        }));
        setCategories(derivedCategories);

        // Set form state
        const row = certData as CertRow;
        setCertType(row.cert_type);
        setName(row.name);
        setVendor(row.vendor);
        setCategory(row.category ?? "");
        setLevel(row.level ?? "");
        setStatus(row.status);
        setIssueDate(row.issue_date ?? "");
        setExpiryDate(row.expiry_date ?? "");
        setCredentialId(row.credential_id ?? "");
        setCredentialUrl(row.credential_url ?? "");
        setScore(row.score != null ? String(row.score) : "");
        setHighlight(row.highlight);
        setNotes(row.notes ?? "");
        setCurrentBadgeUrl(row.badge_image_url ?? null);
        setCurrentBadgeUrl(row.badge_image_url ?? null);
      } catch (err: unknown) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (certId) {
      load();
    }
  }, [certId]);

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

      // 1) จัดการรูป badge
      let finalBadgeUrl: string | null = currentBadgeUrl;

      // ถ้า user เลือก clear badge → ล้างทิ้ง
      if (clearBadge) {
        finalBadgeUrl = null;
      }

      // ถ้ามีไฟล์ใหม่ → upload ทับ
      if (badgeFile) {
        const fileExt = badgeFile.name.split(".").pop() || "png";
        const safeName = (name || "cert")
          .toLowerCase()
          .replace(/[\s_]+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        const fileName = `badge-${safeName}-${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("cert-images")
          .upload(fileName, badgeFile, {
            upsert: true,
          });

        if (uploadError) {
          setError("Upload badge image failed: " + uploadError.message);
          setSaving(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("cert-images")
          .getPublicUrl(uploadData.path);

        finalBadgeUrl = publicUrlData.publicUrl;
      }

      // 2) payload สำหรับ update
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
        badge_image_url: finalBadgeUrl,
      };

      const { error } = await supabase
        .from("certs")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(payload as any)
        .eq("id", certId);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }

      router.push("/admin/certifications");
    } catch (err: unknown) {
      setError((err as Error).message ?? "Unknown error");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-6 w-40 bg-muted animate-pulse rounded-md" />
        <Card className="bg-card/90 border border-border/60">
          <CardContent className="py-10 text-sm text-muted-foreground">
            Loading certification…
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit certification
          </h1>
          <p className="text-sm text-muted-foreground">
            Update details, status, and badge image for this certification record.
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
            Keep your exam and training records up to date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <Alert className="mb-2 bg-destructive/10 text-destructive border-none">
                <TriangleAlertIcon className="h-4 w-4" />
                <AlertTitle>Failed to update certification</AlertTitle>
                <AlertDescription className="text-destructive/80">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Type + Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-cert-type">Type</Label>
                <Select
                  name="certType"
                  value={certType}
                  onValueChange={(val) => setCertType(val as CertType)}
                >
                  <SelectTrigger id="edit-cert-type" aria-label="Certification type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="training">Training / Course</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-cert-status">Status</Label>
                <Select
                  name="status"
                  value={status}
                  onValueChange={(val) => setStatus(val as CertStatus)}
                >
                  <SelectTrigger id="edit-cert-status" aria-label="Certification status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
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
                  required
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                />
              </div>
            </div>

            {/* Category + Level */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-cert-category">Category</Label>
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
                >
                  <SelectTrigger id="edit-cert-category" aria-label="Certification category">
                    <SelectValue placeholder="Select category" />
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
                    id="edit-cert-custom-category"
                    name="customCategory"
                    className="mt-2 h-8 text-xs"
                    placeholder="Enter new category name..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="level">Level (optional)</Label>
                <Input
                  id="level"
                  name="level"
                  autoComplete="off"
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
                  type="number"
                  min={0}
                  max={1000}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between space-y-0 rounded-md border border-border/60 px-3 py-2.5">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-cert-highlight">Highlight in portfolio</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Mark this as a key certification to show in your
                    public-facing
                    portfolio later.
                  </p>
                </div>
                <Switch id="edit-cert-highlight" checked={highlight} onCheckedChange={setHighlight} />
              </div>
            </div>

            {/* Badge image */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-cert-badge-image">Badge image</Label>
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
                  ) : currentBadgeUrl && !clearBadge ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={currentBadgeUrl}
                        alt="Current badge"
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

                <div className="flex flex-col gap-2">
                  <Input
                    id="edit-cert-badge-image"
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

                      // Use FileReader for CSP-safe preview
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setBadgePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);

                      setClearBadge(false);
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      id="edit-cert-clear-badge"
                      checked={clearBadge}
                      onCheckedChange={(val) => {
                        setClearBadge(val);
                        if (val) {
                          setBadgeFile(null);
                          setBadgePreview(null);
                        }
                      }}
                    />
                    <Label htmlFor="edit-cert-clear-badge" className="text-[11px] text-muted-foreground">
                      Remove existing badge image
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    If you upload a new image, it will replace the existing one.
                    Use the switch to clear image completely.
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/certifications")}
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
    </div>
  );
}
