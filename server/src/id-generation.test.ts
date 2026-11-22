import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

describe("primary-key generation", () => {
  it("lets Prisma generate a UUID for every model id", () => {
    const models = Prisma.dmmf.datamodel.models;
    expect(models.length).toBeGreaterThan(0);

    for (const model of models) {
      const id = model.fields.find((field) => field.name === "id");
      expect(id?.isId, `${model.name}.id must be the primary key`).toBe(true);
      expect(id?.default, `${model.name}.id must default to a UUID`).toEqual({
        name: "uuid",
        args: [4],
      });
    }
  });
});
