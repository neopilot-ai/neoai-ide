import NeoAiProvider from "next-auth/providers/neoai";
import type { NextAuthOptions, Session, User, Account } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { trackLogin } from "@/app/lib/telemetry";
import { checkGroupMembership, getCurrentUserWithToken } from "@/app/lib/actions/common/fetch_user";

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
    NeoAiProvider({
      clientId: process.env.NEOAI_CLIENT_ID || '',
      clientSecret: process.env.NEOAI_CLIENT_SECRET || '',
      authorization: { params: { scope: "read_user api" } },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }: { user: User; account?: Account | null }) {
      if (user.email && user.email.endsWith("@neoai.com")) {
        trackLogin(user)
          .catch(e => console.error('Could not track login:', e))

        return true;
      } else {
        if (account?.access_token) {
          const glUser = await getCurrentUserWithToken(account.access_token);
          // Check if user is a member of neoai-org
          const result = await checkGroupMembership(account.access_token, glUser.id)
          if (result) {
            trackLogin(user)
              .catch(e => console.error('Could not track login:', e))
            return true;
          }

          return false;
        }
        return false;
      }
    },
    async jwt({ token, account }: { token: JWT; account?: Account | null }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, 
    updateAge: 30 * 60, 
  }
};