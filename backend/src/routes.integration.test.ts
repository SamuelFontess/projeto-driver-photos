import request from 'supertest';
import type { Express } from 'express';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateToken } from './utils/jwt';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  folder: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  file: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('./lib/prisma', () => ({
  prisma: prismaMock,
}));

let app: Express;

describe('Routes integration', () => {
  beforeAll(async () => {
    const appModule = await import('./app');
    app = appModule.app;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.folder.count.mockResolvedValue(0);
    prismaMock.file.count.mockResolvedValue(0);
    prismaMock.folder.findMany.mockResolvedValue([]);
    prismaMock.file.findMany.mockResolvedValue([]);
  });

  it('POST /api/auth/register returns 201 on success', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'new-user@mail.com',
      name: 'New User',
      createdAt: new Date(),
    });

    const response = await request(app).post('/api/auth/register').send({
      email: 'new-user@mail.com',
      password: '123456',
      name: 'New User',
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it('GET /api/folders returns folders for authenticated user', async () => {
    const token = generateToken({ userId: 'user-1', email: 'user@mail.com' });
    prismaMock.folder.findMany.mockResolvedValue([
      {
        id: 'folder-1',
        name: 'Root Folder',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const response = await request(app)
      .get('/api/folders')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.folders).toHaveLength(1);
    expect(prismaMock.folder.findMany).toHaveBeenCalled();
  });

  it('GET /api/files?search= uses global search filter', async () => {
    const token = generateToken({ userId: 'user-1', email: 'user@mail.com' });

    const response = await request(app)
      .get('/api/files?search=report')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(prismaMock.file.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          name: {
            contains: 'report',
            mode: 'insensitive',
          },
        }),
      })
    );
  });
});
