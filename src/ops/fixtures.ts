/* Rathmines Glass demo fixtures. Every customer, job, amount, metric and event
   below is an illustrative demo record. Research-backed facts (company name,
   sister brands, locations, Danielle, Xero/Square in use) are flagged in
   RESEARCH. Nothing here is a real log, ledger or customer. */
import type {
  ActivityEvent, AgentRun, Approval, BrandId, Callback, ContactSampleRow, Customer, CustomerKind, Draft,
  EmergencyProposal, Interaction, Invoice, Job, MeasurementRevision, OpsData, Opening, PaperRow, Payment,
  Person, PersonId, ProductionOrder, Quote, QuoteLine, Site, Skill, Stage, Supplier, SupplierOrder, Task,
  Visit, WorkshopTask, Zone, ProdState
} from "./types";
import { hhmm, minutes, mulberry } from "./time";

export const DATA_VERSION = 3;

export const BRANDS: Record<BrandId, { id: BrandId; name: string; short: string; site: string; focus: string }> = {
  RG: { id: "RG", name: "Rathmines Glass", short: "Rathmines", site: "rathminesglass.ie", focus: "Emergency glazing, double glazing and specialist glass" },
  MD: { id: "MD", name: "Mirrors Dublin", short: "Mirrors", site: "mirrorsdublin.ie", focus: "Made-to-measure mirrors" },
  SG: { id: "SG", name: "Slim Glaze Heritage", short: "Slim Glaze", site: "slimglaze.ie", focus: "Slim double glazing for traditional frames" }
};
export const BRAND_IDS: BrandId[] = ["RG", "MD", "SG"];

export const RESEARCH = {
  accessed: "12 Nov 2026",
  sources: [
    { url: "https://www.rathminesglass.ie/", note: "Family glazing business serving Dublin; manufacturing in Robinhood, Dublin 22; stained-glass studio in Rathmines." },
    { url: "https://www.rathminesglass.ie/post/who-are-we", note: "Danielle took over from her father Pat in 2012." },
    { url: "https://www.mirrorsdublin.ie/", note: "Mirror sister brand." },
    { url: "https://www.slimglaze.ie/", note: "Heritage glazing brand for traditional frames." },
    { url: "https://www.slimglaze.ie/contact", note: "Shared manufacturing address and studio details." }
  ],
  locations: [
    { name: "Manufacturing", address: "Roseview, Robinhood Road, Dublin 22, D22 KN90", verified: true },
    { name: "Stained-glass studio", address: "Rathmines Avenue, Upper Rathmines Road, Dublin 6", verified: true }
  ],
  call: "Discovery call, 11 Nov 2026 (self-reported figures, not audited)."
};

export const PEOPLE: Person[] = [
  { id: "danielle", name: "Danielle", role: "Owner / Office lead", team: "Office", email: "danielle@rathminesglass.ie", initials: "D", roleKey: "management",
    provenance: "Named on the company website. Email address illustrative.", skills: [] },
  { id: "office", name: "Office coordinator", role: "Scheduling & customer care", team: "Office", email: "office@rathminesglass.ie", initials: "OC", roleKey: "office",
    provenance: "Real role; name not confirmed from the call, so none is used. Email illustrative.", skills: [] },
  { id: "phil", name: "Phil", role: "Lead glazier", team: "Field glazing", email: "phil@rathminesglass.ie", initials: "P", roleKey: "field",
    provenance: "Name mentioned on the call. Role and email illustrative.", skills: ["survey", "glazing", "shopfront", "mirror"] },
  { id: "sean", name: "Sean Byrne", role: "Glazier", team: "Field glazing", email: "sean@rathminesglass.ie", initials: "SB", roleKey: "field",
    provenance: "Fictional demonstration user.", skills: ["glazing", "shopfront", "mirror"] },
  { id: "aoife", name: "Aoife Kelly", role: "Glazier / surveyor", team: "Field glazing", email: "aoife@rathminesglass.ie", initials: "AK", roleKey: "field",
    provenance: "Fictional demonstration user.", skills: ["survey", "glazing", "heritage", "mirror"] },
  { id: "mark", name: "Mark Doyle", role: "Workshop lead", team: "Workshop", email: "mark@rathminesglass.ie", initials: "MD", roleKey: "workshop",
    provenance: "Fictional demonstration user.", skills: ["workshop"] },
  { id: "liam", name: "Liam Walsh", role: "Glass production", team: "Workshop", email: "liam@rathminesglass.ie", initials: "LW", roleKey: "workshop",
    provenance: "Fictional demonstration user.", skills: ["workshop"] },
  { id: "niamh", name: "Niamh Ryan", role: "Specialist studio", team: "Specialist studio", email: "niamh@rathminesglass.ie", initials: "NR", roleKey: "field",
    provenance: "Fictional demonstration user.", skills: ["stained", "heritage"] }
];
export const PERSON = Object.fromEntries(PEOPLE.map(p => [p.id, p])) as Record<PersonId, Person>;

export const SUPPLIERS: Supplier[] = [
  { id: "SUP-1", name: "Specialist Toughening Partner", speciality: "Toughened and laminated units", contact: "Order desk", email: "orders@toughening-partner.example",
    provenance: "Fictional supplier record. No real supplier relationship implied." },
  { id: "SUP-2", name: "Bevel & Edge Workshop", speciality: "Bevelled and polished mirror edges", contact: "Workshop office", email: "hello@bevel-edge.example",
    provenance: "Fictional supplier record. No real supplier relationship implied." }
];

export const AGENTS = [
  { id: "briefing", name: "Briefing", shape: "crown-pebble", tint: "#18324B",
    job: "Reads queues, commitments and finance; writes a cited morning summary.", approval: "Read only. Never changes a record." },
  { id: "watchdog", name: "Ops Watchdog", shape: "rim-capsule", tint: "#1f3d4f",
    job: "Flags missing owners, stale jobs, unreturned callbacks, paid-but-blocked production and overdue commitments.", approval: "Creates local tasks only. Never moves a commitment." },
  { id: "enquiry", name: "Enquiry Assistant", shape: "executive-capsule", tint: "#21404a",
    job: "Summarises mock emails and call notes, suggests duplicates and next actions.", approval: "Office approves every merge." },
  { id: "scheduling", name: "Scheduling Assistant", shape: "crown-pebble", tint: "#243a52",
    job: "Proposes feasible slots and emergency displacement from crew, skills and travel.", approval: "Office approves every schedule change." },
  { id: "production", name: "Production Coordinator", shape: "rim-capsule", tint: "#1b3a3a",
    job: "Checks release gates, workshop load and supplier dependencies.", approval: "Proposes releases. Never approves its own measurement revision." },
  { id: "updates", name: "Customer Updates", shape: "executive-capsule", tint: "#2a3c4c",
    job: "Drafts acknowledgements, quote follow-ups and appointment updates.", approval: "Office reviews before any simulated send." },
  { id: "finance", name: "Finance Follow-up", shape: "crown-pebble", tint: "#1d3446",
    job: "Reconciles mock allocations, spots deposits and balances, drafts reminders.", approval: "Never initiates a payment or refund, never changes real accounts." }
] as const;
export type AgentId = typeof AGENTS[number]["id"];

/* ── jobs ─────────────────────────────────────────────────────────────── */

interface Spec {
  id: string; brand: BrandId; cust: string; kind: CustomerKind; contact: string; address: string; locality: string; zone: Zone; access: string;
  service: string; title: string; stage: Stage; prod?: ProdState; emergency?: boolean; owner: PersonId; enquiry: string;
  measured?: string; indicative?: number; supplier?: boolean;
  next: string; nextOwner: PersonId; nextDue: string; mins: number; crew: number; skills: Skill[]; equipment: string[];
  hold?: string; qc?: string; fitted?: string; released?: string; rack?: string; promises?: { text: string; due: string }[];
  ledgerNote?: string;
}

const E = (n: number) => n * 100; // euro to cents

