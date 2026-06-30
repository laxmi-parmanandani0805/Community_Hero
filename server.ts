import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize Gemini client with aistudio-build User-Agent for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

import {
  db,
  getAllReports,
  getReportById,
  createReport,
  addLog,
  updateReport,
  deleteReport,
  getAllWorkers,
  getWorkersByDepartment,
  getWorkerById,
  updateWorkerAvailability,
  incrementWorkerScore,
  getAllCitizens,
  getCitizenById,
  createOrUpdateCitizen,
  incrementCitizenCivicScore,
  Report,
  TriageLogs,
  Citizen
} from "./db.js";

// Robust retry utility with exponential backoff for Gemini API calls to handle 503, 429, or 500 responses
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 4,
  delay: number = 500
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errMsg = String(error?.message || error || "");
    const errStatus = error?.status || error?.statusCode;
    
    // Check if error is transient (503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED, 500 internal, etc.)
    const isTransient =
      errStatus === 503 ||
      errStatus === 429 ||
      errStatus === 500 ||
      errMsg.includes("503") ||
      errMsg.includes("UNAVAILABLE") ||
      errMsg.includes("high demand") ||
      errMsg.includes("RESOURCE_EXHAUSTED") ||
      errMsg.includes("rate limit") ||
      errMsg.includes("500") ||
      errMsg.includes("temporarily unavailable");

    if (isTransient && retries > 0) {
      console.warn(`[Gemini Retry] Transient error encountered ("${errMsg}", status: ${errStatus}). Retrying in ${delay}ms... (${retries} retries remaining)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Distance calculation helpers
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Helper to validate and analyze a report using Gemini 3.5 Flash
async function triageReportWithAI(title: string, description: string, imageDescription?: string, imageUrl?: string) {
  const systemInstruction = `You are the core backend engine for "Community Hero: Hyperlocal Problem Solver," an AI-powered civic platform.
Your job is to act as an intelligent agent that triages, extracts data from, and tracks municipal/infrastructure complaints reported by citizens.

Execute these steps meticulously:
1. Validate if the issue is a genuine infrastructure, environmental, or civic problem (e.g., potholes, trash dumping, water leakage, broken streetlights, public safety hazards, traffic signal outages, fallen trees, graffiti).
2. Self-Correction / Spam Interception: If the report or the attached image (if provided) is a selfie, face/portrait photo, commercial advertisement, sales pitch, promotional content, generic spam, gibberish, standard chat/greetings, or unrelated personal request, you MUST flag it as is_valid = false, and populate the "triage_reasoning" field with an explanation of why it was intercepted (e.g. "This report contains a selfie or generic advertisement and does not describe a valid municipal infrastructure or civic issue.").
3. For valid civic reports, set "is_valid": true and write a brief explanation in "triage_reasoning" detailing the validity check.
4. Classify the issue into one of these categories: "Pothole", "Water Leakage", "Waste Management", "Streetlight", "Public Safety", or "Other".
5. Assess the severity level:
   - "Critical": Active danger to human life or property (e.g., live wires exposed, major flooding, gas leak, active structural collapse, traffic lights fully down at a major intersection).
   - "Medium": Significant disruption or safety hazard but not an immediate disaster (e.g., deep potholes in heavy traffic, broken streetlights in highly traveled lanes/dark alleys, massive illegal dumping, minor pipe leaks).
   - "Low": Nuisance issues or minor repairs needed (e.g., small pothole in side street, graffiti on wall, full public trash bin, slight pavement cracking).
6. Extract key details like an automated, concise headline and an actionable task summary.
7. Provide an autonomous recommendation for the municipal department that should handle it (e.g., "Department of Public Works", "Water & Sewer Department", "Bureau of Street Lighting", "Department of Sanitation", "Traffic Engineering Division", "Public Safety Office", etc.).
8. Estimate the timeline in integer days ("estimated_completion_days") required for municipal crews to resolve/repair this issue based on its category and severity. Critical issues are usually 1 day. Potholes are usually 3 to 7 days. Streetlight/electrical repairs take 4 to 8 days. Sanitation/rubbish clearance takes 2 to 4 days. Spam/invalid reports should be 0.

You must ALWAYS reply in a strict, valid JSON format matching the schema precisely. Do not include any markdown outside of the JSON or any conversational text.`;

  const prompt = `Report Title: "${title}"
Report Description: "${description}"
${imageDescription ? `Image Analysis Description: "${imageDescription}"` : ""}`;

  const textPart = {
    text: prompt
  };

  const contentsToPass: any = { parts: [textPart] };

  if (imageUrl && imageUrl.startsWith("data:image/")) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      contentsToPass.parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  }

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contentsToPass,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_valid: {
              type: Type.BOOLEAN,
              description: "True if this is a genuine municipal/infrastructure/civic problem. False if spam, selfie, advertisement or unrelated text."
            },
            triage_reasoning: {
              type: Type.STRING,
              description: "Reasoning explaining why this report was flagged as valid or why it was intercepted as spam/selfie/advertisement."
            },
            category: {
              type: Type.STRING,
              enum: ["Pothole", "Water Leakage", "Waste Management", "Streetlight", "Public Safety", "Other"],
              description: "The classified civic category. Set to 'Other' if is_valid is false."
            },
            severity: {
              type: Type.STRING,
              enum: ["Low", "Medium", "Critical"],
              description: "The assessed severity level of the civic issue."
            },
            headline: {
              type: Type.STRING,
              description: "A short, automated, highly concise headline of the issue (e.g., 'Flooded intersection on 5th Ave')."
            },
            actionable_summary: {
              type: Type.STRING,
              description: "A detailed actionable summary or task list of what exactly needs fixing."
            },
            assigned_department: {
              type: Type.STRING,
              description: "Recommended local municipal department to handle this."
            },
            requires_immediate_action: {
              type: Type.BOOLEAN,
              description: "True if severity is Critical or represents an active safety threat requiring immediate emergency dispatch."
            },
            estimated_completion_days: {
              type: Type.INTEGER,
              description: "An estimated integer number of days required to resolve this issue based on category and severity (e.g., 1 for critical, 5 for pothole, etc)."
            }
          },
          required: [
            "is_valid",
            "triage_reasoning",
            "category",
            "severity",
            "headline",
            "actionable_summary",
            "assigned_department",
            "requires_immediate_action",
            "estimated_completion_days"
          ]
        }
      }
    }));

    const text = response.text || "{}";
    const cleanedText = text.trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini triage error:", error);
    // Return a fallback result if AI fails (e.g., API key not set or quota exceeded)
    const mockTriageFallback = {
      is_valid: true,
      category: "Other" as const,
      severity: "Medium" as const,
      headline: title || "New Municipal Report",
      actionable_summary: description || "Review and inspect issue description to verify maintenance details.",
      assigned_department: "City Maintenance & Response Team",
      requires_immediate_action: false,
      estimated_completion_days: 5,
      triage_reasoning: "Valid report (fallback due to transient service limitation)"
    };
    return mockTriageFallback;
  }
}

// Helper to generate custom Markdown safety checklist using Gemini
async function generateChecklistWithAI(category: string, headline: string, summary: string) {
  const prompt = `You are a municipal safety inspector and operations planner.
A field worker is being assigned to the following municipal repair ticket:
Category: "${category}"
Headline: "${headline}"
Actionable Summary: "${summary}"

Please generate a professional, highly concise Markdown checklist of safety steps, tools, and actions they must take. It must use standard Markdown bullet points like:
- [ ] Bring protective gear (gloves, helmet)
- [ ] Inspect adjacent area for hazard
- [ ] Use appropriate tools for ${category}
Provide ONLY the markdown checklist in your response, with no intro or outro. Keep it to 3 to 5 actionable bullet points.`;

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    }));
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Failed to generate checklist with AI:", error);
    // Fallback based on category
    return `- [ ] Bring safety vest and work gloves\n- [ ] Inspect area for immediate dangers\n- [ ] Deploy safety cones/barriers\n- [ ] Execute standard ${category} repair procedures`;
  }
}

// API Routes
app.get("/api/reports", (req, res) => {
  try {
    const list = getAllReports();
    res.json(list);
  } catch (error) {
    console.error("Failed to get reports from SQL database:", error);
    res.status(500).json({ error: "Failed to fetch reports from persistent database" });
  }
});

app.post("/api/triage", async (req, res) => {
  const { title, description, imageDescription, imageUrl } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required." });
  }

  const result = await triageReportWithAI(title, description, imageDescription, imageUrl);
  res.json(result);
});

app.post("/api/reports", async (req, res) => {
  const { title, description, imageDescription, imageUrl, latitude, longitude, address, citizen_name, citizen_contact } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required." });
  }

  try {
    // Triage with AI
    const triageResult = await triageReportWithAI(title, description, imageDescription, imageUrl);

    const initialStatus: Report["status"] = triageResult.is_valid ? "Pending" : "Spam";

    const id = "rep_" + Date.now();
    const createdAt = new Date().toISOString();

    // Register or update the citizen profile and get their ID
    const citizenId = createOrUpdateCitizen(
      citizen_name || "Anonymous",
      citizen_contact || "N/A",
      latitude ? Number(latitude) : undefined,
      longitude ? Number(longitude) : undefined,
      description
    );

    let predictive_maintenance_alert: string | undefined = undefined;
    if (latitude && longitude && triageResult.is_valid) {
      const latNum = Number(latitude);
      const lngNum = Number(longitude);
      const reports = getAllReports();
      const nearbyCount = reports.filter(r => {
        if (!r.is_valid || !r.latitude || !r.longitude || r.category !== triageResult.category) return false;
        const latDiff = Math.abs(r.latitude - latNum);
        const lngDiff = Math.abs(r.longitude - lngNum);
        return latDiff < 0.002 && lngDiff < 0.002;
      }).length;

      if (nearbyCount >= 2) {
        if (triageResult.category === "Water Leakage") {
          predictive_maintenance_alert = "Multiple localized pipe bursts detected; systemic infrastructure failure suspected.";
        } else if (triageResult.category === "Streetlight") {
          predictive_maintenance_alert = "Multiple localized streetlight failures detected; localized power grid fault suspected.";
        } else if (triageResult.category === "Pothole") {
          predictive_maintenance_alert = "Multiple localized pothole clusters detected; rapid roadway degradation suspected.";
        } else {
          predictive_maintenance_alert = `Multiple localized ${triageResult.category.toLowerCase()} issues detected within tight spatial coordinates; systemic infrastructure failure suspected.`;
        }
      }
    }

    // AI Automated Worker Dispatch Logic
    let assignedWorker: any = null;
    let customChecklist: string | undefined = undefined;
    let dispatchLogMessage = "";

    if (triageResult.is_valid) {
      const workers = getAllWorkers();
      const reportCategory = triageResult.category;
      
      const categoryClean = reportCategory.toLowerCase();
      const matchingWorkers = workers.filter(w => {
        const deptClean = w.department.toLowerCase();
        return (categoryClean.includes("pothole") && deptClean.includes("pothole")) ||
               (categoryClean.includes("water") && deptClean.includes("water")) ||
               (categoryClean.includes("waste") && deptClean.includes("waste")) ||
               (categoryClean.includes("streetlight") && deptClean.includes("streetlight")) ||
               (categoryClean.includes("safety") && deptClean.includes("safety")) ||
               (categoryClean === deptClean);
      });

      const availableWorkers = matchingWorkers.filter(w => w.availability === "Available");

      if (availableWorkers.length > 0) {
        assignedWorker = availableWorkers[0];
        if (latitude && longitude) {
          const latNum = Number(latitude);
          const lngNum = Number(longitude);
          let minDistance = Infinity;
          for (const w of availableWorkers) {
            if (w.latitude && w.longitude) {
              const dist = calculateDistance(latNum, lngNum, w.latitude, w.longitude);
              if (dist < minDistance) {
                minDistance = dist;
                assignedWorker = w;
              }
            }
          }
        }

        // Auto-generate a custom safety task checklist using Gemini
        customChecklist = await generateChecklistWithAI(
          triageResult.category,
          triageResult.headline,
          triageResult.actionable_summary
        );

        // Mark worker as busy in the database
        updateWorkerAvailability(assignedWorker.id, "Busy");
        
        dispatchLogMessage = `AI Automated Dispatcher: Successfully matched and assigned available specialist ${assignedWorker.name} (${assignedWorker.contact}, Dept: ${assignedWorker.department}) to this ticket. Status updated to Assigned. Auto-generated custom safety checklist.`;
      } else {
        dispatchLogMessage = `AI Automated Dispatcher: Searched for available specialists in department/category '${triageResult.category}' but all personnel are currently busy. Ticket placed in queue (Pending) for manual or dynamic dispatch.`;
      }
    }

    const newReportNoLogs: Omit<Report, "logs"> = {
      id,
      title,
      description,
      imageDescription: imageDescription || undefined,
      imageUrl: imageUrl || undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      address: address || undefined,
      createdAt,
      status: assignedWorker ? "Assigned" : initialStatus,
      is_valid: triageResult.is_valid,
      category: triageResult.category,
      severity: triageResult.severity,
      headline: triageResult.headline,
      actionable_summary: triageResult.actionable_summary,
      assigned_department: triageResult.assigned_department,
      requires_immediate_action: triageResult.requires_immediate_action,
      notes: "",
      estimated_completion_days: triageResult.estimated_completion_days,
      citizen_name: citizen_name || "Anonymous",
      citizen_contact: citizen_contact || "N/A",
      assigned_worker_id: assignedWorker ? assignedWorker.id : undefined,
      citizen_id: citizenId,
      triage_reasoning: triageResult.triage_reasoning || undefined,
      predictive_maintenance_alert,
      vouch_count: 0,
      priority_score: 1,
      task_checklist: customChecklist
    };

    // Save report to persistent SQLite database
    createReport(newReportNoLogs);

    const descriptionIsDetailed = description && description.trim().length >= 100;
    if (descriptionIsDetailed && citizenId) {
      incrementCitizenCivicScore(citizenId, 10);
    }

    // Save logs to logs table
    const log1 = { timestamp: createdAt, step: "Submission", detail: `Report submitted by ${citizen_name || "resident"}.` };
    const log2 = {
      timestamp: createdAt,
      step: "AI Triage",
      detail: triageResult.is_valid
        ? `Validated. Classified as ${triageResult.category}, ${triageResult.severity} severity. Assigned to ${triageResult.assigned_department}. Reasoning: ${triageResult.triage_reasoning || "N/A"}`
        : `Flagged as Spam / Unrelated civic issue. Reasoning: ${triageResult.triage_reasoning || "N/A"}`
    };

    if (predictive_maintenance_alert) {
      addLog(id, {
        timestamp: createdAt,
        step: "Predictive Alert",
        detail: `WARNING: ${predictive_maintenance_alert}`
      });
    }

    addLog(id, log1);
    addLog(id, log2);

    if (dispatchLogMessage) {
      addLog(id, {
        timestamp: createdAt,
        step: "Automated Dispatch",
        detail: dispatchLogMessage
      });
    }

    if (descriptionIsDetailed && citizenId) {
      addLog(id, {
        timestamp: createdAt,
        step: "Detailed Report Bonus",
        detail: `Awarded +10 Civic Impact Points to reporter for providing a highly detailed description (${description.trim().length} characters).`
      });
    }

    // Send traditional SMS alert to citizen's contact number upon ticket creation
    if (newReportNoLogs.citizen_contact && newReportNoLogs.citizen_contact !== "N/A" && newReportNoLogs.citizen_contact !== "None") {
      sendSMSSimulation(
        newReportNoLogs.citizen_contact,
        `Hi ${newReportNoLogs.citizen_name}, your ${newReportNoLogs.category} issue has been received. Ticket ID: #${newReportNoLogs.id}.`
      );
      
      if (assignedWorker) {
        sendSMSSimulation(
          newReportNoLogs.citizen_contact,
          `Worker ${assignedWorker.name} (Ph: ${assignedWorker.contact}) has been automatically dispatched to resolve your problem.`
        );
      }
    }

    // Return the complete report with logs
    const completedReport = getReportById(id);
    if (!completedReport) {
      throw new Error("Failed to retrieve newly created report");
    }

    res.status(201).json(completedReport);
  } catch (error) {
    console.error("Failed to create report in SQL database:", error);
    res.status(500).json({ error: "Failed to persist report to SQL database" });
  }
});

