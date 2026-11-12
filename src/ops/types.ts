/* Rathmines Glass demo: domain types for the central fixture store.
   Money is always integer cents. Times are "YYYY-MM-DDTHH:MM" local Europe/Dublin
   (UTC+0 in November, so the scenario never crosses a DST boundary). */

export type Cents = number;
export type Iso = string;

export type BrandId = "RG" | "MD" | "SG";
export type BrandFilter = "ALL" | BrandId;

export type PersonId = "danielle" | "office" | "phil" | "sean" | "aoife" | "mark" | "liam" | "niamh";
export type TeamName = "Office" | "Field glazing" | "Workshop" | "Specialist studio";
export type Skill = "survey" | "glazing" | "mirror" | "shopfront" | "heritage" | "workshop" | "stained";

export interface Person {
  id: PersonId;
  name: string;
  role: string;
  team: TeamName;
  email: string;
  initials: string;
  provenance: string;
  skills: Skill[];
  roleKey: "management" | "office" | "field" | "workshop";
}

export type CustomerKind = "Homeowner" | "Retail / hospitality" | "Office" | "Contractor" | "Heritage property" | "Mirror customer";

export interface Customer {
  id: string;
  name: string;
  kind: CustomerKind;
  contact: string;
  phone: string;
  email: string;
  siteIds: string[];
}

export interface Site {
  id: string;
  customerId: string;
  address: string;
  locality: string;
  zone: Zone;
  access: string;
}

export type Zone = "D6" | "D8" | "D12" | "D14" | "D24" | "D4";

export type Stage = "awaiting_measure" | "awaiting_quote" | "awaiting_deposit" | "production" | "ready_to_fit" | "completed";
export type ProdState = "waiting_release" | "in_progress";
export type Fulfilment = "in_house" | "supplier";

export interface Job {
  id: string;
  brand: BrandId;
  customerId: string;
  siteId: string;
  service: string;
  title: string;
  stage: Stage;
  prodState?: ProdState;
  emergency: boolean;
  ownerId: PersonId;
  enquiryAt: Iso;
  measuredAt?: Iso;
  indicativeCents?: Cents;
  fulfilment: Fulfilment;
  nextAction: string;
  nextOwnerId: PersonId;
  nextDue: Iso;
  /* what the next site visit needs */
  visitMins: number;
  crewSize: number;
  skills: Skill[];
  equipment: string[];
  qualityHold?: string;
  qcAt?: Iso;
  fittedAt?: Iso;
  releasedAt?: Iso;
  rackLocation?: string;
  promises: { text: string; due: Iso; resolved?: boolean }[];
  ledgerNote?: string;
  historical?: boolean;
}

export interface Opening {
  label: string;
  qty: number;
  widthMm: number;
  heightMm: number;
}

export type RevisionStatus = "submitted" | "approved" | "rejected" | "superseded";

export interface MeasurementRevision {
  id: string;
  jobId: string;
  rev: number;
  openings: Opening[];
  glassType: string;
  spec: string;
  photos: string[];
  access: string;
  ladder: boolean;
  glaziers: number;
  notes: string;
  measuredBy: PersonId;
  measuredAt: Iso;
  status: RevisionStatus;
  reviewerId?: PersonId;
  reviewedAt?: Iso;
  reason?: string;
  specialistReview?: boolean;
}

export type QuoteStatus = "measured_awaiting_price" | "draft" | "awaiting_approval" | "sent" | "accepted";

export interface QuoteLine {
  desc: string;
  qty: number;
  unitCents: Cents;
}

export interface Quote {
  id: string;
  jobId: string;
  status: QuoteStatus;
  lines: QuoteLine[];
  xeroRef: string;
  ownerId: PersonId;
  createdAt: Iso;
  sentAt?: Iso;
  acceptedAt?: Iso;
  approvedBy?: PersonId;
}

export interface Invoice {
  id: string;
  jobId: string;
  xeroRef: string;
  totalCents: Cents;
  issuedAt: Iso;
  due: Iso | null;
  dueNote: string;
}

export type PaymentSource = "Square" | "Bank transfer";

export interface Payment {
  id: string;
  source: PaymentSource;
  externalRef: string;
  at: Iso;
  amountCents: Cents;
  payerRef: string;
  /* allocation: to a Xero invoice, or to an accepted quote before invoicing */
  invoiceId?: string;
  quoteId?: string;
  jobId?: string;
  status: "allocated" | "unmatched";
  suggestedJobId?: string;
  kind: "deposit" | "balance" | "part";
}

export type VisitKind = "measure" | "fit" | "emergency" | "check";

export interface Visit {
  id: string;
  jobId: string;
  kind: VisitKind;
  date: string;
  start: string;
  end: string;
  crew: PersonId[];
  status: "booked" | "completed" | "cancelled";
  note?: string;
}

export interface EmergencyProposal {
  id: string;
  jobId: string;
  status: "pending" | "approved" | "rejected";
  crew: PersonId[];
  date: string;
  start: string;
  end: string;
  priorityReason: string;
  checklist: { label: string; ok: boolean }[];
  displaced: { visitId: string; toDate: string; toStart: string; toEnd: string }[];
  draftId: string;
  approvalId: string;
}

