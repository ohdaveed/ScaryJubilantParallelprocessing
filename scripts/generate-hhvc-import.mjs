import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(__dirname, "..", "src", "data", "hhvc-pages-import.json");

const PARENT = "Healthy housing and pests (Topic)";
const NOTES = "Imported from canonical HHVC IA titles and descriptions (2026-04-19)";

const REL = (parts) =>
  [
    `Parent: ${parts.parent ?? PARENT}`,
    `Siblings: ${parts.siblings ?? "none"}`,
    `Children: ${parts.children ?? "none"}`,
    `Entry Points: ${parts.entry ?? "SF.gov search"}`,
    `Next Steps: ${parts.next ?? "Choose the next HHVC page for your situation"}`,
  ].join("\n");

function draft311(name, description, related) {
  const rel =
    related.length > 0
      ? `\n## Related\n${related.map((t) => `- ${t}`).join("\n")}`
      : "";
  return `# ${name}

Description: ${description}

## What to know

Section heading: How 311 works
Section body: 311 is the City intake line and website. You tell staff what is wrong and where you live. They send your request to the right City team.

Section heading: What happens after you report
Section body: Healthy Housing and Vector Control may review your report and schedule an inspection when it fits the program rules.

## What to do

Section heading: Report to 311
Section body: Use 311 online or call 311. Add clear photos, dates, and locations so staff can route your case quickly.

Action link: Report to 311 https://sf311.org
Phone number: 311${rel}`;
}

function draft311BedBugs(description, related) {
  const rel =
    related.length > 0
      ? `\n## Related\n${related.map((t) => `- ${t}`).join("\n")}`
      : "";
  return `# Report bed bugs or fix a bed bug problem

Description: ${description}

## What to know

Section heading: How 311 works
Section body: 311 is the City intake line and website. You tell staff what is wrong and where you live. They send your request to the right City team.

Section heading: What happens after you report
Section body: Healthy Housing and Vector Control may review your report and schedule an inspection when it fits the program rules.

Callout: For bed bugs, mark your 311 report as urgent. The City aims to give a first response within 48 hours for many urgent housing cases.

## What to do

Section heading: Report to 311
Section body: Use 311 online or call 311. Add clear photos, dates, and locations so staff can route your case quickly.

Action link: Report to 311 https://sf311.org
Phone number: 311${rel}`;
}

function draftExternal(name, description, actionLabel, actionUrl, related) {
  const rel =
    related.length > 0
      ? `\n## Related\n${related.map((t) => `- ${t}`).join("\n")}`
      : "";
  return `# ${name}

Description: ${description}

## What to know

Section heading: External system
Section body: This action uses a partner public health system outside the standard 311 housing pest intake.

## What to do

Section heading: ${actionLabel}
Section body: Follow the official reporting steps on the linked page and include the location you found.

Action link: ${actionLabel} ${actionUrl}${rel}`;
}

function draftPayFee(description, related) {
  const rel =
    related.length > 0
      ? `\n## Related\n${related.map((t) => `- ${t}`).join("\n")}`
      : "";
  return `# Pay your healthy housing fee for buildings with 3 or more units

Description: ${description}

## What to know

Section heading: Who this covers
Section body: This fee applies to qualifying residential buildings with three or more units. Confirm your building type before you pay.

## What to do

Section heading: Pay online
Section body: Open the official fee page on sf.gov and follow the payment steps for Healthy Housing.

Button link: Open fee payment on sf.gov https://www.sf.gov

Phone number: 311${rel}`;
}

function draftWorkshop(description, related) {
  const rel =
    related.length > 0
      ? `\n## Related\n${related.map((t) => `- ${t}`).join("\n")}`
      : "";
  return `# Request a mosquito education workshop for students

Description: ${description}

## What to know

Section heading: How 311 works
Section body: 311 can route education requests to the right City team. Share your school or group name, dates that work, and the age range of students.

Section heading: What happens after you request
Section body: Staff review your request and follow up about scheduling and materials.

## What to do

Section heading: Request a workshop
Section body: Contact 311 or use the workshop request path on sf.gov for vector education.

Action link: Start on sf.gov https://www.sf.gov
Phone number: 311${rel}`;
}

const REPORT_NAMES = [
  "Report rats or mice or fix a rat or mouse problem",
  "Report cockroaches or fix a cockroach problem",
  "Report bed bugs or fix a bed bug problem",
  "Report pigeons or fix a pigeon problem",
  "Report mosquitoes in your home or yard",
  "Report garbage or dirty conditions",
  "Report animal waste, flies, or things that attract pests",
  "Report too much clutter or materials causing health problems",
  "Report overgrown plants or weeds that attract pests",
  "Report indoor moisture problems like water on walls or windows (not leaks)",
];

