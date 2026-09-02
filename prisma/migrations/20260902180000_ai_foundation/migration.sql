-- CreateEnum
CREATE TYPE "AgentToolCallStatus" AS ENUM ('OK', 'ERROR', 'DENIED', 'AWAITING_CONFIRMATION');

-- CreateTable
CREATE TABLE "agent_tool_calls" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "messageId" TEXT,
    "userId" TEXT,
    "toolName" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "status" "AgentToolCallStatus" NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_tool_calls_userId_createdAt_idx" ON "agent_tool_calls"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_tool_calls_sessionId_createdAt_idx" ON "agent_tool_calls"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_tool_calls_toolName_createdAt_idx" ON "agent_tool_calls"("toolName", "createdAt");

-- AddForeignKey
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
