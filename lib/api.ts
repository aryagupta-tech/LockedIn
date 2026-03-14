import { supabase } from "./supabase";

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
    if (typeof window === "undefined") return null;

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      this.accessToken = data.session.access_token;
      return this.accessToken;
    }
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
      throw new ApiError(res.status, body.error || "Request failed", body.code);
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
  codeSnippet: string | null;
  codeLanguage: string | null;
  communityId: string | null;
  likesCount: number;
  commentsCount: number;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  hasLiked?: boolean;
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
  portfolioUrl: string | null;
  score: number | null;
  scoreBreakdown: unknown;
  reviewedAt: string | null;
  createdAt: string;
}
