import React, { useState, useEffect, useRef } from "react";
import { Report } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Check, 
  MapPin, 
  Image as ImageIcon, 
  AlertTriangle, 
  Loader2, 
  Send,
  Sparkles,
  ShieldCheck,
  Building2,
  Upload,
  X,
  Trash2,
  Mic,
  MicOff
} from "lucide-react";

interface ReportFormProps {
  onSubmit: (reportData: {
    title: string;
    description: string;
    imageDescription?: string;
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    citizen_name?: string;
    citizen_contact?: string;
  }) => Promise<Report>;
}

export default function ReportForm({ onSubmit }: ReportFormProps) {
  const [description, setDescription] = useState("");
  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const [recognitionLang, setRecognitionLang] = useState("en-IN"); // en-IN, hi-IN
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please try Chrome/Edge.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      setError("");
      try {
        const rec = new SpeechRecognition();
        rec.continuous = false; // Stop when the user stops speaking
        rec.interimResults = false;
        rec.lang = recognitionLang;

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setDescription(prev => {
              const separator = prev ? (prev.endsWith(" ") ? "" : " ") : "";
              return prev + separator + transcript;
            });
          }
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error === "not-allowed") {
            setError("Microphone permission denied. Please allow microphone access in your browser.");
          } else {
            setError(`Speech recognition failed: ${event.error}`);
          }
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (e: any) {
        console.error(e);
        setError("Could not start speech recognition.");
        setIsListening(false);
      }
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  const [citizenName, setCitizenName] = useState("");
  const [citizenContact, setCitizenContact] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Silent Geolocation State
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [gpsStatus, setGpsStatus] = useState<"acquiring" | "success" | "fallback">("acquiring");
  const [address, setAddress] = useState("Acquiring automatic GPS telemetry...");

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);

  // Silently trigger browser's Geolocation API on load
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("fallback");
      setAddress("San Francisco, CA");
      setLatitude(37.7749);
      setLongitude(-122.4194);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setGpsStatus("success");
        setAddress("Resolving street address...");

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                "Accept-Language": "en"
              }
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              const addr = data.address || {};
              const parts: string[] = [];
              if (addr.road) parts.push(addr.road);
              if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
              if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
              
              const resolvedAddress = parts.length > 0 
                ? parts.join(", ") 
                : data.display_name;
              setAddress(resolvedAddress);
            } else {
              setAddress(`Location [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
            }
          } else {
            setAddress(`Location [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
          }
        } catch (e) {
          console.error("Reverse geocoding address failed:", e);
          setAddress(`Location [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
        }
      },
      (err) => {
        console.warn(`Geolocation silent capture declined or timed out (Code: ${err?.code}, Message: ${err?.message || "unknown"}). Applying municipal fallback...`);
        setGpsStatus("fallback");
        setAddress("San Francisco, CA");
        setLatitude(37.7749);
        setLongitude(-122.4194);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Handle uploaded files
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, JPEG, WEBP).");
      return;
    }
    
    setError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
      }
    };
    reader.onerror = () => {
      setError("Error reading the image file. Please try another one.");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedPhoto = () => {
    setImageUrl("");
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please describe the problem first.");
      return;
    }
    if (!citizenName.trim() || !citizenContact.trim()) {
      setError("Please enter your name and contact number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create a simplified title from description (first 50 characters)
      const cleanDesc = description.trim();
      const generatedTitle = cleanDesc.length > 55 
        ? cleanDesc.slice(0, 52) + "..." 
        : cleanDesc;

      // Call parent submission which invokes backend API with automatic triage
      const result = await onSubmit({
        title: generatedTitle,
        description: cleanDesc,
        imageUrl: imageUrl.trim() || undefined,
        latitude,
        longitude,
        address: address,
        citizen_name: citizenName.trim(),
        citizen_contact: citizenContact.trim(),
      });

      setSubmittedReport(result);
      setDescription("");
      setCitizenName("");
      setCitizenContact("");
      setImageUrl("");
      setFileName("");
    } catch (err: any) {
      console.error(err);
      setError("We encountered an issue registering your report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {submittedReport ? (
          <motion.div
            key="success-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-8 text-center space-y-6"
          >
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-3xs">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase">
                REPORT LOCKED & DISPATCHED
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Thank You, Community Hero!</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Your report has been successfully processed by our AI dispatch system. City crews have been autonomously notified.
              </p>
            </div>

            {/* Structured Results Panel */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 text-left space-y-3 divide-y divide-slate-100 text-xs text-slate-600">
              <div className="pb-2.5 flex justify-between items-center">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">INCIDENT ID</span>
                <span className="font-mono text-slate-900 font-bold">{submittedReport.id}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">AI VERIFIED CATEGORY</span>
                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{submittedReport.category}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">ASSIGNED DEPARTMENT</span>
                <span className="font-bold text-blue-700 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {submittedReport.assigned_department}
                </span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">URGENCY LEVEL</span>
                <span className={`font-extrabold uppercase text-[10px] tracking-wider px-2 py-0.5 rounded ${
                  submittedReport.severity === "Critical" 
                    ? "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse" 
                    : submittedReport.severity === "Medium" 
                    ? "bg-amber-50 text-amber-700 border border-amber-100" 
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}>
                  {submittedReport.severity}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSubmittedReport(null)}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 active:scale-98 transition-all text-sm cursor-pointer shadow-xs"
            >
              Report Another Issue
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="citizen-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
          >
            {/* Informational Clean Header */}
            <div className="p-6 sm:p-8 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Public Citizen Portal</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Report a Hyperlocal Issue</h2>
                <p className="text-xs text-slate-500">Every submission is instantly parsed, sorted, and routed to the correct crew.</p>
              </div>

              {/* Silent Geotag Status Box */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-3xs text-xs font-medium text-slate-600 max-w-xs sm:max-w-md">
                <MapPin className={`w-3.5 h-3.5 ${gpsStatus === 'acquiring' ? 'text-indigo-500 animate-bounce' : gpsStatus === 'success' ? 'text-emerald-500' : 'text-slate-400'} shrink-0`} />
                <span className="font-medium text-slate-700 truncate" title={gpsStatus === "acquiring" ? "Acquiring GPS location..." : address}>
                  {gpsStatus === "acquiring" ? "Acquiring GPS location..." : `📍 ${address}`}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              {/* Citizen Profile Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1.5">
                  <label htmlFor="citizen_name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="citizen_name"
                    required
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    placeholder="e.g., Eleanor Vance"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-slate-400 bg-white transition-all placeholder-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="citizen_contact" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Contact Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="citizen_contact"
                    required
                    value={citizenContact}
                    onChange={(e) => setCitizenContact(e.target.value)}
                    placeholder="e.g., +1-555-0101"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-slate-400 bg-white transition-all placeholder-slate-300"
                  />
                </div>
              </div>

              {/* Single narrative input */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label htmlFor="description" className="block text-sm font-bold text-slate-800">
                    What is the problem? <span className="text-red-500">*</span>
                  </label>
                  
                  {speechSupported && (
                    <div className="flex items-center gap-2">
                      {/* Language Selector */}
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setRecognitionLang("en-IN")}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            recognitionLang === "en-IN"
                              ? "bg-white text-slate-800 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Eng/Hinglish
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecognitionLang("hi-IN")}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            recognitionLang === "hi-IN"
                              ? "bg-white text-slate-800 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          हिंदी (Hindi)
                        </button>
                      </div>

                      {/* Microphone Button */}
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                          isListening
                            ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse ring-2 ring-rose-500/20"
                            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                        title={isListening ? "Listening... Click to stop" : "Speak to Transcribe (English / Hindi / Hinglish)"}
                      >
                        {isListening ? (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            <MicOff className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-rose-600 font-extrabold text-[11px]">Listening...</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-slate-700 font-semibold text-[11px]">Speak Complaint</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-2.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tip: Describe what it is, where it's located, and any potential hazard to help the AI direct it.</span>
                </div>
                <textarea
                  id="description"
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., There is a severe water leak/burst pipe on Oak Street near the bakery flooding the sidewalk. It is becoming slippery and blocking pedestrians."
                  className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all bg-slate-50/20 placeholder-slate-400 resize-none font-sans"
                />
              </div>

              {/* Interactive Photo Drop Zone with file input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <span>Photo Attachment (Optional)</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  id="hidden_file_input"
                />

                <AnimatePresence mode="wait">
                  {!imageUrl ? (
                    <motion.div
                      key="drop-zone"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={triggerFileInput}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        isDragging 
                          ? "border-blue-500 bg-blue-50/30 text-blue-700" 
                          : "border-slate-200 bg-slate-50/25 hover:bg-slate-50/75 hover:border-slate-300 text-slate-500"
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="p-3 bg-white rounded-xl shadow-3xs border border-slate-100 text-slate-400 group-hover:text-slate-600 transition-colors">
                          <Upload className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">Drag and drop your photo here, or <span className="text-blue-600 hover:text-blue-700 underline">browse</span></p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, JPEG, WEBP files</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="file-preview"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-4 justify-between"
                    >
                      <div className="flex items-center gap-3.5 w-full sm:w-auto">
                        <img 
                          src={imageUrl} 
                          alt="Incident attachment" 
                          className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0 shadow-3xs bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate max-w-[200px] sm:max-w-xs">{fileName || "uploaded_photo.jpg"}</p>
                          <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Photo loaded successfully
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={removeSelectedPhoto}
                        className="w-full sm:w-auto px-3.5 py-1.5 bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-100 hover:text-rose-700 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                        id="remove_photo_button"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Photo</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Alert Message for validation errors */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Secured under Smart-City Civic Codes</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 active:scale-98 transition-all text-xs flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  id="submit_report_button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing & Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Submit Public Complaint
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
