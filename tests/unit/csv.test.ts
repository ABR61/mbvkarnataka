import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvRecords, toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("joins rows with CRLF and quotes fields needing it", () => {
    expect(
      toCsv([
        ["name", "note"],
        ["Asha", "plain"],
        ["Kiran", "has, comma"],
        ['She "said"', "line\nbreak"],
      ]),
    ).toBe(
      'name,note\r\nAsha,plain\r\nKiran,"has, comma"\r\n"She ""said""","line\nbreak"',
    );
  });

  it("round-trips through parseCsvRecords", () => {
    const rows = [
      ["a", "b"],
      ["1", "x, y"],
    ];
    expect(parseCsvRecords(toCsv(rows))).toEqual(rows);
  });
});

describe("parseCsvRecords", () => {
  it("parses simple rows", () => {
    expect(parseCsvRecords("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCsvRecords('name,addr\nAsha,"MG Road, Mysuru"')).toEqual([
      ["name", "addr"],
      ["Asha", "MG Road, Mysuru"],
    ]);
  });

  it("handles escaped quotes inside quoted fields", () => {
    expect(parseCsvRecords('q\n"she said ""hi"""')).toEqual([
      ["q"],
      ['she said "hi"'],
    ]);
  });

  it("supports newlines inside quoted fields", () => {
    expect(parseCsvRecords('a\n"line1\nline2"')).toEqual([
      ["a"],
      ["line1\nline2"],
    ]);
  });

  it("tolerates CRLF and drops blank lines", () => {
    expect(parseCsvRecords("a,b\r\n1,2\r\n\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsv", () => {
  it("maps rows to objects keyed by trimmed headers", () => {
    const { headers, rows } = parseCsv("firstName, age \nAsha,23\nKiran,21");
    expect(headers).toEqual(["firstName", "age"]);
    expect(rows).toEqual([
      { firstName: "Asha", age: "23" },
      { firstName: "Kiran", age: "21" },
    ]);
  });

  it("returns empty for empty input", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
  });

  it("fills missing trailing columns with empty strings", () => {
    const { rows } = parseCsv("a,b,c\n1,2");
    expect(rows[0]).toEqual({ a: "1", b: "2", c: "" });
  });
});
