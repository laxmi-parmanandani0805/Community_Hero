import Database from "better-sqlite3";
import path from "path";

// Initialize SQL database (persisted to reports.db)
const dbPath = path.resolve(process.cwd(), "reports.db");
export const db = new Database(dbPath);

// Enable WAL mode for performance
db.pragma("journal_mode = WAL");

export interface TriageLogs {
  timestamp: string;
  step: string;
  detail: string;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  imageDescription?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  createdAt: string;
  status: "Pending" | "Assigned" | "Resolved" | "Spam";
  is_valid: boolean;
  category: "Pothole" | "Water Leakage" | "Waste Management" | "Streetlight" | "Public Safety" | "Other";
  severity: "Low" | "Medium" | "Critical";
  headline: string;
  actionable_summary: string;
  assigned_department: string;
  requires_immediate_action: boolean;
  notes?: string;
  logs: TriageLogs[];
  estimated_completion_days?: number;
  citizen_name?: string;
  citizen_contact?: string;
  assigned_worker_id?: string;
  citizen_id?: string;
  triage_reasoning?: string;
  predictive_maintenance_alert?: string;
  vouch_count?: number;
  priority_score?: number;
  task_checklist?: string;
}

export interface Worker {
  id: string;
  name: string;
  contact: string;
  department: string;
  availability: "Available" | "Busy";
  latitude?: number;
  longitude?: number;
  score?: number;
}

export interface Citizen {
  id: string;
  name: string;
  contact: string;
  latitude?: number;
  longitude?: number;
  reported_issue_text?: string;
  civic_impact_score?: number;
}

