"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ShieldAlert, UserX, Ban, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/away/logo";

const errorConfig: Record<string, { icon: React.ReactNode; title: string; message: string }> = {
  domain_not_allowed: {
    icon: <ShieldAlert className="h-12 w-12 text-destructive" />,
    title: "Access Denied",
    message: "Only @storepecker.me accounts can access Away. Please sign in with your work email.",
  },
  not_approved: {
    icon: <UserX className="h-12 w-12 text-amber-500" />,
    title: "Account Not Approved",
    message: "Your account hasn't been approved yet. Contact your admin to get access to Away.",
  },
  deactivated: {
    icon: <Ban className="h-12 w-12 text-muted-foreground" />,
    title: "Account Deactivated",
    message: "Your account has been deactivated. Contact your admin for assistance.",
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const errorType = searchParams.get("error") || "default";

  const config = errorConfig[errorType] || {
    icon: <AlertTriangle className="h-12 w-12 text-destructive" />,
    title: "Authentication Error",
    message: "Something went wrong during sign in. Please try again.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <Logo size="lg" className="justify-center" />
        <div className="space-y-4 pt-4">
          <div className="flex justify-center">{config.icon}</div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {config.title}
          </h1>
          <p className="text-muted-foreground">{config.message}</p>
        </div>
        <div className="pt-4">
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <ErrorContent />
    </Suspense>
  );
}
