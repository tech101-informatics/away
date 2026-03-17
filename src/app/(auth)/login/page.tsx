"use client";

import { signIn } from "next-auth/react";
import { Logo } from "@/components/away/logo";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Decorative Left Panel */}
      <div className="relative lg:w-1/2 bg-gradient-to-br from-[hsl(234,89%,18%)] via-[hsl(234,80%,30%)] to-[hsl(250,70%,40%)] p-8 lg:p-16 flex flex-col justify-center items-center text-white overflow-hidden min-h-[300px] lg:min-h-screen">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />

        {/* Floating decorative circles */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-20 w-32 h-32 bg-blue-300/10 rounded-full blur-2xl" />

        {/* Floating planes */}
        <div className="absolute top-16 right-16 opacity-20 animate-pulse">
          <Plane className="h-12 w-12 -rotate-45" />
        </div>
        <div className="absolute bottom-24 left-20 opacity-10 animate-pulse" style={{ animationDelay: "1s" }}>
          <Plane className="h-8 w-8 -rotate-12" />
        </div>

        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <Plane className="h-10 w-10 -rotate-45" />
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Away
            </h1>
          </div>
          <p className="text-lg lg:text-xl text-white/80 font-light max-w-md">
            Time off, sorted.
          </p>
          <p className="text-sm text-white/50 mt-4 max-w-sm mx-auto">
            Manage holidays, leaves, and work-from-home requests in one place.
          </p>
        </div>

        {/* Bottom decorative line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Right Panel - Login */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Logo size="lg" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Welcome back
          </h2>
          <p className="text-muted-foreground mb-10">
            Sign in with your company Google account to continue.
          </p>

          <Button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full h-12 text-base font-semibold gap-3 border-2 border-border bg-card text-foreground hover:bg-accent hover:border-accent transition-colors duration-150 shadow-sm"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-6">
            By signing in, you agree to your organization&apos;s policies.
          </p>

          <div className="mt-12 flex items-center justify-center gap-6 text-muted-foreground/30">
            <div className="h-px flex-1 bg-border" />
            <Plane className="h-4 w-4 -rotate-45" />
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>
      </div>
    </div>
  );
}