const SPECS: Spec[] = [
  /* awaiting measure: 8 */
  { id: "RG-2601", brand: "RG", cust: "Emma Murphy", kind: "Homeowner", contact: "Emma Murphy", address: "Orwell Gardens, Rathgar", locality: "Rathgar, Dublin 6", zone: "D6",
    access: "Terraced house. Rear windows reached through side gate (key under planter).", service: "Double glazing", title: "3 misted sealed units, rear of house",
    stage: "awaiting_measure", owner: "office", enquiry: "2026-10-25T10:12", indicative: E(2400),
    next: "Return callback and offer a measuring slot", nextOwner: "office", nextDue: "2026-11-12T10:00", mins: 120, crew: 1, skills: ["survey"],
    equipment: ["Step ladder", "Laser measure"], promises: [{ text: "Told on 5 Nov she would have a measuring date that week", due: "2026-11-06T17:00" }] },
  { id: "RG-2603", brand: "RG", cust: "Rowan Street Café", kind: "Retail / hospitality", contact: "Café manager", address: "Rowan Street, Portobello", locality: "Portobello, Dublin 8", zone: "D8",
    access: "Shopfront on street. Loading bay outside until 11:00.", service: "Emergency glazing", title: "Shopfront pane missing, make safe and measure",
    stage: "awaiting_measure", emergency: true, owner: "office", enquiry: "2026-11-12T07:48", indicative: E(1480),
    next: "Approve emergency dispatch proposal", nextOwner: "danielle", nextDue: "2026-11-12T09:30", mins: 120, crew: 2, skills: ["shopfront"],
    equipment: ["Glass rack van", "Board-up kit", "Suction lifters"] },
  { id: "RG-2609", brand: "SG", cust: "Ciarán Lynch", kind: "Heritage property", contact: "Ciarán Lynch", address: "Fortfield Terrace, Terenure", locality: "Terenure, Dublin 6W", zone: "D6",
    access: "Victorian sashes, first floor. Scaffold not needed per photos.", service: "Heritage slim glazing", title: "Slim double glazing for 2 Victorian sashes",
    stage: "awaiting_measure", owner: "office", enquiry: "2026-10-29T14:30", indicative: E(3100),
    next: "Book heritage survey with Aoife", nextOwner: "office", nextDue: "2026-11-13T12:00", mins: 90, crew: 1, skills: ["heritage"],
    equipment: ["Sash profile gauge", "Laser measure"] },
  { id: "RG-2610", brand: "MD", cust: "Hughes family", kind: "Mirror customer", contact: "Gráinne Hughes", address: "Cypress Grove, Templeogue", locality: "Templeogue, Dublin 6W", zone: "D6",
    access: "Upstairs bathroom. Dog in house, call ahead.", service: "Mirrors", title: "Bevelled bathroom mirror and splashback",
    stage: "awaiting_measure", owner: "office", enquiry: "2026-11-02T11:05", indicative: E(680),
    next: "Measure booked Fri 13 Nov 14:00", nextOwner: "aoife", nextDue: "2026-11-13T14:00", mins: 60, crew: 1, skills: ["survey"],
    equipment: ["Laser measure", "Template card"] },
  { id: "RG-2611", brand: "RG", cust: "Kimmage Physio Clinic", kind: "Office", contact: "Practice manager", address: "Kimmage Road Lower, Kimmage", locality: "Kimmage, Dublin 12", zone: "D12",
    access: "Ground floor clinic. Visit between appointments only.", service: "Specialist glass", title: "Frosted glass partition, 2 panels",
    stage: "awaiting_measure", owner: "office", enquiry: "2026-11-04T09:40", indicative: E(1950),
    next: "Measure booked today 14:30", nextOwner: "aoife", nextDue: "2026-11-12T14:30", mins: 60, crew: 1, skills: ["survey"],
    equipment: ["Laser measure", "Step ladder"] },
  { id: "RG-2612", brand: "SG", cust: "Orla Dempsey", kind: "Heritage property", contact: "Orla Dempsey", address: "Leinster Road West, Harold's Cross", locality: "Harold's Cross, Dublin 6W", zone: "D6",
    access: "Front door fanlight. Needs studio assessment of lead came.", service: "Heritage glazing", title: "Fanlight restoration and secondary glazing",
    stage: "awaiting_measure", owner: "office", enquiry: "2026-10-31T16:20", indicative: E(1250),
    next: "Call back with a studio survey date", nextOwner: "office", nextDue: "2026-11-11T16:00", mins: 60, crew: 1, skills: ["stained"],
    equipment: ["Studio survey kit"] },
  { id: "RG-2613", brand: "RG", cust: "Gallagher residence", kind: "Homeowner", contact: "Tom Gallagher", address: "Sundrive Road, Crumlin", locality: "Crumlin, Dublin 12", zone: "D12",
    access: "Semi-detached. Four units across front bedrooms.", service: "Double glazing", title: "4 misted double-glazed units",
    stage: "awaiting_measure", owner: "office", enquiry: "2026-11-06T13:15", indicative: E(1720),
    next: "Measure today 09:30 (Aoife)", nextOwner: "aoife", nextDue: "2026-11-12T09:30", mins: 90, crew: 1, skills: ["survey"],
    equipment: ["Step ladder", "Laser measure"] },
  { id: "RG-2614", brand: "RG", cust: "Byrne-Keogh household", kind: "Homeowner", contact: "Paula Keogh", address: "Ballyroan Road, Rathfarnham", locality: "Rathfarnham, Dublin 14", zone: "D14",
    access: "Stair window, lead panel bowed.", service: "Stained glass", title: "Stained glass stair panel repair",
    stage: "awaiting_measure", owner: "niamh", enquiry: "2026-11-09T10:00", indicative: E(900),
    next: "Studio survey booked Mon 16 Nov 10:00", nextOwner: "niamh", nextDue: "2026-11-16T10:00", mins: 60, crew: 1, skills: ["stained"],
    equipment: ["Studio survey kit"] },

  /* awaiting quote: 5 */
  { id: "RG-2602", brand: "MD", cust: "Cedar Lane Dental", kind: "Office", contact: "Practice manager", address: "Cedar Lane, Terenure", locality: "Terenure, Dublin 6W", zone: "D6",
    access: "Three surgeries, work after 17:30 or Saturday.", service: "Mirrors", title: "Wall mirrors for 3 surgeries",
    stage: "awaiting_quote", owner: "danielle", enquiry: "2026-10-28T12:00", measured: "2026-11-06T11:00",
    next: "Approve and send €3,200 quote", nextOwner: "danielle", nextDue: "2026-11-12T12:00", mins: 120, crew: 2, skills: ["mirror"],
    equipment: ["Mirror adhesive", "Suction lifters"] },
  { id: "RG-2606", brand: "RG", cust: "Brennan Home", kind: "Homeowner", contact: "Ruth Brennan", address: "Grosvenor Place, Rathmines", locality: "Rathmines, Dublin 6", zone: "D6",
    access: "Kitchen side window, reached from the lane.", service: "Double glazing", title: "Replacement double-glazed unit, kitchen",
    stage: "awaiting_quote", owner: "office", enquiry: "2026-11-03T15:30", measured: "2026-11-10T10:30",
    next: "Independent check of revised width", nextOwner: "aoife", nextDue: "2026-11-12T15:00", mins: 90, crew: 1, skills: ["glazing"],
    equipment: ["Laser measure"], hold: "Revised width 862 mm awaiting independent check. Order blocked." },
  { id: "RG-2615", brand: "RG", cust: "Walkinstown Pharmacy", kind: "Retail / hospitality", contact: "Pharmacist on duty", address: "Walkinstown Avenue, Walkinstown", locality: "Walkinstown, Dublin 12", zone: "D12",
    access: "Shop window, fit before 09:00 opening.", service: "Specialist glass", title: "Laminated shop window pane",
    stage: "awaiting_quote", owner: "danielle", enquiry: "2026-11-02T10:45", measured: "2026-11-09T08:00",
    next: "Price laminated pane", nextOwner: "danielle", nextDue: "2026-11-12T17:00", mins: 120, crew: 2, skills: ["shopfront"],
    equipment: ["Glass rack van", "Suction lifters"] },
  { id: "RG-2616", brand: "MD", cust: "Aisling Ward", kind: "Mirror customer", contact: "Aisling Ward", address: "Galtymore Road, Drimnagh", locality: "Drimnagh, Dublin 12", zone: "D12",
    access: "Apartment, 2nd floor, lift available.", service: "Mirrors", title: "Sliding wardrobe mirror doors x2",
    stage: "awaiting_quote", owner: "office", enquiry: "2026-11-03T18:10", measured: "2026-11-10T15:00",
    next: "Follow up sent quote", nextOwner: "office", nextDue: "2026-11-16T10:00", mins: 90, crew: 2, skills: ["mirror"],
    equipment: ["Track kit"] },
  { id: "RG-2617", brand: "SG", cust: "Corrigan House", kind: "Heritage property", contact: "Michael Corrigan", address: "Sandymount Avenue, Sandymount", locality: "Sandymount, Dublin 4", zone: "D4",
    access: "Protected structure. Original sashes, 4 windows.", service: "Heritage slim glazing", title: "Slim double glazing, 4 sashes",
    stage: "awaiting_quote", owner: "danielle", enquiry: "2026-10-27T09:00", measured: "2026-11-05T10:00",
    next: "Heritage spec sign-off, then finish quote", nextOwner: "niamh", nextDue: "2026-11-13T17:00", mins: 240, crew: 2, skills: ["heritage"],
    equipment: ["Sash tools", "Putty"] },

  /* awaiting deposit: 3 */
  { id: "RG-2618", brand: "RG", cust: "Moran residence", kind: "Homeowner", contact: "Declan Moran", address: "Kilnamanagh Road, Tallaght", locality: "Tallaght, Dublin 24", zone: "D24",
    access: "Bungalow, 4 units, side access.", service: "Double glazing", title: "4 double-glazed units",
    stage: "awaiting_deposit", owner: "office", enquiry: "2026-10-19T09:20", measured: "2026-11-02T10:00",
    next: "Take €1,070 deposit by card", nextOwner: "office", nextDue: "2026-11-13T12:00", mins: 150, crew: 2, skills: ["glazing"],
    equipment: ["Step ladder"] },
  { id: "RG-2619", brand: "MD", cust: "Studio Ten Yoga", kind: "Retail / hospitality", contact: "Studio owner", address: "Main Street, Blackrock", locality: "Blackrock, Co. Dublin", zone: "D4",
    access: "First-floor studio. Fit Sunday or before 07:00 class.", service: "Mirrors", title: "6 m mirror wall",
    stage: "awaiting_deposit", owner: "office", enquiry: "2026-10-20T19:00", measured: "2026-11-03T08:00",
    next: "Send €1,440 deposit request", nextOwner: "office", nextDue: "2026-11-12T16:00", mins: 240, crew: 2, skills: ["mirror"],
    equipment: ["Mirror adhesive", "Suction lifters"] },
  { id: "RG-2620", brand: "SG", cust: "Kavanagh residence", kind: "Heritage property", contact: "Sinéad Kavanagh", address: "Highfield Road, Rathgar", locality: "Rathgar, Dublin 6", zone: "D6",
    access: "Six sashes, ground and first floor.", service: "Heritage slim glazing", title: "Slim double glazing, 6 sashes",
    stage: "awaiting_deposit", owner: "danielle", enquiry: "2026-10-08T11:00", measured: "2026-10-27T10:00",
    next: "Chase €2,700 deposit", nextOwner: "danielle", nextDue: "2026-11-11T17:00", mins: 360, crew: 2, skills: ["heritage"],
    equipment: ["Sash tools", "Putty"] },

  /* production: 5 (3 waiting release, 2 in progress) */
  { id: "RG-2605", brand: "SG", cust: "O'Neill Residence", kind: "Heritage property", contact: "Brian O'Neill", address: "Belgrave Road, Ranelagh", locality: "Ranelagh, Dublin 6", zone: "D6",
    access: "Three sashes, front elevation.", service: "Heritage slim glazing", title: "Slim double glazing, 3 sashes",
    stage: "production", prod: "waiting_release", owner: "danielle", enquiry: "2026-10-03T10:00", measured: "2026-10-22T09:30",
    next: "Approve release to workshop", nextOwner: "danielle", nextDue: "2026-11-05T12:00", mins: 300, crew: 2, skills: ["heritage"],
    equipment: ["Sash tools", "Putty"] },
  { id: "RG-2621", brand: "RG", cust: "Foley residence", kind: "Homeowner", contact: "Karen Foley", address: "Firhouse Road, Firhouse", locality: "Firhouse, Dublin 24", zone: "D24",
    access: "Three units, rear patio.", service: "Double glazing", title: "3 double-glazed units",
    stage: "production", prod: "waiting_release", owner: "danielle", enquiry: "2026-10-14T15:00", measured: "2026-10-30T10:00",
    next: "Release to workshop", nextOwner: "danielle", nextDue: "2026-11-12T12:00", mins: 120, crew: 2, skills: ["glazing"],
    equipment: ["Step ladder"] },
  { id: "RG-2622", brand: "MD", cust: "Fennelly residence", kind: "Mirror customer", contact: "Joe Fennelly", address: "Tyrconnell Road, Inchicore", locality: "Inchicore, Dublin 8", zone: "D8",
    access: "Living room alcove.", service: "Mirrors", title: "Alcove mirror and glass shelving",
    stage: "production", prod: "waiting_release", owner: "office", enquiry: "2026-10-21T12:30", measured: "2026-11-03T14:00",
    next: "Allocate Square payment SQ-88412", nextOwner: "office", nextDue: "2026-11-12T12:00", mins: 90, crew: 1, skills: ["mirror"],
    equipment: ["Shelf brackets"] },
  { id: "RG-2608", brand: "RG", cust: "Oakfield Shopfront", kind: "Retail / hospitality", contact: "Shop owner", address: "Thomas Street, Dublin 8", locality: "Dublin 8", zone: "D8",
    access: "Shopfront, lane access for van.", service: "Shopfront glazing", title: "Toughened shopfront unit (supplier order)",
    stage: "production", prod: "in_progress", supplier: true, owner: "mark", enquiry: "2026-10-16T09:00", measured: "2026-10-26T08:30",
    next: "Receive and QC toughened unit, then book fitting", nextOwner: "mark", nextDue: "2026-11-13T12:00", mins: 180, crew: 2, skills: ["shopfront"],
    equipment: ["Glass rack van", "Suction lifters"], released: "2026-10-30T10:00" },
  { id: "RG-2623", brand: "RG", cust: "Harrington residence", kind: "Homeowner", contact: "Alan Harrington", address: "Limekiln Lane, Perrystown", locality: "Perrystown, Dublin 12", zone: "D12",
    access: "Three units, one toughened (door side panel).", service: "Double glazing", title: "3 double-glazed units",
    stage: "production", prod: "in_progress", owner: "mark", enquiry: "2026-10-17T10:30", measured: "2026-10-30T14:00",
    next: "Assemble units and chase toughened panel acknowledgement", nextOwner: "mark", nextDue: "2026-11-13T12:00", mins: 150, crew: 2, skills: ["glazing"],
    equipment: ["Step ladder"], released: "2026-11-05T09:00" },

  /* ready to fit: 3 */
  { id: "RG-2604", brand: "MD", cust: "Fitzpatrick Home", kind: "Mirror customer", contact: "Claire Fitzpatrick", address: "Taney Road, Dundrum", locality: "Dundrum, Dublin 14", zone: "D14",
    access: "Hallway and main bedroom. Parking in drive.", service: "Mirrors", title: "Hallway and bedroom mirrors",
    stage: "ready_to_fit", owner: "office", enquiry: "2026-10-12T09:00", measured: "2026-10-22T11:00",
    next: "Fit mirrors (booked visit)", nextOwner: "phil", nextDue: "2026-11-12T10:00", mins: 120, crew: 2, skills: ["mirror"],
    equipment: ["Mirror adhesive", "Suction lifters"], released: "2026-10-28T10:00", qc: "2026-11-10T15:00", rack: "Rack A2",
    promises: [{ text: "Fitting window 10:00 to 12:00 today", due: "2026-11-12T12:00" }] },
  { id: "RG-2624", brand: "RG", cust: "Quinn residence", kind: "Homeowner", contact: "Eoin Quinn", address: "Castlewood Avenue, Rathmines", locality: "Rathmines, Dublin 6", zone: "D6",
    access: "Two units, front bay.", service: "Double glazing", title: "2 double-glazed units",
    stage: "ready_to_fit", owner: "office", enquiry: "2026-10-15T14:00", measured: "2026-11-02T09:00",
    next: "Schedule fitting (2 glaziers, 90 min)", nextOwner: "office", nextDue: "2026-11-13T12:00", mins: 90, crew: 2, skills: ["glazing"],
    equipment: ["Step ladder"], released: "2026-11-03T09:00", qc: "2026-11-11T14:00", rack: "Rack B3" },
  { id: "RG-2625", brand: "MD", cust: "The Corner Barber", kind: "Retail / hospitality", contact: "Owner", address: "Terenure Road North, Terenure", locality: "Terenure, Dublin 6W", zone: "D6",
    access: "Fit before 10:30 opening.", service: "Mirrors", title: "Mirror wall, 4 stations",
    stage: "ready_to_fit", owner: "office", enquiry: "2026-10-13T11:00", measured: "2026-11-01T09:00",
    next: "Fit Fri 13 Nov 08:30", nextOwner: "aoife", nextDue: "2026-11-13T08:30", mins: 120, crew: 2, skills: ["mirror"],
    equipment: ["Mirror adhesive", "Suction lifters"], released: "2026-11-02T10:00", qc: "2026-11-09T16:00", rack: "Rack A4" },

  /* completed: 6 (historical, excluded from active count) */
  { id: "RG-2607", brand: "MD", cust: "Harbour Fitness", kind: "Retail / hospitality", contact: "Gym manager", address: "Harold's Cross Road, Dublin 6", locality: "Dublin 6", zone: "D6",
    access: "Studio floor, out of hours.", service: "Mirrors", title: "Gym mirror wall",
    stage: "completed", owner: "danielle", enquiry: "2026-10-06T10:00", measured: "2026-10-20T19:00",
    next: "Approve balance reminder for €1,800", nextOwner: "danielle", nextDue: "2026-11-12T12:00", mins: 0, crew: 2, skills: ["mirror"],
    equipment: [], released: "2026-10-24T09:00", qc: "2026-10-31T12:00", fitted: "2026-11-04T19:00" },
  { id: "RG-2590", brand: "RG", cust: "Mulligan residence", kind: "Homeowner", contact: "Ann Mulligan", address: "Templeville Road, Templeogue", locality: "Templeogue, Dublin 6W", zone: "D6",
    access: "", service: "Double glazing", title: "3 double-glazed units", stage: "completed", owner: "office",
    enquiry: "2026-09-22T10:00", measured: "2026-10-08T10:00", next: "None", nextOwner: "office", nextDue: "2026-10-30T16:00", mins: 0, crew: 2, skills: [], equipment: [],
    released: "2026-10-16T09:00", qc: "2026-10-23T15:00", fitted: "2026-10-30T11:00", ledgerNote: "Settled before the sample ledger window." },
  { id: "RG-2592", brand: "SG", cust: "Delaney home", kind: "Heritage property", contact: "Mary Delaney", address: "Garville Avenue, Rathgar", locality: "Rathgar, Dublin 6", zone: "D6",
    access: "", service: "Heritage slim glazing", title: "Slim double glazing, 5 sashes", stage: "completed", owner: "danielle",
    enquiry: "2026-09-10T10:00", measured: "2026-09-29T10:00", next: "None", nextOwner: "danielle", nextDue: "2026-10-28T16:00", mins: 0, crew: 2, skills: [], equipment: [],
    released: "2026-10-12T09:00", qc: "2026-10-21T15:00", fitted: "2026-10-28T14:00", ledgerNote: "Settled before the sample ledger window." },
  { id: "RG-2594", brand: "RG", cust: "Harold's Cross Deli", kind: "Retail / hospitality", contact: "Deli owner", address: "Harold's Cross Road, Harold's Cross", locality: "Harold's Cross, Dublin 6W", zone: "D6",
    access: "", service: "Emergency glazing", title: "Emergency board-up and reglaze", stage: "completed", owner: "office",
    enquiry: "2026-10-14T07:30", measured: "2026-10-14T10:00", next: "None", nextOwner: "office", nextDue: "2026-10-22T16:00", mins: 0, crew: 2, skills: [], equipment: [],
    released: "2026-10-15T09:00", qc: "2026-10-20T15:00", fitted: "2026-10-22T08:00", ledgerNote: "Settled before the sample ledger window." },
  { id: "RG-2596", brand: "MD", cust: "Power residence", kind: "Mirror customer", contact: "Liz Power", address: "Ballyboden Road, Ballyboden", locality: "Ballyboden, Dublin 16", zone: "D14",
    access: "", service: "Mirrors", title: "Bathroom mirror with demister", stage: "completed", owner: "office",
    enquiry: "2026-10-01T10:00", measured: "2026-10-16T10:00", next: "None", nextOwner: "office", nextDue: "2026-11-03T16:00", mins: 0, crew: 1, skills: [], equipment: [],
    released: "2026-10-23T09:00", qc: "2026-10-29T15:00", fitted: "2026-11-03T10:00", ledgerNote: "Settled before the sample ledger window." },
  { id: "RG-2598", brand: "RG", cust: "Whelan residence", kind: "Homeowner", contact: "Paddy Whelan", address: "Cashel Road, Crumlin", locality: "Crumlin, Dublin 12", zone: "D12",
    access: "", service: "Double glazing", title: "2 double-glazed units", stage: "completed", owner: "office",
    enquiry: "2026-10-05T10:00", measured: "2026-10-20T10:00", next: "None", nextOwner: "office", nextDue: "2026-11-06T16:00", mins: 0, crew: 2, skills: [], equipment: [],
    released: "2026-10-27T09:00", qc: "2026-11-03T15:00", fitted: "2026-11-06T11:00", ledgerNote: "Settled before the sample ledger window." }
];

