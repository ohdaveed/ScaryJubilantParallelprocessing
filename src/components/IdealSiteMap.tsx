import { PageDraft } from "../types";

export type Hub = "tenant" | "owner" | "community" | "unplaced";

export function assignHub(page: PageDraft): Hub {
  const userType = (page.userType || "").toLowerCase();
  if (userType.includes("resident") || userType.includes("tenant")) return "tenant";
  if (userType.includes("owner") || userType.includes("landlord")) return "owner";
  if (userType.includes("general public")) return "community";

  const pageType = (page.pageType || "").toLowerCase();
  if (pageType.includes("campaign")) return "community";

  const rel = (page.relationships || "").toLowerCase();
  if (rel.includes("tenant") || rel.includes("renter") || rel.includes("pests, mold")) return "tenant";
  if (rel.includes("owner") || rel.includes("landlord") || rel.includes("building fee")) return "owner";
  if (rel.includes("community") || rel.includes("mosquito") || rel.includes("school")) return "community";

  return "unplaced";
}

// Component implemented in Task 3
export default function IdealSiteMap(_props: { pages: PageDraft[]; onSelect: (id: string) => void }) {
  return null;
}
