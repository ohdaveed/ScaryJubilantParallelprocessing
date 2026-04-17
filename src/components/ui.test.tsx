import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Btn } from "./ui";

describe("Btn", () => {
  it("defaults to type=button to avoid implicit submit", () => {
    const html = renderToStaticMarkup(<Btn>+ Add</Btn>);
    expect(html).toContain('type="button"');
  });
});
