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
});
