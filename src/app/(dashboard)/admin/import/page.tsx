"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileText,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/away/page-header";
import { cn } from "@/lib/utils";

interface PreviewRow {
  employeeName: string;
  leaveDate: string;
  leaveType: string;
  duration: string;
  isHalfDay: string;
  status: string;
  source: string;
  originalType: string;
  submittedOn: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  skippedRows: Array<{ name: string; date: string }>;
  overdrawnEmployees: string[];
}

const TEMPLATE_HEADERS = "employeeName,leaveDate,leaveType,duration,isHalfDay,status,source,originalType,submittedOn";
const TEMPLATE_EXAMPLE = "John Doe,2026-01-15,casual,1.0,false,approved,import,Casual Leave,2026-01-14T10:00:00Z";

export default function AdminImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [nameStatus, setNameStatus] = useState<Record<string, "matched" | "unmatched">>({});
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".csv")) {
      toast.error("Only .csv files are accepted");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast.error("File too large (max 2MB)");
      return;
    }

    setFile(f);
    setResult(null);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const data = parsed.data as PreviewRow[];
        setRows(data);
        await validateNames(data);
      },
      error: () => {
        toast.error("Failed to parse CSV");
      },
    });
  };

  const validateNames = async (data: PreviewRow[]) => {
    const uniqueNames = Array.from(new Set(data.map((r) => r.employeeName).filter(Boolean)));
    if (uniqueNames.length === 0) return;

    setValidating(true);
    try {
      const res = await fetch("/api/admin/import/validate-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: uniqueNames }),
      });
      const result = await res.json();
      if (res.ok) {
        const status: Record<string, "matched" | "unmatched"> = {};
        for (const name of result.matched) status[name] = "matched";
        for (const name of result.unmatched) status[name] = "unmatched";
        setNameStatus(status);
      }
    } catch {
      toast.error("Failed to validate employee names");
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/import/leaves", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.unmatchedNames) {
          toast.error(`Unmatched employees: ${data.unmatchedNames.join(", ")}`);
        } else if (data.validationErrors) {
          toast.error(`${data.validationErrors.length} rows failed validation`);
        } else {
          toast.error(data.error || "Import failed");
        }
        return;
      }

      setResult(data);
      toast.success(`Imported ${data.imported} records`);
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = TEMPLATE_HEADERS + "\n" + TEMPLATE_EXAMPLE + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leave-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setRows([]);
    setNameStatus({});
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const matchedCount = Object.values(nameStatus).filter((s) => s === "matched").length;
  const unmatchedCount = Object.values(nameStatus).filter((s) => s === "unmatched").length;
  const hasUnmatched = unmatchedCount > 0;

  return (
    <div>
      <PageHeader
        title="Import Past Leave Records"
        description="Upload a CSV of historical leave data to migrate into Away."
      >
        <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
          <Download className="h-4 w-4" /> Download Template
        </Button>
      </PageHeader>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 text-amber-800 mb-6">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Before importing</p>
          <p className="mt-1 text-amber-700">
            All imported records will be marked as approved and deducted from employee balances.
            Ensure all employees are added to Away first. Duplicate records (same employee + date) will be skipped.
          </p>
        </div>
      </div>

      {/* Result */}
      {result && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Import Complete</p>
                <p className="text-sm text-muted-foreground">
                  {result.imported} records imported, {result.skipped} duplicates skipped
                </p>
              </div>
            </div>
            {result.overdrawnEmployees.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Overdrawn balances: {result.overdrawnEmployees.join(", ")}</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload */}
      {!result && (
        <Card className="mb-6">
          <CardContent className="p-6">
            {!file ? (
              <label className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-sm">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">CSV files only, max 2MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{rows.length} rows</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Name validation summary */}
                {validating ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Validating employee names...
                  </div>
                ) : Object.keys(nameStatus).length > 0 && (
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <span className="text-muted-foreground">Total: {rows.length} rows</span>
                    <Badge className="bg-emerald-100 text-emerald-700" variant="secondary">
                      {matchedCount} matched
                    </Badge>
                    {unmatchedCount > 0 && (
                      <Badge className="bg-rose-100 text-rose-700" variant="secondary">
                        {unmatchedCount} unmatched
                      </Badge>
                    )}
                  </div>
                )}

                {/* Preview table */}
                {rows.length > 0 && (
                  <div className="border rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Employee</th>
                          <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Date</th>
                          <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Type</th>
                          <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Duration</th>
                          <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Original Type</th>
                          <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.slice(0, 100).map((row, i) => {
                          const status = nameStatus[row.employeeName];
                          return (
                            <tr
                              key={i}
                              className={cn(
                                status === "unmatched" && "bg-rose-50",
                                status === "matched" && "bg-emerald-50/30"
                              )}
                            >
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  {status === "matched" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                                  {status === "unmatched" && <X className="h-3.5 w-3.5 text-rose-500" />}
                                  <span className="truncate max-w-[150px]">{row.employeeName}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 tabular-nums">{row.leaveDate}</td>
                              <td className="px-3 py-2">{row.leaveType}</td>
                              <td className="px-3 py-2 tabular-nums">{row.duration}</td>
                              <td className="px-3 py-2 truncate max-w-[120px]">{row.originalType}</td>
                              <td className="px-3 py-2">
                                <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                                  {row.status}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {rows.length > 100 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Showing first 100 of {rows.length} rows
                      </p>
                    )}
                  </div>
                )}

                {/* Import button */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {hasUnmatched
                      ? `Fix ${unmatchedCount} unmatched employee name(s) before importing`
                      : `Ready to import ${rows.length} records`}
                  </div>
                  <Button
                    onClick={handleImport}
                    disabled={importing || hasUnmatched || validating || rows.length === 0}
                    className="gap-2"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Import {rows.length} Records
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
