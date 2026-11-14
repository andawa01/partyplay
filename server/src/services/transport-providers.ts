import { db } from "../config/db";
import { notFound } from "../lib/api-error";
import type {
  CreateTransportProviderInput,
  UpdateTransportProviderInput,
} from "../schemas/transport-providers";

const providerFields = {
  id: true,
  name: true,
  phone: true,
  serviceArea: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listTransportProviders() {
  return db.transportProvider.findMany({
    select: providerFields,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function createTransportProvider(input: CreateTransportProviderInput) {
  return db.transportProvider.create({ data: input, select: providerFields });
}

/** A duplicate phone is a unique-constraint violation; the error middleware maps P2002. */
export async function updateTransportProviderById(
  id: string,
  input: UpdateTransportProviderInput,
) {
  await assertProviderExists(id);
  return db.transportProvider.update({ where: { id }, data: input, select: providerFields });
}

export async function deleteTransportProviderById(id: string): Promise<void> {
  await assertProviderExists(id);
  await db.transportProvider.delete({ where: { id } });
}

async function assertProviderExists(id: string): Promise<void> {
  const provider = await db.transportProvider.findUnique({ where: { id }, select: { id: true } });
  if (!provider) {
    throw notFound(`Transport provider "${id}" was not found`);
  }
}
