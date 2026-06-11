import { describe, it, expect, afterEach } from "vitest";
import {
  flattenMoodleParams,
  buildMoodleUrl,
  moodleConfig,
  isMoodleConfigured,
  moodleEnrolRequest,
} from "@/lib/moodle";

describe("flattenMoodleParams", () => {
  it("flattens arrays of objects into Moodle bracket form", () => {
    expect(flattenMoodleParams({ enrolments: [{ roleid: 5, userid: 2 }] })).toEqual([
      ["enrolments[0][roleid]", "5"],
      ["enrolments[0][userid]", "2"],
    ]);
  });

  it("flattens scalar arrays with indices", () => {
    expect(flattenMoodleParams({ values: ["a@x.com", "b@x.com"] })).toEqual([
      ["values[0]", "a@x.com"],
      ["values[1]", "b@x.com"],
    ]);
  });

  it("encodes booleans as 1/0 and drops null/undefined", () => {
    expect(flattenMoodleParams({ a: true, b: false, c: null, d: undefined })).toEqual([
      ["a", "1"],
      ["b", "0"],
    ]);
  });
});

describe("buildMoodleUrl", () => {
  it("builds the REST endpoint with token + function + json format", () => {
    const url = buildMoodleUrl("https://lms.example.org/", "TKN", "core_course_get_courses");
    expect(url).toBe(
      "https://lms.example.org/webservice/rest/server.php?wstoken=TKN&wsfunction=core_course_get_courses&moodlewsrestformat=json",
    );
  });
});

describe("moodleEnrolRequest", () => {
  it("defaults to the student role", () => {
    expect(moodleEnrolRequest(3, 7)).toEqual({
      enrolments: [{ roleid: 5, userid: 7, courseid: 3 }],
    });
  });
});

describe("moodleConfig", () => {
  const orig = { url: process.env.MOODLE_URL, token: process.env.MOODLE_TOKEN };
  afterEach(() => {
    process.env.MOODLE_URL = orig.url;
    process.env.MOODLE_TOKEN = orig.token;
  });

  it("is null when env is unset", () => {
    delete process.env.MOODLE_URL;
    delete process.env.MOODLE_TOKEN;
    expect(moodleConfig()).toBeNull();
    expect(isMoodleConfigured()).toBe(false);
  });

  it("returns trimmed, slash-stripped config when set", () => {
    process.env.MOODLE_URL = "https://lms.example.org/";
    process.env.MOODLE_TOKEN = "TKN";
    expect(moodleConfig()).toEqual({ url: "https://lms.example.org", token: "TKN" });
    expect(isMoodleConfigured()).toBe(true);
  });
});
