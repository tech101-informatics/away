"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SlackBanner() {
  const { data: session } = useSession();

  if (!session?.user || session.user.isSlackLinked) return null;

  return (
    <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <MessageSquare className="h-4 w-4" />
        </div>
        <p className="text-sm text-foreground">
          <span className="font-medium">Link your Slack account</span>
          <span className="text-muted-foreground hidden sm:inline"> to receive leave notifications in Slack</span>
        </p>
      </div>
      <Link href="/settings/slack">
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
          Link Slack <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}
