import type { FastifyInstance } from "fastify";
import { NotFoundError, ForbiddenError } from "../../lib/errors";

export class PostService {
  constructor(private readonly app: FastifyInstance) {}

  async create(
    authorId: string,
    data: {
      content: string;
      codeSnippet?: string;
      codeLanguage?: string;
      communityId?: string;
    },
  ) {
    if (data.communityId) {
      const membership = await this.app.prisma.communityMember.findUnique({
        where: {
          communityId_userId: {
            communityId: data.communityId,
            userId: authorId,
          },
        },
      });
      if (!membership) {
        throw new ForbiddenError("You must be a community member to post");
      }
    }

    return this.app.prisma.post.create({
      data: { authorId, ...data },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  async getById(postId: string, viewerId?: string) {
    const post = await this.app.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
    if (!post) throw new NotFoundError("Post", postId);

    let hasLiked: boolean | undefined;
    if (viewerId) {
      const like = await this.app.prisma.postLike.findUnique({
        where: { postId_userId: { postId, userId: viewerId } },
      });
      hasLiked = !!like;
    }

    return { ...post, hasLiked };
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.app.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundError("Post", postId);

    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (post.authorId !== userId && user?.role !== "ADMIN") {
      throw new ForbiddenError();
    }

    await this.app.prisma.post.delete({ where: { id: postId } });
    return { deleted: true };
  }

  async like(postId: string, userId: string) {
    const post = await this.app.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundError("Post", postId);

    await this.app.prisma.$transaction([
      this.app.prisma.postLike.create({
        data: { postId, userId },
      }),
      this.app.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    return { liked: true };
  }

  async unlike(postId: string, userId: string) {
    const existing = await this.app.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) return { unliked: false };

    await this.app.prisma.$transaction([
      this.app.prisma.postLike.delete({
        where: { postId_userId: { postId, userId } },
      }),
      this.app.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    return { unliked: true };
  }

  async getComments(postId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.app.prisma.comment.findMany({
      where: { postId, parentId: null },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: "asc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
  }

  async addComment(
    postId: string,
    authorId: string,
    content: string,
    parentId?: string,
  ) {
    const post = await this.app.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundError("Post", postId);

    const [comment] = await this.app.prisma.$transaction([
      this.app.prisma.comment.create({
        data: { postId, authorId, content, parentId },
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      this.app.prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    return comment;
  }
}
