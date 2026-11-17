/**
 * Supabase Client Configuration & Smart Educational Materials Engine
 * Freshman Ethiopia – Study Notes Platform
 */

// Default constants (falls back to localStorage if configured via UI)
let DEFAULT_SUPABASE_URL = "https://qehxdsptiheahyjnzxgy.supabase.co";
let DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlaHhkc3B0aWhlYWh5am56eGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NTU5MTgsImV4cCI6MjEwOTEzMTkxOH0.9cKEDirYM-4cMoFpfoGDheR7cPBql0t_q0lvXcuCpOA";
const BUCKET_NAME = "chapter-files";

// ============================================================================
// 1. ETHIOPIAN FRESHMAN COURSE KNOWLEDGE BASE
// ============================================================================
const SUBJECTS_CATALOG = [
  {
    name: "Geography",
    code: "GEOG",
    fullTitle: "Geography of Ethiopia and the Horn",
    stream: "social",
    color: "#0d9488", // Teal
    keywords: ["geography", "geog", "horn of africa", "ethiopian geology", "physiography", "drainage system", "topography", "climate of ethiopia", "soil and vegetation", "spatial distribution", "map reading", "demographic", "relief"]
  },
  {
    name: "Psychology",
    code: "PSYC",
    fullTitle: "General Psychology",
    stream: "common",
    color: "#7c3aed", // Violet
    keywords: ["psychology", "psych", "human behavior", "cognition", "learning and memory", "personality", "motivation", "sensation and perception", "intelligence", "psychological", "mental processes", "conditioning", "consciousness"]
  },
  {
    name: "Mathematics",
    code: "MATH",
    fullTitle: "Mathematics for Natural & Social Sciences",
    stream: "common",
    color: "#2563eb", // Blue
    keywords: ["mathematics", "math", "maths", "calculus", "propositional logic", "set theory", "relations and functions", "matrix", "matrices", "algebra", "vectors", "limits", "derivatives", "integrals", "geometry"]
  },
  {
    name: "Biology",
    code: "BIOL",
    fullTitle: "General Biology",
    stream: "natural",
    color: "#16a34a", // Green
    keywords: ["biology", "biol", "cell biology", "photosynthesis", "genetics", "ecology", "enzymes", "biomolecules", "microbiology", "cellular respiration", "dna", "rna", "evolution", "human physiology"]
  },
  {
    name: "Physics",
    code: "PHYS",
    fullTitle: "General Physics",
    stream: "natural",
    color: "#4f46e5", // Indigo
    keywords: ["physics", "phys", "mechanics", "kinematics", "dynamics", "thermodynamics", "electromagnetism", "optics", "vectors", "newton", "oscillations", "waves", "electric fields", "energy conservation"]
  },
  {
    name: "Chemistry",
    code: "CHEM",
    fullTitle: "General Chemistry",
    stream: "natural",
    color: "#ea580c", // Orange
    keywords: ["chemistry", "chem", "atomic structure", "periodic table", "chemical bonding", "stoichiometry", "chemical equilibrium", "thermodynamics", "electrochemistry", "acids and bases", "solutions", "kinetics"]
  },
  {
    name: "Logic & Critical Thinking",
    code: "LOGIC",
    fullTitle: "Logic and Critical Thinking",
    stream: "common",
    color: "#9333ea", // Purple
    keywords: ["logic", "critical thinking", "arguments", "fallacy", "fallacies", "deductive", "inductive", "syllogism", "categorical", "proposition", "informal fallacies", "reasoning", "philosophy"]
  },
  {
    name: "Communicative English",
    code: "ENGL",
    fullTitle: "Communicative English Language Skills I & II",
    stream: "common",
    color: "#0284c7", // Sky Blue
    keywords: ["english", "communicative", "grammar", "reading skills", "writing skills", "listening", "paragraph writing", "essay", "tenses", "vocabulary", "comprehension", "speaking"]
  },
  {
    name: "Moral & Civic Education",
    code: "CIVIC",
    fullTitle: "Moral and Civic Education",
    stream: "common",
    color: "#b45309", // Amber
    keywords: ["civic", "civics", "moral", "ethics", "ethical", "citizenship", "democracy", "human rights", "constitution", "governance", "justice", "rule of law", "patriotism"]
  },
  {
    name: "Economics",
    code: "ECON",
    fullTitle: "Introduction to Economics",
    stream: "social",
    color: "#059669", // Emerald
    keywords: ["economics", "econ", "microeconomics", "macroeconomics", "demand and supply", "elasticity", "market structure", "gdp", "inflation", "fiscal policy", "monetary policy", "production theory"]
  },
  {
    name: "History",
    code: "HIST",
    fullTitle: "History of Ethiopia and the Horn",
    stream: "social",
    color: "#c2410c", // Red-orange
    keywords: ["history", "hist", "ethiopian history", "horn of africa", "aksum", "zagwe", "solomonic", "gondar", "adwa", "battle of adwa", "state formation", "historiography", "peoples and cultures"]
  },
  {
    name: "Social Anthropology",
    code: "ANTH",
    fullTitle: "Social Anthropology",
    stream: "social",
    color: "#be185d", // Pink
    keywords: ["anthropology", "anth", "culture", "ethnography", "marriage and family", "kinship", "indigenous knowledge", "cultural diversity", "ethnicity", "customary systems"]
  },
  {
    name: "Emerging Technologies",
    code: "EMTECH",
    fullTitle: "Introduction to Emerging Technologies",
    stream: "common",
    color: "#0891b2", // Cyan
    keywords: ["emerging technologies", "emtech", "artificial intelligence", "ai", "machine learning", "internet of things", "iot", "cloud computing", "big data", "data science", "blockchain", "augmented reality", "cyber security"]
  },
  {
    name: "Computer Programming",
    code: "COMP",
    fullTitle: "Introduction to Computing & Programming",
    stream: "natural",
    color: "#334155", // Slate
    keywords: ["computing", "programming", "python", "c++", "algorithm", "flowchart", "variables", "data types", "loops", "functions", "oop", "arrays"]
  },
  {
    name: "Inclusiveness",
    code: "INCL",
    fullTitle: "Inclusiveness",
    stream: "common",
    color: "#475569", // Neutral Slate
    keywords: ["inclusiveness", "disability", "special needs", "inclusive education", "accessibility", "vulnerability", "intervention"]
  },
  {
    name: "Global Trends",
    code: "GLOB",
    fullTitle: "Global Trends & International Relations",
    stream: "social",
    color: "#0369a1", // Ocean
    keywords: ["global trends", "international relations", "globalization", "foreign policy", "diplomacy", "regional integration", "security"]
  }
];

