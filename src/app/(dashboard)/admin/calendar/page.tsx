"use client";

import { useState, useCallback } from "react";
import { Pencil, CalendarDays, Download as ImportIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/away/page-header";
import { YearSelector } from "@/components/away/YearSelector";
import { HolidayTable } from "@/components/away/HolidayTable";
import { CalendarificImporter } from "@/components/away/CalendarificImporter";
import { useFetch } from "@/hooks/use-fetch";
import { useAction } from "@/hooks/use-action";

interface HolidayData {
  _id: string;
  name: string;
  date: string;
  type: string;
  isOptional: boolean;
}

interface HolidayCalendarData {
  year: number;
  holidays: HolidayData[];
  optionalHolidayQuota: number;
}

const currentYear = new Date().getFullYear();

export default function AdminCalendarPage() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState("saved");

  const {
    data: calendar,
    loading,
    refetch,
  } = useFetch<HolidayCalendarData>(`/api/holidays/${selectedYear}`);

  const saveAction = useAction({
    successMessage: "Holidays updated!",
    onSuccess: () => refetch(),
  });

  // Track local edits for saved holidays tab
  const [localHolidays, setLocalHolidays] = useState<HolidayData[] | null>(null);

  // When calendar data changes, reset local state
  const holidays = localHolidays ?? calendar?.holidays ?? [];
  const hasLocalEdits = localHolidays !== null;

  const handleRemoveHoliday = (index: number) => {
    const current = localHolidays ?? [...(calendar?.holidays || [])];
    const updated = current.filter((_, i) => i !== index);
    setLocalHolidays(updated);
  };

  const handleSaveChanges = () => {
    if (!localHolidays) return;
    saveAction.execute("/api/admin/holidays/save", {
      method: "POST",
      body: JSON.stringify({
        year: selectedYear,
        holidays: localHolidays.map((h) => ({
          name: h.name,
          date: typeof h.date === "string" ? h.date.split("T")[0] : h.date,
          type: h.type,
          isOptional: h.isOptional,
        })),
        optionalHolidayQuota: calendar?.optionalHolidayQuota ?? 2,
      }),
    });
    setLocalHolidays(null);
  };

  const handleImportSuccess = useCallback(() => {
    setLocalHolidays(null);
    refetch();
    setActiveTab("saved");
  }, [refetch]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setLocalHolidays(null);
  };

  return (
    <div>
      <PageHeader
        title="Holiday Calendar Management"
        description="Import Kerala holidays from Calendarific and manage your company's holiday calendar."
      >
        <YearSelector value={selectedYear} onChange={handleYearChange} />
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="saved" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Saved Holidays
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <ImportIcon className="h-4 w-4" />
            Import / Edit
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Saved Holidays */}
        <TabsContent value="saved">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-4">
              <div>
                <CardTitle className="text-lg">
                  Saved Holidays — {selectedYear}
                </CardTitle>
                <CardDescription>
                  {holidays.length} holiday{holidays.length !== 1 ? "s" : ""}{" "}
                  configured.
                  {calendar?.optionalHolidayQuota !== undefined &&
                    ` Optional quota: ${calendar.optionalHolidayQuota}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasLocalEdits && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={handleSaveChanges}
                    disabled={saveAction.loading}
                  >
                    <Save className="h-4 w-4" />
                    {saveAction.loading ? "Saving..." : "Save Changes"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setActiveTab("import")}
                >
                  <Pencil className="h-4 w-4" />
                  Edit / Import
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 skeleton rounded-lg" />
                  ))}
                </div>
              ) : (
                <HolidayTable
                  holidays={holidays}
                  onRemove={handleRemoveHoliday}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Import / Edit from Calendarific */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Import Kerala Holidays — {selectedYear}
              </CardTitle>
              <CardDescription>
                Browse holidays from Calendarific API. Select and configure
                which ones to save as your company holidays.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarificImporter
                year={selectedYear}
                isActive={activeTab === "import"}
                onSaveSuccess={handleImportSuccess}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
