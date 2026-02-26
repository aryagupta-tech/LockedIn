import { Type, Static } from "@sinclair/typebox";

export const ApplyBody = Type.Object({
  githubUrl: Type.Optional(Type.String()),
  codeforcesHandle: Type.Optional(Type.String()),
  leetcodeHandle: Type.Optional(Type.String()),
  portfolioUrl: Type.Optional(Type.String({ format: "uri" })),
});
export type ApplyBody = Static<typeof ApplyBody>;

export const ApplicationResponse = Type.Object({
  id: Type.String(),
  userId: Type.String(),
  status: Type.String(),
  githubUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  codeforcesHandle: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  leetcodeHandle: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  portfolioUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  score: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  scoreBreakdown: Type.Optional(Type.Any()),
  passingThreshold: Type.Number(),
  reviewNote: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const applySchema = {
  tags: ["applications"],
  summary: "Submit a new application for access",
  security: [{ bearerAuth: [] }],
  body: ApplyBody,
  response: { 201: ApplicationResponse },
};

export const getMyApplicationsSchema = {
  tags: ["applications"],
  summary: "List my applications",
  security: [{ bearerAuth: [] }],
  response: { 200: Type.Array(ApplicationResponse) },
};

export const getApplicationSchema = {
  tags: ["applications"],
  summary: "Get a specific application",
  security: [{ bearerAuth: [] }],
  params: Type.Object({ id: Type.String() }),
  response: { 200: ApplicationResponse },
};