/* quote lines per job (euro), all totals hand-checked */
const QUOTES: Record<string, { id: string; status: Quote["status"]; lines: [string, number, number][]; created: string; sent?: string; accepted?: string; owner: PersonId; approvedBy?: PersonId }> = {
  "RG-2602": { id: "Q-3102", status: "awaiting_approval", owner: "danielle", created: "2026-11-11T15:20",
    lines: [["Bevelled wall mirror 1800 x 900, 6 mm", 3, 850], ["Fixings and fitting, half day", 1, 650]] },
  "RG-2606": { id: "Q-3106", status: "draft", owner: "office", created: "2026-11-10T16:00",
    lines: [["Replacement DGU 4-16-4, low-E (size per approved revision)", 1, 840], ["Remove, fit and dispose", 1, 420]] },
  "RG-2615": { id: "Q-3115", status: "measured_awaiting_price", owner: "danielle", created: "2026-11-09T12:00", lines: [] },
  "RG-2616": { id: "Q-3116", status: "sent", owner: "office", created: "2026-11-10T17:00", sent: "2026-11-11T10:05", approvedBy: "danielle",
    lines: [["Mirror sliding door panel 2200 x 760", 2, 440], ["Track and fitting", 1, 300]] },
  "RG-2617": { id: "Q-3117", status: "draft", owner: "danielle", created: "2026-11-06T09:00",
    lines: [["Slim double-glazed unit for sash (heritage)", 8, 650], ["Sash removal, refit and putty", 1, 1200]] },
  "RG-2618": { id: "Q-3118", status: "accepted", owner: "office", created: "2026-11-03T10:00", sent: "2026-11-04T09:00", accepted: "2026-11-10T14:00", approvedBy: "danielle",
    lines: [["Double-glazed unit 4-16-4", 4, 385], ["Fitting, 2 glaziers", 1, 600]] },
  "RG-2619": { id: "Q-3119", status: "accepted", owner: "office", created: "2026-11-04T10:00", sent: "2026-11-05T09:00", accepted: "2026-11-09T18:30", approvedBy: "danielle",
    lines: [["Mirror wall panel 1200 x 2000", 5, 456], ["Fitting, 2 glaziers", 1, 600]] },
  "RG-2620": { id: "Q-3120", status: "accepted", owner: "danielle", created: "2026-10-28T10:00", sent: "2026-10-29T09:00", accepted: "2026-11-04T11:00", approvedBy: "danielle",
    lines: [["Slim DGU for sash (heritage)", 12, 350], ["Sash removal, refit and putty", 1, 1200]] },
  "RG-2605": { id: "Q-3105", status: "accepted", owner: "danielle", created: "2026-10-23T10:00", sent: "2026-10-24T09:00", accepted: "2026-10-30T12:00", approvedBy: "danielle",
    lines: [["Slim DGU for sash (heritage)", 6, 550], ["Sash removal, refit and putty", 1, 1500]] },
  "RG-2621": { id: "Q-3121", status: "accepted", owner: "office", created: "2026-10-31T10:00", sent: "2026-11-02T09:00", accepted: "2026-11-06T16:00", approvedBy: "danielle",
    lines: [["Double-glazed unit 4-16-4", 3, 460], ["Fitting, 2 glaziers", 1, 600]] },
  "RG-2622": { id: "Q-3122", status: "accepted", owner: "office", created: "2026-11-03T16:00", sent: "2026-11-04T09:00", accepted: "2026-11-05T13:00", approvedBy: "danielle",
    lines: [["Alcove mirror 1400 x 900", 1, 620], ["Glass shelf 8 mm, polished", 3, 110], ["Fitting", 1, 400]] },
  "RG-2608": { id: "Q-3108", status: "accepted", owner: "danielle", created: "2026-10-26T15:00", sent: "2026-10-27T09:00", accepted: "2026-10-29T10:00", approvedBy: "danielle",
    lines: [["Toughened 12 mm shopfront unit (supplier)", 1, 2350], ["Fitting, 2 glaziers", 1, 650]] },
  "RG-2623": { id: "Q-3123", status: "accepted", owner: "office", created: "2026-10-31T09:00", sent: "2026-10-31T15:00", accepted: "2026-11-02T10:00", approvedBy: "danielle",
    lines: [["Double-glazed unit (one toughened)", 3, 640], ["Fitting, 2 glaziers", 1, 1200]] },
  "RG-2604": { id: "Q-3104", status: "accepted", owner: "office", created: "2026-10-23T10:00", sent: "2026-10-23T15:00", accepted: "2026-10-26T09:00", approvedBy: "danielle",
    lines: [["Hall mirror, bevelled 1500 x 1000", 1, 980], ["Bedroom mirror 1800 x 600", 2, 510], ["Fitting, 2 glaziers", 1, 600]] },
  "RG-2624": { id: "Q-3124", status: "accepted", owner: "office", created: "2026-11-02T14:00", sent: "2026-11-02T16:00", accepted: "2026-11-02T18:00", approvedBy: "danielle",
    lines: [["Double-glazed unit 4-16-4", 2, 520], ["Fitting, 2 glaziers", 1, 600]] },
  "RG-2625": { id: "Q-3125", status: "accepted", owner: "office", created: "2026-11-01T12:00", sent: "2026-11-01T15:00", accepted: "2026-11-01T17:00", approvedBy: "danielle",
    lines: [["Mirror panel 1000 x 1200", 4, 330], ["Fitting, 2 glaziers", 1, 600]] },
  "RG-2607": { id: "Q-3107", status: "accepted", owner: "danielle", created: "2026-10-21T10:00", sent: "2026-10-21T15:00", accepted: "2026-10-22T09:00", approvedBy: "danielle",
    lines: [["Gym mirror panel 1000 x 2000", 8, 330], ["Fitting, 2 glaziers, out of hours", 1, 960]] },
  "RG-2590": { id: "Q-3090", status: "accepted", owner: "office", created: "2026-10-09T10:00", sent: "2026-10-09T15:00", accepted: "2026-10-12T10:00", approvedBy: "danielle",
    lines: [["Double-glazed unit 4-16-4", 3, 460], ["Fitting, 2 glaziers", 1, 600]] },
  "RG-2592": { id: "Q-3092", status: "accepted", owner: "danielle", created: "2026-09-30T10:00", sent: "2026-10-01T09:00", accepted: "2026-10-06T10:00", approvedBy: "danielle",
    lines: [["Slim DGU for sash (heritage)", 10, 305], ["Sash removal, refit and putty", 1, 1200]] },
  "RG-2594": { id: "Q-3094", status: "accepted", owner: "office", created: "2026-10-14T11:00", sent: "2026-10-14T11:30", accepted: "2026-10-14T12:00", approvedBy: "danielle",
    lines: [["Emergency board-up", 1, 240], ["Float glass pane, reglaze", 1, 650]] },
  "RG-2596": { id: "Q-3096", status: "accepted", owner: "office", created: "2026-10-16T14:00", sent: "2026-10-17T09:00", accepted: "2026-10-20T10:00", approvedBy: "danielle",
    lines: [["Bathroom mirror with demister pad", 1, 840], ["Fitting", 1, 300]] },
  "RG-2598": { id: "Q-3098", status: "accepted", owner: "office", created: "2026-10-21T10:00", sent: "2026-10-21T15:00", accepted: "2026-10-23T10:00", approvedBy: "danielle",
    lines: [["Double-glazed unit 4-16-4", 2, 855], ["Fitting, 2 glaziers", 1, 600]] }
};

