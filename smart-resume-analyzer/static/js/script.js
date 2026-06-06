/**
 * Smart Resume Analyzer — Frontend Controller
 * Handles: drag-and-drop upload, API communication,
 *          dynamic DOM rendering, and Chart.js visualisations.
 */

"use strict";

// ─── DOM References ────────────────────────────────────────────────────────

const dropZone        = document.getElementById("drop-zone");
const fileInput       = document.getElementById("file-input");
const filePreview     = document.getElementById("file-preview");
const dropInner       = dropZone.querySelector(".drop-zone__inner");
const fileNameEl      = document.getElementById("file-name");
const fileSizeEl      = document.getElementById("file-size");
const removeFileBtn   = document.getElementById("remove-file");

const analyzeBtn      = document.getElementById("analyze-btn");
const btnText         = document.getElementById("btn-text");
const btnSpinner      = document.getElementById("btn-spinner");

const uploadError     = document.getElementById("upload-error");
const progressWrap    = document.getElementById("progress-wrap");
const progressBar     = document.getElementById("progress-bar");
const progressLabel   = document.getElementById("progress-label");

const resultsSection  = document.getElementById("results-section");
const uploadSection   = document.getElementById("upload-section");
const restartBtn      = document.getElementById("restart-btn");

// Results DOM targets
const scoreValue      = document.getElementById("score-value");
const scoreHeadline   = document.getElementById("score-headline");
const gradeBadge      = document.getElementById("grade-badge");
const skillCountBadge = document.getElementById("skill-count-badge");
const wordCountBadge  = document.getElementById("word-count-badge");
const scoreSummary    = document.getElementById("score-summary");
const breakdownBars   = document.getElementById("breakdown-bars");
const skillsByCategory= document.getElementById("skills-by-category");
const detectedCount   = document.getElementById("detected-count");
const missingSkillsList= document.getElementById("missing-skills-list");
const recsGrid        = document.getElementById("recommendations-grid");

// Chart instances (stored for potential re-renders)
let scoreRingChart = null;
let skillBarChart  = null;
let radarChart     = null;

// Active file reference
let selectedFile = null;


// ─── Drag & Drop ───────────────────────────────────────────────────────────

dropZone.addEventListener("click", (e) => {
  // Allow remove button to work without triggering file picker
  if (e.target.closest("#remove-file")) return;
  fileInput.click();
});

dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) applyFile(file);
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) applyFile(fileInput.files[0]);
});

removeFileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  clearFile();
});


// ─── File Handling ─────────────────────────────────────────────────────────

/**
 * Validate and register the selected file, then update UI.
 * @param {File} file
 */
function applyFile(file) {
  clearError();

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showError("Only PDF files are supported. Please select a .pdf file.");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError("File size exceeds the 10 MB limit.");
    return;
  }

  selectedFile = file;

  // Show preview
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatBytes(file.size);
  dropInner.classList.add("hidden");
  filePreview.classList.remove("hidden");

  // Enable submit
  analyzeBtn.disabled = false;
  btnText.textContent  = "Analyze Resume";
}

function clearFile() {
  selectedFile       = null;
  fileInput.value    = "";
  filePreview.classList.add("hidden");
  dropInner.classList.remove("hidden");
  analyzeBtn.disabled = true;
  btnText.textContent  = "Select a file to begin";
  clearError();
}

function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}


// ─── Error Handling ────────────────────────────────────────────────────────

function showError(msg) {
  uploadError.textContent = `⚠ ${msg}`;
  uploadError.classList.remove("hidden");
}

function clearError() {
  uploadError.textContent = "";
  uploadError.classList.add("hidden");
}


// ─── Progress Simulation ───────────────────────────────────────────────────

const PROGRESS_STEPS = [
  { pct: 15, label: "Uploading PDF…"         },
  { pct: 35, label: "Extracting text…"        },
  { pct: 60, label: "Detecting skills…"       },
  { pct: 80, label: "Calculating score…"      },
  { pct: 95, label: "Building insights…"      },
  { pct: 100, label: "Analysis complete ✓"   },
];

