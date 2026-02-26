import { Type, Static } from "@sinclair/typebox";

export const UpdateProfileBody = Type.Object({
  displayName: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  bio: Type.Optional(Type.String({ maxLength: 500 })),
  avatarUrl: Type.Optional(Type.String()),
  codeforcesHandle: Type.Optional(Type.String()),
  leetcodeHandle: Type.Optional(Type.String()),
  portfolioUrl: Type.Optional(Type.String()),
});
export type UpdateProfileBody = Static<typeof UpdateProfileBody>;

export const ProfileResponse = Type.Object({
  id: Type.String(),
  username: Type.String(),
  displayName: Type.String(),
  avatarUrl: Type.Union([Type.String(), Type.Null()]),
  bio: Type.Union([Type.String(), Type.Null()]),
  githubUsername: Type.Union([Type.String(), Type.Null()]),
  codeforcesHandle: Type.Union([Type.String(), Type.Null()]),
  leetcodeHandle: Type.Union([Type.String(), Type.Null()]),
  portfolioUrl: Type.Union([Type.String(), Type.Null()]),
  role: Type.String(),
  followersCount: Type.Number(),
  followingCount: Type.Number(),
  isFollowing: Type.Optional(Type.Boolean()),
  createdAt: Type.String(),
});
