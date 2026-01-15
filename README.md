# MedLens - Medical Document Companion

> **⚠️ IMPORTANT DISCLAIMER**  
> MedLens is a personal health information organizer for educational purposes only.  
> It is NOT a medical device and should NOT be used for clinical decisions.  
> Always consult qualified healthcare professionals for medical advice.

---

## 🏥 What is MedLens?

MedLens helps you organize, understand, and track your medical documents using AI. Upload lab reports, prescriptions, or imaging results and get:

- 📊 Structured data extraction from medical documents
- 📈 Health trends visualization over time
- 🌍 Multi-language explanations (12 languages)
- 📱 Works offline (PWA)
- 📤 Export to FHIR/CSV formats

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Google AI API Key (free tier available)

### Installation

```bash
# Clone/extract the project
cd medlens

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
```

### Configure API Keys

Edit `.env.local`:
```env
# Server-side keys (NEVER use NEXT_PUBLIC_ for secrets!)
GOOGLE_API_KEY=AIzaSy...your-key-here
HF_TOKEN=hf_...your-token-here

# Enable real API
NEXT_PUBLIC_USE_REAL_API=true
```

### Run

```bash
npm run dev
# Open http://localhost:3000
```

---

## 🔒 Security Architecture

### API Key Protection
```
❌ WRONG: NEXT_PUBLIC_API_KEY (exposed in browser)
✅ RIGHT: API_KEY (server-side only via /api routes)
```

All API calls go through server-side routes:
- `/api/analyze` - Document analysis (secure)
- `/api/process` - Legacy processing

### Data Storage
- **Local only**: All data stored in browser localStorage
- **No server storage**: We don't store your medical data
- **You control deletion**: Clear browser data to remove everything

---

## ⚖️ Regulatory Positioning

### Current Status: Personal Wellness Tool
MedLens is positioned as a **personal health information organizer**, NOT a medical device.

| Capability | Status |
|------------|--------|
| Document OCR/extraction | ✅ Allowed |
| Data visualization | ✅ Allowed |
| Plain language explanations | ✅ Allowed |
| Clinical diagnosis | ❌ NOT supported |
| Treatment recommendations | ❌ NOT supported |
| Medical device claims | ❌ NOT made |

### FDA Considerations
Under current positioning, MedLens falls under **"general wellness"** category per FDA guidance on wellness apps. This exemption applies because:
1. We don't claim to diagnose or treat diseases
2. We don't make clinical recommendations  
3. We explicitly state this is for educational purposes

### HIPAA Considerations
For individual consumer use (B2C):
- Users upload their OWN documents
- Data stays on user's device
- No covered entity relationship

⚠️ **For B2B/Healthcare deployment**: Full HIPAA compliance would be required.

---

## 🛡️ Required Disclaimers

These disclaimers MUST be shown to users:

```
"MedLens is for educational purposes only. It is not a medical 
device and should not be used for diagnosis or treatment decisions. 
Always consult qualified healthcare professionals."

"AI can make errors. Always verify extracted information against 
your original documents."

"If you are experiencing a medical emergency, call 911 immediately."
```

---

## 📁 Project Structure

```
medlens/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/      # Secure API route ⭐
│   │   │   └── process/      # Legacy route
│   │   ├── page.tsx          # Main app
│   │   └── layout.tsx        # PWA setup
│   ├── components/
│   │   ├── DocumentUpload.tsx
│   │   ├── HealthDashboard.tsx
│   │   ├── MedicationChecker.tsx
│   │   ├── Disclaimers.tsx   # Legal components ⭐
│   │   └── ...
│   ├── lib/
│   │   ├── medgemma.ts       # AI integration
│   │   ├── fhir-export.ts    # Healthcare export
│   │   └── store.ts          # State management
│   └── types/
│       └── medical.ts        # TypeScript types
├── public/
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker
└── .env.example              # Environment template
```

---

## 🔧 Production Deployment Checklist

### Before Going Live

- [ ] Move ALL API keys to server-side (no `NEXT_PUBLIC_` secrets)
- [ ] Add consent modal on first use
- [ ] Display disclaimers on every page
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Add rate limiting to API routes
- [ ] Enable HTTPS only
- [ ] Add Content Security Policy headers
- [ ] Test with real medical documents

### For Healthcare/B2B Deployment (Additional)

- [ ] Implement user authentication
- [ ] Add encryption for stored data
- [ ] Set up audit logging
- [ ] Complete HIPAA risk assessment
- [ ] Sign BAA with cloud providers
- [ ] Obtain legal review
- [ ] Consider FDA 510(k) if making clinical claims

---

## 🧪 Testing

```bash
# Run type checking  
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build
```

### Test with Sample Documents
Use the included `sample-lab-report.html` or `sample-lab-report.png` for testing.

---

## 📊 Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| AI - Vision | Google Gemini 1.5 Flash |
| AI - Text | HuggingFace Inference API |
| Export | FHIR R4, CSV |
| PWA | Service Worker |

---

## ⚠️ Known Limitations

1. **MedGemma Access**: The actual MedGemma 1.5 4B model requires gated access approval from Google. Currently using Gemini 1.5 Flash as fallback.

2. **Drug Interactions**: The medication checker provides general information only. Use validated databases (DrugBank, RxNorm) for production.

3. **OCR Accuracy**: Complex or handwritten documents may not extract correctly. Always verify against originals.

4. **Local Storage**: Browser localStorage has size limits (~5-10MB). Heavy users may need data export.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Ensure no sensitive data in commits
4. Add appropriate disclaimers for new features
5. Submit pull request

---

## 📄 License

MIT License - See LICENSE file

---

## ⚠️ Final Reminder

**This is NOT a medical device.**  
**AI can make errors.**  
**Always consult healthcare professionals.**

---

Built with ❤️ for the Kaggle Health AI Hackathon
