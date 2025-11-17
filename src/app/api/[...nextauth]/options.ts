import Credentials from "next-auth/providers/credentials";
import type { NextAuthOptions, Session, User, Account } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { trackLogin } from "@/app/lib/telemetry";
import { checkGroupMembership, getCurrentUserWithToken } from "@/app/lib/actions/common/fetch_user_utils";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      id: "neoai",
      name: "NeoAI",
      credentials: {
        email: { label: "Email", type: "text" },
        accessToken: { label: "Access Token", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.accessToken) {
          throw new Error("Access token is required");
        }
        
        try {
          const user = await getCurrentUserWithToken(credentials.accessToken);
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Failed to authorize user:", error);
          throw new Error("Authorization failed");
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }: { user: User; account?: Account | null }): Promise<boolean> {
      if (user.email && user.email.endsWith("@neoai.com")) {
        await trackLogin(user)
          .catch((e) => console.error('Could not track login:', e));

        return true;
      } else if (account?.access_token) {
        const glUser = await getCurrentUserWithToken(account.access_token);
        const result = await checkGroupMembership(account.access_token, glUser.id);
        if (result) {
          await trackLogin(user)
            .catch((e) => console.error('Could not track login:', e));

          return true;
        }

        return false;
      }

      return false;
    },
    async jwt({ token, account }: { token: JWT; account?: Account | null }): Promise<JWT> {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, 
    updateAge: 30 * 60, 
  },
};
