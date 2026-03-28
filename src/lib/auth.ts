import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { connectDB } from "./db";
import User from "@/models/User";

const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAIN || "storepecker.me")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return false;

      const email = user.email?.toLowerCase() || "";

      // 1. Domain check
      const emailDomain = email.split("@")[1];
      if (!ALLOWED_DOMAINS.includes(emailDomain)) {
        return `/auth/error?error=domain_not_allowed`;
      }

      await connectDB();

      const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      const isAdmin = adminEmails.includes(email);

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        // 2. Check isApproved
        if (!existingUser.isApproved && !isAdmin) {
          return `/auth/error?error=not_approved`;
        }

        // 3. Check isActive
        if (!existingUser.isActive) {
          return `/auth/error?error=deactivated`;
        }

        // 4. Admin role enforcement
        if (isAdmin && existingUser.role !== "admin") {
          existingUser.role = "admin";
        }
        if (!isAdmin && existingUser.role === "admin") {
          existingUser.role = "employee";
        }

        // Update profile
        existingUser.name = user.name || existingUser.name;
        existingUser.image = user.image || existingUser.image;
        if (!existingUser.googleId) {
          existingUser.googleId = account.providerAccountId;
        }
        await existingUser.save();
      } else {
        // New user — only admins can self-register
        if (isAdmin) {
          await User.create({
            name: user.name,
            email,
            googleId: account.providerAccountId,
            image: user.image,
            role: "admin",
            isApproved: true,
            isActive: true,
            approvedAt: new Date(),
            leaveBalances: [],
          });
        } else {
          // Not pre-approved by admin
          return `/auth/error?error=not_approved`;
        }
      }

      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        await connectDB();
        const dbUser = await User.findOne({ email: token.email }).lean();
        if (dbUser) {
          const u = dbUser as Record<string, unknown>;
          token.id = u._id?.toString();
          token.role = u.role as string | undefined;
          token.mongoId = u._id?.toString();
          token.isSlackLinked = u.isSlackLinked as boolean;
          token.slackUserId = u.slackUserId as string | undefined;
          token.isActive = u.isActive as boolean;
          token.isApproved = u.isApproved as boolean;
          // Use Google image, fall back to Slack avatar
          if (!token.picture && u.slackAvatar) {
            token.picture = u.slackAvatar as string;
          }
          if (!token.name && u.slackDisplayName) {
            token.name = u.slackDisplayName as string;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>;
        u.id = token.mongoId as string;
        u.role = token.role as string;
        u.isSlackLinked = token.isSlackLinked as boolean;
        u.slackUserId = token.slackUserId as string;
        u.isActive = token.isActive as boolean;
        u.isApproved = token.isApproved as boolean;
        // Ensure image falls back to Slack avatar
        if (!u.image && token.picture) {
          u.image = token.picture;
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});
