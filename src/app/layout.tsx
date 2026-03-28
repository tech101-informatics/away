import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/away/providers";

export const metadata: Metadata = {
  title: "Away — Time off, sorted.",
  description: "Employee holiday, leave & WFH management system",
  icons: {
    icon: "/favicon.png",
    apple: "/away_icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