/* measurement revisions: [jobId, rev, openings, by, at, status, reviewer, reviewedAt, reason?] */
type RevSpec = [string, number, [string, number, number, number][], PersonId, string, MeasurementRevision["status"], PersonId | undefined, string | undefined, string?];
const REVS: RevSpec[] = [
  ["RG-2602", 1, [["Surgery 1 wall", 1, 1800, 900], ["Surgery 2 wall", 1, 1800, 900], ["Surgery 3 wall", 1, 1800, 900]], "aoife", "2026-11-06T11:00", "approved", "phil", "2026-11-07T09:10"],
  ["RG-2606", 1, [["Kitchen side window", 1, 826, 1240]], "phil", "2026-11-10T10:30", "superseded", undefined, undefined, "Width taken inside the glazing bead. Re-measured to the rebate."],
  ["RG-2606", 2, [["Kitchen side window", 1, 862, 1240]], "phil", "2026-11-11T16:40", "submitted", "aoife", undefined],
  ["RG-2615", 1, [["Shop window", 1, 2400, 1650]], "phil", "2026-11-09T08:00", "approved", "aoife", "2026-11-10T08:30"],
  ["RG-2616", 1, [["Wardrobe door", 2, 760, 2200]], "aoife", "2026-11-10T15:00", "approved", "phil", "2026-11-10T17:20"],
  ["RG-2617", 1, [["Front sash, upper", 4, 820, 760], ["Front sash, lower", 4, 820, 780]], "aoife", "2026-11-05T10:00", "submitted", "niamh", undefined],
  ["RG-2618", 1, [["Bedroom 1", 1, 1100, 1200], ["Bedroom 2", 1, 1100, 1200], ["Kitchen", 1, 900, 1000], ["Bathroom", 1, 600, 900]], "phil", "2026-11-02T10:00", "approved", "aoife", "2026-11-02T16:00"],
  ["RG-2619", 1, [["Mirror wall panel", 5, 1200, 2000]], "aoife", "2026-11-03T08:00", "approved", "phil", "2026-11-03T12:00"],
  ["RG-2620", 1, [["Ground floor sash", 6, 780, 740], ["First floor sash", 6, 760, 720]], "aoife", "2026-10-27T10:00", "approved", "niamh", "2026-10-28T11:00"],
  ["RG-2605", 1, [["Front sash, upper", 3, 840, 790], ["Front sash, lower", 3, 840, 810]], "phil", "2026-10-22T09:30", "approved", "aoife", "2026-10-23T10:00"],
  ["RG-2621", 1, [["Patio side", 1, 900, 2100], ["Kitchen", 1, 1200, 1100], ["Utility", 1, 600, 900]], "aoife", "2026-10-30T10:00", "approved", "phil", "2026-10-30T15:00"],
  ["RG-2622", 1, [["Alcove mirror", 1, 1400, 900], ["Glass shelf", 3, 880, 250]], "phil", "2026-11-03T14:00", "approved", "aoife", "2026-11-03T17:00"],
  ["RG-2608", 1, [["Shopfront unit", 1, 2150, 2400]], "phil", "2026-10-26T08:30", "superseded", undefined, undefined, "Handle cut-out added. Toughened glass cannot be cut after toughening."],
  ["RG-2608", 2, [["Shopfront unit, handle cut-out", 1, 2150, 2400]], "phil", "2026-10-28T09:00", "approved", "aoife", "2026-10-29T09:30"],
  ["RG-2623", 1, [["Front door side panel (toughened)", 1, 400, 2050], ["Living room", 1, 1500, 1300], ["Kitchen", 1, 1100, 1000]], "aoife", "2026-10-30T14:00", "approved", "phil", "2026-10-31T09:00"],
  ["RG-2604", 1, [["Hall mirror", 1, 1500, 1000], ["Bedroom mirror", 2, 600, 1800]], "aoife", "2026-10-22T11:00", "approved", "phil", "2026-10-22T16:00"],
  ["RG-2624", 1, [["Front bay left", 1, 700, 1400], ["Front bay right", 1, 700, 1400]], "phil", "2026-11-02T09:00", "approved", "aoife", "2026-11-02T12:00"],
  ["RG-2625", 1, [["Station mirror", 4, 1000, 1200]], "aoife", "2026-11-01T09:00", "approved", "phil", "2026-11-01T11:00"],
  ["RG-2607", 1, [["Gym mirror panel", 8, 1000, 2000]], "phil", "2026-10-20T19:00", "approved", "aoife", "2026-10-21T09:00"],
  ["RG-2590", 1, [["Front", 3, 1000, 1200]], "phil", "2026-10-08T10:00", "approved", "aoife", "2026-10-08T15:00"],
  ["RG-2592", 1, [["Sash", 5, 800, 760]], "aoife", "2026-09-29T10:00", "approved", "niamh", "2026-09-30T10:00"],
  ["RG-2594", 1, [["Shop door pane", 1, 900, 1900]], "phil", "2026-10-14T10:00", "approved", "aoife", "2026-10-14T11:00"],
  ["RG-2596", 1, [["Bathroom mirror", 1, 800, 600]], "aoife", "2026-10-16T10:00", "approved", "phil", "2026-10-16T14:00"],
  ["RG-2598", 1, [["Rear", 2, 1100, 1200]], "phil", "2026-10-20T10:00", "approved", "aoife", "2026-10-20T15:00"]
];

const GLASS: Record<string, [string, string]> = {
  "RG-2602": ["Silver mirror", "6 mm, bevelled 20 mm"],
  "RG-2606": ["Double-glazed unit", "4-16-4 toughened inner, low-E, argon"],
  "RG-2615": ["Laminated float", "6.8 mm laminated, polished edges"],
  "RG-2616": ["Silver mirror", "4 mm safety-backed"],
  "RG-2617": ["Slim double-glazed unit", "3-4-3 slim, heritage putty finish"],
  "RG-2620": ["Slim double-glazed unit", "3-4-3 slim, heritage putty finish"],
  "RG-2605": ["Slim double-glazed unit", "3-4-3 slim, heritage putty finish"],
  "RG-2608": ["Toughened float", "12 mm toughened, handle cut-out per rev 2"],
  "RG-2623": ["Double-glazed unit", "4-16-4, one toughened side panel"]
};

function lineTotal(lines: QuoteLine[]): number {
  return lines.reduce((n, l) => n + l.qty * l.unitCents, 0);
}

/* ── seed builder ─────────────────────────────────────────────────────── */

