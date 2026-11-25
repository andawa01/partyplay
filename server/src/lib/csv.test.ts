import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "./csv";

describe("csv", () => {
  it("leaves simple values unquoted and renders null as empty", () => {
    expect(csvCell("PP-ABC123")).toBe("PP-ABC123");
    expect(csvCell(1800)).toBe("1800");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes values containing separators and doubles quotes", () => {
    expect(csvCell("Nairobi, Kenya")).toBe('"Nairobi, Kenya"');
    expect(csvCell('He said "yes"')).toBe('"He said ""yes"""');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
  });

  it("writes CRLF rows and a trailing newline", () => {
    expect(
      toCsv([
        ["Reference", "Amount"],
        ["PP-1", "500.00"],
      ]),
    ).toBe("Reference,Amount\r\nPP-1,500.00\r\n");
  });
});
