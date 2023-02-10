-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EthereumTransactionStatus" AS ENUM ('NOT_CONFIRMED', 'CONFIRMED');

-- CreateTable
CREATE TABLE "PathIndex" (
    "id" BIGSERIAL NOT NULL,
    "index" BIGINT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BridgeEventTransactions" (
    "id" BIGSERIAL NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "status" "EthereumTransactionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "BridgeEventTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PathIndex_index_key" ON "PathIndex"("index");