export function seed(): OpsData {
  const customers: Customer[] = [];
  const sites: Site[] = [];
  const jobs: Job[] = [];
  SPECS.forEach((s, i) => {
    const cid = "C-" + String(101 + i);
    const sid = "S-" + String(101 + i);
    const slug = s.cust.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
    customers.push({ id: cid, name: s.cust, kind: s.kind, contact: s.contact, phone: "087 555 0" + String(101 + i),
      email: slug + "@example.com", siteIds: [sid] });
    sites.push({ id: sid, customerId: cid, address: s.address.split(",")[0], locality: s.locality, zone: s.zone, access: s.access });
    jobs.push({
      id: s.id, brand: s.brand, customerId: cid, siteId: sid, service: s.service, title: s.title, stage: s.stage,
      prodState: s.prod, emergency: !!s.emergency, ownerId: s.owner, enquiryAt: s.enquiry, measuredAt: s.measured,
      indicativeCents: s.indicative, fulfilment: s.supplier ? "supplier" : "in_house", nextAction: s.next,
      nextOwnerId: s.nextOwner, nextDue: s.nextDue, visitMins: s.mins, crewSize: s.crew, skills: s.skills,
      equipment: s.equipment, qualityHold: s.hold, qcAt: s.qc, fittedAt: s.fitted, releasedAt: s.released,
      rackLocation: s.rack, promises: s.promises || [], ledgerNote: s.ledgerNote, historical: s.stage === "completed"
    });
  });

  const quotes: Quote[] = Object.entries(QUOTES).map(([jobId, q]) => ({
    id: q.id, jobId, status: q.status, ownerId: q.owner, createdAt: q.created, sentAt: q.sent, acceptedAt: q.accepted,
    approvedBy: q.approvedBy, xeroRef: "QU-" + q.id.slice(2) + " (mock)",
    lines: q.lines.map(([desc, qty, unit]) => ({ desc, qty, unitCents: E(unit) }))
  }));

  const revisions: MeasurementRevision[] = REVS.map(([jobId, rev, ops, by, at, status, reviewer, reviewedAt, reason]) => {
    const job = jobs.find(j => j.id === jobId)!;
    const g = GLASS[jobId] || (job.service === "Mirrors" ? ["Silver mirror", "6 mm, polished edge"] : ["Double-glazed unit", "4-16-4 float, low-E"]);
    const openings: Opening[] = ops.map(([label, qty, w, h]) => ({ label, qty, widthMm: w, heightMm: h }));
    return {
      id: "MR-" + jobId.slice(3) + "-" + rev, jobId, rev, openings, glassType: g[0], spec: g[1],
      photos: rev === 2 && jobId === "RG-2606" ? ["Rebate close-up (sample)", "Tape at 862 mm (sample)"] : ["Elevation (sample)"],
      access: job.equipment.includes("Step ladder") ? "Ladder access" : "Ground level",
      ladder: job.equipment.includes("Step ladder"), glaziers: job.crewSize || 1,
      notes: reason || (job.service.includes("Heritage") ? "Profile depth recorded for slim unit." : ""),
      measuredBy: by, measuredAt: at, status, reviewerId: reviewer, reviewedAt, reason,
      specialistReview: jobId === "RG-2617" && status === "submitted"
    };
  });

  const invoices: Invoice[] = [
    { id: "INV-501", jobId: "RG-2605", xeroRef: "INV-501 (Xero mock)", totalCents: E(4800), issuedAt: "2026-10-30T12:30", due: null, dueNote: "Balance due on completion" },
    { id: "INV-502", jobId: "RG-2604", xeroRef: "INV-502 (Xero mock)", totalCents: E(2600), issuedAt: "2026-10-26T09:30", due: null, dueNote: "Balance due after fitting" },
    { id: "INV-503", jobId: "RG-2607", xeroRef: "INV-503 (Xero mock)", totalCents: E(3600), issuedAt: "2026-10-22T09:30", due: "2026-11-05", dueNote: "Balance due 5 Nov 2026" },
    { id: "INV-504", jobId: "RG-2608", xeroRef: "INV-504 (Xero mock)", totalCents: E(3000), issuedAt: "2026-10-29T10:30", due: "2026-11-27", dueNote: "Balance due 27 Nov 2026" }
  ];

  const payments: Payment[] = [
    { id: "PAY-9001", source: "Square", externalRef: "SQ-88301", at: "2026-11-04T14:12", amountCents: E(2400), payerRef: "ONEILL DEPOSIT", invoiceId: "INV-501", jobId: "RG-2605", status: "allocated", kind: "deposit" },
    { id: "PAY-9002", source: "Square", externalRef: "SQ-88240", at: "2026-10-27T11:02", amountCents: E(1300), payerRef: "FITZPATRICK", invoiceId: "INV-502", jobId: "RG-2604", status: "allocated", kind: "deposit" },
    { id: "PAY-9003", source: "Square", externalRef: "SQ-88211", at: "2026-10-22T10:20", amountCents: E(1800), payerRef: "HARBOUR FIT", invoiceId: "INV-503", jobId: "RG-2607", status: "allocated", kind: "deposit" },
    { id: "PAY-9004", source: "Bank transfer", externalRef: "XERO-BT-2291", at: "2026-10-30T09:00", amountCents: E(1500), payerRef: "OAKFIELD DEP", invoiceId: "INV-504", jobId: "RG-2608", status: "allocated", kind: "deposit" },
    { id: "PAY-9005", source: "Square", externalRef: "SQ-88355", at: "2026-11-06T12:40", amountCents: E(1200), payerRef: "OAKFIELD", invoiceId: "INV-504", jobId: "RG-2608", status: "allocated", kind: "part" },
    { id: "PAY-9010", source: "Square", externalRef: "SQ-88409", at: "2026-11-11T15:31", amountCents: E(990), payerRef: "FOLEY DEP", quoteId: "Q-3121", jobId: "RG-2621", status: "allocated", kind: "deposit" },
    { id: "PAY-9011", source: "Square", externalRef: "SQ-88412", at: "2026-11-10T13:05", amountCents: E(675), payerRef: "FENELLY MIRR", status: "unmatched", suggestedJobId: "RG-2622", kind: "deposit" },
    { id: "PAY-9012", source: "Square", externalRef: "SQ-88322", at: "2026-11-03T10:15", amountCents: E(1560), payerRef: "HARRINGTON", quoteId: "Q-3123", jobId: "RG-2623", status: "allocated", kind: "deposit" },
    { id: "PAY-9013", source: "Square", externalRef: "SQ-88280", at: "2026-10-29T16:44", amountCents: E(820), payerRef: "QUINN", quoteId: "Q-3124", jobId: "RG-2624", status: "allocated", kind: "deposit" },
    { id: "PAY-9014", source: "Square", externalRef: "SQ-88291", at: "2026-10-30T09:12", amountCents: E(960), payerRef: "CORNER BARBER", quoteId: "Q-3125", jobId: "RG-2625", status: "allocated", kind: "deposit" }
  ];

  const visits: Visit[] = [
    { id: "V-501", jobId: "RG-2604", kind: "fit", date: "2026-11-12", start: "10:00", end: "12:00", crew: ["phil", "sean"], status: "booked" },
    { id: "V-502", jobId: "RG-2613", kind: "measure", date: "2026-11-12", start: "09:30", end: "11:00", crew: ["aoife"], status: "booked" },
    { id: "V-503", jobId: "RG-2606", kind: "check", date: "2026-11-12", start: "12:30", end: "13:30", crew: ["aoife"], status: "booked", note: "Independent re-check of revised width" },
    { id: "V-504", jobId: "RG-2611", kind: "measure", date: "2026-11-12", start: "14:30", end: "15:30", crew: ["aoife"], status: "booked" },
    { id: "V-510", jobId: "RG-2625", kind: "fit", date: "2026-11-13", start: "08:30", end: "10:30", crew: ["aoife", "sean"], status: "booked" },
    { id: "V-511", jobId: "RG-2610", kind: "measure", date: "2026-11-13", start: "14:00", end: "15:00", crew: ["aoife"], status: "booked" },
    { id: "V-512", jobId: "RG-2619", kind: "check", date: "2026-11-13", start: "11:30", end: "12:30", crew: ["phil"], status: "booked", note: "Template check before deposit (customer request)" },
    { id: "V-520", jobId: "RG-2614", kind: "measure", date: "2026-11-16", start: "10:00", end: "11:00", crew: ["niamh"], status: "booked" },
    { id: "V-521", jobId: "RG-2602", kind: "check", date: "2026-11-16", start: "09:00", end: "10:00", crew: ["phil"], status: "booked", note: "Wall survey for fixings" }
  ];
  /* completed historical visits, so timelines and throughput have evidence */
  revisions.filter(r => r.rev === 1).forEach((r, i) => {
    visits.push({ id: "V-4" + String(10 + i), jobId: r.jobId, kind: "measure", date: r.measuredAt.slice(0, 10), start: r.measuredAt.slice(11, 16),
      end: hhmm(minutes(r.measuredAt.slice(11, 16)) + 60), crew: [r.measuredBy], status: "completed" });
  });
  jobs.filter(j => j.fittedAt).forEach((j, i) => {
    visits.push({ id: "V-3" + String(10 + i), jobId: j.id, kind: j.service === "Emergency glazing" ? "emergency" : "fit", date: j.fittedAt!.slice(0, 10),
      start: j.fittedAt!.slice(11, 16), end: String(Number(j.fittedAt!.slice(11, 13)) + 2).padStart(2, "0") + ":00", crew: ["phil", "sean"], status: "completed" });
  });

  const proposals: EmergencyProposal[] = [{
    id: "EP-1", jobId: "RG-2603", status: "pending", crew: ["phil", "sean"], date: "2026-11-12", start: "10:00", end: "12:00",
    priorityReason: "Shopfront pane missing overnight. Premises open to the street and the café opens at 10:00.",
    checklist: [
      { label: "Glass completely smashed or missing", ok: true },
      { label: "Premises unsecured or exposed to weather", ok: true },
      { label: "Loose glass still in frame (safety risk)", ok: true },
      { label: "Priority confirmed by office (07:52)", ok: true }
    ],
    displaced: [{ visitId: "V-501", toDate: "2026-11-12", toStart: "14:00", toEnd: "16:00" }],
    draftId: "D-1", approvalId: "A-2"
  }];

  const productionOrders: ProductionOrder[] = [
    { id: "PO-7105", jobId: "RG-2605", route: "in_house", status: "waiting_release", specRev: 1, ownerId: "mark", blocker: "Office release sign-off missed after deposit cleared on 4 Nov" },
    { id: "PO-7121", jobId: "RG-2621", route: "in_house", status: "waiting_release", specRev: 1, ownerId: "mark", blocker: "Release planned today; all gates clear" },
    { id: "PO-7122", jobId: "RG-2622", route: "in_house", status: "waiting_release", specRev: 1, ownerId: "mark", blocker: "Deposit paid through Square but not allocated" },
    { id: "PO-7108", jobId: "RG-2608", route: "supplier", status: "released", specRev: 2, ownerId: "mark", releasedAt: "2026-10-30T10:00", releasedBy: "danielle" },
    { id: "PO-7123", jobId: "RG-2623", route: "in_house", status: "released", specRev: 1, ownerId: "mark", releasedAt: "2026-11-05T09:00", releasedBy: "danielle" },
    { id: "PO-7104", jobId: "RG-2604", route: "in_house", status: "complete", specRev: 1, ownerId: "mark", releasedAt: "2026-10-28T10:00", releasedBy: "danielle" },
    { id: "PO-7124", jobId: "RG-2624", route: "in_house", status: "complete", specRev: 1, ownerId: "mark", releasedAt: "2026-11-03T09:00", releasedBy: "danielle" },
    { id: "PO-7125", jobId: "RG-2625", route: "in_house", status: "complete", specRev: 1, ownerId: "mark", releasedAt: "2026-11-02T10:00", releasedBy: "danielle" }
  ];
  jobs.filter(j => j.historical).forEach(j => {
    productionOrders.push({ id: "PO-H" + j.id.slice(3), jobId: j.id, route: "in_house", status: "complete", specRev: 1, ownerId: "mark", releasedAt: j.releasedAt, releasedBy: "danielle" });
  });

  const workshopTasks: WorkshopTask[] = [
    { id: "WT-1231", poId: "PO-7123", jobId: "RG-2623", step: "cut", ownerId: "liam", due: "2026-11-10T16:00", status: "done" },
    { id: "WT-1232", poId: "PO-7123", jobId: "RG-2623", step: "assemble", ownerId: "liam", due: "2026-11-12T16:00", status: "doing" },
    { id: "WT-1233", poId: "PO-7123", jobId: "RG-2623", step: "qc", ownerId: "mark", due: "2026-11-13T12:00", status: "todo" },
    { id: "WT-1241", poId: "PO-7124", jobId: "RG-2624", step: "qc", ownerId: "mark", due: "2026-11-11T14:00", status: "done" },
    { id: "WT-1251", poId: "PO-7125", jobId: "RG-2625", step: "qc", ownerId: "mark", due: "2026-11-09T16:00", status: "done" },
    { id: "WT-1041", poId: "PO-7104", jobId: "RG-2604", step: "qc", ownerId: "mark", due: "2026-11-10T15:00", status: "done" }
  ];

  const supplierOrders: SupplierOrder[] = [
    { id: "SO-4402", jobId: "RG-2608", supplierId: "SUP-1", supplierRef: "STP-55871", specRev: 2, orderedAt: "2026-10-30T11:00", expected: "2026-11-13",
      acknowledged: true, ackAt: "2026-10-31T09:20", received: false, qc: false },
    { id: "SO-4407", jobId: "RG-2623", supplierId: "SUP-1", supplierRef: "awaiting", specRev: 1, orderedAt: "2026-11-10T10:00", expected: "2026-11-17",
      acknowledged: false, received: false, qc: false },
    { id: "SO-4399", jobId: "RG-2604", supplierId: "SUP-2", supplierRef: "BEW-2210", specRev: 1, orderedAt: "2026-10-28T12:00", expected: "2026-11-06",
      acknowledged: true, ackAt: "2026-10-28T15:00", received: true, receivedAt: "2026-11-06T10:00", qc: true, qcAt: "2026-11-10T15:00" }
  ];

  const tasks: Task[] = [
    { id: "T-01", title: "Return Emma Murphy's callback and offer a measuring slot", ownerId: "office", due: "2026-11-12T10:00", priority: "High", team: "Office", status: "open", ref: { type: "job", id: "RG-2601" }, source: "Ops Watchdog" },
    { id: "T-02", title: "Approve release of O'Neill Residence to workshop", ownerId: "danielle", due: "2026-11-12T10:00", priority: "High", team: "Office", status: "open", ref: { type: "job", id: "RG-2605" }, source: "Production Coordinator" },
    { id: "T-03", title: "Independent check of Brennan Home revised width", ownerId: "aoife", due: "2026-11-12T15:00", priority: "High", team: "Field glazing", status: "open", ref: { type: "job", id: "RG-2606" }, source: "Phil" },
    { id: "T-04", title: "Chase Kavanagh residence deposit (€2,700)", ownerId: "danielle", due: "2026-11-11T17:00", priority: "Medium", team: "Office", status: "open", ref: { type: "job", id: "RG-2620" }, source: "Finance Follow-up" },
    { id: "T-05", title: "Price laminated pane for Walkinstown Pharmacy", ownerId: "danielle", due: "2026-11-12T17:00", priority: "Medium", team: "Office", status: "open", ref: { type: "job", id: "RG-2615" }, source: "Manual" },
    { id: "T-06", title: "Allocate Square payment SQ-88412 (€675)", ownerId: "office", due: "2026-11-12T12:00", priority: "High", team: "Office", status: "open", ref: { type: "payment", id: "PAY-9011" }, source: "Finance Follow-up" },
    { id: "T-07", title: "Receive and QC toughened unit SO-4402", ownerId: "mark", due: "2026-11-13T12:00", priority: "Medium", team: "Workshop", status: "open", ref: { type: "supplierOrder", id: "SO-4402" }, source: "Production Coordinator" },
    { id: "T-08", title: "Chase supplier acknowledgement for SO-4407", ownerId: "mark", due: "2026-11-12T12:00", priority: "High", team: "Workshop", status: "open", ref: { type: "supplierOrder", id: "SO-4407" }, source: "Production Coordinator" },
    { id: "T-09", title: "Schedule Quinn residence fitting", ownerId: "office", due: "2026-11-13T12:00", priority: "Medium", team: "Office", status: "open", ref: { type: "job", id: "RG-2624" }, source: "Manual" },
    { id: "T-10", title: "Heritage spec sign-off for Corrigan House", ownerId: "niamh", due: "2026-11-13T17:00", priority: "Medium", team: "Specialist studio", status: "open", ref: { type: "job", id: "RG-2617" }, source: "Manual" },
    { id: "T-11", title: "Assemble units for Harrington residence", ownerId: "liam", due: "2026-11-12T16:00", priority: "Medium", team: "Workshop", status: "open", ref: { type: "job", id: "RG-2623" }, source: "Workshop queue" },
    { id: "T-12", title: "Review paper diary migration sample", ownerId: "office", due: "2026-11-16T12:00", priority: "Low", team: "Office", status: "open", ref: { type: "person", id: "office" }, source: "Manual" },
    { id: "T-13", title: "Load mirrors for Fitzpatrick fitting", ownerId: "phil", due: "2026-11-12T09:30", priority: "Medium", team: "Field glazing", status: "done", ref: { type: "job", id: "RG-2604" }, source: "Manual", doneAt: "2026-11-12T08:40" }
  ];

  const approvals: Approval[] = [
    { id: "A-1", kind: "quote_release", title: "Release quote Q-3102 to Cedar Lane Dental (€3,200)", detail: "Measured 6 Nov. Three bevelled wall mirrors plus fitting. Xero draft QU-3102 (mock).",
      ref: { type: "quote", id: "Q-3102" }, jobId: "RG-2602", requestedBy: "Office coordinator", approverId: "danielle", status: "pending", createdAt: "2026-11-11T15:20" },
    { id: "A-2", kind: "emergency_reschedule", title: "Dispatch Phil and Sean to Rowan Street Café; move Fitzpatrick fitting to 14:00", detail: "Emergency make-safe 10:00 to 12:00. Fitzpatrick Home fitting moves to 14:00 to 16:00 today. Customer message drafted.",
      ref: { type: "job", id: "RG-2603" }, jobId: "RG-2603", requestedBy: "Scheduling Assistant", approverId: "danielle", status: "pending", createdAt: "2026-11-12T07:58", agentId: "scheduling" },
    { id: "A-3", kind: "production_release", title: "Release O'Neill Residence (PO-7105) to workshop", detail: "Quote accepted, €2,400 deposit allocated 4 Nov, measurement rev 1 approved. Waiting 6 working days.",
      ref: { type: "job", id: "RG-2605" }, jobId: "RG-2605", requestedBy: "Production Coordinator", approverId: "danielle", status: "pending", createdAt: "2026-11-12T08:10", agentId: "production" },
    { id: "A-4", kind: "measurement_correction", title: "Approve Brennan Home width correction 826 to 862 mm", detail: "Rev 2 submitted by Phil. Independent check assigned to Aoife. Estimated avoidable rework €420 if the original width were used.",
      ref: { type: "job", id: "RG-2606" }, jobId: "RG-2606", requestedBy: "Phil", approverId: "aoife", status: "pending", createdAt: "2026-11-11T16:40" },
    { id: "A-5", kind: "payment_reminder", title: "Send balance reminder to Harbour Fitness (€1,800, 7 days overdue)", detail: "INV-503 balance due 5 Nov. Reminder drafted; nothing sent until approved, and then only in the demo.",
      ref: { type: "draft", id: "D-2" }, jobId: "RG-2607", requestedBy: "Finance Follow-up", approverId: "danielle", status: "pending", createdAt: "2026-11-12T08:15", agentId: "finance" },
    { id: "A-6", kind: "customer_message", title: "Acknowledge Emma Murphy and promise a call by 10:00", detail: "Drafted by Customer Updates from her 08:05 email.",
      ref: { type: "draft", id: "D-3" }, jobId: "RG-2601", requestedBy: "Customer Updates", approverId: "office", status: "pending", createdAt: "2026-11-12T08:20", agentId: "updates" },
    { id: "A-7", kind: "enquiry_merge", title: "Merge duplicate call from Emma Murphy into RG-2601", detail: "Same phone number and surname as the 08:05 email. Suggested by Enquiry Assistant.",
      ref: { type: "job", id: "RG-2601" }, jobId: "RG-2601", requestedBy: "Enquiry Assistant", approverId: "office", status: "pending", createdAt: "2026-11-12T08:46", agentId: "enquiry" },
    { id: "A-0", kind: "quote_release", title: "Release quote Q-3116 to Aisling Ward (€1,180)", detail: "Approved and sent in the demo.",
      ref: { type: "quote", id: "Q-3116" }, jobId: "RG-2616", requestedBy: "Office coordinator", approverId: "danielle", status: "approved", createdAt: "2026-11-10T17:00", decidedAt: "2026-11-11T10:05", decidedBy: "danielle" }
  ];

  const drafts: Draft[] = [
    { id: "D-1", jobId: "RG-2604", customerId: custOf(jobs, "RG-2604"), channel: "SMS", subject: "Revised arrival window today",
      body: "Hi Claire, this is Rathmines Glass. Our fitting team has been called to an emergency this morning, so we need to move your mirror fitting to 14:00 to 16:00 today. Reply here if that does not suit and we will rebook. Sorry for the change.",
      status: "draft", createdBy: "Customer Updates", approvalId: "A-2", createdAt: "2026-11-12T07:59" },
    { id: "D-2", jobId: "RG-2607", customerId: custOf(jobs, "RG-2607"), channel: "Email", subject: "Balance on INV-503",
      body: "Hello, thanks again for choosing Mirrors Dublin for the gym mirror wall. Our records show a balance of €1,800 on invoice INV-503, which was due on 5 November. If it has already been paid, please ignore this note. Otherwise you can pay by card over the phone or by bank transfer quoting INV-503.",
      status: "draft", createdBy: "Finance Follow-up", approvalId: "A-5", createdAt: "2026-11-12T08:15" },
    { id: "D-3", jobId: "RG-2601", customerId: custOf(jobs, "RG-2601"), channel: "Email", subject: "Your measuring visit",
      body: "Hi Emma, sorry for the wait on your measuring visit. We have your enquiry for the three rear units and will call you by 10:00 today with a confirmed date.",
      status: "draft", createdBy: "Customer Updates", approvalId: "A-6", createdAt: "2026-11-12T08:20" }
  ];

  const callbacks: Callback[] = [
    { id: "CB-1", jobId: "RG-2601", customerName: "Emma Murphy", customerId: custOf(jobs, "RG-2601"), reason: "Waiting 18 days for a measure. Wants a date.", due: "2026-11-12T10:00", ownerId: "office", lastContact: "2026-11-12T08:44", status: "open" },
    { id: "CB-2", jobId: "RG-2612", customerName: "Orla Dempsey", customerId: custOf(jobs, "RG-2612"), reason: "Asked for a studio survey date.", due: "2026-11-11T16:00", ownerId: "office", lastContact: "2026-11-10T15:10", status: "open" },
    { id: "CB-3", jobId: "RG-2620", customerName: "Sinéad Kavanagh", customerId: custOf(jobs, "RG-2620"), reason: "Deposit chase, offered card over phone.", due: "2026-11-12T11:00", ownerId: "danielle", lastContact: "2026-11-12T08:31", status: "open" },
    { id: "CB-4", customerName: "Declan Farrell (new caller)", reason: "Bathroom mirror, Ranelagh. Wants a rough price.", due: "2026-11-12T12:00", ownerId: "office", lastContact: "2026-11-12T08:20", status: "open" },
    { id: "CB-5", jobId: "RG-2616", customerName: "Aisling Ward", customerId: custOf(jobs, "RG-2616"), reason: "Quote follow-up.", due: "2026-11-16T10:00", ownerId: "office", lastContact: "2026-11-11T10:05", status: "open" },
    { id: "CB-6", jobId: "RG-2604", customerName: "Claire Fitzpatrick", customerId: custOf(jobs, "RG-2604"), reason: "Confirm fitting time.", due: "2026-11-11T17:00", ownerId: "office", lastContact: "2026-11-11T16:30", status: "done", doneAt: "2026-11-11T16:30", outcome: "Confirmed 10:00 to 12:00." }
  ];

  const interactions: Interaction[] = [
    { id: "IN-1", at: "2026-11-12T07:48", channel: "Phone", brand: "RG", from: "Rowan Street Café", summary: "Front pane smashed overnight, glass missing. Café opens at 10:00.", customerId: custOf(jobs, "RG-2603"), jobId: "RG-2603",
      urgency: "emergency", ownerId: "office", status: "linked", emergencyChecks: { smashedOrMissing: true, securityRisk: true } },
    { id: "IN-2", at: "2026-11-12T08:05", channel: "Email", brand: "RG", from: "Emma Murphy", summary: "Any update on a measuring date? Third time asking.", customerId: custOf(jobs, "RG-2601"), jobId: "RG-2601",
      urgency: "high", ownerId: "office", status: "linked" },
    { id: "IN-3", at: "2026-11-12T08:12", channel: "Email", brand: "MD", from: "Claire Fitzpatrick", summary: "Just confirming you are still coming at 10 today?", customerId: custOf(jobs, "RG-2604"), jobId: "RG-2604",
      urgency: "normal", ownerId: "office", status: "linked" },
    { id: "IN-4", at: "2026-11-12T08:20", channel: "Phone", brand: "MD", from: "Declan Farrell", summary: "New caller. Bathroom mirror for a Ranelagh apartment, wants a rough price.",
      urgency: "normal", ownerId: "office", status: "draft_enquiry" },
    { id: "IN-5", at: "2026-11-12T08:31", channel: "Email", brand: "SG", from: "Sinéad Kavanagh", summary: "Will pay the deposit on Friday, is that ok?", customerId: custOf(jobs, "RG-2620"), jobId: "RG-2620",
      urgency: "normal", ownerId: "danielle", status: "linked" },
    { id: "IN-6", at: "2026-11-12T08:44", channel: "Phone", brand: "RG", from: "Caller 087 555 0101", summary: "Missed call, voicemail: 'It's Emma again about the windows'.",
      dedupeJobId: "RG-2601", dedupeReason: "Same phone number as Emma Murphy (RG-2601) and same topic.", urgency: "high", ownerId: "office", status: "new" },
    { id: "IN-7", at: "2026-11-12T08:50", channel: "Email", brand: "RG", from: "Specialist Toughening Partner", summary: "Order STP-55871 dispatched, delivery to Robinhood 13 Nov.", jobId: "RG-2608",
      urgency: "normal", ownerId: "office", status: "linked" },
    { id: "IN-8", at: "2026-11-12T08:55", channel: "Manual", brand: "RG", from: "Walk-in note (paper)", summary: "Small crack in bedroom window, Terenure. Pane intact, no gap.",
      urgency: "normal", ownerId: "office", status: "draft_enquiry", emergencyChecks: { smashedOrMissing: false, securityRisk: false } }
  ];

  const activity: ActivityEvent[] = SEED_ACTIVITY.map((e, i) => ({ id: "EV-" + String(i + 1).padStart(3, "0"), ...e }));
  const agentRuns: AgentRun[] = SEED_RUNS;

  const paper: PaperRow[] = [
    { id: "PB-1", source: "Office diary, Nov page 41 (sample scan)", status: "needs_review",
      extracted: [{ k: "Customer", v: "Mrs Tierney, Kimmage", confidence: 0.92 }, { k: "Work", v: "2 DG units, kitchen", confidence: 0.78 }, { k: "Date", v: "Tue 17 Nov?", confidence: 0.41 }] },
    { id: "PB-2", source: "Measuring book, entry 112 (sample scan)", status: "needs_review",
      extracted: [{ k: "Opening", v: "Bathroom, 610 x 915", confidence: 0.88 }, { k: "Glass", v: "Obscure 4 mm", confidence: 0.66 }, { k: "Measured by", v: "P.", confidence: 0.54 }] },
    { id: "PB-3", source: "Phone pad, 10 Nov (sample scan)", status: "needs_review",
      extracted: [{ k: "Caller", v: "Fennelly, mirror", confidence: 0.83 }, { k: "Note", v: "Paid by card, ref FENELLY", confidence: 0.71 }] },
    { id: "PB-4", source: "Office diary, Oct page 30 (sample scan)", status: "accepted",
      extracted: [{ k: "Customer", v: "Harbour Fitness", confidence: 0.97 }, { k: "Work", v: "Mirror wall, after 19:00", confidence: 0.9 }] }
  ];

  return {
    version: DATA_VERSION, jobs, customers, sites, revisions, quotes, invoices, payments, visits, proposals, productionOrders,
    workshopTasks, supplierOrders, tasks, approvals, drafts, callbacks, interactions, activity, agentRuns, paper,
    seq: 100, clock: 0, squareImports: 0
  };
}

