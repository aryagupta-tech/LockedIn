import { Type, Static } from "@sinclair/typebox";

export const CreatePostBody = Type.Object({
  content: Type.String({ minLength: 1, maxLength: 5000 }),
  codeSnippet: Type.Optional(Type.String({ maxLength: 10000 })),
  codeLanguage: Type.Optional(Type.String({ maxLength: 50 })),
  communityId: Type.Optional(Type.String()),
});
export type CreatePostBody = Static<typeof CreatePostBody>;

export const CreateCommentBody = Type.Object({
  content: Type.String({ minLength: 1, maxLength: 2000 }),
  parentId: Type.Optional(Type.String()),
});
export type CreateCommentBody = Static<typeof CreateCommentBody>;

export const PostResponse = Type.Object({
  id: Type.String(),
  content: Type.String(),
  codeSnippet: Type.Union([Type.String(), Type.Null()]),
  codeLanguage: Type.Union([Type.String(), Type.Null()]),
  communityId: Type.Union([Type.String(), Type.Null()]),
  likesCount: Type.Number(),
  commentsCount: Type.Number(),
  author: Type.Object({
    id: Type.String(),
    username: Type.String(),
    displayName: Type.String(),
    avatarUrl: Type.Union([Type.String(), Type.Null()]),
  }),
  hasLiked: Type.Optional(Type.Boolean()),
  createdAt: Type.String(),
});