// Ensure tables exist
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      imageDescription TEXT,
      imageUrl TEXT,
      latitude REAL,
      longitude REAL,
      address TEXT,
      createdAt TEXT NOT NULL,
      status TEXT NOT NULL,
      is_valid INTEGER NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      headline TEXT NOT NULL,
      actionable_summary TEXT NOT NULL,
      assigned_department TEXT NOT NULL,
      requires_immediate_action INTEGER NOT NULL,
      notes TEXT,
      estimated_completion_days INTEGER,
      citizen_name TEXT,
      citizen_contact TEXT,
      assigned_worker_id TEXT,
      citizen_id TEXT,
      triage_reasoning TEXT,
      predictive_maintenance_alert TEXT,
      vouch_count INTEGER DEFAULT 0,
      priority_score INTEGER DEFAULT 1,
      task_checklist TEXT
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reportId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      step TEXT NOT NULL,
      detail TEXT NOT NULL,
      FOREIGN KEY (reportId) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      department TEXT NOT NULL,
      availability TEXT NOT NULL,
      latitude REAL,
      longitude REAL
    );

    CREATE TABLE IF NOT EXISTS citizens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT NOT NULL UNIQUE,
      latitude REAL,
      longitude REAL,
      reported_issue_text TEXT,
      civic_impact_score INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_logs_reportId ON logs(reportId);
  `);

  // Run dynamic schema migrations to ensure columns exist in existing reports.db
  const migrations = [
    "ALTER TABLE reports ADD COLUMN estimated_completion_days INTEGER;",
    "ALTER TABLE reports ADD COLUMN citizen_name TEXT;",
    "ALTER TABLE reports ADD COLUMN citizen_contact TEXT;",
    "ALTER TABLE reports ADD COLUMN assigned_worker_id TEXT;",
    "ALTER TABLE reports ADD COLUMN citizen_id TEXT;",
    "ALTER TABLE reports ADD COLUMN triage_reasoning TEXT;",
    "ALTER TABLE reports ADD COLUMN predictive_maintenance_alert TEXT;",
    "ALTER TABLE reports ADD COLUMN vouch_count INTEGER DEFAULT 0;",
    "ALTER TABLE reports ADD COLUMN priority_score INTEGER DEFAULT 1;",
    "ALTER TABLE reports ADD COLUMN task_checklist TEXT;",
    "ALTER TABLE citizens ADD COLUMN civic_impact_score INTEGER DEFAULT 0;",
    "ALTER TABLE workers ADD COLUMN latitude REAL;",
    "ALTER TABLE workers ADD COLUMN longitude REAL;",
    "ALTER TABLE workers ADD COLUMN score INTEGER DEFAULT 0;"
  ];

  for (const query of migrations) {
    try {
      db.exec(query);
    } catch (err) {
      // Column might already exist, which is expected and can be ignored
    }
  }

  // Seed workers if table is empty
  const workersCount = (db.prepare("SELECT COUNT(*) as count FROM workers").get() as any).count;
  if (workersCount === 0) {
    console.log("[DB] Seeding mock department workers directory...");
    const seedWorkers = [
      { id: "wk_1", name: "John Doe", contact: "+1-555-0101", department: "Pothole", availability: "Available", latitude: 37.7701, longitude: -122.4212 },
      { id: "wk_2", name: "Sarah Jenkins", contact: "+1-555-0102", department: "Pothole", availability: "Available", latitude: 37.7825, longitude: -122.4150 },
      { id: "wk_3", name: "Mario Bros", contact: "+1-555-0201", department: "Water Leakage", availability: "Available", latitude: 37.7752, longitude: -122.4230 },
      { id: "wk_4", name: "Luigi Bros", contact: "+1-555-0202", department: "Water Leakage", availability: "Available", latitude: 37.7680, longitude: -122.4090 },
      { id: "wk_5", name: "Oscar Trash", contact: "+1-555-0301", department: "Waste Management", availability: "Available", latitude: 37.7831, longitude: -122.4011 },
      { id: "wk_6", name: "Gary Green", contact: "+1-555-0302", department: "Waste Management", availability: "Available", latitude: 37.7715, longitude: -122.4110 },
      { id: "wk_7", name: "Thomas Edison", contact: "+1-555-0401", department: "Streetlight", availability: "Available", latitude: 37.7790, longitude: -122.4310 },
      { id: "wk_8", name: "Nikola Tesla", contact: "+1-555-0402", department: "Streetlight", availability: "Available", latitude: 37.7620, longitude: -122.4200 },
      { id: "wk_9", name: "Officer Chen", contact: "+1-555-0501", department: "Public Safety", availability: "Available", latitude: 37.7740, longitude: -122.4400 },
      { id: "wk_10", name: "Sheriff Carter", contact: "+1-555-0502", department: "Public Safety", availability: "Available", latitude: 37.7850, longitude: -122.4100 }
    ];

    const insertWorker = db.prepare(`
      INSERT INTO workers (id, name, contact, department, availability, latitude, longitude)
      VALUES (@id, @name, @contact, @department, @availability, @latitude, @longitude)
    `);

    db.transaction(() => {
      for (const wk of seedWorkers) {
        insertWorker.run(wk);
      }
    })();
  }

  // If reports table is empty, seed initial records to guarantee a fully populated screen
  const count = (db.prepare("SELECT COUNT(*) as count FROM reports").get() as any).count;
  if (count === 0) {
    console.log("[DB] Seeding initial SQL database with sample dispatches...");
    
    const initialReports = [
      {
        id: "rep_1",
        title: "Large deep pothole on West End Ave",
        description: "There is a massive pothole in the middle lane of West End Ave, right outside the pharmacy. Already saw two cars swerve dangerously to avoid it and one hit it, making a loud thud.",
        createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        status: "Pending",
        is_valid: 1,
        category: "Pothole",
        severity: "Medium",
        headline: "Dangerous Mid-lane Pothole on West End Ave",
        actionable_summary: "Repair deep pothole in the middle traffic lane outside the pharmacy to prevent vehicle damage and swerving hazards.",
        assigned_department: "Department of Public Works",
        requires_immediate_action: 0,
        notes: "Work order crew dispatched to fill with hot-mix asphalt.",
        citizen_name: "Eleanor Vance",
        citizen_contact: "+1-555-9001",
        assigned_worker_id: null,
        logs: [
          { timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), step: "Submission", detail: "Report submitted by resident." },
          { timestamp: new Date(Date.now() - 35.8 * 3600 * 1000).toISOString(), step: "AI Triage", detail: "Validated. Classified as Pothole, Medium severity. Assigned to Department of Public Works." }
        ]
      },
      {
        id: "rep_2",
        title: "Burst water main flooding Elm Street",
        description: "Water is bubbling up rapidly from under the asphalt on 400 block of Elm Street. The whole street is flooding and water is starting to pool near shop doors. The sidewalk is completely submerged.",
        latitude: 37.7749,
        longitude: -122.4194,
        address: "400 Elm St, Civic Center",
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        status: "Assigned",
        is_valid: 1,
        category: "Water Leakage",
        severity: "Critical",
        headline: "Active Water Main Break Flooding 400 Block Elm St",
        actionable_summary: "Shut off water main, dig up damaged section under the street, and replace the broken pipe to stop flooding and prevent commercial property damage.",
        assigned_department: "Water & Utilities Department",
        requires_immediate_action: 1,
        notes: "Utility emergency shutoff completed. Pipe replaced and road temporarily patched.",
        citizen_name: "Marcus Aurelius",
        citizen_contact: "+1-555-9002",
        assigned_worker_id: "wk_3",
        logs: [
          { timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), step: "Submission", detail: "Emergency water main break reported." },
          { timestamp: new Date(Date.now() - 3.9 * 3600 * 1000).toISOString(), step: "AI Triage", detail: "Validated. Classified as Water Leakage, Critical severity. Flagged for Immediate Action. Assigned to Water & Utilities Department." },
          { timestamp: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(), step: "Dispatched", detail: "Emergency repair crew assigned and dispatched." }
        ]
      },
      {
        id: "rep_3",
        title: "Cheap weight loss pills advertisement",
        description: "Lose 10 pounds in 3 days! Natural herbal remedies. Visit quickslim-miracle.com for special discount coupons or call 1-800-FAST-SLIM right now!!",
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        status: "Spam",
        is_valid: 0,
        category: "Other",
        severity: "Low",
        headline: "Spam / Commercial Advertisement",
        actionable_summary: "No action required. Commercial advertisement post detected.",
        assigned_department: "Moderation Queue",
        requires_immediate_action: 0,
        notes: "Auto-filtered by AI triage system.",
        citizen_name: "Bot Spammer",
        citizen_contact: "None",
        assigned_worker_id: null,
        logs: [
          { timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), step: "Submission", detail: "Report submitted." },
          { timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), step: "AI Triage", detail: "Flagged as Spam/Unrelated. Filtered out from public feeds." }
        ]
      },
      {
        id: "rep_4",
        title: "Broken streetlight in high-pedestrian alleyway",
        description: "The streetlamp at the corner of Oak Lane & 8th Street is completely dead. The bulb looks smashed. This alleyway is heavily used by students coming home at night, and it is pitch black. Extremely dangerous and dark.",
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        status: "Pending",
        is_valid: 1,
        category: "Streetlight",
        severity: "Medium",
        headline: "Smashed Streetlight in Dark High-Pedestrian Alleyway",
        actionable_summary: "Replace smashed bulb/luminaire on lamp post at Oak Lane & 8th Street to restore visibility and public safety.",
        assigned_department: "Bureau of Street Lighting",
        requires_immediate_action: 0,
        notes: "",
        citizen_name: "Chloe Price",
        citizen_contact: "+1-555-9004",
        assigned_worker_id: null,
        logs: [
          { timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), step: "Submission", detail: "Report submitted." },
          { timestamp: new Date(Date.now() - 1.9 * 3600 * 1000).toISOString(), step: "AI Triage", detail: "Validated. Classified as Streetlight, Medium severity. Assigned to Bureau of Street Lighting." }
        ]
      },
      {
        id: "rep_5",
        title: "Illegal mattress and trash dumping in alleyway",
        description: "Someone dumped two large mattresses and about 6 black bags of household garbage right in front of the emergency exit of the community theater on Maple Lane. It blocks the doorway completely.",
        latitude: 37.7801,
        longitude: -122.4122,
        address: "120 Maple Lane (behind Community Theater)",
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        status: "Resolved",
        is_valid: 1,
        category: "Waste Management",
        severity: "Medium",
        headline: "Illegal Dumping of Mattresses and Trash Blocking Emergency Exit",
        actionable_summary: "Clear bulk rubbish (mattresses) and trash bags blocking the theater emergency egress door to restore safety codes.",
        assigned_department: "Department of Sanitation",
        requires_immediate_action: 0,
        notes: "Sanitation heavy-duty pickup crew cleared the alleyway.",
        citizen_name: "Arthur Pendragon",
        citizen_contact: "+1-555-9005",
        assigned_worker_id: "wk_5",
        logs: [
          { timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), step: "Submission", detail: "Illegal dumping reported." },
          { timestamp: new Date(Date.now() - 47.9 * 3600 * 1000).toISOString(), step: "AI Triage", detail: "Validated. Classified as Waste Management, Medium severity. Assigned to Department of Sanitation." },
          { timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), step: "Resolution", detail: "Sanitation crew cleared all debris. Emergency exit door unblocked. Marked as Resolved." }
        ]
      }
    ];

    // Seed citizens if table is empty
    const citizensCount = (db.prepare("SELECT COUNT(*) as count FROM citizens").get() as any).count;
    if (citizensCount === 0) {
      console.log("[DB] Seeding mock citizens directory...");
      const initialCitizens = [
        { id: "cit_1", name: "Eleanor Vance", contact: "+1-555-9001", latitude: 37.7749, longitude: -122.4194, reported_issue_text: "Large deep pothole on West End Ave" },
        { id: "cit_2", name: "Marcus Aurelius", contact: "+1-555-9002", latitude: 37.7749, longitude: -122.4194, reported_issue_text: "Burst water main flooding Elm Street" },
        { id: "cit_3", name: "Bot Spammer", contact: "None", latitude: null, longitude: null, reported_issue_text: "Cheap weight loss pills advertisement" },
        { id: "cit_4", name: "Chloe Price", contact: "+1-555-9004", latitude: 37.7699, longitude: -122.4468, reported_issue_text: "Broken streetlight in high-pedestrian alleyway" },
        { id: "cit_5", name: "Arthur Pendragon", contact: "+1-555-9005", latitude: 37.7801, longitude: -122.4122, reported_issue_text: "Illegal mattress and trash dumping in alleyway" }
      ];
      const insertCitizen = db.prepare(`
        INSERT INTO citizens (id, name, contact, latitude, longitude, reported_issue_text)
        VALUES (@id, @name, @contact, @latitude, @longitude, @reported_issue_text)
      `);
      db.transaction(() => {
        for (const cit of initialCitizens) {
          insertCitizen.run(cit);
        }
      })();
    }

    const insertReport = db.prepare(`
      INSERT INTO reports (
        id, title, description, imageDescription, imageUrl, latitude, longitude, address,
        createdAt, status, is_valid, category, severity, headline, actionable_summary,
        assigned_department, requires_immediate_action, notes, estimated_completion_days,
        citizen_name, citizen_contact, assigned_worker_id, citizen_id
      ) VALUES (
        @id, @title, @description, @imageDescription, @imageUrl, @latitude, @longitude, @address,
        @createdAt, @status, @is_valid, @category, @severity, @headline, @actionable_summary,
        @assigned_department, @requires_immediate_action, @notes, @estimated_completion_days,
        @citizen_name, @citizen_contact, @assigned_worker_id, @citizen_id
      )
    `);

    const insertLog = db.prepare(`
      INSERT INTO logs (reportId, timestamp, step, detail)
      VALUES (@reportId, @timestamp, @step, @detail)
    `);

    const transaction = db.transaction(() => {
      for (const r of initialReports as any[]) {
        let seedDays = 5;
        if (r.id === "rep_1") seedDays = 7;
        else if (r.id === "rep_2") seedDays = 1;
        else if (r.id === "rep_3") seedDays = 0;
        else if (r.id === "rep_4") seedDays = 5;
        else if (r.id === "rep_5") seedDays = 3;

        let citId = null;
        if (r.id === "rep_1") citId = "cit_1";
        else if (r.id === "rep_2") citId = "cit_2";
        else if (r.id === "rep_3") citId = "cit_3";
        else if (r.id === "rep_4") citId = "cit_4";
        else if (r.id === "rep_5") citId = "cit_5";

        insertReport.run({
          id: r.id,
          title: r.title,
          description: r.description,
          imageDescription: r.imageDescription || null,
          imageUrl: r.imageUrl || null,
          latitude: r.latitude !== undefined ? r.latitude : null,
          longitude: r.longitude !== undefined ? r.longitude : null,
          address: r.address || null,
          createdAt: r.createdAt,
          status: r.status,
          is_valid: r.is_valid,
          category: r.category,
          severity: r.severity,
          headline: r.headline,
          actionable_summary: r.actionable_summary,
          assigned_department: r.assigned_department,
          requires_immediate_action: r.requires_immediate_action,
          notes: r.notes || null,
          estimated_completion_days: seedDays,
          citizen_name: r.citizen_name || "Eleanor Vance",
          citizen_contact: r.citizen_contact || "+1-555-9001",
          assigned_worker_id: r.assigned_worker_id || null,
          citizen_id: citId
        });

        // Set seeded workers to Busy if they are assigned
        if (r.assigned_worker_id) {
          db.prepare("UPDATE workers SET availability = 'Busy' WHERE id = ?").run(r.assigned_worker_id);
        }

        for (const log of r.logs) {
          insertLog.run({
            reportId: r.id,
            timestamp: log.timestamp,
            step: log.step,
            detail: log.detail
          });
        }
      }
    });

    transaction();
  }
}

// Run initial check
initDb();

export function getAllReports(): Report[] {
  const reportsRaw = db.prepare("SELECT * FROM reports ORDER BY createdAt DESC").all() as any[];
  const logsRaw = db.prepare("SELECT * FROM logs ORDER BY timestamp ASC").all() as any[];

  // Group logs by reportId
  const logsMap = new Map<string, TriageLogs[]>();
  for (const log of logsRaw) {
    if (!logsMap.has(log.reportId)) {
      logsMap.set(log.reportId, []);
    }
    logsMap.get(log.reportId)!.push({
      timestamp: log.timestamp,
      step: log.step,
      detail: log.detail
    });
  }

  return reportsRaw.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    imageDescription: r.imageDescription || undefined,
    imageUrl: r.imageUrl || undefined,
    latitude: r.latitude !== null ? Number(r.latitude) : undefined,
    longitude: r.longitude !== null ? Number(r.longitude) : undefined,
    address: r.address || undefined,
    createdAt: r.createdAt,
    status: r.status as any,
    is_valid: Boolean(r.is_valid),
    category: r.category as any,
    severity: r.severity as any,
    headline: r.headline,
    actionable_summary: r.actionable_summary,
    assigned_department: r.assigned_department,
    requires_immediate_action: Boolean(r.requires_immediate_action),
    notes: r.notes || undefined,
    logs: logsMap.get(r.id) || [],
    estimated_completion_days: r.estimated_completion_days !== null && r.estimated_completion_days !== undefined ? Number(r.estimated_completion_days) : undefined,
    citizen_name: r.citizen_name || undefined,
    citizen_contact: r.citizen_contact || undefined,
    assigned_worker_id: r.assigned_worker_id || undefined,
    citizen_id: r.citizen_id || undefined,
    triage_reasoning: r.triage_reasoning || undefined,
    predictive_maintenance_alert: r.predictive_maintenance_alert || undefined,
    vouch_count: r.vouch_count !== null && r.vouch_count !== undefined ? Number(r.vouch_count) : 0,
    priority_score: r.priority_score !== null && r.priority_score !== undefined ? Number(r.priority_score) : 1,
    task_checklist: r.task_checklist || undefined
  }));
}

export function getReportById(id: string): Report | null {
  const r = db.prepare("SELECT * FROM reports WHERE id = ?").get(id) as any;
  if (!r) return null;

  const logsRaw = db.prepare("SELECT * FROM logs WHERE reportId = ? ORDER BY timestamp ASC").all(id) as any[];
  const logs = logsRaw.map((log) => ({
    timestamp: log.timestamp,
    step: log.step,
    detail: log.detail
  }));

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    imageDescription: r.imageDescription || undefined,
    imageUrl: r.imageUrl || undefined,
    latitude: r.latitude !== null ? Number(r.latitude) : undefined,
    longitude: r.longitude !== null ? Number(r.longitude) : undefined,
    address: r.address || undefined,
    createdAt: r.createdAt,
    status: r.status as any,
    is_valid: Boolean(r.is_valid),
    category: r.category as any,
    severity: r.severity as any,
    headline: r.headline,
    actionable_summary: r.actionable_summary,
    assigned_department: r.assigned_department,
    requires_immediate_action: Boolean(r.requires_immediate_action),
    notes: r.notes || undefined,
    logs,
    estimated_completion_days: r.estimated_completion_days !== null && r.estimated_completion_days !== undefined ? Number(r.estimated_completion_days) : undefined,
    citizen_name: r.citizen_name || undefined,
    citizen_contact: r.citizen_contact || undefined,
    assigned_worker_id: r.assigned_worker_id || undefined,
    citizen_id: r.citizen_id || undefined,
    triage_reasoning: r.triage_reasoning || undefined,
    predictive_maintenance_alert: r.predictive_maintenance_alert || undefined,
    vouch_count: r.vouch_count !== null && r.vouch_count !== undefined ? Number(r.vouch_count) : 0,
    priority_score: r.priority_score !== null && r.priority_score !== undefined ? Number(r.priority_score) : 1,
    task_checklist: r.task_checklist || undefined
  };
}

export function createReport(report: Omit<Report, "logs">): void {
  const insert = db.prepare(`
    INSERT INTO reports (
      id, title, description, imageDescription, imageUrl, latitude, longitude, address,
      createdAt, status, is_valid, category, severity, headline, actionable_summary,
      assigned_department, requires_immediate_action, notes, estimated_completion_days,
      citizen_name, citizen_contact, assigned_worker_id, citizen_id,
      triage_reasoning, predictive_maintenance_alert, vouch_count, priority_score, task_checklist
    ) VALUES (
      @id, @title, @description, @imageDescription, @imageUrl, @latitude, @longitude, @address,
      @createdAt, @status, @is_valid, @category, @severity, @headline, @actionable_summary,
      @assigned_department, @requires_immediate_action, @notes, @estimated_completion_days,
      @citizen_name, @citizen_contact, @assigned_worker_id, @citizen_id,
      @triage_reasoning, @predictive_maintenance_alert, @vouch_count, @priority_score, @task_checklist
    )
  `);

  insert.run({
    id: report.id,
    title: report.title,
    description: report.description,
    imageDescription: report.imageDescription || null,
    imageUrl: report.imageUrl || null,
    latitude: report.latitude !== undefined ? report.latitude : null,
    longitude: report.longitude !== undefined ? report.longitude : null,
    address: report.address || null,
    createdAt: report.createdAt,
    status: report.status,
    is_valid: report.is_valid ? 1 : 0,
    category: report.category,
    severity: report.severity,
    headline: report.headline,
    actionable_summary: report.actionable_summary,
    assigned_department: report.assigned_department,
    requires_immediate_action: report.requires_immediate_action ? 1 : 0,
    notes: report.notes || null,
    estimated_completion_days: report.estimated_completion_days !== undefined ? report.estimated_completion_days : null,
    citizen_name: report.citizen_name || null,
    citizen_contact: report.citizen_contact || null,
    assigned_worker_id: report.assigned_worker_id || null,
    citizen_id: report.citizen_id || null,
    triage_reasoning: report.triage_reasoning || null,
    predictive_maintenance_alert: report.predictive_maintenance_alert || null,
    vouch_count: report.vouch_count !== undefined ? report.vouch_count : 0,
    priority_score: report.priority_score !== undefined ? report.priority_score : 1,
    task_checklist: report.task_checklist || null
  });
}

export function addLog(reportId: string, log: TriageLogs): void {
  const insert = db.prepare(`
    INSERT INTO logs (reportId, timestamp, step, detail)
    VALUES (?, ?, ?, ?)
  `);
  insert.run(reportId, log.timestamp, log.step, log.detail);
}

export function updateReport(id: string, fields: Partial<Omit<Report, "id" | "logs">>): void {
  const setParts: string[] = [];
  const params: any = { id };

  for (const [key, val] of Object.entries(fields)) {
    if (val === undefined) continue;
    let dbVal = val;
    if (typeof val === "boolean") {
      dbVal = val ? 1 : 0;
    }
    setParts.push(`${key} = @${key}`);
    params[key] = dbVal === undefined ? null : dbVal;
  }

  if (setParts.length === 0) return;

  const sql = `UPDATE reports SET ${setParts.join(", ")} WHERE id = @id`;
  db.prepare(sql).run(params);
}

export function deleteReport(id: string): void {
  db.prepare("DELETE FROM reports WHERE id = ?").run(id);
}

// Workers Directory Database Handlers
export function getAllWorkers(): Worker[] {
  return db.prepare("SELECT * FROM workers").all() as Worker[];
}

export function getWorkersByDepartment(department: string): Worker[] {
  return db.prepare("SELECT * FROM workers WHERE department = ?").all(department) as Worker[];
}

export function getWorkerById(id: string): Worker | null {
  const worker = db.prepare("SELECT * FROM workers WHERE id = ?").get(id) as Worker | undefined;
  return worker || null;
}

export function updateWorkerAvailability(id: string, availability: "Available" | "Busy"): void {
  db.prepare("UPDATE workers SET availability = ? WHERE id = ?").run(availability, id);
}

export function incrementWorkerScore(workerId: string, points: number): void {
  db.prepare("UPDATE workers SET score = IFNULL(score, 0) + ? WHERE id = ?").run(points, workerId);
}

// Citizens Directory Database Handlers
export function getAllCitizens(): Citizen[] {
  return db.prepare("SELECT * FROM citizens").all() as Citizen[];
}

export function getCitizenById(id: string): Citizen | null {
  const citizen = db.prepare("SELECT * FROM citizens WHERE id = ?").get(id) as Citizen | undefined;
  return citizen || null;
}

export function createOrUpdateCitizen(name: string, contact: string, latitude?: number, longitude?: number, issueText?: string): string {
  const contactStr = contact ? contact.trim() : "";
  const isGenericContact = !contactStr || contactStr.toLowerCase() === "none" || contactStr.toLowerCase() === "n/a" || contactStr.toLowerCase() === "anonymous";

  let citizen = null;
  if (!isGenericContact) {
    citizen = db.prepare("SELECT * FROM citizens WHERE contact = ?").get(contactStr) as any;
  }

  if (citizen) {
    db.prepare(`
      UPDATE citizens 
      SET name = ?, latitude = ?, longitude = ?, reported_issue_text = ?
      WHERE id = ?
    `).run(name || citizen.name, latitude ?? citizen.latitude, longitude ?? citizen.longitude, issueText ?? citizen.reported_issue_text, citizen.id);
    return citizen.id;
  } else {
    const id = "cit_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    db.prepare(`
      INSERT INTO citizens (id, name, contact, latitude, longitude, reported_issue_text, civic_impact_score)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(id, name || "Anonymous Submitter", contactStr || ("Unknown_" + id), latitude ?? null, longitude ?? null, issueText ?? null);
    return id;
  }
}

export function incrementCitizenCivicScore(citizenId: string, points: number): void {
  db.prepare("UPDATE citizens SET civic_impact_score = IFNULL(civic_impact_score, 0) + ? WHERE id = ?").run(points, citizenId);
}
