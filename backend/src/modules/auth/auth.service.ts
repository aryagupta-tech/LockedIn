import type { FastifyInstance } from "fastify";
import { ConflictError, UnauthorizedError } from "../../lib/errors";
import { getSupabaseAdmin } from "../../lib/supabase";

export class AuthService {
  private supabase = getSupabaseAdmin();

  constructor(private readonly app: FastifyInstance) {}

  async register(data: {
    email: string;
    username: string;
    password: string;
    displayName: string;
  }) {
    const existing = await this.app.prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email.toLowerCase() },
          { username: data.username.toLowerCase() },
        ],
      },
    });

    if (existing) {
      const field =
        existing.email === data.email.toLowerCase() ? "email" : "username";
      throw new ConflictError(`A user with this ${field} already exists`);
    }

    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email: data.email.toLowerCase(),
        password: data.password,
        email_confirm: true,
        user_metadata: {
          username: data.username.toLowerCase(),
          displayName: data.displayName,
        },
      });

    if (authError) {
      throw new ConflictError(authError.message);
    }

    const user = await this.app.prisma.user.create({
      data: {
        id: authData.user.id,
        email: data.email.toLowerCase(),
        username: data.username.toLowerCase(),
        displayName: data.displayName,
      },
    });

    const { data: session, error: signInError } =
      await this.supabase.auth.signInWithPassword({
        email: data.email.toLowerCase(),
        password: data.password,
      });

    if (signInError || !session.session) {
      throw new UnauthorizedError("Account created but login failed. Please try logging in.");
    }

    return {
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      expiresIn: session.session.expires_in,
      user: this.publicUser(user),
    };
  }

  async login(email: string, password: string) {
    const { data: session, error } =
      await this.supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

    if (error || !session.session) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const user = await this.app.prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      throw new UnauthorizedError("Profile not found. Please register first.");
    }

    if (user.status === "BANNED") {
      throw new UnauthorizedError("This account has been suspended");
    }

    return {
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      expiresIn: session.session.expires_in,
      user: this.publicUser(user),
    };
  }

  async refresh(refreshToken: string) {
    const { data: session, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !session.session) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const user = await this.app.prisma.user.findUnique({
      where: { id: session.user!.id },
    });

    if (!user) {
      throw new UnauthorizedError("Profile not found");
    }

    return {
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      expiresIn: session.session.expires_in,
      user: this.publicUser(user),
    };
  }

  getGitHubAuthUrl(redirectTo: string): string {
    return `${this.app.config.SUPABASE_URL}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(redirectTo)}`;
  }

  async githubCallback(accessToken: string, refreshToken: string) {
    const { data: session, error } = await this.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !session.session) {
      throw new UnauthorizedError("GitHub authentication failed");
    }

    const supaUser = session.user!;
    let user = await this.app.prisma.user.findUnique({
      where: { id: supaUser.id },
    });

    if (!user) {
      const meta = supaUser.user_metadata || {};
      let username = (
        meta.user_name ||
        meta.preferred_username ||
        supaUser.email?.split("@")[0] ||
        "user"
      )
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_");

      const taken = await this.app.prisma.user.findUnique({
        where: { username },
      });
      if (taken) {
        username = `${username}_${supaUser.id.slice(0, 6)}`;
      }

      user = await this.app.prisma.user.create({
        data: {
          id: supaUser.id,
          email: (supaUser.email || `${username}@github.user`).toLowerCase(),
          username,
          displayName: meta.full_name || meta.name || username,
          avatarUrl: meta.avatar_url || null,
          githubId: meta.provider_id ? parseInt(meta.provider_id) : null,
          githubUsername: meta.user_name || null,
        },
      });
    } else {
      const meta = supaUser.user_metadata || {};
      if (meta.avatar_url && !user.avatarUrl) {
        user = await this.app.prisma.user.update({
          where: { id: user.id },
          data: {
            avatarUrl: meta.avatar_url,
            githubUsername: meta.user_name || user.githubUsername,
          },
        });
      }
    }

    if (user.status === "BANNED") {
      throw new UnauthorizedError("This account has been suspended");
    }

    return {
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      expiresIn: session.session.expires_in,
      user: this.publicUser(user),
    };
  }

  private publicUser(user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
    status: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
    };
  }
}