function custOf(jobs: Job[], jobId: string): string {
  return jobs.find(j => j.id === jobId)!.customerId;
}

export function quoteTotal(q: Quote): number {
  return lineTotal(q.lines);
}

/* ── seed activity: chronological, oldest first ─────────────────────────── */
type SeedEv = Omit<ActivityEvent, "id">;
const SEED_ACTIVITY: SeedEv[] = [
  { at: "2026-11-04T14:12", actorKind: "system", actor: "Simulated Square import", action: "Imported card payment SQ-88301 (€2,400) and allocated it to INV-501", ref: { type: "job", id: "RG-2605" }, refLabel: "RG-2605 O'Neill Residence", source: "Simulated Square import" },
  { at: "2026-11-05T09:00", actorKind: "person", actor: "Danielle", action: "Released Harrington residence to the workshop", ref: { type: "job", id: "RG-2623" }, refLabel: "RG-2623 Harrington residence", source: "Pulse" },
  { at: "2026-11-05T10:00", actorKind: "person", actor: "Aoife Kelly", action: "Submitted measurements for Corrigan House (8 sashes)", ref: { type: "job", id: "RG-2617" }, refLabel: "RG-2617 Corrigan House", source: "Pulse" },
  { at: "2026-11-06T11:00", actorKind: "person", actor: "Aoife Kelly", action: "Submitted measurements for Cedar Lane Dental", ref: { type: "job", id: "RG-2602" }, refLabel: "RG-2602 Cedar Lane Dental", source: "Pulse" },
  { at: "2026-11-06T15:30", actorKind: "person", actor: "Niamh Ryan", action: "Rejected draft sash specification for Corrigan House: profile depth missing", ref: { type: "job", id: "RG-2617" }, refLabel: "RG-2617 Corrigan House", source: "Pulse" },
  { at: "2026-11-09T16:00", actorKind: "person", actor: "Mark Doyle", action: "Completed QC for The Corner Barber mirrors (Rack A4)", ref: { type: "job", id: "RG-2625" }, refLabel: "RG-2625 The Corner Barber", source: "Pulse" },
  { at: "2026-11-10T10:00", actorKind: "person", actor: "Mark Doyle", action: "Ordered toughened side panel from Specialist Toughening Partner (SO-4407)", ref: { type: "job", id: "RG-2623" }, refLabel: "RG-2623 Harrington residence", source: "Pulse" },
  { at: "2026-11-10T10:30", actorKind: "person", actor: "Phil", action: "Submitted measurements for Brennan Home: width 826 mm", ref: { type: "job", id: "RG-2606" }, refLabel: "RG-2606 Brennan Home", source: "Pulse" },
  { at: "2026-11-10T13:05", actorKind: "system", actor: "Simulated Square import", action: "Card payment SQ-88412 (€675, ref FENELLY MIRR) could not be matched; sent to review", ref: { type: "payment", id: "PAY-9011" }, refLabel: "PAY-9011", source: "Simulated Square import" },
  { at: "2026-11-11T10:05", actorKind: "person", actor: "Danielle", action: "Approved quote Q-3116 (€1,180); marked sent in the demo", ref: { type: "job", id: "RG-2616" }, refLabel: "RG-2616 Aisling Ward", source: "Pulse" },
  { at: "2026-11-11T14:00", actorKind: "person", actor: "Mark Doyle", action: "Completed QC for Quinn residence units (Rack B3)", ref: { type: "job", id: "RG-2624" }, refLabel: "RG-2624 Quinn residence", source: "Pulse" },
  { at: "2026-11-11T15:31", actorKind: "system", actor: "Simulated Square import", action: "Allocated SQ-88409 (€990) to accepted quote Q-3121 as deposit", ref: { type: "job", id: "RG-2621" }, refLabel: "RG-2621 Foley residence", source: "Simulated Square import" },
  { at: "2026-11-11T16:40", actorKind: "person", actor: "Phil", action: "Submitted measurement revision 2 for Brennan Home: width 826 to 862 mm", ref: { type: "job", id: "RG-2606" }, refLabel: "RG-2606 Brennan Home", source: "Pulse" },
  { at: "2026-11-11T16:42", actorKind: "person", actor: "Office coordinator", action: "Put Brennan Home on quality hold; assigned independent check to Aoife", ref: { type: "job", id: "RG-2606" }, refLabel: "RG-2606 Brennan Home", source: "Pulse" },
  { at: "2026-11-12T06:00", actorKind: "system", actor: "Simulated Xero sync", action: "Read 4 invoices and 5 allocated payments. No changes written.", source: "Simulated Xero sync" },
  { at: "2026-11-12T06:05", actorKind: "system", actor: "Simulated Square import", action: "Checked 9 card events: 0 new, 1 still unmatched", source: "Simulated Square import" },
  { at: "2026-11-12T07:48", actorKind: "person", actor: "Office coordinator", action: "Logged emergency call from Rowan Street Café", ref: { type: "job", id: "RG-2603" }, refLabel: "RG-2603 Rowan Street Café", source: "Manual call log" },
  { at: "2026-11-12T07:52", actorKind: "person", actor: "Office coordinator", action: "Confirmed emergency priority: glass missing, premises unsecured", ref: { type: "job", id: "RG-2603" }, refLabel: "RG-2603 Rowan Street Café", source: "Pulse" },
  { at: "2026-11-12T07:58", actorKind: "agent", actor: "Scheduling Assistant", action: "Proposed emergency dispatch; would move Fitzpatrick Home fitting to 14:00", ref: { type: "job", id: "RG-2603" }, refLabel: "RG-2603 Rowan Street Café", source: "Demo simulation" },
  { at: "2026-11-12T08:00", actorKind: "agent", actor: "Briefing", action: "Posted the morning briefing", source: "Demo simulation" },
  { at: "2026-11-12T08:10", actorKind: "agent", actor: "Production Coordinator", action: "Flagged O'Neill Residence: paid, gates clear, not released for 6 working days", ref: { type: "job", id: "RG-2605" }, refLabel: "RG-2605 O'Neill Residence", source: "Demo simulation" },
  { at: "2026-11-12T08:15", actorKind: "agent", actor: "Finance Follow-up", action: "Drafted balance reminder for Harbour Fitness (€1,800)", ref: { type: "job", id: "RG-2607" }, refLabel: "RG-2607 Harbour Fitness", source: "Demo simulation" },
  { at: "2026-11-12T08:40", actorKind: "person", actor: "Phil", action: "Loaded mirrors for the Fitzpatrick fitting", ref: { type: "job", id: "RG-2604" }, refLabel: "RG-2604 Fitzpatrick Home", source: "Pulse" },
  { at: "2026-11-12T08:46", actorKind: "agent", actor: "Enquiry Assistant", action: "Suggested merging a missed call into RG-2601 (same number)", ref: { type: "job", id: "RG-2601" }, refLabel: "RG-2601 Emma Murphy", source: "Demo simulation" }
];