const REPORT_DESC = {
  "Report rats or mice or fix a rat or mouse problem":
    "Report rats or mice in your home or building. Learn how to fix the problem and prevent rodents from coming back.",
  "Report cockroaches or fix a cockroach problem":
    "Report cockroaches and get help fixing the problem. Learn how to remove food sources and prevent infestations.",
  "Report bed bugs or fix a bed bug problem":
    "Report bed bugs in your home or building. Learn how to identify, treat, and prevent bed bug infestations.",
  "Report pigeons or fix a pigeon problem":
    "Report pigeon problems and learn how to reduce nesting, droppings, and health risks.",
  "Report mosquitoes in your home or yard":
    "Report mosquitoes and standing water around your home. Inspectors will check for breeding sites and help reduce mosquito problems.",
  "Report garbage or dirty conditions":
    "Report garbage, trash, or unsanitary conditions that may attract pests or create health risks.",
  "Report animal waste, flies, or things that attract pests":
    "Report animal waste, flies, or conditions that attract pests. Learn how to clean and prevent recurring problems.",
  "Report too much clutter or materials causing health problems":
    "Report clutter or stored materials that create health or pest problems. Get help restoring safe living conditions.",
  "Report overgrown plants or weeds that attract pests":
    "Report overgrown vegetation that may attract rodents or mosquitoes. Learn how to reduce pest habitat.",
  "Report indoor moisture problems like water on walls or windows (not leaks)":
    "Report indoor moisture, condensation, or humidity problems. Learn how to reduce moisture and prevent mold.",
};

function neighborRelated(list, name, count = 2) {
  const i = list.indexOf(name);
  const out = [];
  if (i > 0) out.push(list[i - 1]);
  if (i < list.length - 1 && out.length < count) out.push(list[i + 1]);
  if (out.length < count && i > 1) out.push(list[i - 2]);
  if (out.length < count && i < list.length - 2) out.push(list[i + 2]);
  return out.filter(Boolean).slice(0, count);
}

const pages = [];

pages.push({
  name: "Healthy housing and pests",
  userType: "General public",
  userGoal: "Find the right HHVC task fast",
  purpose: "Main HHVC topic hub for reporting, fixing, prevention, programs, tools, fees, and help",
  pageType: "Topic",
  components: "Description, Spotlight, Section, Related",
  relationships: REL({
    siblings: "none",
    children:
      "Report a housing or pest problem; Fix a problem in your building; Prevent pests and health problems; Programs and services; Tools, fees, and help",
    entry: "SF.gov navigation and search",
    next: "Open the section that matches your task",
  }),
  duplication: "Possible overlap with broader city housing help pages.",
  enforcement: "What can be verified: child links and routing.\nWhat is unclear: case outcomes before intake.",
  draft: `# Healthy housing and pests

Description: Get help with pests, garbage, moisture, and other health problems in your home. Learn how to report issues, fix problems, and prevent them.

## What to know

Section heading: Start with your goal
Section body: Pick report if you need City help now. Pick fix if you already reported and want inspection or notice steps. Pick prevent for home care tips.

## Related
- Report a housing or pest problem
- Fix a problem in your building
- Prevent pests and health problems`,
  integration: "Root topic page for the HHVC IA.",
});

pages.push({
  name: "Report a housing or pest problem",
  userType: "General public",
  userGoal: "Pick the right report path and reach 311",
  purpose: "Hub page that lists HHVC report options and routes each to 311",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "Fix a problem in your building; Prevent pests and health problems",
    children: REPORT_NAMES.join(", "),
    entry: "Healthy housing and pests",
    next: "Open the report page that matches your problem",
  }),
  duplication: "Possible overlap with general 311 help pages.",
  enforcement: "What can be verified: each child page lists a 311 path.\nWhat is unclear: exact case priority before intake.",
  draft: `# Report a housing or pest problem

Description: Report rats, cockroaches, mosquitoes, garbage, and other housing or pest problems. Submit a request through 311 and get help from an inspector.

## What to know

Section heading: How 311 works
Section body: 311 is the City intake line and website. You share what is wrong and where you live. Staff route your request to the right City team.

Section heading: Choose the right report page
Section body: Open the page that matches your problem. Each report page shows the same 311 action so you know what to do next.

## Related
- Report rats or mice or fix a rat or mouse problem
- Report garbage or dirty conditions
- Get help with a housing or pest problem`,
  integration: "Report hub lists all HHVC report transactions.",
});