let progressInterval = null;
let currentStep      = 0;

function startProgress() {
  currentStep = 0;
  progressWrap.classList.remove("hidden");
  setProgress(0, "Preparing…");
}

function advanceProgress() {
  if (currentStep >= PROGRESS_STEPS.length) return;
  const { pct, label } = PROGRESS_STEPS[currentStep];
  setProgress(pct, label);
  currentStep++;
}

function setProgress(pct, label) {
  progressBar.style.width          = `${pct}%`;
  progressBar.setAttribute("aria-valuenow", pct);
  progressLabel.textContent         = label;
}

function stopProgress() {
  clearInterval(progressInterval);
  progressInterval = null;
  progressWrap.classList.add("hidden");
  setProgress(0, "");
  currentStep = 0;
}


// ─── Analysis Request ──────────────────────────────────────────────────────

analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  clearError();

  // Lock UI
  analyzeBtn.disabled = true;
  btnText.textContent  = "Analyzing…";
  btnSpinner.classList.remove("hidden");

  startProgress();
  // Stagger progress steps during network round-trip
  progressInterval = setInterval(advanceProgress, 600);

  const formData = new FormData();
  formData.append("resume", selectedFile);

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body:   formData,
    });

    const data = await response.json();

    // Stop and complete progress
    clearInterval(progressInterval);
    setProgress(100, "Analysis complete ✓");
    await sleep(500);
    stopProgress();

    if (!response.ok || data.error) {
      showError(data.error || "An unexpected error occurred.");
      resetAnalyzeButton();
      return;
    }

    renderResults(data);

  } catch (err) {
    clearInterval(progressInterval);
    stopProgress();
    showError("Network error — could not reach the server. Please try again.");
    resetAnalyzeButton();
    console.error("[SmartResume] Fetch error:", err);
  }
});

function resetAnalyzeButton() {
  analyzeBtn.disabled = false;
  btnText.textContent  = "Analyze Resume";
  btnSpinner.classList.add("hidden");
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}


// ─── Results Rendering ─────────────────────────────────────────────────────

/**
 * Master renderer — orchestrates all result widgets.
 * @param {Object} data  JSON payload from /api/analyze
 */
function renderResults(data) {
  const { score, detected_skills, missing_skills, recommendations, meta } = data;

  // Scroll past upload into results
  uploadSection.classList.add("hidden");
  resultsSection.classList.remove("hidden");

  renderScoreHero(score, meta);
  renderBreakdownBars(score.breakdown);
  renderDetectedSkills(detected_skills, meta.total_skills);
  renderMissingSkills(missing_skills);
  renderRecommendations(recommendations);

  // Charts need a tick to ensure canvas is visible
  requestAnimationFrame(() => {
    renderSkillBarChart(detected_skills);
    renderRadarChart(score.breakdown);
    renderScoreRing(score.composite);
  });

  resultsSection.scrollIntoView({ behavior: "smooth" });
}


// ── Score Hero ──────────────────────────────────────────────

function renderScoreHero(score, meta) {
  scoreValue.textContent      = score.composite;
  gradeBadge.textContent      = `Grade ${score.grade}`;
  skillCountBadge.textContent = `${meta.total_skills} skill${meta.total_skills !== 1 ? "s" : ""} detected`;
  wordCountBadge.textContent  = `${meta.word_count.toLocaleString()} words`;

  const headline = scoreLabel(score.composite);
  scoreHeadline.textContent   = headline;
  scoreSummary.textContent    = scoreSummaryText(score);
}

function scoreLabel(n) {
  if (n >= 85) return "Outstanding Resume 🏆";
  if (n >= 70) return "Strong Resume";
  if (n >= 55) return "Good Foundation";
  if (n >= 40) return "Needs Improvement";
  return "Getting Started";
}

function scoreSummaryText(score) {
  const { composite, breakdown, word_count, total_skills } = score;
  const weak = Object.entries(breakdown)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([k]) => k)
    .join(" and ");

  return `Your resume scored ${composite}/100 across five dimensions. `
    + `It contains ${total_skills} detected skills and ${word_count} words. `
    + `Focus on improving ${weak} to raise your score.`;
}


