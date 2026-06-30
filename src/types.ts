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
  task_checklist?: string;
  triage_reasoning?: string;
  vouch_count?: number;
  priority_score?: number;
  predictive_maintenance_alert?: string;
}

export interface Worker {
  id: string;
  name: string;
  contact: string;
  department: string;
  availability: "Available" | "Busy";
}

export interface TriageResult {
  is_valid: boolean;
  category: "Pothole" | "Water Leakage" | "Waste Management" | "Streetlight" | "Public Safety" | "Other";
  severity: "Low" | "Medium" | "Critical";
  headline: string;
  actionable_summary: string;
  assigned_department: string;
  requires_immediate_action: boolean;
  estimated_completion_days: number;
}
