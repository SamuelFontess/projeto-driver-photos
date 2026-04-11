import http from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import type { Express } from "express";
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "./utils/jwt";
import { publishEmailJob, publishEmailJobsBulk } from "./lib/emailQueue";
import { publishBroadcastJob } from "./lib/broadcastQueue";

// ─── Prisma mock ──────────────────────────────────────────────────────────────
const prismaMock = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  folder: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  file: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  family: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  familyMember: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  favoriteFolder: {
    findMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn().mockResolvedValue(undefined),
  },
  $transaction: vi.fn((queries: unknown) => {
    if (Array.isArray(queries)) {
      return Promise.all(queries);
    }
    return Promise.resolve([]);
  }),
};

vi.mock("./lib/prisma", () => ({
  prisma: prismaMock,
}));

// ─── Firebase mock ────────────────────────────────────────────────────────────
const storageMockFile = {
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue([true]),
  createReadStream: vi.fn().mockReturnValue({
    on: vi.fn(),
    pipe: vi.fn(),
  }),
  download: vi.fn().mockResolvedValue([Buffer.from("fake-content")]),
};

const bucketMock = {
  file: vi.fn().mockReturnValue(storageMockFile),
};

vi.mock("./lib/firebase", () => ({
  initFirebase: vi.fn(),
  getFirebaseBucket: vi.fn().mockReturnValue(bucketMock),
}));

// ─── Redis cache mock (preview cache — optional) ──────────────────────────────
vi.mock("./lib/redis", () => ({
  getPreviewFromCache: vi.fn().mockResolvedValue(null),
  setPreviewInCache: vi.fn().mockResolvedValue(undefined),
  previewCacheMaxBytes: 20 * 1024 * 1024,
  previewMaxBytes: 50 * 1024 * 1024,
  getRedisClient: vi.fn().mockResolvedValue(null),
}));

// ─── Email queue mock ─────────────────────────────────────────────────────────
vi.mock("./lib/emailQueue", () => ({
  publishEmailJob: vi.fn().mockResolvedValue("mock-job-id"),
  publishEmailJobsBulk: vi.fn().mockResolvedValue(undefined),
}));

// ─── Broadcast queue mock ─────────────────────────────────────────────────────
vi.mock("./lib/broadcastQueue", () => ({
  publishBroadcastJob: vi.fn().mockResolvedValue("mock-broadcast-id"),
}));

let app: Express;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function authCookie(userId = "user-1", email = "user@mail.com") {
  return `access_token=${generateToken({ userId, email })}`;
}

function adminCookie() {
  return `access_token=${generateToken({ userId: "admin-1", email: "admin@test.com" })}`;
}