const SEED_RUNS: AgentRun[] = [
  { id: "RUN-101", agentId: "briefing", at: "2026-11-12T08:00",
    inputs: ["24 active jobs across 5 stages", "Open callbacks and commitments", "Sample ledger (4 invoices)", "Pending approvals"],
    findings: [
      { text: "8 jobs await measurement and 5 await quotes.", refs: [] },
      { text: "O'Neill Residence has paid €2,400 and waited 6 working days for production release.", refs: [{ type: "job", id: "RG-2605" }] },
      { text: "Harbour Fitness owes €1,800, 7 days overdue.", refs: [{ type: "job", id: "RG-2607" }, { type: "invoice", id: "INV-503" }] },
      { text: "One emergency proposal would move Fitzpatrick Home's fitting.", refs: [{ type: "job", id: "RG-2603" }, { type: "job", id: "RG-2604" }] }
    ], proposed: "No action. Read only.", result: "Posted to Home and the right rail." },
  { id: "RUN-102", agentId: "watchdog", at: "2026-11-12T07:30",
    inputs: ["Callbacks", "Job next actions and due times", "Commitments made to customers"],
    findings: [
      { text: "Emma Murphy was promised a measuring date by 6 Nov and has no visit booked.", refs: [{ type: "job", id: "RG-2601" }] },
      { text: "Orla Dempsey's callback was due 11 Nov 16:00 and is still open.", refs: [{ type: "job", id: "RG-2612" }] },
      { text: "Kavanagh residence deposit chase is a day overdue.", refs: [{ type: "job", id: "RG-2620" }] }
    ], proposed: "Create a callback task for the office. No commitments changed.", result: "Task T-01 created for the Office coordinator." },
  { id: "RUN-103", agentId: "enquiry", at: "2026-11-12T08:46",
    inputs: ["8 inbox items since 07:30", "Customer phone numbers and names"],
    findings: [
      { text: "Missed call at 08:44 matches Emma Murphy's number on RG-2601.", refs: [{ type: "job", id: "RG-2601" }] },
      { text: "Walk-in note describes a small crack with the pane intact: standard priority, not an emergency.", refs: [] }
    ], proposed: "Merge the missed call into RG-2601.", approvalId: "A-7", result: "Waiting for office approval." },
  { id: "RUN-104", agentId: "scheduling", at: "2026-11-12T07:58",
    inputs: ["Emergency RG-2603 needs 2 shopfront glaziers for 2 h", "Booked visits for 12 Nov", "Working hours 08:00 to 17:00", "Travel estimates between areas"],
    findings: [
      { text: "Only Phil and Sean hold the shopfront skill; both are on the Fitzpatrick fitting 10:00 to 12:00.", refs: [{ type: "job", id: "RG-2604" }] },
      { text: "Fitzpatrick fitting fits 14:00 to 16:00 today with 25 min travel from Portobello.", refs: [{ type: "visit", id: "V-501" }] }
    ], proposed: "Dispatch Phil and Sean to RG-2603 at 10:00 and move the Fitzpatrick fitting to 14:00.", approvalId: "A-2", result: "Waiting for office approval." },
  { id: "RUN-105", agentId: "production", at: "2026-11-12T08:10",
    inputs: ["Production orders", "Deposit allocations", "Measurement revisions", "Supplier acknowledgements"],
    findings: [
      { text: "PO-7105 (O'Neill) passes every gate and has waited 6 working days.", refs: [{ type: "job", id: "RG-2605" }] },
      { text: "PO-7122 (Fennelly) cannot release: deposit payment not allocated.", refs: [{ type: "job", id: "RG-2622" }, { type: "payment", id: "PAY-9011" }] },
      { text: "SO-4407 not acknowledged by the supplier after 47 hours.", refs: [{ type: "supplierOrder", id: "SO-4407" }] }
    ], proposed: "Request release approval for PO-7105.", approvalId: "A-3", result: "Waiting for Danielle." },
  { id: "RUN-106", agentId: "updates", at: "2026-11-12T08:20",
    inputs: ["Inbox emails since 08:00", "Open callbacks"],
    findings: [{ text: "Emma Murphy emailed a third time asking for a date.", refs: [{ type: "job", id: "RG-2601" }] }],
    proposed: "Send an acknowledgement promising a call by 10:00.", approvalId: "A-6", result: "Draft waiting for office review." },
  { id: "RUN-107", agentId: "finance", at: "2026-11-12T08:15",
    inputs: ["Sample ledger: 4 invoices, €14,000", "9 card events from the simulated Square import"],
    findings: [
      { text: "INV-503 (Harbour Fitness) has €1,800 outstanding, 7 days overdue.", refs: [{ type: "invoice", id: "INV-503" }] },
      { text: "SQ-88412 (€675) is unmatched; reference suggests Fennelly residence.", refs: [{ type: "payment", id: "PAY-9011" }, { type: "job", id: "RG-2622" }] }
    ], proposed: "Draft a reminder to Harbour Fitness.", approvalId: "A-5", result: "Draft waiting for Danielle." }
];