// ── Score Ring Chart ────────────────────────────────────────

function renderScoreRing(composite) {
  if (scoreRingChart) { scoreRingChart.destroy(); scoreRingChart = null; }

  const ctx = document.getElementById("score-ring").getContext("2d");
  const remaining = 100 - composite;
  const color = composite >= 70 ? "#2f6bff" : composite >= 50 ? "#f59e0b" : "#ef4444";

  scoreRingChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [composite, remaining],
        backgroundColor: [color, "rgba(255,255,255,0.06)"],
        borderWidth:     0,
        hoverOffset:     0,
      }],
    },
    options: {
      cutout:    "78%",
      animation: { duration: 1000, easing: "easeInOutCubic" },
      plugins:   { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
}


// ── Score Breakdown Bars ────────────────────────────────────

/** Map dimension names to their maximum possible score. */
const DIMENSION_MAX = {
  "Skill Breadth":        30,
  "Content Depth":        20,
  "Tech Diversity":       20,
  "Modern Stack":         20,
  "Professional Signals": 10,
};

function renderBreakdownBars(breakdown) {
  breakdownBars.innerHTML = "";

  Object.entries(breakdown).forEach(([label, pts]) => {
    const max  = DIMENSION_MAX[label] ?? 20;
    const pct  = Math.round((pts / max) * 100);

    const row  = document.createElement("div");
    row.className = "breakdown-row";
    row.innerHTML = `
      <div class="breakdown-row__header">
        <span class="breakdown-row__label">${label}</span>
        <span class="breakdown-row__pts">${pts} / ${max}</span>
      </div>
      <div class="breakdown-track">
        <div class="breakdown-fill" style="width:0%" data-target="${pct}"></div>
      </div>`;

    breakdownBars.appendChild(row);
  });

  // Animate bars after paint
  requestAnimationFrame(() => {
    document.querySelectorAll(".breakdown-fill").forEach((el) => {
      el.style.width = el.dataset.target + "%";
    });
  });
}


// ── Detected Skills ─────────────────────────────────────────

function renderDetectedSkills(detected, total) {
  skillsByCategory.innerHTML = "";
  detectedCount.textContent  = total;

  const entries = Object.entries(detected).filter(([, skills]) => skills.length);

  if (!entries.length) {
    skillsByCategory.innerHTML = `<p style="color:var(--grey-400);font-size:.85rem">No skills detected. Ensure your PDF contains selectable text.</p>`;
    return;
  }

  entries.forEach(([category, skills]) => {
    const catEl = document.createElement("div");
    catEl.className = "skill-category";
    catEl.innerHTML = `
      <p class="skill-category__name">${escapeHtml(category)}</p>
      <div class="skill-chips">
        ${skills.map(s => `<span class="skill-chip">${escapeHtml(s)}</span>`).join("")}
      </div>`;
    skillsByCategory.appendChild(catEl);
  });
}


// ── Missing Skills ──────────────────────────────────────────

function renderMissingSkills(missing) {
  missingSkillsList.innerHTML = "";

  if (!missing.length) {
    missingSkillsList.innerHTML = `<p style="color:var(--success);font-size:.85rem">✓ Great coverage! No critical gaps found.</p>`;
    return;
  }

  missing.forEach((skill) => {
    const item = document.createElement("div");
    item.className = "missing-item";
    item.innerHTML = `<span class="missing-item__dot"></span>${escapeHtml(skill)}`;
    missingSkillsList.appendChild(item);
  });
}


// ── Recommendations ─────────────────────────────────────────

function renderRecommendations(recs) {
  recsGrid.innerHTML = "";

  if (!recs.length) {
    recsGrid.innerHTML = `<p style="color:var(--grey-400);font-size:.85rem">No specific recommendations — keep it up!</p>`;
    return;
  }

  recs.forEach(({ title, message, level }) => {
    const card = document.createElement("div");
    card.className = `rec-card rec-card--${level}`;
    card.innerHTML = `
      <p class="rec-card__title">${escapeHtml(title)}</p>
      <p class="rec-card__msg">${escapeHtml(message)}</p>`;
    recsGrid.appendChild(card);
  });
}


// ─── Charts ────────────────────────────────────────────────────────────────

const CHART_DEFAULTS = {
  font:  { family: "'DM Sans', sans-serif", size: 11 },
  color: "rgba(200,211,232,0.75)",
};

function renderSkillBarChart(detected) {
  if (skillBarChart) { skillBarChart.destroy(); skillBarChart = null; }

  const labels = Object.keys(detected).filter(k => detected[k].length);
  const values = labels.map(k => detected[k].length);

  if (!labels.length) return;

  const ctx = document.getElementById("skill-chart").getContext("2d");

  skillBarChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label:           "Skills",
        data:            values,
        backgroundColor: "rgba(47,107,255,0.65)",
        borderColor:     "rgba(77,131,255,1)",
        borderWidth:     1,
        borderRadius:    4,
        borderSkipped:   false,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           { duration: 900, easing: "easeInOutCubic" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0d1a36",
          titleColor:      "#fff",
          bodyColor:       "#8898b8",
          borderColor:     "rgba(47,107,255,.4)",
          borderWidth:     1,
          callbacks: {
            title: ([item]) => item.label,
            label: (item) => ` ${item.raw} skill${item.raw !== 1 ? "s" : ""}`,
          },
        },
      },
      scales: {
        x: {
          ticks:  { ...CHART_DEFAULTS, maxRotation: 30 },
          grid:   { color: "rgba(255,255,255,0.04)" },
          border: { color: "rgba(255,255,255,0.06)" },
        },
        y: {
          beginAtZero: true,
          ticks:  { ...CHART_DEFAULTS, precision: 0 },
          grid:   { color: "rgba(255,255,255,0.04)" },
          border: { color: "rgba(255,255,255,0.06)" },
        },
      },
    },
  });
}


