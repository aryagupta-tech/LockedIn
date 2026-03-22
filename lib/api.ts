import { supabase } from "./supabase";
import type { BuilderProgress } from "./gamification";

export type { BuilderProgress };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async getToken(): Promise<string | null> {
    if (this.accessToken) return this.accessToken;
    return null;
  }

  clearTokens() {
    this.accessToken = null;
    localStorage.removeItem("lockedin_user");
  }

  async request<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
    const { skipAuth, headers: customHeaders, ...rest } = options;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((customHeaders as Record<string, string>) || {}),
    };

    if (!skipAuth) {
      const token = await this.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    let res = await fetch(`${API_BASE}${path}`, { ...rest, headers });

    if (res.status === 401 && !skipAuth) {
      const { data } = await supabase.auth.refreshSession();
      if (data.session) {
        this.accessToken = data.session.access_token;
        headers["Authorization"] = `Bearer ${data.session.access_token}`;
        res = await fetch(`${API_BASE}${path}`, { ...rest, headers });
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Request failed" }));
      throw new ApiError(
        res.status,
        body.error || "Request failed",
        body.code,
        body.details as string | undefined,
        body.hint as string | undefined,
      );
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  get<T = unknown>(path: string, opts?: ApiOptions) {
    return this.request<T>(path, { ...opts, method: "GET" });
  }

  post<T = unknown>(path: string, body?: unknown, opts?: ApiOptions) {
    return this.request<T>(path, { ...opts, method: "POST", body: body ? JSON.stringify(body) : undefined });
  }

  patch<T = unknown>(path: string, body?: unknown, opts?: ApiOptions) {
    return this.request<T>(path, { ...opts, method: "PATCH", body: body ? JSON.stringify(body) : undefined });
  }

  put<T = unknown>(path: string, body?: unknown, opts?: ApiOptions) {
    return this.request<T>(path, { ...opts, method: "PUT", body: body ? JSON.stringify(body) : undefined });
  }

  del<T = unknown>(path: string, opts?: ApiOptions) {
    return this.request<T>(path, { ...opts, method: "DELETE" });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: string,
    public hint?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = new ApiClient();

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  status: string;
  createdAt?: string;
  /** Last time username was changed (GitHub accounts); drives 30-day cooldown. */
  usernameChangedAt?: string | null;
  /** From GET/PATCH /profiles/me — whether the session includes GitHub OAuth. */
  githubSignIn?: boolean;
  /** From GET/PATCH /profiles/me — false while inside the 30-day username cooldown. */
  canChangeUsername?: boolean;
  /** ISO date when username can change again (cooldown). */
  nextUsernameChangeAt?: string | null;
  builder?: BuilderProgress;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface Post {
  id: string;
  content: string;
  /** Public Supabase storage URL for an attached image (optional). */
  imageUrl?: string | null;
  codeSnippet: string | null;
  codeLanguage: string | null;
  communityId: string | null;
  likesCount: number;
  commentsCount: number;
  /** Populated after running scripts/post-views-count.sql; incremented on post GET (non-author). */
  viewsCount?: number;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  hasLiked?: boolean;
  hasBookmarked?: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  parentId: string | null;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  replies?: Comment[];
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isPrivate: boolean;
  memberCount: number;
  gatingCriteria: unknown;
  owner: { id: string; username: string; displayName: string };
  createdAt: string;
}

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  githubUsername: string | null;
  role: string;
  status: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
  createdAt: string;
  builder?: BuilderProgress;
}

export interface FeedResponse {
  items: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface Application {
  id: string;
  userId: string;
  status: string;
  githubUrl: string | null;
  codeforcesHandle: string | null;
  leetcodeHandle: string | null;
  codolioProfile: string | null;
  score: number | null;
  scoreBreakdown: unknown;
  reviewedAt: string | null;
  createdAt: string;
}
