import { handlers } from "@/lib/auth";

/** Prisma adapter + bcrypt need the Node.js runtime. */
export const runtime = "nodejs";

export const { GET, POST } = handlers;