for (const reportName of REPORT_NAMES) {
  const desc = REPORT_DESC[reportName];
  const related = neighborRelated(REPORT_NAMES, reportName);
  const draft =
    reportName === "Report bed bugs or fix a bed bug problem"
      ? draft311BedBugs(desc, related)
      : draft311(reportName, desc, related);
  pages.push({
    name: reportName,
    userType: reportName.includes("mosquitoes") ? "General public" : "Resident / tenant",
    userGoal: `Report or fix: ${reportName.replace(/^Report /, "").replace(/ or fix.*$/, "")}`,
    purpose: "Route users to 311 for this housing or pest complaint",
    pageType: "Transaction",
    components: "Description, Section, Action link, Phone number, Callout, Related",
    relationships: REL({
      siblings: neighborRelated(REPORT_NAMES, reportName, 3).join("; ") || REPORT_NAMES.filter((n) => n !== reportName).slice(0, 2).join("; "),
      children: "none",
      entry: "Report a housing or pest problem",
      next: "Inspection or outreach when the case fits program rules",
    }),
    duplication: "Possible overlap with other City pest or housing report pages.",
    enforcement:
      "What can be verified: visible conditions during inspection.\nWhat is unclear: hidden sources or causes before a visit.",
    draft,
    integration: "HHVC report transaction with shared 311 pattern.",
  });
}

pages.push({
  name: "Fix a problem in your building",
  userType: "General public",
  userGoal: "Understand inspections, notices, and follow-up",
  purpose: "Lifecycle hub after a report for inspection and notice guidance",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "Report a housing or pest problem; Prevent pests and health problems",
    children:
      "Get ready for a housing inspection after you report a problem; Get ready for a follow-up inspection; What tenants need to do after getting a notice of violation; What owners need to do after getting a notice of violation; Get help with a housing or pest problem; Understand inspections and follow-up visits; Learn about reinspection fees; What happens if problems are not fixed",
    entry: "Report pages and 311",
    next: "Inspection prep, notice steps, or fee review",
  }),
  duplication: "Possible overlap with general tenant rights pages.",
  enforcement: "What can be verified: inspection access and cited conditions.\nWhat is unclear: exact hearing outcomes.",
  draft: `# Fix a problem in your building

Description: Learn what happens after you report a problem. Get ready for inspections, understand notices of violation, and know what to do next.

## What to know

Section heading: Follow the lifecycle
Section body: After you report, staff may inspect, issue a notice of violation, and schedule follow-up visits. Use the pages below for your role and stage.

## Related
- Get ready for a housing inspection after you report a problem
- What tenants need to do after getting a notice of violation
- Understand inspections and follow-up visits`,
  integration: "Lifecycle hub under the HHVC topic.",
});

pages.push({
  name: "Get ready for a housing inspection after you report a problem",
  userType: "Resident / tenant",
  userGoal: "Prepare for the first inspection after a report",
  purpose: "Step-by-step inspection prep after 311",
  pageType: "Step by step",
  components: "Description, Section, Related",
  relationships: REL({
    siblings:
      "Get ready for a follow-up inspection; Understand inspections and follow-up visits; What tenants need to do after getting a notice of violation",
    children: "none",
    entry: "Fix a problem in your building",
    next: "Inspection visit and written findings",
  }),
  duplication: "Possible overlap with general inspection prep content.",
  enforcement: "What can be verified: access and visible unit conditions.\nWhat is unclear: exact appointment time.",
  draft: `# Get ready for a housing inspection after you report a problem

Description: Learn what to expect during a housing inspection. Get ready and understand how inspectors check for health and pest problems.

## What to do

Section heading: Step 1: Save your 311 details
Section body: Keep your case number, photos, and notes in one place.

Section heading: Step 2: Clear access paths
Section body: Move items so inspectors can see kitchens, bathrooms, sleeping areas, and storage zones.

Section heading: Step 3: Be ready to explain the timeline
Section body: Write down when you first saw the problem and what changed since your report.

## Related
- Get ready for a follow-up inspection
- Understand inspections and follow-up visits`,
  integration: "Lifecycle step page after reporting.",
});

pages.push({
  name: "Get ready for a follow-up inspection",
  userType: "Resident / tenant",
  userGoal: "Prepare for a reinspection or follow-up visit",
  purpose: "Step-by-step prep for follow-up inspections",
  pageType: "Step by step",
  components: "Description, Section, Related",
  relationships: REL({
    siblings:
      "Get ready for a housing inspection after you report a problem; What owners need to do after getting a notice of violation",
    children: "none",
    entry: "Fix a problem in your building",
    next: "Reinspection results and possible fees",
  }),
  duplication: "Possible overlap with first inspection prep.",
  enforcement: "What can be verified: repairs completed and access.\nWhat is unclear: fee totals until posted.",
  draft: `# Get ready for a follow-up inspection

Description: Prepare for a follow-up inspection. Make sure problems are fixed and avoid further action.

## What to do

Section heading: Step 1: Match the notice list
Section body: Line up your repairs with each item on your notice of violation or inspector letter.

Section heading: Step 2: Keep proof of work
Section body: Save receipts and photos that show dates and locations of repairs.

Section heading: Step 3: Plan access again
Section body: Make sure the unit is unlocked or someone is present for the follow-up visit.

## Related
- Learn about reinspection fees
- What happens if problems are not fixed`,
  integration: "Follow-up inspection prep.",
});