// ============================================================================
// 2. CREDENTIAL MANAGEMENT
// ============================================================================
function getActiveCredentials() {
  const storedUrl = localStorage.getItem("study_notes_supabase_url");
  const storedKey = localStorage.getItem("study_notes_supabase_key");

  const url = (storedUrl && storedUrl.startsWith("https://"))
    ? storedUrl.trim()
    : (DEFAULT_SUPABASE_URL.startsWith("https://") ? DEFAULT_SUPABASE_URL.trim() : "");

  const key = (storedKey && storedKey.length > 20)
    ? storedKey.trim()
    : (DEFAULT_SUPABASE_ANON_KEY && DEFAULT_SUPABASE_ANON_KEY.length > 20 ? DEFAULT_SUPABASE_ANON_KEY.trim() : "");

  return { url, key };
}

function saveCredentials(url, key) {
  if (url) localStorage.setItem("study_notes_supabase_url", url.trim());
  if (key) localStorage.setItem("study_notes_supabase_key", key.trim());
  initClient();
}

function clearCredentials() {
  localStorage.removeItem("study_notes_supabase_url");
  localStorage.removeItem("study_notes_supabase_key");
  supabaseClient = null;
}

const isConfigured = () => {
  const { url, key } = getActiveCredentials();
  return Boolean(url && key && url.startsWith("https://") && key.length > 20);
};

let supabaseClient = null;

function initClient() {
  const { url, key } = getActiveCredentials();
  if (url && key && typeof window.supabase !== "undefined") {
    try {
      supabaseClient = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      window.AppConfig.supabaseClient = supabaseClient;
      return supabaseClient;
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      return null;
    }
  }
  return null;
}

if (typeof window.supabase !== "undefined") {
  initClient();
}

