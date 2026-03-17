export interface CalendarificHoliday {
  name: string;
  date: string;
  type: string;
  isOptional: boolean;
}

interface CalendarificApiResponse {
  meta: { code: number };
  response: {
    holidays: Array<{
      name: string;
      date: {
        iso: string;
      };
      type: string[];
      primary_type: string;
    }>;
  };
}

export async function fetchKeralaHolidays(
  year: number
): Promise<CalendarificHoliday[]> {
  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey) {
    throw new Error("CALENDARIFIC_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    country: "IN",
    year: String(year),
    location: "in-kl",
    type: "national,local,religious",
  });

  const res = await fetch(
    `https://calendarific.com/api/v2/holidays?${params.toString()}`,
    { next: { revalidate: 0 } }
  );

  if (!res.ok) {
    throw new Error(
      `Calendarific API returned status ${res.status}: ${res.statusText}`
    );
  }

  const data: CalendarificApiResponse = await res.json();

  if (data.meta.code !== 200) {
    throw new Error(
      `Calendarific API error: code ${data.meta.code}`
    );
  }

  return data.response.holidays.map((h) => ({
    name: h.name,
    date: h.date.iso.split("T")[0],
    type: h.primary_type || h.type[0] || "local",
    isOptional: false,
  }));
}