/* ── previous-business-day contact sample (Wed 11 Nov 2026) ──────────────── */
/* 200 phone + 50 email interactions across 34 enquiry conversations. Fictional
   rows sized to the reported daily volume; not real call logs. */
export function contactSample(): ContactSampleRow[] {
  const rnd = mulberry(20261111);
  const convs: { id: string; label: string; weight: number; kind: ContactSampleRow["kind"] }[] = [];
  const named: [string, number, ContactSampleRow["kind"]][] = [
    ["Emma Murphy (RG-2601)", 9, "Status check"], ["Sinéad Kavanagh (RG-2620)", 6, "Payment query"], ["Orla Dempsey (RG-2612)", 7, "Status check"],
    ["Cedar Lane Dental (RG-2602)", 5, "Quote follow-up"], ["Ciarán Lynch (RG-2609)", 6, "Status check"], ["Gallagher residence (RG-2613)", 5, "Booking change"],
    ["Fitzpatrick Home (RG-2604)", 4, "Booking change"], ["Brennan Home (RG-2606)", 5, "Status check"], ["Walkinstown Pharmacy (RG-2615)", 6, "Quote follow-up"],
    ["Aisling Ward (RG-2616)", 3, "Quote follow-up"], ["Corrigan House (RG-2617)", 4, "Quote follow-up"], ["Moran residence (RG-2618)", 4, "Payment query"],
    ["Studio Ten Yoga (RG-2619)", 5, "Booking change"], ["O'Neill Residence (RG-2605)", 6, "Status check"], ["Foley residence (RG-2621)", 3, "Payment query"],
    ["Fennelly residence (RG-2622)", 4, "Payment query"], ["Oakfield Shopfront (RG-2608)", 5, "Status check"], ["Harrington residence (RG-2623)", 3, "Status check"],
    ["Quinn residence (RG-2624)", 4, "Booking change"], ["The Corner Barber (RG-2625)", 3, "Booking change"], ["Harbour Fitness (RG-2607)", 2, "Payment query"],
    ["Hughes family (RG-2610)", 4, "Booking change"], ["Kimmage Physio Clinic (RG-2611)", 3, "Booking change"], ["Byrne-Keogh household (RG-2614)", 3, "New enquiry"],
    ["Whelan residence (RG-2598)", 2, "Payment query"], ["Power residence (RG-2596)", 1, "Payment query"]
  ];
  named.forEach(([label, weight, kind], i) => convs.push({ id: "CV-" + String(i + 1).padStart(2, "0"), label, weight, kind }));
  ["Prospect: bathroom mirror, Ranelagh", "Prospect: shop door glass, Crumlin", "Prospect: sash windows, Rathmines", "Prospect: glass splashback, Terenure",
   "Prospect: conservatory roof panel, Tallaght", "Prospect: gym mirrors, Dún Laoghaire", "Prospect: broken patio door, Drimnagh", "Prospect: stained glass door, Dublin 8"]
    .forEach((label, i) => convs.push({ id: "CV-" + String(27 + i), label, weight: 2 + (i % 3), kind: i === 6 ? "Emergency" : "New enquiry" }));

  const totalWeight = convs.reduce((n, c) => n + c.weight, 0);
  const pick = () => {
    let r = rnd() * totalWeight;
    for (const c of convs) { r -= c.weight; if (r <= 0) return c; }
    return convs[convs.length - 1];
  };
  const rows: ContactSampleRow[] = [];
  const kinds: ContactSampleRow["kind"][] = ["Status check", "Status check", "Booking change", "Quote follow-up", "Payment query"];
  for (let i = 0; i < 250; i++) {
    const channel: "Phone" | "Email" = i < 200 ? "Phone" : "Email";
    const c = i < convs.length ? convs[i] : pick();
    const mins = 8 * 60 + Math.floor(rnd() * (9.5 * 60));
    const first = i < convs.length;
    rows.push({ id: "CS-" + String(i + 1).padStart(3, "0"), at: "2026-11-11T" + String(Math.floor(mins / 60)).padStart(2, "0") + ":" + String(mins % 60).padStart(2, "0"),
      channel, conversation: c.id, label: c.label,
      kind: first ? c.kind : (c.kind === "New enquiry" || c.kind === "Emergency" ? "Status check" : kinds[Math.floor(rnd() * kinds.length)]) });
  }
  return rows.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

export const CONTACT_SAMPLE = contactSample();

export const INTEGRATION_CARDS = [
  { id: "xero", name: "Xero", role: "Quotes, invoices and accounting", status: "Simulated read", detail: "Authoritative for quote and invoice references in this demo. Reads are simulated; any change is a reviewed draft. No two-way sync is claimed.", tone: "accent" },
  { id: "square", name: "Square", role: "Card payments", status: "Simulated import", detail: "Card events map to Xero invoices through allocation records. Unmatched events go to review. Re-importing never double-counts.", tone: "accent" },
  { id: "email", name: "Email", role: "Inbox and drafts", status: "Simulated inbox", detail: "Provider not specified on the call, so none is assumed. Drafts are reviewed and never delivered from the demo.", tone: "neutral" },
  { id: "phone", name: "Telephone", role: "Call capture", status: "Manual logging", detail: "Calls are logged by hand or through the mock intake form. No telephony provider is connected.", tone: "neutral" },
  { id: "paper", name: "Paper books and diaries", role: "Migration", status: "Sample queue", detail: "Four sample scans with extracted fields and confidence for human review. Historical paper has not been digitised.", tone: "neutral" },
  { id: "gtasks", name: "Google Tasks", role: "Task list", status: "Previously trialled", detail: "Tried and abandoned according to the call. Not connected, not in use.", tone: "neutral" },
  { id: "altpay", name: "Alternative payment provider", role: "Card payments", status: "Under consideration, provider unconfirmed", detail: "Mentioned on the call; the name was unclear. Fees quoted on the call are unverified, so no saving is calculated and no migration is shown.", tone: "neutral" }
] as const;