// Update Report Status or Notes
app.patch("/api/reports/:id", (req, res) => {
  const { id } = req.params;
  const { status, notes, category, severity, assigned_department, headline, actionable_summary } = req.body;

  try {
    const report = getReportById(id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const updates: Partial<Omit<Report, "id" | "logs">> = {};

    if (status && status !== report.status) {
      if (status === "Resolved" && !report.assigned_worker_id) {
        return res.status(400).json({ error: "Cannot resolve report without an assigned worker first." });
      }

      const timestamp = new Date().toISOString();
      const log = {
        timestamp,
        step: "Status Update",
        detail: `Status changed from ${report.status} to ${status}.`
      };
      addLog(id, log);
      updates.status = status;

      // Release worker if status is resolved or spam
      if ((status === "Resolved" || status === "Spam") && report.assigned_worker_id) {
        if (status === "Resolved" && report.status !== "Resolved") {
          incrementWorkerScore(report.assigned_worker_id, 10);
          addLog(id, {
            timestamp,
            step: "Worker Points Award",
            detail: `Assigned worker awarded +10 points for successfully resolving this ticket.`
          });
        }
        updateWorkerAvailability(report.assigned_worker_id, "Available");
        addLog(id, {
          timestamp,
          step: "Worker Released",
          detail: `Assigned worker released and marked as Available.`
        });
      }

      if (status === "Resolved" && report.status !== "Resolved" && report.citizen_id) {
        incrementCitizenCivicScore(report.citizen_id, 50);
        addLog(id, {
          timestamp,
          step: "Civic Points Award",
          detail: `Reporter citizen awarded +50 Civic Impact Points for resolved issue.`
        });
        
        // Send real-time resolution SMS simulation
        if (report.citizen_contact && report.citizen_contact !== "N/A" && report.citizen_contact !== "None") {
          sendSMSSimulation(
            report.citizen_contact,
            `Ticket #${report.id} ("${report.title}") has been successfully resolved! Thank you for keeping our neighborhood clean!`
          );
        }
      }
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (category) updates.category = category;
    if (severity) updates.severity = severity;
    if (assigned_department) updates.assigned_department = assigned_department;
    if (headline) updates.headline = headline;
    if (actionable_summary) updates.actionable_summary = actionable_summary;

    updateReport(id, updates);

    const updatedReport = getReportById(id);
    res.json(updatedReport);
  } catch (error) {
    console.error("Failed to update report in SQL database:", error);
    res.status(500).json({ error: "Failed to update report in SQL database" });
  }
});

// GET All Workers or Filtered by Department Category
app.get("/api/workers", (req, res) => {
  const { department } = req.query;
  try {
    let list;
    if (department) {
      list = getWorkersByDepartment(String(department));
    } else {
      list = getAllWorkers();
    }
    res.json(list);
  } catch (error) {
    console.error("Failed to fetch workers:", error);
    res.status(500).json({ error: "Failed to fetch workers" });
  }
});

// Assign Worker to Report
app.post("/api/reports/:id/assign", async (req, res) => {
  const { id } = req.params;
  const { workerId } = req.body;

  if (!workerId) {
    return res.status(400).json({ error: "Worker ID is required for assignment." });
  }

  try {
    const report = getReportById(id);
    if (!report) {
      return res.status(404).json({ error: "Report not found." });
    }

    const worker = getWorkerById(workerId);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found." });
    }

    // Release old worker if one was already assigned
    if (report.assigned_worker_id && report.assigned_worker_id !== workerId) {
      updateWorkerAvailability(report.assigned_worker_id, "Available");
    }

    // Auto-generate a custom safety task checklist using Gemini
    const customChecklist = await generateChecklistWithAI(
      report.category,
      report.headline,
      report.actionable_summary
    );

    // Assign new worker and update report with checklist
    updateReport(id, {
      assigned_worker_id: workerId,
      status: "Assigned",
      task_checklist: customChecklist
    });

    // Mark worker as busy
    updateWorkerAvailability(workerId, "Busy");

    // Send real-time dispatch SMS simulation
    if (report.citizen_contact && report.citizen_contact !== "N/A" && report.citizen_contact !== "None") {
      sendSMSSimulation(
        report.citizen_contact,
        `Worker ${worker.name} (Ph: ${worker.contact}) has been dispatched to resolve your problem.`
      );
    }

    const timestamp = new Date().toISOString();
    addLog(id, {
      timestamp,
      step: "Worker Assignment",
      detail: `Assigned field worker ${worker.name} (${worker.contact}, Dept: ${worker.department}) to this ticket. Status updated to Assigned. Auto-generated worker task checklist.`
    });

    const updatedReport = getReportById(id);
    res.json(updatedReport);
  } catch (error) {
    console.error("Failed to assign worker:", error);
    res.status(500).json({ error: "Failed to assign worker." });
  }
});

// Mark as Resolved by Worker
app.post("/api/reports/:id/resolve", (req, res) => {
  const { id } = req.params;

  try {
    const report = getReportById(id);
    if (!report) {
      return res.status(404).json({ error: "Report not found." });
    }

    if (!report.assigned_worker_id) {
      return res.status(400).json({ error: "Cannot mark report as resolved. A worker must be assigned first." });
    }

    const worker = getWorkerById(report.assigned_worker_id);

    // Update report status
    updateReport(id, {
      status: "Resolved"
    });

    // Mark worker back to Available
    updateWorkerAvailability(report.assigned_worker_id, "Available");

    // Increment worker score by +10
    incrementWorkerScore(report.assigned_worker_id, 10);

    // Increment civic impact score of the citizen who reported it
    if (report.citizen_id) {
      incrementCitizenCivicScore(report.citizen_id, 50);
    }

    // Send real-time resolution SMS simulation
    if (report.citizen_contact && report.citizen_contact !== "N/A" && report.citizen_contact !== "None") {
      sendSMSSimulation(
        report.citizen_contact,
        `Ticket #${report.id} ("${report.title}") has been successfully resolved! Thank you for keeping our neighborhood clean!`
      );
    }

    const timestamp = new Date().toISOString();
    addLog(id, {
      timestamp,
      step: "Resolution",
      detail: `Marked as Resolved by assigned worker ${worker ? worker.name : "field staff"}. Worker awarded +10 points. Worker availability reset to Available. +50 Civic Impact Points awarded to reporter.`
    });

    const updatedReport = getReportById(id);
    res.json(updatedReport);
  } catch (error) {
    console.error("Failed to resolve report:", error);
    res.status(500).json({ error: "Failed to resolve report." });
  }
});

// Community Vouch Endpoint
app.post("/api/reports/:id/vouch", (req, res) => {
  const { id } = req.params;
  try {
    const report = getReportById(id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const currentVouch = report.vouch_count || 0;
    const currentPriority = report.priority_score || 1;

    const newVouch = currentVouch + 1;
    const newPriority = currentPriority + 10; // each vouch increments priority by 10 points!

    updateReport(id, {
      vouch_count: newVouch,
      priority_score: newPriority
    });

    const timestamp = new Date().toISOString();
    addLog(id, {
      timestamp,
      step: "Community Vouch",
      detail: `Another resident vouched for this issue! Total Vouches: ${newVouch}. Priority Score escalated to ${newPriority}.`
    });

    res.json(getReportById(id));
  } catch (err) {
    console.error("Vouch failed:", err);
    res.status(500).json({ error: "Failed to process community vouch." });
  }
});

// SMS Dispatch and History Simulation for Feature 3
export interface SMSLog {
  id: string;
  recipient: string;
  message: string;
  timestamp: string;
}

const smsHistory: SMSLog[] = [
  {
    id: "sms_seed_1",
    recipient: "+1-555-9002",
    message: "Your water leakage report #rep_2 has been assigned to field agent Mario Bros. They are on their way!",
    timestamp: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString()
  }
];

export function sendSMSSimulation(recipient: string, message: string): SMSLog {
  const sms: SMSLog = {
    id: "sms_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    recipient: recipient || "+1-555-0199",
    message,
    timestamp: new Date().toISOString()
  };
  smsHistory.push(sms);
  console.log(`[SMS DISPATCH] To: ${sms.recipient} | Message: "${sms.message}"`);
  return sms;
}

app.get("/api/sms-history", (req, res) => {
  res.json(smsHistory);
});

app.post("/api/send-sms", (req, res) => {
  const { recipient, message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "SMS message is required." });
  }
  const sms = sendSMSSimulation(recipient, message);
  res.status(201).json(sms);
});

