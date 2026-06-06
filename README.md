# Smart Resume Analyzer

> **AI-powered resume analysis** — upload a PDF, get an instant professional breakdown of your skills, score, and gaps.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0-black?logo=flask)
![Chart.js](https://img.shields.io/badge/Chart.js-4.4-FF6384?logo=chartdotjs&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Project Overview

**Smart Resume Analyzer** is a full-stack portfolio web application that allows users to upload their PDF resume and receive an instant, detailed professional analysis. The backend parses resume text, identifies skills across seven technology categories, computes a weighted quality score, flags missing high-demand technologies, and generates personalised recommendations.

Built as a showcase-quality portfolio project with production coding conventions — clean architecture, proper error handling, RESTful API design, and a premium frontend UI.

---

## Features

| Feature | Description |
|---|---|
| 📤 **Drag & Drop Upload** | Intuitive PDF upload with file validation and preview |
| 🔍 **Text Extraction** | PyPDF2 multi-page extraction with normalisation |
| 🧠 **Skill Detection** | 80+ technologies across 7 categories matched via regex |
| 📊 **5-Dimension Scoring** | Weighted scoring: Skill Breadth, Content Depth, Tech Diversity, Modern Stack, Professional Signals |
| 🚨 **Gap Analysis** | Missing high-demand skills against industry benchmark list |
| 💡 **Recommendations** | Context-sensitive, priority-ranked actionable insights |
| 📈 **Interactive Charts** | Skill distribution (bar), score dimensions (radar), composite score (donut) |
| 🔒 **Privacy First** | Files deleted immediately post-analysis; no data persisted |
| 📱 **Responsive** | Mobile-friendly layout across all breakpoints |

---

## Tech Stack

**Backend**
- Python 3.10+
- Flask 3.0
- PyPDF2 3.0 — PDF text extraction
- Gunicorn — WSGI production server

**Frontend**
- Vanilla JavaScript (ES2022, no framework)
- Chart.js 4.4 — interactive data visualisations
- CSS custom properties + CSS Grid/Flexbox
- Google Fonts: Syne (display) + DM Sans (body)

---

## Project Structure

```
smart-resume-analyzer/
├── app.py                  # Flask app, routes, analysis engine
├── requirements.txt
├── .env.example
├── README.md
├── uploads/                # Temp upload dir (files deleted post-analysis)
├── templates/
│   └── index.html          # Single-page application shell
└── static/
    ├── css/
    │   └── style.css       # Design system + component styles
    └── js/
        └── script.js       # Upload logic, API client, chart renderers
```

---

## Installation

### Prerequisites
- Python 3.10 or higher
- pip

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/smart-resume-analyzer.git
cd smart-resume-analyzer

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. (Optional) Set environment variables
cp .env.example .env
# Edit .env → set SECRET_KEY for production

# 5. Run the development server
python app.py
```

Open **http://localhost:5000** in your browser.

### Production Deployment

```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

---

## API Reference

### `POST /api/analyze`

Accepts a multipart PDF upload and returns a structured JSON analysis.

**Request**
```
Content-Type: multipart/form-data
Field: resume (PDF file, max 10 MB)
```

**Response**
```json
{
  "status": "success",
  "analyzed_at": "2024-06-01T12:00:00Z",
  "score": {
    "composite": 74,
    "grade": "B+",
    "breakdown": {
      "Skill Breadth": 22,
      "Content Depth": 20,
      "Tech Diversity": 16,
      "Modern Stack": 12,
      "Professional Signals": 4
    },
    "word_count": 612,
    "total_skills": 18
  },
  "detected_skills": {
    "Programming Languages": ["Python", "JavaScript"],
    "Web Technologies": ["React", "Flask", "Node.Js"]
  },
  "missing_skills": ["Docker", "Kubernetes", "Terraform"],
  "recommendations": [
    {
      "title": "Add Cloud Expertise",
      "message": "No cloud platform detected...",
      "level": "high"
    }
  ],
  "meta": {
    "word_count": 612,
    "total_skills": 18,
    "categories_covered": 5
  }
}
```

---

## Scoring Methodology

| Dimension | Max | How it's calculated |
|---|---|---|
| Skill Breadth | 30 | `min(30, total_skills × 1.8)` |
| Content Depth | 20 | Word count tiers (150 / 350 / 600+) |
| Tech Diversity | 20 | Categories covered × 4 |
| Modern Stack | 20 | Power-skill hits × 4 |
| Professional Signals | 10 | Regex matches for GitHub, projects, education, certs |

---

## Screenshots

> _Add screenshots here after running the project locally._

| Section | Preview |
|---|---|
| Landing Hero | _(screenshot)_ |
| Upload Zone | _(screenshot)_ |
| Results Dashboard | _(screenshot)_ |
| Skill Charts | _(screenshot)_ |

---

## Future Enhancements

- [ ] **OpenAI / Gemini integration** — LLM-powered narrative resume feedback
- [ ] **ATS Compatibility Score** — detect formatting issues that fail ATS parsers
- [ ] **Job Description Matching** — paste a JD and get a match % against resume
- [ ] **Exported PDF Report** — downloadable analysis report
- [ ] **Resume Version History** — compare multiple uploads over time
- [ ] **LinkedIn Profile Import** — fetch data via URL instead of PDF
- [ ] **Dark / Light mode toggle**

---

## License

MIT © 2024 Bharath

---

> Built with Flask, PyPDF2, and Chart.js. Portfolio-grade code — no shortcuts.
