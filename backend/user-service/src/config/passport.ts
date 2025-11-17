import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../utils/database';

// JWT Strategy
passport.use(
  'jwt',
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    },
    async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.id },
        });
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// GitHub Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:8001/auth/github/callback',
    },
    async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
      try {
        let user = await prisma.user.findUnique({
          where: { email: profile.emails?.[0]?.value || '' },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: profile.emails?.[0]?.value || `github-${profile.id}@neoai.dev`,
              name: profile.displayName || profile.username || 'GitHub User',
              password: '', // OAuth users don't have passwords
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8001/auth/google/callback',
    },
    async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
      try {
        let user = await prisma.user.findUnique({
          where: { email: profile.emails?.[0]?.value || '' },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: profile.emails?.[0]?.value || `google-${profile.id}@neoai.dev`,
              name: profile.displayName || 'Google User',
              password: '', // OAuth users don't have passwords
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: id as string },
    });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
