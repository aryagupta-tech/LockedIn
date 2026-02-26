import { Type, Static } from "@sinclair/typebox";

export const CreateAppealBody = Type.Object({
  applicationId: Type.String(),
  reason: Type.String({ minLength: 20, maxLength: 2000 }),
});
export type CreateAppealBody = Static<typeof CreateAppealBody>;

export const AppealResponse = Type.Object({
  id: Type.String(),
  applicationId: Type.String(),
  reason: Type.String(),
  status: Type.String(),
  reviewNote: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
});
