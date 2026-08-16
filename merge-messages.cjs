// merge-messages.cjs — 把 messages-*.json 合并注入 client.js 的 GENERIC / SLOT_MESSAGES
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const clientPath = path.join(dir, "lib", "client.js");

const generic = [];
const slots = { dawn: [], morning: [], noon: [], afternoon: [], offwork: [], evening: [], night: [] };

const files = fs.readdirSync(dir).filter((f) => /^messages-.*\.json$/.test(f));
if (files.length === 0) {
  console.error("no messages-*.json found");
  process.exit(1);
}
for (const f of files) {
  const obj = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  if (Array.isArray(obj.generic)) generic.push(...obj.generic);
  for (const k of Object.keys(slots)) {
    if (Array.isArray(obj[k])) slots[k].push(...obj[k]);
  }
}

function clean(arr) {
  const seen = new Set();
  const out = [];
  for (const m of arr) {
    if (!m || typeof m.t !== "string" || typeof m.s !== "string") continue;
    const t = m.t.trim();
    const s = m.s.trim();
    if (!t || !s) continue;
    const key = t + "\u0001" + s;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ t, s });
  }
  return out;
}

const gen = clean(generic);
const slotObj = {};
let slotTotal = 0;
for (const k of Object.keys(slots)) {
  slotObj[k] = clean(slots[k]);
  slotTotal += slotObj[k].length;
}

let client = fs.readFileSync(clientPath, "utf8");
const genLit = gen.map((m) => JSON.stringify(m)).join(",");
if (!client.includes("/*__GENERIC__*/")) { console.error("marker /*__GENERIC__*/ not found"); process.exit(1); }
if (!client.includes("/*__SLOT_MESSAGES__*/")) { console.error("marker /*__SLOT_MESSAGES__*/ not found"); process.exit(1); }
client = client.replace("/*__GENERIC__*/", genLit);
const slotLit = Object.keys(slotObj).map((k) => JSON.stringify(k) + ":" + JSON.stringify(slotObj[k])).join(",");
client = client.replace("/*__SLOT_MESSAGES__*/", slotLit);
fs.writeFileSync(clientPath, client, "utf8");

console.log("merged generic=" + gen.length + " slotsTotal=" + slotTotal + " grandTotal=" + (gen.length + slotTotal));
console.log("slot breakdown: " + Object.keys(slotObj).map((k) => k + "=" + slotObj[k].length).join(" "));