// Delete Report
app.delete("/api/reports/:id", (req, res) => {
  const { id } = req.params;
  try {
    const report = getReportById(id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    deleteReport(id);
    res.json({ success: true, message: "Report deleted" });
  } catch (error) {
    console.error("Failed to delete report in SQL database:", error);
    res.status(500).json({ error: "Failed to delete report from SQL database" });
  }
});

// Database Inspector APIs
app.get("/api/db/status", (req, res) => {
  try {
    const reportsCount = (db.prepare("SELECT COUNT(*) as count FROM reports").get() as any).count;
    const logsCount = (db.prepare("SELECT COUNT(*) as count FROM logs").get() as any).count;
    const workersCount = (db.prepare("SELECT COUNT(*) as count FROM workers").get() as any).count;
    const citizensCount = (db.prepare("SELECT COUNT(*) as count FROM citizens").get() as any).count;
    
    const pragmaJournalMode = (db.prepare("PRAGMA journal_mode").get() as any).journal_mode;
    
    const reportsSchema = db.prepare("PRAGMA table_info(reports)").all();
    const logsSchema = db.prepare("PRAGMA table_info(logs)").all();
    const workersSchema = db.prepare("PRAGMA table_info(workers)").all();
    const citizensSchema = db.prepare("PRAGMA table_info(citizens)").all();

    res.json({
      dbPath: path.resolve(process.cwd(), "reports.db"),
      journalMode: pragmaJournalMode,
      reportsCount,
      logsCount,
      workersCount,
      citizensCount,
      tables: [
        { name: "reports", count: reportsCount, schema: reportsSchema },
        { name: "logs", count: logsCount, schema: logsSchema },
        { name: "workers", count: workersCount, schema: workersSchema },
        { name: "citizens", count: citizensCount, schema: citizensSchema }
      ]
    });
  } catch (error: any) {
    console.error("DB Status check failed:", error);
    res.status(500).json({ error: error.message || "Failed to inspect database" });
  }
});

app.get("/api/citizens", (req, res) => {
  try {
    const citizens = getAllCitizens();
    res.json(citizens);
  } catch (error: any) {
    console.error("Failed to load citizens:", error);
    res.status(500).json({ error: error.message || "Failed to load citizens directory" });
  }
});

app.get("/api/workers", (req, res) => {
  try {
    const workers = getAllWorkers();
    res.json(workers);
  } catch (error: any) {
    console.error("Failed to load workers:", error);
    res.status(500).json({ error: error.message || "Failed to load workers directory" });
  }
});

app.get("/api/leaderboard", (req, res) => {
  try {
    const citizens = db.prepare("SELECT id, name, contact, civic_impact_score, reported_issue_text FROM citizens ORDER BY civic_impact_score DESC LIMIT 20").all();
    const workers = db.prepare("SELECT id, name, department, score, availability FROM workers ORDER BY score DESC LIMIT 20").all();
    res.json({ citizens, workers });
  } catch (error: any) {
    console.error("Failed to fetch leaderboard:", error);
    res.status(500).json({ error: error.message || "Failed to fetch leaderboard." });
  }
});

app.post("/api/db/query", (req, res) => {
  const { sql } = req.body;
  if (!sql) {
    return res.status(400).json({ error: "SQL query statement is required" });
  }

  try {
    const stmt = db.prepare(sql);
    let result;
    if (stmt.reader) {
      result = stmt.all();
    } else {
      result = stmt.run();
    }
    res.json({ success: true, result });
  } catch (error: any) {
    console.error("SQL Execution failed:", error);
    res.status(400).json({ success: false, error: error.message || "SQL Execution Error" });
  }
});

// Vite Middleware Integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
