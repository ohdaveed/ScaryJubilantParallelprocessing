import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Btn } from "./ui";

describe("Btn", () => {
  it("defaults to type=button to avoid implicit submit", () => {
    const element = React.createElement(Btn, null, "+ Add");
    const html = renderToStaticMarkup(element);
    expect(html).toContain('type="button"');
  });
});
