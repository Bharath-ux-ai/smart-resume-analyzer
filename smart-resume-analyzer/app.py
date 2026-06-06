"""
Smart Resume Analyzer — Flask Backend
Description: Production-grade resume analysis engine using NLP-style keyword
             extraction, scoring heuristics, and structured JSON API responses.
"""

import os
import re
import uuid
import logging
from pathlib import Path
from datetime import datetime
from collections import defaultdict

from flask import Flask, request, jsonify, render_template
import PyPDF2

# ─── App Configuration ───────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = Flask(__name__)
app.config.update(
    MAX_CONTENT_LENGTH=10 * 1024 * 1024,
    UPLOAD_FOLDER=str(UPLOAD_DIR),
    SECRET_KEY=os.environ.get("SECRET_KEY", "dev-secret-change-in-prod"),
    JSON_SORT_KEYS=False,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


# ─── Skill Knowledge Base ─────────────────────────────────────────────────────

SKILL_TAXONOMY: dict = {
    "Programming Languages": [
        "python", "java", "javascript", "typescript", "c++", "c#", "c",
        "go", "rust", "kotlin", "swift", "ruby", "scala", "r", "matlab",
        "php", "perl", "bash", "shell",
    ],
    "Web Technologies": [
        "html", "css", "react", "vue", "angular", "next.js", "nuxt",
        "node.js", "express", "flask", "django", "fastapi", "graphql",
        "rest", "tailwind", "bootstrap", "webpack", "vite",
    ],
    "Databases": [
        "mysql", "postgresql", "mongodb", "redis", "sqlite", "oracle",
        "cassandra", "dynamodb", "elasticsearch", "firebase", "sql",
        "nosql", "neo4j", "mariadb",
    ],
    "Cloud & DevOps": [
        "aws", "azure", "gcp", "google cloud", "docker", "kubernetes",
        "terraform", "ansible", "ci/cd", "jenkins", "github actions",
        "linux", "nginx", "apache", "helm", "prometheus", "grafana",
    ],
    "Tools & Platforms": [
        "git", "github", "gitlab", "bitbucket", "jira", "confluence",
        "figma", "postman", "swagger", "vs code", "intellij", "xcode",
    ],
    "AI / ML": [
        "machine learning", "deep learning", "tensorflow", "pytorch",
        "scikit-learn", "nlp", "computer vision", "pandas", "numpy",
        "matplotlib", "seaborn", "keras", "hugging face", "openai",
    ],
    "Soft Skills": [
        "communication", "leadership", "teamwork", "problem solving",
        "agile", "scrum", "kanban", "critical thinking", "mentoring",
    ],
}

POWER_SKILLS: set = {
    "kubernetes", "terraform", "rust", "go", "typescript", "next.js",
    "fastapi", "pytorch", "tensorflow", "aws", "azure", "gcp",
    "github actions", "graphql", "redis", "elasticsearch",
}

RECOMMENDED_SKILLS: list = [
    "docker", "kubernetes", "aws", "ci/cd", "typescript", "redis",
    "postgresql", "terraform", "graphql", "fastapi", "prometheus",
]


# ─── Text Extraction ──────────────────────────────────────────────────────────

def extract_text_from_pdf(filepath: str) -> str:
    """Extract and normalise all text from a multi-page PDF."""
    text_parts = []
    with open(filepath, "rb") as fh:
        reader = PyPDF2.PdfReader(fh)
        if reader.is_encrypted:
            raise ValueError("Encrypted PDFs are not supported.")
        for page in reader.pages:
            raw = page.extract_text() or ""
            text_parts.append(raw)

    full_text = " ".join(text_parts)
    full_text = re.sub(r"[ \t]+", " ", full_text)
    full_text = re.sub(r"\n{3,}", "\n\n", full_text)
    return full_text.strip()


# ─── Skill Detection ─────────────────────────────────────────────────────────

def detect_skills(text: str) -> dict:
    """Case-insensitive phrase scan across SKILL_TAXONOMY."""
    lower_text = text.lower()
    detected = defaultdict(list)

    for category, skills in SKILL_TAXONOMY.items():
        for skill in skills:
            pattern = r"\b" + re.escape(skill) + r"\b"
            if re.search(pattern, lower_text):
                label = skill.title() if len(skill) > 2 else skill.upper()
                detected[category].append(label)

    return dict(detected)


def compute_missing_skills(detected_flat: list) -> list:
    """Return top skill gaps against RECOMMENDED_SKILLS (max 8)."""
    detected_lower = {s.lower() for s in detected_flat}
    missing = [s.title() for s in RECOMMENDED_SKILLS if s.lower() not in detected_lower]
    return missing[:8]


# ─── Scoring Engine ───────────────────────────────────────────────────────────

def compute_resume_score(text: str, detected: dict) -> dict:
    """Five-dimension weighted scoring returning a 0–100 composite."""
    breakdown = {}
    flat_detected = [s for skills in detected.values() for s in skills]
    total_skills = len(flat_detected)
    word_count = len(text.split())

    # 1. Skill breadth (30 pts)
    breakdown["Skill Breadth"] = min(30, int(total_skills * 1.8))

    # 2. Content richness (20 pts)
    if word_count >= 600:
        breakdown["Content Depth"] = 20
    elif word_count >= 350:
        breakdown["Content Depth"] = 14
    elif word_count >= 150:
        breakdown["Content Depth"] = 8
    else:
        breakdown["Content Depth"] = 3

    # 3. Category diversity (20 pts)
    category_count = len([c for c, s in detected.items() if s])
    breakdown["Tech Diversity"] = min(20, category_count * 4)

    # 4. Modern / power tech (20 pts)
    flat_lower = {s.lower() for s in flat_detected}
    power_hits = flat_lower.intersection(POWER_SKILLS)
    breakdown["Modern Stack"] = min(20, len(power_hits) * 4)

    # 5. Professional signals (10 pts)
    signal_score = 0
    signal_patterns = [
        r"\b(linkedin\.com|github\.com)\b",
        r"\b(experience|worked at|employment)\b",
        r"\b(project[s]?|built|developed|designed)\b",
        r"\b(bachelor|master|degree|university|college)\b",
        r"\b(certification|certified|aws certified)\b",
    ]
    for pat in signal_patterns:
        if re.search(pat, text, re.I):
            signal_score += 2
    breakdown["Professional Signals"] = min(10, signal_score)

    composite = max(0, min(100, sum(breakdown.values())))
    grade = (
        "A+" if composite >= 90 else
        "A"  if composite >= 80 else
        "B+" if composite >= 70 else
        "B"  if composite >= 60 else
        "C+" if composite >= 50 else
        "C"  if composite >= 40 else "D"
    )

    return {
        "composite": composite,
        "grade": grade,
        "breakdown": breakdown,
        "word_count": word_count,
        "total_skills": total_skills,
    }


# ─── Recommendation Engine ────────────────────────────────────────────────────

def generate_recommendations(score_data: dict, detected: dict, missing: list) -> list:
    """Context-aware actionable recommendations (max 6)."""
    recs = []
    composite = score_data["composite"]
    flat_lower = {s.lower() for skills in detected.values() for s in skills}

    def add(title, msg, level="medium"):
        recs.append({"title": title, "message": msg, "level": level})

    cloud_skills = detected.get("Cloud & DevOps", [])
    if not cloud_skills:
        add("Add Cloud Expertise",
            "No cloud platform detected. AWS, Azure, or GCP experience is essential for 85%+ of modern engineering roles.",
            "high")
    elif len(cloud_skills) < 3:
        add("Deepen Cloud Knowledge",
            f"You have {len(cloud_skills)} cloud skill(s). Expand into Terraform or Kubernetes to stand out.",
            "medium")

    if "docker" not in flat_lower:
        add("Learn Docker",
            "Container skills are a baseline expectation. Add Docker to your projects and document it in your resume.",
            "high")

    if not detected.get("AI / ML"):
        add("Explore AI/ML",
            "AI literacy is increasingly valued. Even basic exposure to scikit-learn, pandas, or a small ML project can differentiate you.",
            "low")

    if score_data["word_count"] < 300:
        add("Expand Resume Content",
            "Your resume appears brief. Add quantified achievements under each role — numbers outperform generic responsibilities.",
            "high")

    if "github" not in flat_lower:
        add("Link Your GitHub",
            "Including a GitHub profile URL signals active contribution. Recruiters routinely check public repos.",
            "medium")

    if missing:
        add("Close Skill Gaps",
            f"Top missing technologies: {', '.join(missing[:4])}. A side-project using one of these can significantly improve your profile.",
            "medium")

    if composite < 60:
        add("Earn a Certification",
            "Consider AWS Solutions Architect, Google Cloud Associate, or CKA to validate and boost your profile.",
            "high")

    return recs[:6]


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze_resume():
    """POST /api/analyze — accepts multipart PDF, returns JSON analysis."""
    if "resume" not in request.files:
        return jsonify({"error": "No file field named 'resume' in request."}), 400

    file = request.files["resume"]

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are accepted."}), 415

    safe_name = f"{uuid.uuid4().hex}.pdf"
    save_path = UPLOAD_DIR / safe_name

    try:
        file.save(str(save_path))
        logger.info("Saved upload → %s", safe_name)

        raw_text = extract_text_from_pdf(str(save_path))

        if len(raw_text.strip()) < 50:
            return jsonify({"error": "PDF contains no extractable text. Try a non-scanned PDF."}), 422

        detected_skills   = detect_skills(raw_text)
        flat_skills       = [s for skills in detected_skills.values() for s in skills]
        missing_skills    = compute_missing_skills(flat_skills)
        score_data        = compute_resume_score(raw_text, detected_skills)
        recommendations   = generate_recommendations(score_data, detected_skills, missing_skills)

        payload = {
            "status": "success",
            "analyzed_at": datetime.utcnow().isoformat() + "Z",
            "score": score_data,
            "detected_skills": detected_skills,
            "missing_skills": missing_skills,
            "recommendations": recommendations,
            "meta": {
                "word_count": score_data["word_count"],
                "total_skills": score_data["total_skills"],
                "categories_covered": len([c for c, s in detected_skills.items() if s]),
            },
        }

        return jsonify(payload), 200

    except ValueError as exc:
        logger.warning("Validation error: %s", exc)
        return jsonify({"error": str(exc)}), 422

    except Exception:
        logger.exception("Unexpected error during analysis")
        return jsonify({"error": "Internal analysis failure. Please try again."}), 500

    finally:
        if save_path.exists():
            save_path.unlink()


@app.errorhandler(413)
def request_entity_too_large(_):
    return jsonify({"error": "File exceeds the 10 MB limit."}), 413


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
