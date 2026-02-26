import { hash, compare } from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { ConflictError, UnauthorizedError } from "../../lib/errors";
import { encrypt } from "../../lib/crypto";
import {
  buildGitHubAuthUrl,
  exchangeGitHubCode,
  fetchGitHubUser,
  fetchGitHubEmail,
} from "./github-oauth";

const BCRYPT_ROUNDS = 12;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
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

    const passwordHash = await hash(data.password, BCRYPT_ROUNDS);

    const user = await this.app.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.username.toLowerCase(),
        displayName: data.displayName,
        passwordHash,
      },
    });

    const tokens = await this.generateTokens(user.id, user.role);
    return { ...tokens, user: this.publicUser(user) };
  }

  async login(email: string, password: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.status === "BANNED") {
      throw new UnauthorizedError("This account has been suspended");
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { ...tokens, user: this.publicUser(user) };
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    const stored = await this.app.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        // Token reuse detected — revoke all tokens for this user
        await this.app.prisma.refreshToken.deleteMany({
          where: { userId: stored.userId },
        });
      }
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Rotate: delete old token, issue new pair
    await this.app.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(
      stored.user.id,
      stored.user.role,
    );
    return { ...tokens, user: this.publicUser(stored.user) };
  }

  getGitHubAuthUrl(): string {
    return buildGitHubAuthUrl();
  }

  async githubCallback(code: string) {
    const ghToken = await exchangeGitHubCode(code);
    const ghUser = await fetchGitHubUser(ghToken);

    let email = ghUser.email;
    if (!email) {
      email = await fetchGitHubEmail(ghToken);
    }
    if (!email) {
      throw new UnauthorizedError(
        "No verified email found on your GitHub account",
      );
    }

    let user = await this.app.prisma.user.findUnique({
      where: { githubId: ghUser.id },
    });

    if (!user) {
      // Check if email is taken by a non-GitHub user
      const emailUser = await this.app.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (emailUser) {
        // Link GitHub to existing account
        user = await this.app.prisma.user.update({
          where: { id: emailUser.id },
          data: {
            githubId: ghUser.id,
            githubUsername: ghUser.login,
            githubTokenEnc: encrypt(ghToken),
            avatarUrl: emailUser.avatarUrl || ghUser.avatar_url,
          },
        });
      } else {
        // Create new user — derive a unique username
        let username = ghUser.login.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const taken = await this.app.prisma.user.findUnique({
          where: { username },
        });
        if (taken) {
          username = `${username}_${randomBytes(3).toString("hex")}`;
        }

        user = await this.app.prisma.user.create({
          data: {
            email: email.toLowerCase(),
            username,
            displayName: ghUser.name || ghUser.login,
            avatarUrl: ghUser.avatar_url,
            bio: ghUser.bio,
            githubId: ghUser.id,
            githubUsername: ghUser.login,
            githubTokenEnc: encrypt(ghToken),
          },
        });
      }
    } else {
      // Update token on every login
      user = await this.app.prisma.user.update({
        where: { id: user.id },
        data: {
          githubTokenEnc: encrypt(ghToken),
          githubUsername: ghUser.login,
          avatarUrl: user.avatarUrl || ghUser.avatar_url,
        },
      });
    }

    if (user.status === "BANNED") {
      throw new UnauthorizedError("This account has been suspended");
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { ...tokens, user: this.publicUser(user) };
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  private async generateTokens(
    userId: string,
    role: string,
  ): Promise<TokenPair> {
    const cfg = this.app.config;
    const expiresIn = cfg.JWT_ACCESS_EXPIRES_SECONDS;

    const accessToken = this.app.jwt.sign(
      { sub: userId, role },
      { expiresIn },
    );

    const rawRefresh = randomBytes(48).toString("hex");
    const tokenHash = hashToken(rawRefresh);

    await this.app.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt: new Date(
          Date.now() + cfg.JWT_REFRESH_EXPIRES_SECONDS * 1000,
        ),
      },
    });

    // Limit active refresh tokens per user (keep latest 5)
    const tokens = await this.app.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: 5,
    });
    if (tokens.length > 0) {
      await this.app.prisma.refreshToken.deleteMany({
        where: { id: { in: tokens.map((t) => t.id) } },
      });
    }

    return { accessToken, refreshToken: rawRefresh, expiresIn };
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
