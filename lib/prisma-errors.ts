import { Prisma } from "@prisma/client";

function prismaErrorCode(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
}

export function isPrismaNotFoundError(error: unknown) {
  return prismaErrorCode(error) === "P2025";
}

export function isPrismaTableMissingError(error: unknown) {
  return prismaErrorCode(error) === "P2021";
}

export function isPrismaConflictError(error: unknown) {
  return prismaErrorCode(error) === "P2002";
}

export function isDatabaseUnavailableError(error: unknown) {
  const code = prismaErrorCode(error);
  if (code && ["P1001", "P1003", "P1012", "P2021", "P2022", "P2024", "P2037"].includes(code)) return true;
  if (!(error instanceof Error)) return false;
  return /Environment variable not found: DATABASE_URL|Can't reach database server|Database .* does not exist/i.test(error.message);
}