// ============================================================================
// 3. SMART DOCUMENT IDENTIFICATION ALGORITHM
// ============================================================================
function smartIdentifyDocument({ filename = "", textContent = "", mimeType = "" }) {
  const result = {
    title: "",
    subject: "General Academic",
    subjectCode: "GEN",
    category: "notes",       // 'notes', 'questions', 'exam', 'summary', 'image'
    chapter: null,           // number: 1, 2, ...
    chapterLabel: "",
    stream: "common",        // 'natural', 'social', 'common'
    fileType: "html",        // 'html' or 'image'
    confidence: "medium",
    detectionNotes: []
  };

  const lowerName = filename.toLowerCase();
  const lowerContent = (textContent || "").slice(0, 8000).toLowerCase();
  const combined = `${lowerName} ${lowerContent}`;

  // 1. Detect File Type
  if (mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(filename)) {
    result.fileType = "image";
    result.category = "image";
  } else {
    result.fileType = "html";
  }

  // 2. Identify Category
  if (/\b(model[-_\s]?exam|final[-_\s]?exam|mid[-_\s]?exam|national[-_\s]?exam)\b/i.test(combined)) {
    result.category = "exam";
    result.detectionNotes.push("Identified as Model / Final Exam");
  } else if (/\b(question|questions|quiz|test|review[-_\s]?exercises?|practice)\b/i.test(combined)) {
    result.category = "questions";
    result.detectionNotes.push("Identified as Practice Questions");
  } else if (/\b(summary|overview|cheat[-_\s]?sheet|handout)\b/i.test(combined)) {
    result.category = "summary";
    result.detectionNotes.push("Identified as Course Summary / Review");
  } else if (result.fileType === "image") {
    result.category = "image";
  } else {
    result.category = "notes";
    result.detectionNotes.push("Identified as Lecture Study Notes");
  }

  // 3. Identify Chapter Number
  const chMatch = lowerName.match(/(?:chapter|ch|unit)[-_.\s]*(\d{1,2})/i) ||
    lowerContent.match(/<h[1-3][^>]*>[\s\S]*?(?:chapter|ch|unit)\s*(\d{1,2})/i) ||
    lowerContent.match(/(?:chapter|unit)\s*(\d{1,2})/i);

  if (chMatch) {
    const num = parseInt(chMatch[1], 10);
    if (!isNaN(num) && num > 0 && num <= 20) {
      result.chapter = num;
      result.chapterLabel = `Chapter ${num}`;
      result.detectionNotes.push(`Extracted ${result.chapterLabel}`);
    }
  }

  // 4. Identify Subject using scoring heuristic
  let bestSubject = null;
  let highestScore = 0;

  SUBJECTS_CATALOG.forEach((subj) => {
    let score = 0;
    subj.keywords.forEach((kw) => {
      const cleanKw = kw.toLowerCase().trim();
      if (!cleanKw) return;

      // Match against filename (higher weight)
      if (lowerName.includes(cleanKw)) {
        score += 8;
      }

      // Match against document content
      if (lowerContent.includes(cleanKw)) {
        score += 3;
      }
    });

    if (score > highestScore) {
      highestScore = score;
      bestSubject = subj;
    }
  });

  if (bestSubject && highestScore >= 3) {
    result.subject = bestSubject.name;
    result.subjectCode = bestSubject.code;
    result.stream = bestSubject.stream;
    result.confidence = highestScore >= 8 ? "high" : "medium";
    result.detectionNotes.push(`Auto-detected subject: ${bestSubject.name} (${result.confidence} confidence)`);
  } else {
    result.detectionNotes.push("Defaulted to General Academic");
  }

  // 5. Generate Smart Title
  let extractedTitle = "";
  if (result.fileType === "html" && textContent) {
    const titleMatch = textContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      const raw = titleMatch[1].trim();
      if (raw.length > 3 && raw.length < 100 && !/^(untitled|document|index)$/i.test(raw)) {
        extractedTitle = raw;
      }
    }
    if (!extractedTitle) {
      const h1Match = textContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match && h1Match[1]) {
        const raw = h1Match[1].trim();
        if (raw.length > 3 && raw.length < 100) {
          extractedTitle = raw;
        }
      }
    }
  }

  if (extractedTitle) {
    result.title = extractedTitle;
  } else {
    const subjectPrefix = result.subject !== "General Academic" ? result.subject : "";
    const chapterPart = result.chapter ? `Chapter ${result.chapter}` : "";
    let categoryPart = "Study Notes";

    if (result.category === "exam") categoryPart = "Model Exam & Questions";
    else if (result.category === "questions") categoryPart = "Review Questions";
    else if (result.category === "summary") categoryPart = "Key Concepts Summary";
    else if (result.category === "image") categoryPart = "Diagram & Chart";

    const parts = [subjectPrefix, chapterPart, categoryPart].filter(Boolean);
    result.title = parts.length > 0 ? parts.join(" – ") : cleanFilename(filename);
  }

  return result;
}