function renderRadarChart(breakdown) {
  if (radarChart) { radarChart.destroy(); radarChart = null; }

  const labels = Object.keys(breakdown);
  const values = Object.values(breakdown);
  const maxes  = labels.map(l => DIMENSION_MAX[l] ?? 20);

  // Normalise to 0–100 scale for even radar arms
  const normalised = values.map((v, i) => Math.round((v / maxes[i]) * 100));

  const ctx = document.getElementById("radar-chart").getContext("2d");

  radarChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [{
        label:           "Score %",
        data:            normalised,
        backgroundColor: "rgba(47,107,255,0.18)",
        borderColor:     "rgba(77,131,255,0.9)",
        borderWidth:     2,
        pointBackgroundColor: "#2f6bff",
        pointRadius:     4,
        pointHoverRadius:6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           { duration: 900, easing: "easeInOutCubic" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0d1a36",
          titleColor:      "#fff",
          bodyColor:       "#8898b8",
          borderColor:     "rgba(47,107,255,.4)",
          borderWidth:     1,
          callbacks: {
            label: (item) => ` ${item.raw}%`,
          },
        },
      },
      scales: {
        r: {
          min:        0,
          max:        100,
          ticks:      { stepSize: 25, color: "rgba(200,211,232,0.4)", font: { size: 9 }, backdropColor: "transparent" },
          grid:       { color: "rgba(255,255,255,0.06)" },
          angleLines: { color: "rgba(255,255,255,0.06)" },
          pointLabels:{ color: CHART_DEFAULTS.color, font: { size: 10, family: "'DM Sans', sans-serif" } },
        },
      },
    },
  });
}


// ─── Restart ────────────────────────────────────────────────────────────────

restartBtn.addEventListener("click", () => {
  // Reset all state
  clearFile();
  resetAnalyzeButton();
  resultsSection.classList.add("hidden");
  uploadSection.classList.remove("hidden");
  uploadSection.scrollIntoView({ behavior: "smooth" });

  // Destroy charts
  [scoreRingChart, skillBarChart, radarChart].forEach(c => c?.destroy());
  scoreRingChart = skillBarChart = radarChart = null;
});


// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
