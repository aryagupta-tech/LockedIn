const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("lockedin_access_token");
  }

  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("lockedin_refresh_token");
  }

  private setTokens(access: string, refresh: string) {
    localStorage.setItem("lockedin_access_token", access);
    localStorage.setItem("lockedin_refresh_token", refresh);
  }

  clearTokens() {
    localStorage.removeItem("lockedin_access_token");
    localStorage.removeItem("lockedin_refresh_token");
    localStorage.removeItem("lockedin_user");
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem("lockedin_user", JSON.stringify(data.user));
      return true;
    } catch {
      return false;
    }
  }

  async request<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
    const { skipAuth, headers: customHeaders, ...rest } = options;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((customHeaders as Record<string, string>) || {}),
    };

    if (!skipAuth) {
      const token = this.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    let res = await fetch(`${API_BASE}${path}`, { ...rest, headers });

    if (res.status === 401 && !skipAuth) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const newToken = this.getToken();
        if (newToken) headers["Authorization"] = `Bearer ${newToken}`;
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