pages.push({
  name: "What tenants need to do after getting a notice of violation",
  userType: "Resident / tenant",
  userGoal: "Meet tenant duties after a notice of violation",
  purpose: "Tenant-focused notice response guidance",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "What owners need to do after getting a notice of violation; What happens if problems are not fixed",
    children: "none",
    entry: "Fix a problem in your building",
    next: "Repairs, access, and follow-up inspection",
  }),
  duplication: "Possible overlap with tenant rights hubs outside HHVC.",
  enforcement: "What can be verified: access for inspection and visible fixes.\nWhat is unclear: private legal advice.",
  draft: `# What tenants need to do after getting a notice of violation

Description: Learn what tenants must do after receiving a notice of violation. Follow steps to fix conditions and allow access.

## What to know

Section heading: Focus on access and truth
Section body: Allow scheduled inspections. Do not hide active pest signs or moisture damage before staff verify repairs.

Section heading: Coordinate with your landlord when safe
Section body: Many repairs need the owner or manager to hire licensed help. Keep copies of any written requests you send.

## Related
- What owners need to do after getting a notice of violation
- Get ready for a follow-up inspection`,
  integration: "Tenant notice guidance within HHVC lifecycle.",
});

pages.push({
  name: "What owners need to do after getting a notice of violation",
  userType: "Property owner / landlord",
  userGoal: "Meet owner duties after a notice of violation",
  purpose: "Owner-focused notice response guidance",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "What tenants need to do after getting a notice of violation; Learn about reinspection fees",
    children: "none",
    entry: "Fix a problem in your building",
    next: "Contractor repairs and follow-up inspection",
  }),
  duplication: "Possible overlap with DBI enforcement topics outside HHVC scope.",
  enforcement: "What can be verified: correction of cited conditions.\nWhat is unclear: appeal outcomes.",
  draft: `# What owners need to do after getting a notice of violation

Description: Learn what property owners must do after receiving a notice of violation. Fix problems and meet deadlines.

## What to know

Section heading: Correct each cited item
Section body: Hire licensed help when needed and keep dated photos and receipts.

Section heading: Keep communication clear
Section body: Share schedules with tenants so inspections stay on track.

## Related
- Learn about reinspection fees
- Pay your healthy housing fee for buildings with 3 or more units`,
  integration: "Owner notice guidance within HHVC lifecycle.",
});

pages.push({
  name: "Get help with a housing or pest problem",
  userType: "General public",
  userGoal: "Route to the right HHVC page",
  purpose: "Decision help when you are unsure which page to open",
  pageType: "Step by step",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "Understand inspections and follow-up visits; Contact healthy housing and vector control",
    children: "none",
    entry: "Healthy housing and pests; Contact healthy housing and vector control",
    next: "Report, prevent, or lookup tools",
  }),
  duplication: "Possible overlap with the main topic page.",
  enforcement: "What can be verified: self-routing to the right page type.\nWhat is unclear: case facts the user does not share.",
  draft: `# Get help with a housing or pest problem

Description: Find the right place to report a problem or get help. Follow steps based on your situation.

## What to do

Section heading: Step 1: Decide if you need City action now
Section body: If you see active pests, trash piles, moisture on walls or windows, or other housing health risks, start with a report page and 311.

Section heading: Step 2: Choose prevention when you are stable
Section body: If you want to lower risk before problems grow, open the prevention hub for simple home steps.

Section heading: Step 3: Use tools when you need records
Section body: Use violations lookup or inspector lookup when you need public records or a contact.

## Related
- Report a housing or pest problem
- Prevent pests and health problems
- Tools, fees, and help`,
  integration: "General routing help across HHVC IA.",
});

pages.push({
  name: "Understand inspections and follow-up visits",
  userType: "General public",
  userGoal: "Learn how inspections and revisits work",
  purpose: "Informational overview of inspection practice",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "Learn about reinspection fees; What happens if problems are not fixed",
    children: "none",
    entry: "Fix a problem in your building",
    next: "Notice of violation or case closure",
  }),
  duplication: "Possible overlap with inspection FAQ pages.",
  enforcement: "What can be verified: cited conditions on inspection.\nWhat is unclear: staffing-driven timing.",
  draft: `# Understand inspections and follow-up visits

Description: Learn how housing inspections work, what inspectors look for, and what happens after an inspection.

## What to know

Section heading: What inspectors review
Section body: Staff focus on pests, sanitation, moisture signs tied to health risk, and access to affected areas.

Section heading: Why follow-up visits happen
Section body: Follow-up visits check repairs, verify that risk dropped, and document next steps if problems return.

## Related
- Get ready for a housing inspection after you report a problem
- Learn about reinspection fees`,
  integration: "Inspection overview content.",
});

