import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SfGovPagePreview } from "./SfGovPreview";

describe("SfGovPagePreview", () => {
  it("adds Karl CMS hover labels to rendered preview content", () => {
    const draft = `# Pay my annual building fee

Summary: Pay your HHVC fee online or in person.

## What to do
Section heading: Pay online
Section body: The fastest way to pay is online.
Button link: Pay my fee online
Phone number: 311
Email: healthyhousing@sfdph.org
Callout: Bring your account number.
This text explains the next step.

## Related
- Contact HHVC`;

    const html = renderToStaticMarkup(
      <SfGovPagePreview draft={draft} pageType="Transaction" pageTitle="Pay my annual building fee" />
    );

    expect(html).toContain('title="Karl CMS: Title"');
    expect(html).toContain('title="Karl CMS: Description"');
    expect(html).toContain('title="Karl CMS: What to do"');
    expect(html).toContain('title="Karl CMS: What to do &gt; Section heading"');
    expect(html).toContain('title="Karl CMS: What to do &gt; Section body"');
    expect(html).toContain('title="Karl CMS: What to do &gt; Button link"');
    expect(html).toContain('title="Karl CMS: What to do &gt; Phone number"');
    expect(html).toContain('title="Karl CMS: What to do &gt; Email"');
    expect(html).toContain('title="Karl CMS: What to do &gt; Callout"');
    expect(html).toContain('title="Karl CMS: What to do &gt; Text"');
    expect(html).toContain('title="Karl CMS: Related &gt; item"');
    expect(html).toContain(">Pay online</h3>");
    expect(html).toContain(">The fastest way to pay is online.</p>");
    expect(html).toContain(">Pay my fee online");
    expect(html).toContain(">healthyhousing@sfdph.org</span>");
    expect(html).toContain(">Contact HHVC</span>");
  });

  it("renders action link as a mock button when bullet-prefixed and strips trailing URL from the label", () => {
    const draft = `# Test page

## What to do
Section body: Use 311 to report.
- Action link: Report to 311 https://sf311.org
Phone number: 311`;

    const html = renderToStaticMarkup(<SfGovPagePreview draft={draft} pageType="Transaction" pageTitle="Test page" />);

    expect(html).toContain('title="Karl CMS: What to do &gt; Action link"');
    expect(html).toContain("Report to 311");
    expect(html).not.toContain("sf311.org");
  });

  it("renders a single inline markdown link as styled link text", () => {
    const draft = `# Contact HHVC

Description: Reach HHVC support.

## What to do
Section body: [Contact HHVC](https://sf.gov)`;

    const html = renderToStaticMarkup(
      <SfGovPagePreview draft={draft} pageType="Information" pageTitle="Contact HHVC" />
    );

    expect(html).toContain(">Contact HHVC</span>");
    expect(html).toContain("text-decoration:underline");
  });

  it("renders three or more plain peer lines as a list for scannability", () => {
    const draft = `# Keep your home pest-free

## What to do
Start with these prevention steps:
Seal food containers
Clean under appliances weekly
Report leaks quickly`;

    const html = renderToStaticMarkup(
      <SfGovPagePreview draft={draft} pageType="Information" pageTitle="Keep your home pest-free" />
    );

    expect(html).toContain("<ul");
    expect(html).toContain("Seal food containers</li>");
    expect(html).toContain("Clean under appliances weekly</li>");
    expect(html).toContain("Report leaks quickly</li>");
  });
});