// ─── Test suite ───────────────────────────────────────────────────────────────
describe("Routes integration", () => {
  beforeAll(async () => {
    const appModule = await import("./app");
    app = appModule.app;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default prisma stubs
    prismaMock.folder.count.mockResolvedValue(0);
    prismaMock.file.count.mockResolvedValue(0);
    prismaMock.folder.findMany.mockResolvedValue([]);
    prismaMock.file.findMany.mockResolvedValue([]);
    prismaMock.favoriteFolder.findMany.mockResolvedValue([]);
    prismaMock.family.findMany.mockResolvedValue([]);
    prismaMock.familyMember.findMany.mockResolvedValue([]);
    prismaMock.auditLog.create.mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation((queries: unknown) => {
      if (Array.isArray(queries)) {
        return Promise.all(queries);
      }
      return Promise.resolve([]);
    });

    // Default Firebase stubs
    bucketMock.file.mockReturnValue(storageMockFile);
    storageMockFile.save.mockResolvedValue(undefined);
    storageMockFile.delete.mockResolvedValue(undefined);
    storageMockFile.exists.mockResolvedValue([true]);
    storageMockFile.download.mockResolvedValue([Buffer.from("fake-content")]);
  });

  // ─── Auth ──────────────────────────────────────────────────────────────────

  describe("Auth", () => {
    it("POST /api/auth/register returns 201 on success", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: "user-1",
        email: "new-user@mail.com",
        name: "New User",
        createdAt: new Date(),
      });

      const response = await request(app).post("/api/auth/register").send({
        email: "new-user@mail.com",
        password: "123456",
        name: "New User",
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("user");
      expect(response.headers["set-cookie"]).toBeDefined();
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it("POST /api/auth/register returns 409 when email already exists", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "existing-user" });

      const response = await request(app).post("/api/auth/register").send({
        email: "existing@mail.com",
        password: "123456",
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toMatch(/already exists/i);
    });

    it("POST /api/auth/login returns 401 on wrong password", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "user@mail.com",
        // bcrypt hash of 'wrong-password' would not match 'correct-password'
        // we use null password to simulate a Google-only account
        password: null,
      });

      const response = await request(app).post("/api/auth/login").send({
        email: "user@mail.com",
        password: "any",
      });

      expect(response.status).toBe(401);
    });

    it("GET /api/auth/me returns 401 without cookie", async () => {
      const response = await request(app).get("/api/auth/me");
      expect(response.status).toBe(401);
    });

    it("GET /api/auth/me returns user when authenticated", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "user@mail.com",
        name: "Test User",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .get("/api/auth/me")
        .set("Cookie", authCookie());

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty("email", "user@mail.com");
    });
  });

  // ─── Folders ───────────────────────────────────────────────────────────────

  describe("Folders", () => {
    it("GET /api/folders returns folders for authenticated user", async () => {
      prismaMock.folder.findMany.mockResolvedValue([
        {
          id: "folder-1",
          name: "Root Folder",
          parentId: null,
          familyId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prismaMock.folder.count.mockResolvedValue(1);
      prismaMock.favoriteFolder.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get("/api/folders")
        .set("Cookie", authCookie());

      expect(response.status).toBe(200);
      expect(response.body.folders).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });

    it("GET /api/folders returns 401 without auth", async () => {
      const response = await request(app).get("/api/folders");
      expect(response.status).toBe(401);
    });
  });

  // ─── Files ─────────────────────────────────────────────────────────────────

  describe("Files", () => {
    it("GET /api/files returns 401 without auth", async () => {
      const response = await request(app).get("/api/files");
      expect(response.status).toBe(401);
    });

    it("GET /api/files?search= uses global search filter", async () => {
      const response = await request(app)
        .get("/api/files?search=report")
        .set("Cookie", authCookie());

      expect(response.status).toBe(200);
      expect(response.body.total).toBeDefined();
      expect(prismaMock.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: "report", mode: "insensitive" },
          }),
        })
      );
    });

    it("POST /api/files uploads a file successfully", async () => {
      const fileRecord = {
        id: "file-1",
        name: "test.pdf",
        size: 1024,
        mimeType: "application/pdf",
        familyId: null,
        folderId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.file.create.mockResolvedValue(fileRecord);

      const response = await request(app)
        .post("/api/files")
        .set("Cookie", authCookie())
        .attach("files", Buffer.from("fake pdf content"), {
          filename: "test.pdf",
          contentType: "application/pdf",
        });

      expect(response.status).toBe(201);
      expect(response.body.files).toHaveLength(1);
      expect(storageMockFile.save).toHaveBeenCalled();
      expect(prismaMock.file.create).toHaveBeenCalled();
    });

    it("POST /api/files rejects disallowed MIME types", async () => {
      const response = await request(app)
        .post("/api/files")
        .set("Cookie", authCookie())
        .attach("files", Buffer.from("exe content"), {
          filename: "virus.exe",
          contentType: "application/octet-stream",
        });

      expect(response.status).toBe(400);
    });

    it("POST /api/files cleans up Firebase file on DB failure", async () => {
      prismaMock.file.create.mockRejectedValue(new Error("DB constraint violation"));

      const response = await request(app)
        .post("/api/files")
        .set("Cookie", authCookie())
        .attach("files", Buffer.from("fake pdf content"), {
          filename: "test.pdf",
          contentType: "application/pdf",
        });

      expect(response.status).toBe(500);
      expect(storageMockFile.save).toHaveBeenCalled();
      expect(storageMockFile.delete).toHaveBeenCalled();
    });

    it("DELETE /api/files/:id returns 404 for non-existent file", async () => {
      prismaMock.file.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete("/api/files/non-existent-id")
        .set("Cookie", authCookie());

      expect(response.status).toBe(404);
    });
  });

  // ─── Families ──────────────────────────────────────────────────────────────

  describe("Families", () => {
    it("GET /api/families returns 401 without auth", async () => {
      const response = await request(app).get("/api/families");
      expect(response.status).toBe(401);
    });

    it("GET /api/families returns families for authenticated user", async () => {
      prismaMock.family.findMany.mockResolvedValue([
        {
          id: "family-1",
          name: "My Family",
          ownerId: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { members: 2 },
        },
      ]);

      const response = await request(app)
        .get("/api/families")
        .set("Cookie", authCookie());

      expect(response.status).toBe(200);
      expect(response.body.families).toHaveLength(1);
    });

    it("POST /api/families creates a family", async () => {
      const family = {
        id: "family-1",
        name: "Test Family",
        ownerId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.family.create.mockResolvedValue(family);

      const response = await request(app)
        .post("/api/families")
        .set("Cookie", authCookie())
        .send({ name: "Test Family" });

      expect(response.status).toBe(201);
      expect(response.body.family).toHaveProperty("name", "Test Family");
    });

    it("GET /api/families/:id/members returns 403 when user has no access", async () => {
      prismaMock.family.findUnique.mockResolvedValue({
        id: "family-1",
        ownerId: "other-user",
      });
      prismaMock.familyMember.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get("/api/families/family-1/members")
        .set("Cookie", authCookie());

      expect(response.status).toBe(403);
    });

    it("POST /api/families/:id/members usa email do inviter quando nome está vazio (usuário sem conta)", async () => {
      const invite = {
        id: "member-1",
        familyId: "family-1",
        userId: null,
        email: "invited@test.com",
        status: "pending",
        invitedById: "user-1",
        invitedAt: new Date(),
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.family.findUnique.mockResolvedValue({
        id: "family-1",
        name: "Test Family",
        ownerId: "user-1",
      });
      // 1ª chamada: invitedUser por email → null (sem conta)
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      // familyMember.findFirst: sem convite anterior
      prismaMock.familyMember.findFirst.mockResolvedValue(null);
      // 2ª chamada: inviter por id → name null, só email
      prismaMock.user.findUnique.mockResolvedValueOnce({
        name: null,
        email: "inviter@test.com",
      });
      prismaMock.familyMember.create.mockResolvedValue(invite);

      const response = await request(app)
        .post("/api/families/family-1/invites")
        .set("Cookie", authCookie("user-1", "inviter@test.com"))
        .send({ email: "invited@test.com" });

      expect(response.status).toBe(201);
      expect(vi.mocked(publishEmailJob)).toHaveBeenCalledWith(
        "family_invite_register",
        expect.objectContaining({ inviterName: "inviter@test.com" }),
      );
    });

    it("POST /api/families/:id/members usa email do inviter quando nome está vazio (usuário com conta)", async () => {
      const invite = {
        id: "member-2",
        familyId: "family-1",
        userId: "invited-user-2",
        email: "invited@test.com",
        status: "pending",
        invitedById: "user-1",
        invitedAt: new Date(),
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.family.findUnique.mockResolvedValue({
        id: "family-1",
        name: "Test Family",
        ownerId: "user-1",
      });
      // 1ª chamada: invitedUser por email → usuário com conta
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: "invited-user-2",
        email: "invited@test.com",
      });
      // familyMember.findFirst: sem convite anterior
      prismaMock.familyMember.findFirst.mockResolvedValue(null);
      // 2ª chamada: inviter por id → name null, só email
      prismaMock.user.findUnique.mockResolvedValueOnce({
        name: null,
        email: "inviter@test.com",
      });
      prismaMock.familyMember.create.mockResolvedValue(invite);

      const response = await request(app)
        .post("/api/families/family-1/invites")
        .set("Cookie", authCookie("user-1", "inviter@test.com"))
        .send({ email: "invited@test.com" });

      expect(response.status).toBe(201);
      expect(vi.mocked(publishEmailJob)).toHaveBeenCalledWith(
        "family_invite",
        expect.objectContaining({ inviterName: "inviter@test.com" }),
      );
    });
  });

  // ─── Admin ─────────────────────────────────────────────────────────────────

  describe("Admin", () => {
    afterEach(() => {
      delete process.env.ADMIN_EMAILS;
    });

    it("POST /api/admin/send-email returns 403 for non-admin", async () => {
      const response = await request(app)
        .post("/api/admin/send-email")
        .set("Cookie", authCookie())
        .send({ to: "user@mail.com", subject: "test", body: "<p>hello</p>" });

      expect(response.status).toBe(403);
    });

    it("POST /api/admin/send-email returns 401 without auth", async () => {
      const response = await request(app)
        .post("/api/admin/send-email")
        .send({ to: "user@mail.com", subject: "test", body: "<p>hello</p>" });

      expect(response.status).toBe(401);
    });

    it("POST /api/admin/send-email returns 200 and enqueues manual_email job", async () => {
      process.env.ADMIN_EMAILS = "admin@test.com";
      vi.mocked(publishEmailJob).mockResolvedValue("mock-job-id");

      const response = await request(app)
        .post("/api/admin/send-email")
        .set("Cookie", adminCookie())
        .send({ to: "destino@mail.com", subject: "Assunto", body: "<p>Corpo</p>" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Email enviado com sucesso" });
      expect(vi.mocked(publishEmailJob)).toHaveBeenCalledOnce();
      expect(vi.mocked(publishEmailJob)).toHaveBeenCalledWith("manual_email", {
        to: "destino@mail.com",
        subject: "Assunto",
        html: "<p>Corpo</p>",
      });
    });

    it("POST /api/admin/send-email returns 200 even when job returns empty jobId", async () => {
      process.env.ADMIN_EMAILS = "admin@test.com";
      vi.mocked(publishEmailJob).mockResolvedValue("");

      const response = await request(app)
        .post("/api/admin/send-email")
        .set("Cookie", adminCookie())
        .send({ to: "destino@mail.com", subject: "Assunto", body: "<p>Corpo</p>" });

      expect(response.status).toBe(200);
      expect(vi.mocked(publishEmailJob)).toHaveBeenCalledOnce();
    });

    it("POST /api/admin/broadcast returns 401 without auth", async () => {
      const response = await request(app)
        .post("/api/admin/broadcast")
        .send({ title: "Aviso", message: "Olá a todos" });

      expect(response.status).toBe(401);
    });

    it("POST /api/admin/broadcast returns 403 for non-admin", async () => {
      const response = await request(app)
        .post("/api/admin/broadcast")
        .set("Cookie", authCookie())
        .send({ title: "Aviso", message: "Olá a todos" });

      expect(response.status).toBe(403);
    });

    it("POST /api/admin/broadcast returns 400 when title or message is missing", async () => {
      process.env.ADMIN_EMAILS = "admin@test.com";

      const response = await request(app)
        .post("/api/admin/broadcast")
        .set("Cookie", adminCookie())
        .send({ title: "", message: "msg" });

      expect(response.status).toBe(400);
    });

    it("POST /api/admin/broadcast returns 200 e enfileira broadcast_message sem email", async () => {
      process.env.ADMIN_EMAILS = "admin@test.com";

      const response = await request(app)
        .post("/api/admin/broadcast")
        .set("Cookie", adminCookie())
        .send({ title: "Aviso", message: "Sistema em manutenção", sendEmail: false });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/sucesso/i);
      expect(vi.mocked(publishBroadcastJob)).toHaveBeenCalledOnce();
      expect(vi.mocked(publishBroadcastJob)).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Sistema em manutenção" }),
      );
      expect(vi.mocked(publishEmailJob)).not.toHaveBeenCalled();
    });

    it("POST /api/admin/broadcast com sendEmail=true enfileira broadcast + broadcast_email por usuário", async () => {
      process.env.ADMIN_EMAILS = "admin@test.com";
      prismaMock.user.findMany.mockResolvedValue([
        { email: "user1@mail.com" },
        { email: "user2@mail.com" },
      ]);

      const response = await request(app)
        .post("/api/admin/broadcast")
        .set("Cookie", adminCookie())
        .send({ title: "Novidade", message: "Temos uma novidade!", sendEmail: true });

      expect(response.status).toBe(200);
      expect(vi.mocked(publishBroadcastJob)).toHaveBeenCalledOnce();
      expect(vi.mocked(publishEmailJobsBulk)).toHaveBeenCalledOnce();
      expect(vi.mocked(publishEmailJobsBulk)).toHaveBeenCalledWith([
        { type: "broadcast_email", payload: expect.objectContaining({ to: "user1@mail.com", subject: "Novidade" }) },
        { type: "broadcast_email", payload: expect.objectContaining({ to: "user2@mail.com", subject: "Novidade" }) },
      ]);
    });
  });

  // ─── Events (SSE) ──────────────────────────────────────────────────────────

  describe("Events (SSE)", () => {
    it("GET /api/events retorna 401 sem autenticação", async () => {
      const res = await request(app).get("/api/events");
      expect(res.status).toBe(401);
    });

    it("GET /api/events retorna cabeçalhos text/event-stream com autenticação", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "user@mail.com",
        name: "Test User",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // supertest não suporta respostas que nunca fecham (SSE);
      // usamos http.get direto para verificar os headers e abortar em seguida
      const server = app.listen(0);
      const { port } = server.address() as AddressInfo;
      const token = generateToken({ userId: "user-1", email: "user@mail.com" });

      try {
        await new Promise<void>((resolve, reject) => {
          const req = http.get(
            `http://localhost:${port}/api/events`,
            { headers: { Cookie: `access_token=${token}` } },
            (res) => {
              expect(res.statusCode).toBe(200);
              expect(res.headers["content-type"]).toContain("text/event-stream");
              expect(res.headers["x-accel-buffering"]).toBe("no");
              res.destroy();
              resolve();
            }
          );
          req.on("error", (err: NodeJS.ErrnoException) => {
            if (err.code === "ECONNRESET") resolve();
            else reject(err);
          });
        });
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });

  // ─── Health check ──────────────────────────────────────────────────────────

  describe("Health", () => {
    it("GET /health returns 200", async () => {
      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
    });
  });
});
