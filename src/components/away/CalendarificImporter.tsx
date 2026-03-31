"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Check, Loader2, Plus, Trash2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HolidayTypeSelect } from "./HolidayTypeSelect";
import { DatePicker } from "./date-picker";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiHoliday {
  name: string;
  date: string;
  type: string;
  isOptional: boolean;
}

interface SavedHoliday {
  _id?: string;
  name: string;
  date: string | Date;
  type: string;
  isOptional: boolean;
}

interface HolidayRow {
  name: string;
  date: string;
  apiType: string;
  companyType: "national" | "company" | "optional";
  isOptional: boolean;
  checked: boolean;
}

interface CustomHoliday {
  id: string;
  name: string;
  date: string;
  type: "national" | "company" | "optional";
  isOptional: boolean;
  included: boolean;
}

interface CalendarificImporterProps {
  year: number;
  isActive: boolean;
  onSaveSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Suggestion data for known missing Kerala holidays
// ---------------------------------------------------------------------------

const keralaSuggestions: Record<number, Omit<CustomHoliday, "id" | "included">[]> = {
  2025: [
    { name: "Vishu", date: "2025-04-14", type: "national", isOptional: false },
    { name: "May Day", date: "2025-05-01", type: "national", isOptional: false },
    { name: "First Onam", date: "2025-09-04", type: "national", isOptional: false },
    { name: "Sree Narayana Guru Jayanti", date: "2025-08-22", type: "national", isOptional: false },
    { name: "Sree Narayana Guru Samadhi", date: "2025-09-21", type: "national", isOptional: false },
    { name: "Vijayadasami", date: "2025-10-02", type: "national", isOptional: false },
    { name: "Christmas Eve", date: "2025-12-24", type: "company", isOptional: false },
  ],
  2026: [
    { name: "Vishu", date: "2026-04-15", type: "national", isOptional: false },
    { name: "May Day", date: "2026-05-01", type: "national", isOptional: false },
    { name: "Sree Narayana Guru Jayanti", date: "2026-08-12", type: "national", isOptional: false },
    { name: "First Onam", date: "2026-08-25", type: "national", isOptional: false },
    { name: "Sree Narayana Guru Samadhi", date: "2026-09-21", type: "national", isOptional: false },
    { name: "Vijayadasami", date: "2026-10-21", type: "national", isOptional: false },
    { name: "Christmas Eve", date: "2026-12-24", type: "company", isOptional: false },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0;
function genId() {
  return `custom-${Date.now()}-${++idCounter}`;
}

const apiTypeBadgeColors: Record<string, string> = {
  "National holiday": "bg-rose-100 text-rose-700",
  "Local holiday": "bg-sky-100 text-sky-700",
  Muslim: "bg-emerald-100 text-emerald-700",
  "Hindu holiday": "bg-amber-100 text-amber-700",
  Christian: "bg-violet-100 text-violet-700",
  Observance: "bg-gray-100 text-gray-600",
  "Restricted holiday": "bg-teal-100 text-teal-700",
  "Gazetted holiday": "bg-indigo-100 text-indigo-700",
};

function getBadgeColor(type: string) {
  return apiTypeBadgeColors[type] || "bg-gray-100 text-gray-600";
}

function normalizeDate(d: string | Date): string {
  if (typeof d === "string") return d.split("T")[0];
  return format(new Date(d), "yyyy-MM-dd");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalendarificImporter({
  year,
  isActive,
  onSaveSuccess,
}: CalendarificImporterProps) {
  // Calendarific rows
  const [rows, setRows] = useState<HolidayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [quota, setQuota] = useState(2);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [existingCount, setExistingCount] = useState(0);

  // Custom holidays
  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);
  const customInitedForYearRef = useRef<number | null>(null);

  // Cache
  const cacheRef = useRef<
    Record<number, { apiHolidays: ApiHoliday[]; savedHolidays: SavedHoliday[] }>
  >({});
  const lastFetchedYearRef = useRef<number | null>(null);

  // -------------------------------------------------------------------
  // Build Calendarific rows from API + saved data
  // -------------------------------------------------------------------

  const buildRows = useCallback(
    (apiHolidays: ApiHoliday[], savedHolidays: SavedHoliday[]) => {
      const savedByDate = new Map<string, SavedHoliday>();
      for (const h of savedHolidays) {
        savedByDate.set(normalizeDate(h.date), h);
      }

      const result: HolidayRow[] = apiHolidays.map((api) => {
        const dateStr = api.date.split("T")[0];
        const saved = savedByDate.get(dateStr);
        return {
          name: api.name,
          date: dateStr,
          apiType: api.type,
          companyType: saved
            ? (saved.type as "national" | "company" | "optional")
            : "national",
          isOptional: saved ? saved.isOptional : false,
          checked: !!saved,
        };
      });

      result.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      return result;
    },
    []
  );

  // -------------------------------------------------------------------
  // Build custom holidays from saved data that aren't in the API list
  // -------------------------------------------------------------------

  const buildCustomHolidays = useCallback(
    (apiHolidays: ApiHoliday[], savedHolidays: SavedHoliday[]) => {
      const apiDates = new Set(apiHolidays.map((h) => h.date.split("T")[0]));

      // Saved holidays that are NOT in the Calendarific list → custom
      const savedCustom: CustomHoliday[] = savedHolidays
        .filter((h) => !apiDates.has(normalizeDate(h.date)))
        .map((h) => ({
          id: genId(),
          name: h.name,
          date: normalizeDate(h.date),
          type: h.type as "national" | "company" | "optional",
          isOptional: h.isOptional,
          included: true,
        }));

      // Also add suggestions that aren't already in API or saved customs
      const savedCustomDates = new Set(savedCustom.map((h) => h.date));
      const suggestions = keralaSuggestions[year];
      const suggestionRows: CustomHoliday[] = (suggestions || [])
        .filter((s) => !apiDates.has(s.date) && !savedCustomDates.has(s.date))
        .map((s) => ({
          id: genId(),
          name: s.name,
          date: s.date,
          type: s.type,
          isOptional: s.isOptional,
          included: false,
        }));

      // Merge: saved customs first (checked), then unsaved suggestions (unchecked)
      return [...savedCustom, ...suggestionRows];
    },
    [year]
  );

  // -------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (cacheRef.current[year] && lastFetchedYearRef.current === year) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/holidays/calendarific?year=${year}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch holidays");
      }

      cacheRef.current[year] = data;
      lastFetchedYearRef.current = year;

      setRows(buildRows(data.apiHolidays, data.savedHolidays));
      setExistingCount(data.savedHolidays.length);

      // Initialise custom holidays for this year (only once per year)
      if (customInitedForYearRef.current !== year) {
        setCustomHolidays(
          buildCustomHolidays(data.apiHolidays, data.savedHolidays)
        );
        customInitedForYearRef.current = year;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [year, buildRows, buildCustomHolidays]);

  useEffect(() => {
    if (!isActive) return;

    if (
      lastFetchedYearRef.current !== null &&
      lastFetchedYearRef.current !== year
    ) {
      delete cacheRef.current[lastFetchedYearRef.current];
      lastFetchedYearRef.current = null;
      customInitedForYearRef.current = null;
    }

    fetchData();
  }, [isActive, year, fetchData]);

  // -------------------------------------------------------------------
  // Calendarific row actions
  // -------------------------------------------------------------------

  const toggleAll = (checked: boolean) =>
    setRows((prev) => prev.map((r) => ({ ...r, checked })));

  const toggleRow = (index: number) =>
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, checked: !r.checked } : r))
    );

  const updateRowType = (
    index: number,
    type: "national" | "company" | "optional"
  ) =>
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, companyType: type, isOptional: type === "optional" }
          : r
      )
    );

  const updateRowOptional = (index: number, isOptional: boolean) =>
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, isOptional } : r))
    );

  // -------------------------------------------------------------------
  // Custom holiday actions
  // -------------------------------------------------------------------

  const addCustomRow = () =>
    setCustomHolidays((prev) => [
      ...prev,
      {
        id: genId(),
        name: "",
        date: "",
        type: "national",
        isOptional: false,
        included: true,
      },
    ]);

  const removeCustomRow = (id: string) =>
    setCustomHolidays((prev) => prev.filter((h) => h.id !== id));

  const updateCustom = (
    id: string,
    field: keyof Omit<CustomHoliday, "id">,
    value: string | boolean
  ) =>
    setCustomHolidays((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const updated = { ...h, [field]: value };
        if (field === "type" && value === "optional") updated.isOptional = true;
        if (field === "type" && value !== "optional") updated.isOptional = false;
        return updated;
      })
    );

  const clearAllCustom = () => setCustomHolidays([]);

  // -------------------------------------------------------------------
  // Duplicate detection
  // -------------------------------------------------------------------

  const checkedApiDates = new Set(
    rows.filter((r) => r.checked).map((r) => r.date)
  );
  const checkedApiKeys = new Set(
    rows
      .filter((r) => r.checked)
      .map((r) => `${r.date}|${r.name.toLowerCase()}`)
  );

  function isDuplicate(custom: CustomHoliday) {
    if (!custom.date) return false;
    return checkedApiKeys.has(
      `${custom.date}|${custom.name.toLowerCase()}`
    ) || (checkedApiDates.has(custom.date) && custom.included);
  }

  // -------------------------------------------------------------------
  // Validation & Save
  // -------------------------------------------------------------------

  const includedCustom = customHolidays.filter((h) => h.included);

  function validateCustomHolidays(): boolean {
    for (const h of includedCustom) {
      if (!h.name || h.name.trim().length < 2) {
        toast.error(
          "Please fill in all custom holiday details before saving"
        );
        return false;
      }
      if (!h.date) {
        toast.error(
          "Please fill in all custom holiday details before saving"
        );
        return false;
      }
      const parsed = parseISO(h.date);
      if (!isValid(parsed) || parsed.getFullYear() !== year) {
        toast.error(
          `Custom holiday "${h.name}" has a date outside ${year}`
        );
        return false;
      }
    }
    return true;
  }

  const checkedCount = rows.filter((r) => r.checked).length;
  const totalSaveCount = checkedCount + includedCustom.length;

  const handleSaveClick = () => {
    if (totalSaveCount === 0) {
      toast.error("Select at least one holiday to save");
      return;
    }
    if (!validateCustomHolidays()) return;

    if (existingCount > 0) {
      setConfirmOpen(true);
    } else {
      doSave();
    }
  };

  const doSave = async () => {
    setConfirmOpen(false);

    if (!validateCustomHolidays()) return;

    const selectedApi = rows
      .filter((r) => r.checked)
      .map((r) => ({
        name: r.name,
        date: r.date,
        type: r.companyType,
        isOptional: r.isOptional,
      }));

    const selectedCustom = includedCustom.map((h) => ({
      name: h.name.trim(),
      date: h.date,
      type: h.type,
      isOptional: h.isOptional,
    }));

    const merged = [...selectedApi, ...selectedCustom];

    setSaving(true);
    try {
      const res = await fetch("/api/admin/holidays/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          holidays: merged,
          optionalHolidayQuota: quota,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Failed to save holidays"
        );
      }

      toast.success(`Saved ${merged.length} holidays for ${year}`);
      delete cacheRef.current[year];
      lastFetchedYearRef.current = null;
      customInitedForYearRef.current = null;
      onSaveSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save holidays"
      );
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------
  // Date picker constraint: only allow dates within the selected year
  // -------------------------------------------------------------------

  const disableDateOutsideYear = (d: Date) => d.getFullYear() !== year;

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3 rounded-lg border"
          >
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-5 w-10" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive font-medium mb-2">
          Failed to load holidays
        </p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" onClick={fetchData}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Controls bar                                                      */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
            Deselect All
          </Button>
          <span className="text-sm text-muted-foreground">
            {checkedCount} of {rows.length} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Optional quota:</Label>
          <Input
            type="number"
            className="w-20 h-8"
            value={quota}
            onChange={(e) =>
              setQuota(
                Math.max(0, Math.min(20, parseInt(e.target.value) || 0))
              )
            }
            min={0}
            max={20}
          />
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Calendarific holiday rows                                         */}
      {/* ---------------------------------------------------------------- */}
      {rows.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[32px_1fr_110px_100px_110px_60px] sm:grid-cols-[32px_1fr_140px_120px_130px_70px] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
            <span />
            <span>Holiday</span>
            <span>Date</span>
            <span>API Type</span>
            <span>Company Type</span>
            <span>Optional</span>
          </div>
          <div className="divide-y max-h-[520px] overflow-y-auto">
            {rows.map((row, idx) => (
              <div
                key={`${row.date}-${row.name}`}
                className={cn(
                  "grid grid-cols-[32px_1fr_110px_100px_110px_60px] sm:grid-cols-[32px_1fr_140px_120px_130px_70px] gap-2 px-4 py-3 items-center transition-colors",
                  row.checked
                    ? "bg-primary/[0.03]"
                    : "hover:bg-muted/20 opacity-60"
                )}
              >
                <Checkbox
                  checked={row.checked}
                  onCheckedChange={() => toggleRow(idx)}
                />
                <span
                  className={cn(
                    "text-sm truncate",
                    row.checked ? "font-medium" : ""
                  )}
                >
                  {row.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(row.date), "dd MMM yyyy")}
                </span>
                <Badge
                  className={cn(
                    "text-xs w-fit",
                    getBadgeColor(row.apiType)
                  )}
                  variant="secondary"
                >
                  {row.apiType.length > 16
                    ? row.apiType.slice(0, 14) + "..."
                    : row.apiType}
                </Badge>
                <HolidayTypeSelect
                  value={row.companyType}
                  onChange={(v) => updateRowType(idx, v)}
                  size="sm"
                />
                <Switch
                  checked={row.isOptional}
                  onCheckedChange={(v) => updateRowOptional(idx, v)}
                  className="scale-90"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <p>No holidays returned from Calendarific for {year}.</p>
          <p className="text-sm mt-1">
            You can still add custom holidays below.
          </p>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Custom Holidays section                                           */}
      {/* ---------------------------------------------------------------- */}
      <Separator />

      <div>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3
              className="text-base font-semibold tracking-tight"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Custom Holidays
            </h3>
            <p className="text-sm text-muted-foreground">
              Add Kerala-specific or company holidays missing from the list
              above
            </p>
          </div>
          <div className="flex items-center gap-2">
            {customHolidays.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5"
                onClick={clearAllCustom}
              >
                <X className="h-3.5 w-3.5" />
                Clear all
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={addCustomRow}
            >
              <Plus className="h-4 w-4" /> Add Holiday
            </Button>
          </div>
        </div>

        {customHolidays.length === 0 ? (
          <div className="text-center py-8 border rounded-lg border-dashed text-muted-foreground">
            <p className="text-sm">No custom holidays added.</p>
            <Button
              variant="link"
              size="sm"
              className="mt-1"
              onClick={addCustomRow}
            >
              Add one
            </Button>
          </div>
        ) : (
          <div className="space-y-2 mt-3">
            {customHolidays.map((h) => {
              const dup = isDuplicate(h);
              const nameInvalid =
                h.included && h.name.trim().length > 0 && h.name.trim().length < 2;
              const nameEmpty = h.included && h.name.trim().length === 0;
              const dateEmpty = h.included && !h.date;

              return (
                <div
                  key={h.id}
                  className={cn(
                    "grid grid-cols-[32px_1fr] sm:grid-cols-[32px_180px_1fr_130px_60px_36px] gap-2 p-3 rounded-lg border items-center transition-all duration-200",
                    h.included
                      ? "bg-primary/[0.03] border-border"
                      : "opacity-50 border-dashed"
                  )}
                  style={{
                    animation: "fade-in 0.25s ease-out forwards",
                  }}
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={h.included}
                    onCheckedChange={(v) =>
                      updateCustom(h.id, "included", !!v)
                    }
                  />

                  {/* Date picker */}
                  <div className="sm:col-span-1 col-span-1">
                    <DatePicker
                      date={h.date ? new Date(h.date + "T00:00:00") : undefined}
                      onSelect={(d) =>
                        updateCustom(
                          h.id,
                          "date",
                          d ? format(d, "yyyy-MM-dd") : ""
                        )
                      }
                      placeholder="Pick date"
                      disabled={disableDateOutsideYear}
                    />
                    {dateEmpty && (
                      <p className="text-xs text-destructive mt-0.5">
                        Date required
                      </p>
                    )}
                  </div>

                  {/* Name input */}
                  <div className="col-span-1 sm:col-span-1">
                    <Input
                      value={h.name}
                      onChange={(e) =>
                        updateCustom(h.id, "name", e.target.value)
                      }
                      placeholder="Holiday name"
                      maxLength={100}
                      className={cn(
                        "h-9",
                        (nameInvalid || nameEmpty) && "border-destructive"
                      )}
                    />
                    {nameInvalid && (
                      <p className="text-xs text-destructive mt-0.5">
                        Min 2 characters
                      </p>
                    )}
                    {dup && (
                      <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Already exists above
                      </p>
                    )}
                  </div>

                  {/* Type */}
                  <HolidayTypeSelect
                    value={h.type}
                    onChange={(v) => updateCustom(h.id, "type", v)}
                    size="sm"
                  />

                  {/* Optional toggle */}
                  <Switch
                    checked={h.isOptional}
                    onCheckedChange={(v) =>
                      updateCustom(h.id, "isOptional", v)
                    }
                    className="scale-90"
                  />

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCustomRow(h.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Save button                                                       */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          {totalSaveCount} holiday{totalSaveCount !== 1 ? "s" : ""} will be
          saved
          {includedCustom.length > 0 && (
            <span>
              {" "}
              ({checkedCount} from API + {includedCustom.length} custom)
            </span>
          )}
        </p>
        <Button
          onClick={handleSaveClick}
          disabled={saving || totalSaveCount === 0}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Save Selected Holidays (
              {totalSaveCount})
            </>
          )}
        </Button>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Confirmation dialog                                               */}
      {/* ---------------------------------------------------------------- */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace existing holidays?</DialogTitle>
            <DialogDescription>
              This will replace {existingCount} existing holiday
              {existingCount !== 1 ? "s" : ""} for {year} with{" "}
              {totalSaveCount} selected holiday
              {totalSaveCount !== 1 ? "s" : ""}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={doSave} disabled={saving}>
              {saving ? "Saving..." : "Yes, replace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