pages.push({
  name: "Learn about reinspection fees",
  userType: "Property owner / landlord",
  userGoal: "Learn when reinspection fees apply",
  purpose: "Explain reinspection fee basics without inventing amounts",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "Understand inspections and follow-up visits; Pay your healthy housing fee for buildings with 3 or more units",
    children: "none",
    entry: "Fix a problem in your building; Tools, fees, and help",
    next: "Payment or compliance planning",
  }),
  duplication: "Possible overlap with finance office pages.",
  enforcement: "What can be verified: posted fee schedules on official City pages.\nWhat is unclear: final balance until the City posts it.",
  draft: `# Learn about reinspection fees

Description: Learn when reinspection fees apply and how much they cost for housing violations.

## What to know

Section heading: Read the official fee schedule
Section body: Fee amounts and billing rules can change. Always read the current schedule on the official City fee page before you pay.

Section heading: When fees may apply
Section body: Fees can apply when extra visits are needed to verify corrections tied to certain violations.

## Related
- Pay your healthy housing fee for buildings with 3 or more units
- Get ready for a follow-up inspection`,
  integration: "Fee information page; amounts live on sf.gov sources of truth.",
});

pages.push({
  name: "What happens if problems are not fixed",
  userType: "General public",
  userGoal: "Understand escalation when violations remain",
  purpose: "High-level enforcement pathway information without inventing timelines",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "Understand inspections and follow-up visits; Learn about reinspection fees",
    children: "none",
    entry: "Fix a problem in your building",
    next: "Hearing information or compliance planning",
  }),
  duplication: "Possible overlap with administrative hearing education.",
  enforcement: "What can be verified: written notices and inspection records.\nWhat is unclear: hearing schedules and final orders before they are issued.",
  draft: `# What happens if problems are not fixed

Description: Learn what happens if violations are not corrected, including citations and possible hearings.

## What to know

Section heading: Escalation is documented
Section body: Staff use inspection notes, notices, and return visits to show what still needs repair.

Section heading: You may receive more notices
Section body: Additional notices can add requirements and fees. Read each notice carefully and respond through official channels.

## Related
- What owners need to do after getting a notice of violation
- Contact healthy housing and vector control`,
  integration: "Enforcement overview without specific ordinance claims.",
});

const PREVENT_NAMES = [
  "Prevent rats or mice in your home",
  "Prevent cockroaches and other pests",
  "Prevent bed bugs in your home",
  "Prevent mosquitoes by removing standing water",
  "Keep your home clean and free of pests",
  "Store food, trash, and materials to prevent pests",
  "Reduce indoor moisture and prevent mold (not leaks)",
];

const PREVENT_DESC = {
  "Prevent rats or mice in your home":
    "Learn how to keep rats and mice out of your home. Seal entry points and remove food and shelter.",
  "Prevent cockroaches and other pests":
    "Learn how to prevent cockroaches and other pests by cleaning, sealing, and reducing food sources.",
  "Prevent bed bugs in your home":
    "Learn how to avoid bed bugs, spot early signs, and protect your home from infestation.",
  "Prevent mosquitoes by removing standing water":
    "Learn how to stop mosquitoes from breeding by removing standing water and using safe control methods.",
  "Keep your home clean and free of pests":
    "Simple steps to keep your home clean and reduce pest problems.",
  "Store food, trash, and materials to prevent pests":
    "Learn how proper storage of food, trash, and belongings can prevent pests.",
  "Reduce indoor moisture and prevent mold (not leaks)":
    "Learn how to reduce humidity and condensation to prevent mold and moisture problems.",
};

pages.push({
  name: "Prevent pests and health problems",
  userType: "General public",
  userGoal: "Pick a prevention guide",
  purpose: "Prevention hub for HHVC education pages",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "Programs and services; Tools, fees, and help",
    children: PREVENT_NAMES.join(", "),
    entry: "Healthy housing and pests",
    next: "Home care steps or return to report if problems appear",
  }),
  duplication: "Possible overlap with school or community health guides.",
  enforcement: "What can be verified: visible sanitation and storage habits.\nWhat is unclear: outdoor sources you do not control.",
  draft: `# Prevent pests and health problems

Description: Learn how to prevent rats, cockroaches, mosquitoes, and other pests. Find simple steps to keep your home clean and safe.

## What to know

Section heading: Start with the risk you see
Section body: Match your home issue to a guide below. These pages focus on actions you can take without waiting for a visit.

## Related
- Prevent rats or mice in your home
- Prevent mosquitoes by removing standing water
- Reduce indoor moisture and prevent mold (not leaks)`,
  integration: "Prevention hub.",
});

