import { describe, expect, it } from "vitest";
import {
  contentTypeFromPageType as clientContentTypeFromPageType,
  pageTypeFromContentType as clientPageTypeFromContentType
} from "./utils/contentModel";
import {
  contentTypeFromPageType as serverContentTypeFromPageType,
  pageTypeFromContentType as serverPageTypeFromContentType
} from "../lib/contentModel.js";

describe("content model page type mappings", () => {
  it("preserves Campaign and Resource Collection in both client and server mappings", () => {
    expect(clientContentTypeFromPageType("Campaign")).toBe("campaign");
    expect(clientContentTypeFromPageType("Resource Collection")).toBe("resource_collection");
    expect(clientPageTypeFromContentType("campaign")).toBe("Campaign");
    expect(clientPageTypeFromContentType("resource_collection")).toBe("Resource Collection");

    expect(serverContentTypeFromPageType("Campaign")).toBe("campaign");
    expect(serverContentTypeFromPageType("Resource Collection")).toBe("resource_collection");
    expect(serverPageTypeFromContentType("campaign")).toBe("Campaign");
    expect(serverPageTypeFromContentType("resource_collection")).toBe("Resource Collection");
  });
});
