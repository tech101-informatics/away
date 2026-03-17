"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  MessageSquare,
  Search,
  Check,
  Loader2,
  Unlink,
  LinkIcon,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/away/page-header";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";

interface SlackMatch {
  slackUserId: string;
  displayName: string;
  email: string;
  avatar: string;
}

export default function SlackSettingsPage() {
  const { data: session, update } = useSession();
  const isLinked = session?.user?.isSlackLinked;

  const [step, setStep] = useState<"idle" | "searching" | "auto-found" | "manual" | "error">("idle");
  const [autoMatch, setAutoMatch] = useState<SlackMatch | null>(null);
  const [manualMembers, setManualMembers] = useState<SlackMatch[]>([]);
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const unlinkAction = useAction({
    successMessage: "Slack account unlinked",
    onSuccess: () => update(),
  });

  const handleInitiate = async () => {
    setStep("searching");
    setSearch("");
    setErrorMsg("");
    try {
      const res = await fetch("/api/slack/link/initiate");
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to connect to Slack");
        setStep("error");
        return;
      }

      if (data.alreadyLinked) {
        toast.info("Your Slack account is already linked!");
        setStep("idle");
        update();
        return;
      }

      // Always store the full members list
      setManualMembers(data.members || []);

      if (data.autoMatched && data.match) {
        setAutoMatch(data.match);
        setStep("auto-found");
      } else {
        setStep("manual");
        if ((data.members || []).length === 0) {
          setErrorMsg("No unlinked Slack members found. Ask your admin to check the Slack bot configuration.");
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect to Slack");
      setStep("error");
    }
  };

  const handleInitiateManual = () => {
    // manualMembers already populated from handleInitiate
    setSearch("");
    setStep("manual");
  };

  const handleConfirm = async (slackUserId: string) => {
    setLinking(true);
    try {
      const res = await fetch("/api/slack/link/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slackUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Slack account linked successfully!");
      setStep("idle");
      update();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link Slack");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = () => {
    unlinkAction.execute("/api/slack/link/confirm", {
      method: "POST",
      body: JSON.stringify({ slackUserId: "" }),
    });
  };

  const filteredMembers = search
    ? manualMembers.filter(
        (m) =>
          m.displayName.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase())
      )
    : manualMembers;

  return (
    <div>
      <PageHeader
        title="Slack Integration"
        description="Link your Slack account to receive leave notifications."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Slack Account</CardTitle>
              <CardDescription>
                {isLinked
                  ? "Your Slack account is linked"
                  : "Link your Slack to get leave notifications as DMs"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLinked ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg">
                <Badge className="bg-emerald-100 text-emerald-700 gap-1" variant="secondary">
                  <Check className="h-3 w-3" /> Connected
                </Badge>
                <span className="text-sm text-emerald-700">
                  Slack notifications are active
                </span>
              </div>
              <Button variant="outline" className="gap-2 text-muted-foreground" onClick={handleUnlink}>
                <Unlink className="h-4 w-4" /> Unlink Slack
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {step === "idle" && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    We&apos;ll try to find your Slack account automatically
                  </p>
                  <Button onClick={handleInitiate} className="gap-2">
                    <Search className="h-4 w-4" /> Find My Slack Account
                  </Button>
                </div>
              )}

              {step === "searching" && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Searching Slack workspace...</p>
                </div>
              )}

              {step === "error" && (
                <div className="text-center py-8 space-y-3">
                  <AlertCircle className="h-8 w-8 mx-auto text-destructive opacity-60" />
                  <p className="text-sm text-muted-foreground">{errorMsg}</p>
                  <Button variant="outline" onClick={handleInitiate} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Try Again
                  </Button>
                </div>
              )}

              {step === "auto-found" && autoMatch && (
                <div className="space-y-4">
                  <p className="text-sm text-emerald-700 font-medium">We found your Slack account!</p>
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={autoMatch.avatar} />
                      <AvatarFallback>{autoMatch.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{autoMatch.displayName}</p>
                      <p className="text-sm text-muted-foreground">{autoMatch.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleConfirm(autoMatch.slackUserId)} disabled={linking} className="gap-2">
                      {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                      {linking ? "Linking..." : "Confirm & Link"}
                    </Button>
                    <Button variant="outline" onClick={() => { setAutoMatch(null); handleInitiateManual(); }}>
                      Not me
                    </Button>
                  </div>
                </div>
              )}

              {step === "manual" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Select your Slack account from the list below
                    </p>
                    <Button variant="ghost" size="sm" onClick={handleInitiate} className="gap-1.5 text-xs">
                      <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </Button>
                  </div>

                  {manualMembers.length > 0 ? (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or email..."
                          className="pl-9"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      {manualMembers.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {manualMembers.length} member{manualMembers.length !== 1 ? "s" : ""} available
                          {search && ` · ${filteredMembers.length} matching`}
                        </p>
                      )}
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {filteredMembers.map((m) => (
                          <button
                            key={m.slackUserId}
                            className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                            onClick={() => handleConfirm(m.slackUserId)}
                            disabled={linking}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={m.avatar} />
                                <AvatarFallback className="text-xs">{m.displayName[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{m.displayName}</p>
                                {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                              </div>
                            </div>
                          </button>
                        ))}
                        {filteredMembers.length === 0 && search && (
                          <p className="text-center py-6 text-sm text-muted-foreground">
                            No members match &quot;{search}&quot;
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium text-foreground/70">No Slack members available</p>
                      <p className="text-sm mt-1">{errorMsg || "All workspace members are already linked, or the Slack bot needs to be configured."}</p>
                      <Button variant="outline" size="sm" onClick={handleInitiate} className="mt-3 gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" /> Try Again
                      </Button>
                    </div>
                  )}

                  <Button variant="outline" onClick={() => setStep("idle")}>Cancel</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
