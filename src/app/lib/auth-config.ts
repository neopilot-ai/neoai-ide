import type { NextAuthOptions } from "next-auth";

// This is a placeholder auth config that can be imported without circular dependencies
// The actual auth configuration is in src/app/api/[...nextauth]/options.ts
export const authOptions: NextAuthOptions = {
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, 
    updateAge: 30 * 60, 
  },
};