function cleanFilename(filename) {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// ============================================================================
// 4. STORAGE & DATABASE HELPERS
// ============================================================================
function getNotesPublicUrl(filePath) {
  if (!supabaseClient || !filePath) return null;
  const cleanPath = filePath.startsWith("/") ? filePath.substring(1) : filePath;
  const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(cleanPath);
  if (!data || !data.publicUrl) return null;
  const cacheBuster = `t=${Date.now()}`;
  const separator = data.publicUrl.includes("?") ? "&" : "?";
  return `${data.publicUrl}${separator}${cacheBuster}`;
}

/**
 * Fetch all study materials
 */
async function fetchPublishedMaterials(filter = {}) {
  if (!supabaseClient) {
    return { data: [], error: "Supabase client is not configured." };
  }

  try {
    // 1. Try querying the rich study_materials database table
    let query = supabaseClient
      .from("study_materials")
      .select("*")
      .eq("is_published", true)
      .order("subject", { ascending: true })
      .order("chapter", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (filter.subject && filter.subject !== "all") {
      query = query.eq("subject", filter.subject);
    }
    if (filter.stream && filter.stream !== "all") {
      query = query.in("stream", [filter.stream, "common"]);
    }
    if (filter.category && filter.category !== "all") {
      query = query.eq("category", filter.category);
    }

    const { data: dbData, error: dbError } = await query;

    if (!dbError && dbData && dbData.length > 0) {
      return { data: dbData, error: null, source: "database" };
    }

    // 2. Fallback: Query storage bucket directly and run smart identification
    const { data: storageFiles, error: storageErr } = await listAllStorageFiles();
    if (storageErr) {
      return { data: dbData || [], error: storageErr, source: "storage" };
    }

    const synthesized = (storageFiles || []).map((file) => {
      const smart = smartIdentifyDocument({ filename: file.name });
      return {
        id: file.id || file.name,
        title: smart.title,
        storage_path: file.name,
        file_name: file.name,
        file_type: smart.fileType,
        mime_type: smart.fileType === "html" ? "text/html" : "image/jpeg",
        file_size: file.metadata ? file.metadata.size : 0,
        subject: smart.subject,
        subject_code: smart.subjectCode,
        category: smart.category,
        chapter: smart.chapter,
        chapter_label: smart.chapterLabel,
        stream: smart.stream,
        description: "",
        is_published: true,
        created_at: file.created_at || new Date().toISOString(),
        updated_at: file.updated_at || new Date().toISOString(),
      };
    });

    return { data: synthesized, error: null, source: "fallback" };
  } catch (err) {
    console.error("fetchPublishedMaterials error:", err);
    return { data: [], error: err.message || "Failed to retrieve materials." };
  }
}

/**
 * List raw files directly from Supabase Storage
 */
async function listAllStorageFiles() {
  if (!supabaseClient) return { data: [], error: "Supabase client is not configured." };

  try {
    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .list("", { limit: 150, sortBy: { column: "name", order: "asc" } });

    if (error) return { data: [], error: error.message };

    const validFiles = (data || []).filter((item) => {
      const name = item.name.toLowerCase();
      return (
        !name.startsWith(".") &&
        (name.endsWith(".html") ||
          name.endsWith(".htm") ||
          name.endsWith(".png") ||
          name.endsWith(".jpg") ||
          name.endsWith(".jpeg") ||
          name.endsWith(".webp") ||
          name.endsWith(".svg"))
      );
    });

    return { data: validFiles, error: null };
  } catch (err) {
    return { data: [], error: err.message || "Failed to list storage." };
  }
}

/**
 * Upload a document or image to Supabase Storage with clean upsert & detailed errors
 */
async function uploadMaterialFile(file, storagePath, mimeType) {
  if (!supabaseClient) throw new Error("Supabase client is not initialized.");

  // Check active session
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData || !sessionData.session) {
    throw new Error("You are not signed in. Please log in to the Admin Portal to upload files.");
  }

  let determinedMime = mimeType;
  if (!determinedMime || determinedMime === "application/octet-stream") {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (ext === "html" || ext === "htm") determinedMime = "text/html";
    else if (ext === "png") determinedMime = "image/png";
    else if (ext === "jpg" || ext === "jpeg") determinedMime = "image/jpeg";
    else if (ext === "webp") determinedMime = "image/webp";
    else if (ext === "svg") determinedMime = "image/svg+xml";
    else determinedMime = "text/html";
  }

  const cleanPath = storagePath.startsWith("/") ? storagePath.substring(1) : storagePath;

  const { data, error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .upload(cleanPath, file, {
      upsert: true,
      contentType: determinedMime,
      cacheControl: "0",
    });

  if (error) {
    console.error("Storage upload error:", error);
    if (error.message && (error.message.includes("row-level security") || error.message.includes("policy"))) {
      throw new Error(`Upload blocked by Supabase Row Level Security policy. Please execute the updated SQL script in 'supabase/schema.sql' in your Supabase SQL Editor.`);
    }
    if (error.statusCode === "404" || (error.message && error.message.includes("Bucket not found"))) {
      throw new Error(`Storage bucket '${BUCKET_NAME}' was not found. Please run 'supabase/schema.sql' in your Supabase SQL Editor.`);
    }
    throw error;
  }
  return data;
}

/**
 * Upsert metadata record to public.study_materials
 */
async function saveMaterialMetadata(materialRecord) {
  if (!supabaseClient) return { error: "Supabase client not initialized." };

  try {
    const cleanPath = materialRecord.storage_path.startsWith("/")
      ? materialRecord.storage_path.substring(1)
      : materialRecord.storage_path;

    const payload = {
      title: materialRecord.title,
      storage_path: cleanPath,
      file_name: materialRecord.file_name,
      file_type: materialRecord.file_type || "html",
      mime_type: materialRecord.mime_type || "text/html",
      file_size: materialRecord.file_size || 0,
      subject: materialRecord.subject,
      subject_code: materialRecord.subject_code || "GEN",
      category: materialRecord.category || "notes",
      chapter: materialRecord.chapter ? parseInt(materialRecord.chapter, 10) : null,
      chapter_label: materialRecord.chapter_label || (materialRecord.chapter ? `Chapter ${materialRecord.chapter}` : ""),
      stream: materialRecord.stream || "common",
      description: materialRecord.description || "",
      is_published: true,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from("study_materials")
      .upsert(payload, { onConflict: "storage_path" })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Could not save to study_materials table (schema might need running):", error.message);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.warn("saveMaterialMetadata fallback caught:", err);
    return { data: null, error: err.message };
  }
}

/**
 * Delete a study material from both storage and database
 */
async function deleteMaterial(storagePath, recordId) {
  if (!supabaseClient) throw new Error("Supabase client is not initialized.");
  const cleanPath = storagePath.startsWith("/") ? storagePath.substring(1) : storagePath;

  const { error: storageError } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .remove([cleanPath]);

  if (storageError) {
    console.warn("Storage deletion warning:", storageError.message);
  }

  try {
    if (recordId) {
      await supabaseClient.from("study_materials").delete().eq("id", recordId);
    } else {
      await supabaseClient.from("study_materials").delete().eq("storage_path", cleanPath);
    }
  } catch (dbErr) {
    console.warn("Database deletion note:", dbErr);
  }

  return { success: true };
}

// Export to window
window.AppConfig = {
  BUCKET_NAME,
  SUBJECTS_CATALOG,
  getActiveCredentials,
  saveCredentials,
  clearCredentials,
  isConfigured,
  supabaseClient,
  initClient,
  smartIdentifyDocument,
  getNotesPublicUrl,
  fetchPublishedMaterials,
  listAllStorageFiles,
  uploadMaterialFile,
  saveMaterialMetadata,
  deleteMaterial,
};
