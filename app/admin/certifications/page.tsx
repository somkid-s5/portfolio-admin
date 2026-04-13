"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  Plus,
  Trophy,
  Calendar,
  Filter,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

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
  badge_image_url: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function getExpiryState(
  expiryDate: string | null,
  status: CertStatus
): "none" | "ok" | "soon" | "expired" {
  if (!expiryDate) return "none";
  const now = new Date();
  const exp = new Date(expiryDate);
  if (Number.isNaN(exp.getTime())) return "none";
  if (status === "expired" || exp.getTime() < now.getTime()) return "expired";
  const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 60 ? "soon" : "ok";
}

function statusBadgeVariant(status: CertStatus) {
  switch (status) {
    case "planned":
      return "outline";
    case "in_progress":
      return "secondary";
    case "passed":
      return "default";
    case "expired":
      return "destructive";
    default:
      return "outline";
  }
}

function typeLabel(type: CertType) {
  switch (type) {
    case "exam":
      return "Exam";
    case "training":
      return "Training";
    case "other":
      return "Other";
    default:
      return type;
  }
}

export default function CertificationsPage() {
  const router = useRouter();
  const db = supabase;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [categories, setCategories] = useState<CertCategoryRow[]>([]);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<CertType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<CertStatus | "all">("all");
  const [filterVendor, setFilterVendor] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [certToDelete, setCertToDelete] = useState<string | null>(null);

  const deriveCategories = (rows: CertRow[]): CertCategoryRow[] => {
    const uniqueCategories = Array.from(
      new Set(rows.map((row) => row.category?.trim()).filter(Boolean))
    ) as string[];

    return uniqueCategories
      .sort((a, b) => a.localeCompare(b))
      .map((category) => ({
        id: category,
        name: category,
        slug: category.toLowerCase().replace(/\s+/g, "-"),
      }));
  };

  // Load certifications and derive categories from current records
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const certRes = await db
          .from("certs")
          .select(
            "id, cert_type, name, vendor, category, level, status, issue_date, expiry_date, credential_id, credential_url, score, highlight, badge_image_url"
          )
          .order("issue_date", { ascending: false })
          .order("created_at", { ascending: false });
        if (certRes.error) throw new Error(certRes.error.message);
        const certRows = (certRes.data ?? []) as CertRow[];
        setCerts(certRows);
        setCategories(deriveCategories(certRows));
      } catch (e: unknown) {
        setError((e as Error).message || "Failed to load certifications.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [db]);

  const vendors = useMemo(() => {
    const set = new Set<string>();
    certs.forEach((c) => set.add(c.vendor));
    return Array.from(set).sort();
  }, [certs]);

  const usedCategories = useMemo(() => {
    return categories;
  }, [certs, categories]);

  const filteredCerts = useMemo(() => {
    return certs.filter((c) => {
      if (filterType !== "all" && c.cert_type !== filterType) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterVendor !== "all" && c.vendor !== filterVendor) return false;
      if (filterCategory !== "all" && (c.category ?? "none") !== filterCategory)
        return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(
            c.name.toLowerCase().includes(q) ||
            c.vendor.toLowerCase().includes(q) ||
            (c.level ?? "").toLowerCase().includes(q)
          )
        )
          return false;
      }
      return true;
    });
  }, [certs, filterType, filterStatus, filterVendor, filterCategory, search]);

  const getCategoryName = (id: string | null) => {
    if (!id) return "—";
    const cat = categories.find((c) => c.id === id);
    return cat?.name ?? "—";
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCertToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!certToDelete) return;
    const id = certToDelete;
    setDeleteDialogOpen(false);
    const cert = certs.find((c) => c.id === id);
    const deleteOperation = async () => {
      try {
        if (cert?.badge_image_url) {
          const url = cert.badge_image_url;
          let bucketName = "cert-images";
          if (url.includes("/cert-images/")) bucketName = "cert-images";
          else if (url.includes("/badges/")) bucketName = "badges";
          else if (url.includes("/cert-badges/")) bucketName = "cert-badges";
          if (url.includes(bucketName)) {
            const rawPath = url.split(`${bucketName}/`)[1];
            if (rawPath) {
              const path = decodeURIComponent(rawPath);
              const { error: storageError } = await db.storage
                .from(bucketName)
                .remove([path]);
              if (storageError)
                console.error("Storage Delete Error:", storageError);
            }
          }
        }
        const { error } = await db.from("certs").delete().eq("id", id);
        if (error) throw error;
        return true;
      } catch (e) {
        console.error("Unexpected Error:", e);
        throw e;
      }
    };
    toast.promise(deleteOperation(), {
      loading: "Deleting certification...",
      success: () => {
        setCerts((prev) => prev.filter((c) => c.id !== id));
        return "Certification deleted successfully";
      },
      error: (err: unknown) =>
        `Failed to delete certification: ${(err as Error).message}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Certifications
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your exams, training certifications, and credentials in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => router.push("/admin/certifications/new")}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add certification
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="bg-destructive/10 text-destructive border-none">
          <AlertTitle>Failed to load certifications</AlertTitle>
          <AlertDescription className="text-destructive/80">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters + Summary */}
      <Card className="bg-card/90 border border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Certifications
                overview
              </CardTitle>
              <CardDescription>
                Filter by cert type, vendor, and status. Great for planning your
                learning roadmap.
              </CardDescription>
            </div>
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{certs.length} total</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters</span>
              </div>

              {/* cert type */}
              <Select
                value={filterType}
                onValueChange={(val) => setFilterType(val as CertType | "all")}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              {/* status */}
              <Select
                value={filterStatus}
                onValueChange={(val) =>
                  setFilterStatus(val as CertStatus | "all")
                }
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              {/* vendor */}
              <Select
                value={filterVendor}
                onValueChange={(val) => setFilterVendor(val)}
              >
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vendors</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* category */}
              <Select
                value={filterCategory}
                onValueChange={(val) => setFilterCategory(val)}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {usedCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* search */}
              <div className="w-full md:w-60 ">
                <Input
                  placeholder="Search name, vendor, level…"
                  id="certifications-admin-search"
                  name="certifications-admin-search"
                  aria-label="Search certifications by name, vendor, or level"
                  autoComplete="off"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="rounded-md border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[52px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue / Expiry</TableHead>
                    <TableHead className="text-right w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-9 w-9 rounded-md" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[180px]" />
                          <Skeleton className="h-3 w-[100px]" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[100px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[100px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[80px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-[60px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-[70px]" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-[80px]" />
                          <Skeleton className="h-3 w-[80px]" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-7 w-12 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredCerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No certifications match your filters yet.
            </p>
          ) : (
            <div className="rounded-md border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[52px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue / Expiry</TableHead>
                    <TableHead className="text-right w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCerts.map((cert) => {
                    const expiryState = getExpiryState(
                      cert.expiry_date,
                      cert.status
                    );
                    return (
                      <TableRow key={cert.id}>
                        {/* Badge */}
                        <TableCell>
                          <div className="w-9 h-9 rounded-md border border-border/60 bg-muted/40 overflow-hidden flex items-center justify-center">
                            {cert.badge_image_url ? (
                              <Image
                                src={cert.badge_image_url}
                                alt={cert.name}
                                width={36}
                                height={36}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-muted-foreground px-1 text-center">
                                {cert.vendor.slice(0, 3).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        {/* Name + level */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {cert.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {cert.level || ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{cert.vendor}</TableCell>
                        <TableCell className="text-sm">
                          {cert.category || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 px-2"
                          >
                            {typeLabel(cert.cert_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge
                            variant={statusBadgeVariant(cert.status)}
                            className="text-[10px] h-5 px-2 capitalize"
                          >
                            {cert.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        {/* Issue / Expiry + warning */}
                        <TableCell className="text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span>{formatDate(cert.issue_date)}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-muted-foreground">
                                {formatDate(cert.expiry_date)}
                              </span>
                              {expiryState === "soon" && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-4 px-1.5 text-amber-500 border-amber-500/40"
                                >
                                  <AlertTriangle className="mr-1 h-3 w-3" />{" "}
                                  Soon
                                </Badge>
                              )}
                              {expiryState === "expired" && (
                                <Badge
                                  variant="destructive"
                                  className="text-[9px] h-4 px-1.5"
                                >
                                  <AlertTriangle className="mr-1 h-3 w-3" />{" "}
                                  Expired
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              router.push(`/admin/certifications/${cert.id}`)
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 ml-2"
                            onClick={(e) => handleDeleteClick(e, cert.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              certification and remove it from our servers.
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