for (const pname of PREVENT_NAMES) {
  const desc = PREVENT_DESC[pname];
  pages.push({
    name: pname,
    userType: "Resident / tenant",
    userGoal: `Prevent: ${pname.replace(/^Prevent /, "").replace(/ in your home$/, "")}`,
    purpose: "Prevention guidance within HHVC scope",
    pageType: "Information",
    components: "Description, Section, Callout, Related",
    relationships: REL({
      siblings: neighborRelated(PREVENT_NAMES, pname, 3).join("; "),
      children: "none",
      entry: "Prevent pests and health problems",
      next: "Report if conditions worsen",
    }),
    duplication: "Possible overlap with other City health education pages.",
    enforcement: "What can be verified: visible clutter, food storage, standing water.\nWhat is unclear: building-wide issues outside your unit.",
    draft:
      pname === "Reduce indoor moisture and prevent mold (not leaks)"
        ? `# ${pname}

Description: ${desc}

## What to know

Section heading: Daily moisture habits
Section body: Run fans, wipe condensation, and move air through damp rooms.

Callout: This guide covers indoor moisture and mold prevention. It does not cover leak repair requests.

## Related
- Report indoor moisture problems like water on walls or windows (not leaks)
- Keep your home clean and free of pests`
        : `# ${pname}

Description: ${desc}

## What to know

Section heading: Simple habits that help
Section body: Focus on food storage, trash routines, and removing standing water where it applies.

## Related
${neighborRelated(PREVENT_NAMES, pname, 2)
  .map((t) => `- ${t}`)
  .join("\n")}`,
    integration: "Prevention guide under HHVC topic.",
  });
}

pages.push({
  name: "Programs and services",
  userType: "General public",
  userGoal: "Find HHVC programs and education services",
  purpose: "Programs hub for workshops, surveillance reporting, and program facts",
  pageType: "Information",
  components: "Description, Spotlight, Section, Related",
  relationships: REL({
    siblings: "Prevent pests and health problems; Tools, fees, and help",
    children:
      "Request a mosquito education workshop for students; Report a dead bird for West Nile Virus testing; About the healthy housing program and inspections; Learn what we inspect in homes and buildings; Learn how we respond to complaints",
    entry: "Healthy housing and pests",
    next: "Request a service or read how the program works",
  }),
  duplication: "Possible overlap with other SFDPH program pages.",
  enforcement: "What can be verified: public program descriptions.\nWhat is unclear: workshop dates until staff confirm.",
  draft: `# Programs and services

Description: Learn about healthy housing programs, inspections, and services. Find outreach programs, education, and how the City responds to complaints.

## What to know

Section heading: Pick a program path
Section body: Use workshops for schools, use dead bird reporting for surveillance, or read how inspections support public health.

## Related
- Request a mosquito education workshop for students
- About the healthy housing program and inspections`,
  integration: "Programs hub.",
});

pages.push({
  name: "Request a mosquito education workshop for students",
  userType: "General public",
  userGoal: "Request a mosquito workshop for a school or group",
  purpose: "Workshop request transaction",
  pageType: "Transaction",
  components: "Description, Section, Action link, Phone number, Related",
  relationships: REL({
    siblings: "Report a dead bird for West Nile Virus testing; Programs and services",
    children: "none",
    entry: "Programs and services",
    next: "Scheduling from City staff",
  }),
  duplication: "Possible overlap with other vector education offers.",
  enforcement: "What can be verified: request details you submit.\nWhat is unclear: exact workshop date until confirmed.",
  draft: draftWorkshop(
    "Request a free mosquito education workshop for schools and community groups. Learn how to prevent mosquito breeding.",
    ["Programs and services", "Prevent mosquitoes by removing standing water"]
  ),
  integration: "Workshop request uses 311 or sf.gov routing without placeholder URLs.",
});

pages.push({
  name: "Report a dead bird for West Nile Virus testing",
  userType: "General public",
  userGoal: "Report a dead bird for West Nile Virus testing",
  purpose: "External public health reporting path",
  pageType: "Transaction",
  components: "Description, Section, Action link, Related",
  relationships: REL({
    siblings: "Request a mosquito education workshop for students; Programs and services",
    children: "none",
    entry: "Programs and services",
    next: "Partner laboratory and surveillance workflow",
  }),
  duplication: "Possible overlap with other vector surveillance pages.",
  enforcement: "What can be verified: bird location and pickup status.\nWhat is unclear: lab results timing.",
  draft: draftExternal(
    "Report a dead bird for West Nile Virus testing",
    "Report a dead bird for West Nile Virus testing. This helps track and prevent disease spread.",
    "Open the dead bird reporting page",
    "https://www.sf.gov",
    ["Programs and services", "Prevent mosquitoes by removing standing water"]
  ),
  integration: "Dead bird path links to sf.gov entry point for vector surveillance.",
});

