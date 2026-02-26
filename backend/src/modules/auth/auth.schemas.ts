import { Type, Static } from "@sinclair/typebox";

// ─── Request bodies ──────────────────────────────────────────────────────────

export const RegisterBody = Type.Object({
  email: Type.String({ format: "email" }),
  username: Type.String({
    minLength: 3,
    maxLength: 30,
    pattern: "^[a-zA-Z0-9_]+$",
  }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
  displayName: Type.String({ minLength: 1, maxLength: 100 }),
});
export type RegisterBody = Static<typeof RegisterBody>;

export const LoginBody = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String(),
});
export type LoginBody = Static<typeof LoginBody>;

export const RefreshBody = Type.Object({
  refreshToken: Type.String(),
});
export type RefreshBody = Static<typeof RefreshBody>;

export const GitHubCallbackBody = Type.Object({
  code: Type.String(),
});
export type GitHubCallbackBody = Static<typeof GitHubCallbackBody>;

// ─── Responses ───────────────────────────────────────────────────────────────

export const UserPublic = Type.Object({
  id: Type.String(),
  email: Type.String(),
  username: Type.String(),
  displayName: Type.String(),
  avatarUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  role: Type.String(),
  status: Type.String(),
});

export const AuthTokens = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
  expiresIn: Type.Number(),
  user: UserPublic,
});

export const ErrorResponse = Type.Object({
  error: Type.String(),
  code: Type.String(),
});

// ─── Route schemas ───────────────────────────────────────────────────────────

export const registerSchema = {
  tags: ["auth"],
  summary: "Register with email and password",
  body: RegisterBody,
  response: { 201: AuthTokens, 409: ErrorResponse },
};

export const loginSchema = {
  tags: ["auth"],
  summary: "Log in with email and password",
  body: LoginBody,
  response: { 200: AuthTokens, 401: ErrorResponse },
};

export const refreshSchema = {
  tags: ["auth"],
  summary: "Refresh access token",
  body: RefreshBody,
  response: { 200: AuthTokens, 401: ErrorResponse },
};

export const githubUrlSchema = {
  tags: ["auth"],
  summary: "Get GitHub OAuth authorization URL",
  response: {
    200: Type.Object({ url: Type.String() }),
  },
};

export const githubCallbackSchema = {
  tags: ["auth"],
  summary: "Exchange GitHub OAuth code for tokens",
  body: GitHubCallbackBody,
  response: { 200: AuthTokens },
};
