export const queryKeys = {
  site: () => ["site"] as const,

  categories: (slug?: string) =>
    slug ? (["categories", slug] as const) : (["categories"] as const),

  equipment: (filters?: Record<string, unknown>) => ["equipment", filters ?? {}] as const,
  equipmentDetail: (slug: string) => ["equipment", slug] as const,

  packages: (slug?: string) => (slug ? (["packages", slug] as const) : (["packages"] as const)),
  offers: () => ["offers"] as const,

  availability: (equipmentIds: string[], startDate: string, endDate: string) =>
    ["availability", [...equipmentIds].sort(), startDate, endDate] as const,

  calendar: (equipmentId: string, month: string) => ["calendar", equipmentId, month] as const,

  booking: (code: string) => ["booking", code] as const,
  bookingQuote: (request: {
    startDate: string;
    endDate: string;
    packages: Array<{ packageId: string; quantity: number }>;
    equipment: Array<{ equipmentId: string; quantity: number }>;
  }) => ["bookings", "quote", request] as const,

  admin: {
    me: () => ["admin", "me"] as const,
    categories: () => ["admin", "categories"] as const,
    equipment: (filters?: Record<string, unknown>) =>
      ["admin", "equipment", filters ?? {}] as const,
    blackouts: () => ["admin", "blackouts"] as const,
    packages: () => ["admin", "packages"] as const,
    offers: () => ["admin", "offers"] as const,
    transportProviders: () => ["admin", "transport-providers"] as const,
    bookings: (filters?: object) => ["admin", "bookings", filters ?? {}] as const,
    bookingCounts: (filters?: object) => ["admin", "booking-counts", filters ?? {}] as const,
    booking: (id: string) => ["admin", "booking", id] as const,
    payments: (bookingId: string) => ["admin", "payments", bookingId] as const,
    dashboard: () => ["admin", "dashboard"] as const,
    settings: () => ["admin", "settings"] as const,
    staff: () => ["admin", "staff"] as const,
  },
} as const;