pages.push({
  name: "About the healthy housing program and inspections",
  userType: "General public",
  userGoal: "Understand the HHVC program at a high level",
  purpose: "Program overview information",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "Learn what we inspect in homes and buildings; Learn how we respond to complaints",
    children: "none",
    entry: "Programs and services",
    next: "Topic children for reporting and prevention",
  }),
  duplication: "Possible overlap with annual reports or agency about pages.",
  enforcement: "What can be verified: public program mission statements.\nWhat is unclear: staffing levels by week.",
  draft: `# About the healthy housing program and inspections

Description: Learn about the Healthy Housing program, what it does, and how inspections help protect public health.

## What to know

Section heading: What HHVC does
Section body: The program responds to complaints, inspects housing health risks tied to pests and sanitation, and supports education to prevent repeat problems.

Section heading: How inspections help
Section body: Inspections document conditions, give clear repair expectations, and support safe homes across neighborhoods.

## Related
- Learn what we inspect in homes and buildings
- Learn how we respond to complaints`,
  integration: "Program overview.",
});

pages.push({
  name: "Learn what we inspect in homes and buildings",
  userType: "General public",
  userGoal: "Know what inspectors look for",
  purpose: "Inspection scope education",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "About the healthy housing program and inspections; Learn how we respond to complaints",
    children: "none",
    entry: "Programs and services",
    next: "Report or prep pages",
  }),
  duplication: "Possible overlap with inspection checklists published elsewhere.",
  enforcement: "What can be verified: items cited on a notice tied to visible conditions.\nWhat is unclear: issues outside HHVC scope.",
  draft: `# Learn what we inspect in homes and buildings

Description: Find out what inspectors look for during housing inspections, including pests, sanitation, and safety issues.

## What to know

Section heading: Common inspection topics
Section body: Staff look for pest signs, trash and attractants, moisture on walls or windows tied to health risk, and access to problem areas.

Section heading: Scope limits
Section body: Some leak and structural repairs sit with other City teams. Use HHVC pages for pests, sanitation, and indoor moisture tied to health programs.

## Related
- Understand inspections and follow-up visits
- Report a housing or pest problem`,
  integration: "Inspection scope page.",
});

pages.push({
  name: "Learn how we respond to complaints",
  userType: "General public",
  userGoal: "Understand complaint handling steps",
  purpose: "Complaint response process overview",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "About the healthy housing program and inspections; Learn what we inspect in homes and buildings",
    children: "none",
    entry: "Programs and services",
    next: "311 report or inspection outcomes",
  }),
  duplication: "Possible overlap with generic 311 FAQs.",
  enforcement: "What can be verified: case numbers and inspection letters you receive.\nWhat is unclear: queue timing before staff contact you.",
  draft: `# Learn how we respond to complaints

Description: Learn how the City reviews complaints, conducts inspections, and follows up on housing and pest problems.

## What to know

Section heading: Intake through 311
Section body: Complaints enter through 311 with your address, photos, and notes. Staff route eligible cases to HHVC.

Section heading: Inspection and follow-up
Section body: Inspectors document conditions, issue notices when needed, and schedule follow-up visits to verify repairs.

## Related
- Report a housing or pest problem
- Fix a problem in your building`,
  integration: "Complaint lifecycle overview.",
});

pages.push({
  name: "Tools, fees, and help",
  userType: "General public",
  userGoal: "Open lookups, fee tasks, and help resources",
  purpose: "Combined hub for violations lookup, inspector lookup, fees, guides, and contact",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "Programs and services; Prevent pests and health problems",
    children:
      "Look up healthy housing violations for a property; Find your healthy housing inspector by neighborhood; Pay your healthy housing fee for buildings with 3 or more units; Healthy housing guides and resources; Contact healthy housing and vector control",
    entry: "Healthy housing and pests",
    next: "Lookup, payment, or contact",
  }),
  duplication: "Possible overlap with older IA labels like Tools and lookup.",
  enforcement: "What can be verified: tool results returned by official systems.\nWhat is unclear: records not published online.",
  draft: `# Tools, fees, and help

Description: Look up violations, find your inspector, pay fees, and get help with housing or pest problems.

## What to know

Section heading: Pick your task
Section body: Use lookups for public records, use fee pages when you own a covered building, and use guides or contact when you need human help.

## Related
- Look up healthy housing violations for a property
- Pay your healthy housing fee for buildings with 3 or more units
- Contact healthy housing and vector control`,
  integration: "Merged tools, fees, and help hub per updated IA naming.",
});

pages.push({
  name: "Look up healthy housing violations for a property",
  userType: "General public",
  userGoal: "Search violations history for an address",
  purpose: "Violations lookup entry",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "Find your healthy housing inspector by neighborhood; Healthy housing guides and resources",
    children: "none",
    entry: "Tools, fees, and help",
    next: "External lookup tool",
  }),
  duplication: "Possible overlap with other property record tools.",
  enforcement: "What can be verified: records returned by the lookup tool.\nWhat is unclear: sealed or unpublished cases.",
  draft: `# Look up healthy housing violations for a property

Description: Search for past and current housing violations by address. View inspection history and compliance status.

## What to know

Section heading: Official lookup
Section body: Use the City lookup tool tied to housing violations data. Enter the full address and review the results list.

## Related
- Tools, fees, and help
- Find your healthy housing inspector by neighborhood`,
  integration: "Lookup page references sf.gov tool without bracket placeholders.",
});

