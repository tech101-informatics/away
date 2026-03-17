import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: "admin" | "manager" | "employee";
      isSlackLinked: boolean;
      slackUserId?: string;
      isActive: boolean;
      isApproved: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    mongoId?: string;
    isSlackLinked?: boolean;
    slackUserId?: string;
    isActive?: boolean;
    isApproved?: boolean;
  }
}
