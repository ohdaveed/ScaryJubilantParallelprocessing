import fs from 'fs';


const inputFile = 'src/data/hhvc-pages-import.json';
const reviewFile = 'src/data/hhvc-pages-import.review.json';

const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

const forcedDrop = new Set([
  "I need to report bed bugs",
  "I found a dead bird (stub)",
  "I need to report mold in my home (v2)",
  "I need to fix a violation after an inspection (v2)",
  "My rules as a building owner (v2)"
].map(s => s.toLowerCase()));

const stubMarkers = ["stub", "to be confirmed", "content to be generated", "url to be confirmed", "tbd", "if available"];

function normalizeName(name) {
  let n = name.toLowerCase();
  n = n.replace(/\s*\(.*?\)\s*/g, ''); // Remove parenthetical suffixes
  n = n.replace(/bed bugs/g, 'bedbugs');
  n = n.replace(/[^\w\s]/g, ''); // Strip punctuation
  n = n.trim().replace(/\s+/g, ' '); // Normalize spaces
  return n;
}

const active = [];
const review = [];
const seenNames = new Map();

const counts = {
  duplicate: 0,
  stub: 0,
  forcedDrop: 0
};

for (const item of data) {
  const name = item.name || '';
  const lowerName = name.toLowerCase();
  const normName = normalizeName(name);

  // SLA artifact fix: replace the duplicated phrase if present
  // The user mentioned "after report is received from 311 after report is received from 311"
  if (item.nonEmergencyTimeline) {
      item.nonEmergencyTimeline = item.nonEmergencyTimeline.replace(/after report is received from 311 after report is received from 311/g, "after report is received from 311");
  }

  // Force-drop
  if (forcedDrop.has(lowerName)) {
    review.push({ reason: 'forced-drop', originalName: name, page: item });
    counts.forcedDrop++;
    continue;
  }

  // Parent line relationship
  if (item.relationships) {
    item.relationships = item.relationships.map(r => {
      if (r.startsWith("Parent:")) {
        return "Parent: Healthy housing and pests (Topic)";
      }
      return r;
    });
  }

  // Placeholder/Stub
  const contentToSearch = [
    item.name,
    item.draftSlaResponse,
    item.enforcementProtocol,
    item.integrationNotes
  ].join(' ').toLowerCase();

  const isStub = stubMarkers.some(marker => contentToSearch.includes(marker));
  if (isStub) {
    review.push({ reason: 'placeholder/stub', originalName: name, page: item });
    counts.stub++;
    continue;
  }

  // Duplicates
  if (seenNames.has(normName)) {
    review.push({ reason: 'duplicate', originalName: name, page: item });
    counts.duplicate++;
    continue;
  }

  seenNames.set(normName, true);
  active.push(item);
}

fs.writeFileSync(inputFile, JSON.stringify(active, null, 2));
fs.writeFileSync(reviewFile, JSON.stringify(review, null, 2));

console.log('Summary Counts:');
console.log(`- Active: ${active.length}`);
console.log(`- Duplicates: ${counts.duplicate}`);
console.log(`- Stubs: ${counts.stub}`);
console.log(`- Forced-drop: ${counts.forcedDrop}`);