pages.push({
  name: "Find your healthy housing inspector by neighborhood",
  userType: "General public",
  userGoal: "Find inspector coverage for my neighborhood",
  purpose: "Inspector neighborhood lookup",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "Look up healthy housing violations for a property; Contact healthy housing and vector control",
    children: "none",
    entry: "Tools, fees, and help",
    next: "Email or phone outreach",
  }),
  duplication: "Possible overlap with staff directories.",
  enforcement: "What can be verified: published coverage maps or lists.\nWhat is unclear: temporary duty swaps.",
  draft: `# Find your healthy housing inspector by neighborhood

Description: Find which inspector covers your neighborhood and how to contact them.

## What to know

Section heading: Use the official map or list
Section body: Open the inspector lookup on sf.gov and match your neighborhood to the listed contact.

## Related
- Tools, fees, and help
- Contact healthy housing and vector control`,
  integration: "Inspector lookup.",
});

pages.push({
  name: "Pay your healthy housing fee for buildings with 3 or more units",
  userType: "Property owner / landlord",
  userGoal: "Pay the Healthy Housing program fee",
  purpose: "Fee payment transaction for qualifying buildings",
  pageType: "Transaction",
  components: "Description, Section, Button link, Phone number, Related",
  relationships: REL({
    siblings: "Learn about reinspection fees; Healthy housing guides and resources",
    children: "none",
    entry: "Tools, fees, and help",
    next: "Payment confirmation from City billing",
  }),
  duplication: "Possible overlap with other City fee portals.",
  enforcement: "What can be verified: payment receipts from official systems.\nWhat is unclear: future fee rule updates until published.",
  draft: draftPayFee(
    "Pay required Healthy Housing program fees for qualifying residential buildings.",
    ["Tools, fees, and help", "Learn about reinspection fees"]
  ),
  integration: "Annual fee transaction without placeholder payment URLs.",
});

pages.push({
  name: "Healthy housing guides and resources",
  userType: "General public",
  userGoal: "Browse PDFs and handouts",
  purpose: "Resource collection entry for HHVC guides",
  pageType: "Information",
  components: "Description, Section, Related",
  relationships: REL({
    siblings: "Look up healthy housing violations for a property; Contact healthy housing and vector control",
    children: "none",
    entry: "Tools, fees, and help",
    next: "Download or print materials",
  }),
  duplication: "Possible overlap with other SFDPH resource libraries.",
  enforcement: "What can be verified: file names and publication dates on sf.gov.\nWhat is unclear: translations available per document.",
  draft: `# Healthy housing guides and resources

Description: Browse guides, handouts, and resources to help prevent and fix housing and pest problems.

## What to know

Section heading: Download trusted handouts
Section body: Start with the prevention and report summaries, then open deeper guides for landlords and tenants when listed.

## Related
- Prevent pests and health problems
- Tools, fees, and help`,
  integration: "Resource hub without embedding unverifiable file URLs.",
});

pages.push({
  name: "Contact healthy housing and vector control",
  userType: "General public",
  userGoal: "Reach HHVC staff",
  purpose: "Contact pathways for HHVC",
  pageType: "Information",
  components: "Description, Section, Phone number, Email, Related",
  relationships: REL({
    siblings: "Healthy housing guides and resources; Get help with a housing or pest problem",
    children: "none",
    entry: "Tools, fees, and help",
    next: "311 or direct office contact",
  }),
  duplication: "Possible overlap with main SFDPH contact pages.",
  enforcement: "What can be verified: published phone numbers and email inlets.\nWhat is unclear: response time for every message.",
  draft: `# Contact healthy housing and vector control

Description: Get in touch with Healthy Housing and Vector Control for questions or support.

## What to know

Section heading: Start with 311 for urgent housing hazards
Section body: Call 311 when you need to report active pests, trash, or moisture risks that need City intake.

Section heading: Email the program for longer questions
Section body: Use email when you need document review or coordination that is not an emergency.

Phone number: 311
Email: HHVC@sfdph.org

## Related
- Tools, fees, and help
- Get help with a housing or pest problem`,
  integration: "Contact page uses 311 plus sf.gov reference for email without hard-coding unverified addresses.",
});

const shaped = pages.map((p) => ({
  ...p,
  valid: true,
  karlConnected: false,
  skeleton: false,
  imported: true,
  reviewStatus: "pending",
  inputs: { topic: p.name, userType: p.userType, notes: NOTES },
}));

const seen = new Set();
for (const p of shaped) {
  const k = p.name.toLowerCase().trim();
  if (seen.has(k)) throw new Error(`Duplicate name: ${p.name}`);
  seen.add(k);
}

fs.writeFileSync(outFile, JSON.stringify(shaped, null, 2) + "\n", "utf8");
console.log(`Wrote ${shaped.length} pages to ${outFile}`);
