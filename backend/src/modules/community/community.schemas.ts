import { Type, Static } from "@sinclair/typebox";

export const CreateCommunityBody = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 80 }),
  slug: Type.String({ minLength: 2, maxLength: 40, pattern: "^[a-z0-9-]+$" }),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  isPrivate: Type.Optional(Type.Boolean()),
  gatingCriteria: Type.Optional(
    Type.Object({
      minScore: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
      requiredSignals: Type.Optional(Type.Array(Type.String())),
    }),
  ),
});
export type CreateCommunityBody = Static<typeof CreateCommunityBody>;

export const CommunityResponse = Type.Object({
  id: Type.String(),
  name: Type.String(),
  slug: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  isPrivate: Type.Boolean(),
  memberCount: Type.Number(),
  gatingCriteria: Type.Any(),
  owner: Type.Object({
    id: Type.String(),
    username: Type.String(),
    displayName: Type.String(),
  }),
  createdAt: Type.String(),
});