export type POStatus = "waiting_release" | "released" | "complete";

export interface ProductionOrder {
  id: string;
  jobId: string;
  route: Fulfilment;
  status: POStatus;
  specRev: number;
  ownerId: PersonId;
  releasedAt?: Iso;
  releasedBy?: PersonId;
  blocker?: string;
}

export type WorkshopStep = "cut" | "assemble" | "qc";

export interface WorkshopTask {
  id: string;
  poId: string;
  jobId: string;
  step: WorkshopStep;
  ownerId: PersonId;
  due: Iso;
  status: "todo" | "doing" | "done";
}

export interface Supplier {
  id: string;
  name: string;
  speciality: string;
  contact: string;
  email: string;
  provenance: string;
}

export interface SupplierOrder {
  id: string;
  jobId: string;
  supplierId: string;
  supplierRef: string;
  specRev: number;
  orderedAt: Iso;
  expected: string;
  acknowledged: boolean;
  ackAt?: Iso;
  received: boolean;
  receivedAt?: Iso;
  qc: boolean;
  qcAt?: Iso;
}

export type Priority = "High" | "Medium" | "Low";

export interface EntityRef {
  type: "job" | "customer" | "quote" | "invoice" | "supplier" | "person" | "payment" | "visit" | "approval" | "task" | "draft" | "supplierOrder";
  id: string;
}

export interface Task {
  id: string;
  title: string;
  ownerId: PersonId;
  due: Iso;
  priority: Priority;
  team: TeamName;
  status: "open" | "done";
  ref: EntityRef;
  source: string;
  doneAt?: Iso;
}

export type ApprovalKind =
  | "quote_release"
  | "emergency_reschedule"
  | "measurement_correction"
  | "customer_message"
  | "production_release"
  | "payment_reminder"
  | "enquiry_merge";

export interface Approval {
  id: string;
  kind: ApprovalKind;
  title: string;
  detail: string;
  ref: EntityRef;
  jobId?: string;
  requestedBy: string;
  approverId: PersonId;
  status: "pending" | "approved" | "rejected";
  createdAt: Iso;
  decidedAt?: Iso;
  decidedBy?: PersonId;
  agentId?: string;
  outcome?: string;
}

export interface Draft {
  id: string;
  jobId: string;
  customerId: string;
  channel: "Email" | "SMS";
  subject: string;
  body: string;
  status: "draft" | "sent_demo" | "discarded";
  createdBy: string;
  approvalId?: string;
  createdAt: Iso;
}

export interface Callback {
  id: string;
  jobId?: string;
  customerName: string;
  customerId?: string;
  reason: string;
  due: Iso;
  ownerId: PersonId;
  lastContact: Iso;
  status: "open" | "done";
  doneAt?: Iso;
  outcome?: string;
}

export type Channel = "Phone" | "Email" | "Manual";

export interface Interaction {
  id: string;
  at: Iso;
  channel: Channel;
  brand: BrandId;
  from: string;
  summary: string;
  customerId?: string;
  jobId?: string;
  dedupeJobId?: string;
  dedupeReason?: string;
  urgency: "emergency" | "high" | "normal";
  ownerId: PersonId;
  status: "new" | "linked" | "merged" | "draft_enquiry" | "converted";
  emergencyChecks?: { smashedOrMissing: boolean; securityRisk: boolean };
}

export interface ContactSampleRow {
  id: string;
  at: Iso;
  channel: "Phone" | "Email";
  conversation: string;
  label: string;
  kind: "New enquiry" | "Status check" | "Quote follow-up" | "Booking change" | "Payment query" | "Emergency";
}

export interface ActivityEvent {
  id: string;
  at: Iso;
  actorKind: "person" | "agent" | "system";
  actor: string;
  action: string;
  ref?: EntityRef;
  refLabel?: string;
  source: string;
}

export interface AgentRun {
  id: string;
  agentId: string;
  at: Iso;
  inputs: string[];
  findings: { text: string; refs: EntityRef[] }[];
  proposed: string;
  approvalId?: string;
  result: string;
}

export interface PaperRow {
  id: string;
  source: string;
  extracted: { k: string; v: string; confidence: number }[];
  status: "needs_review" | "accepted" | "rejected";
}

export interface OpsData {
  version: number;
  jobs: Job[];
  customers: Customer[];
  sites: Site[];
  revisions: MeasurementRevision[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  visits: Visit[];
  proposals: EmergencyProposal[];
  productionOrders: ProductionOrder[];
  workshopTasks: WorkshopTask[];
  supplierOrders: SupplierOrder[];
  tasks: Task[];
  approvals: Approval[];
  drafts: Draft[];
  callbacks: Callback[];
  interactions: Interaction[];
  activity: ActivityEvent[];
  agentRuns: AgentRun[];
  paper: PaperRow[];
  seq: number;
  clock: number;
  squareImports: number;
}
