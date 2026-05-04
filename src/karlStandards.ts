export const VALID_KARL_PAGE_TYPES = [
  "Transaction",
  "Information",
  "Step by step",
  "Location",
  "News",
  "Event",
  "Campaign",
  "About",
  "Resource Collection",
  "Meeting",
  "Profile",
  "Data story",
  "Reports",
  "Topic"
] as const;

export const VALID_KARL_COMPONENTS = [
  "Title",
  "Description",
  "Button link",
  "Callout",
  "Spotlight",
  "Text",
  "Section",
  "Phone number",
  "Email",
  "Related",
  "Address",
  "Media",
  "Profile",
  "Resource tile",
  "What to know",
  "What to do",
  "Action link"
] as const;

export const TRANSACTION_REQUIRED_SECTION_LABELS = [
  "What to know",
  "What to do"
] as const;

export const PROHIBITED_PLACEHOLDER_PATTERNS = [
  "[To be generated]",
  "[To be determined]",
  "[Content to be generated]"
] as const;
