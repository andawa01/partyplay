import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminCategory, AdminEquipment } from "../../../lib/admin-catalogue";
import { EquipmentFormDialog } from "./EquipmentPanel";
import { OfferFormDialog } from "./OffersPanel";
import { PackageFormDialog } from "./PackagesPanel";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderWithClient(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
}

const category: AdminCategory = {
  id: "cat-furniture",
  slug: "furniture",
  name: "Furniture",
  description: null,
  isGroup: false,
  parentId: null,
  children: [],
  equipment: [],
};

function equipmentRow(id: string, name: string): AdminEquipment {
  return {
    id,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    description: null,
    imageUrl: null,
    imagePublicId: null,
    note: null,
    pricePerDay: "1000.00",
    pricePerWeek: null,
    flatPrice: null,
    pricingMode: "PER_DAY",
    minQuantity: 1,
    maxQuantity: 10,
    total: 5,
    category: { slug: "furniture", name: "Furniture", parent: null },
    isActive: true,
    createdAt: "2026-11-22T10:00:00.000Z",
    updatedAt: "2026-11-22T10:00:00.000Z",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin catalogue forms", () => {
  it("blocks an empty equipment form with inline field errors", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithClient(
      <EquipmentFormDialog
        categories={[category]}
        categoryIdBySlug={new Map([["furniture", category.id]])}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add equipment" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Slug is required")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Set the price used by this pricing mode so the public catalogue can show a price",
      ),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the form values and shows the server message on a slug conflict", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        jsonResponse(409, {
          error: 'A record with this slug already exists',
          code: "CONFLICT",
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithClient(
      <EquipmentFormDialog
        categories={[category]}
        categoryIdBySlug={new Map([["furniture", category.id]])}
        onClose={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/^Name/), "Test chairs");
    await user.type(screen.getByLabelText(/^Slug/), "test-chairs");
    await user.type(screen.getByLabelText(/daily price/i), "1200");
    await user.click(screen.getByRole("button", { name: "Add equipment" }));

    expect(await screen.findByText("Could not save changes")).toBeInTheDocument();
    expect(
      screen.getByText("A record with this slug already exists"),
    ).toBeInTheDocument();

    // The operator's input is still on screen so they can change the slug and retry.
    expect(screen.getByLabelText(/^Name/)).toHaveValue("Test chairs");
    expect(screen.getByLabelText(/^Slug/)).toHaveValue("test-chairs");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/admin/equipment");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      slug: "test-chairs",
      name: "Test chairs",
      categoryId: category.id,
      pricePerDay: 1200,
    });
  });

  it("uploads an image and saves its Cloudinary reference", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/admin/uploads/sign") {
          return jsonResponse(200, {
            data: {
              cloudName: "demo",
              apiKey: "123456789",
              timestamp: 1_764_000_000,
              signature: "a".repeat(40),
              folder: "partyplay/equipment",
              uploadUrl: "https://api.cloudinary.com/v1_1/demo/image/upload",
              allowedFormats: ["jpg", "jpeg", "png", "webp"],
              maxFileSize: 8 * 1024 * 1024,
            },
          });
        }
        if (url.startsWith("https://api.cloudinary.com")) {
          return jsonResponse(200, {
            secure_url:
              "https://res.cloudinary.com/demo/image/upload/v1/partyplay/equipment/chairs.jpg",
            public_id: "partyplay/equipment/chairs",
            width: 1200,
            height: 800,
          });
        }
        return jsonResponse(201, { data: equipmentRow("eq-new", "Test chairs") });
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithClient(
      <EquipmentFormDialog
        categories={[category]}
        categoryIdBySlug={new Map([["furniture", category.id]])}
        onClose={vi.fn()}
      />,
    );

    await user.upload(
      screen.getByLabelText("Image"),
      new File(["image"], "chairs.png", { type: "image/png" }),
    );

    expect(await screen.findByAltText("Catalogue image preview")).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/image/upload/v1/partyplay/equipment/chairs.jpg",
    );

    await user.type(screen.getByLabelText(/^Name/), "Test chairs");
    await user.type(screen.getByLabelText(/^Slug/), "test-chairs");
    await user.type(screen.getByLabelText(/daily price/i), "1200");
    await user.click(screen.getByRole("button", { name: "Add equipment" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const saveInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(JSON.parse(String(saveInit.body))).toMatchObject({
      imageUrl:
        "https://res.cloudinary.com/demo/image/upload/v1/partyplay/equipment/chairs.jpg",
      imagePublicId: "partyplay/equipment/chairs",
    });
  });

  it("rejects duplicate equipment lines in a package", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithClient(
      <PackageFormDialog
        equipment={[
          equipmentRow("eq-chairs", "Chairs"),
          equipmentRow("eq-tables", "Tables"),
        ]}
        onClose={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/^Name/), "Test package");
    await user.type(screen.getByLabelText(/^Slug/), "test-package");
    await user.type(screen.getByLabelText(/^Price/), "5000");

    await user.click(screen.getByRole("button", { name: "Add item" }));
    await user.click(screen.getByRole("button", { name: "Add item" }));

    const equipmentSelects = screen.getAllByLabelText(/^Equipment \d/);
    expect(equipmentSelects).toHaveLength(2);
    await user.selectOptions(equipmentSelects[1]!, "eq-chairs");

    await user.click(screen.getByRole("button", { name: "Add package" }));

    expect(
      await screen.findByText("Each equipment item can only appear once"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a target when an offer applies to one equipment item", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithClient(
      <OfferFormDialog
        equipment={[{ id: "eq-chairs", name: "Chairs", isActive: true }]}
        packages={[]}
        onClose={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/^Name/), "Test offer");
    await user.type(screen.getByLabelText(/^Slug/), "test-offer");
    await user.type(screen.getByLabelText(/percentage off/i), "10");
    await user.selectOptions(
      screen.getByLabelText(/^Applies to/),
      "ONE_EQUIPMENT",
    );

    await user.click(screen.getByRole("button", { name: "Add offer" }));

    expect(
      await screen.findByText("Choose what this offer applies to"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
