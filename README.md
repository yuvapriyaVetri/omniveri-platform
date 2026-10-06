# OmniVeri: Universal Academic Credential & Background Verification Clearinghouse

An enterprise-grade, neutral verification clearinghouse connecting **verifying employers / HR background screening teams** with **120+ accredited partner universities**.

---

## 🏛️ The Paradigm: A Centralized, Common Verification Platform

In real-world hiring, companies (like Google, Microsoft, McKinsey, Tesla, Goldman Sachs) do not build direct integrations with every university in the world. Instead, they rely on a **Universal Clearinghouse (OmniVeri)**.

```
                    ┌──────────────────────────────┐
                    │     Hiring Organizations     │
                    │  (Google, Tesla, Apple, HR)  │
                    └──────────────┬───────────────┘
                                   │ Submits Candidate Applications
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│             OmniVeri Universal Clearinghouse Workstation               │
│                                                                        │
│  [10 PENDING CANDIDATE CASES ASSIGNED TO VERIFIER QUEUE]              │
│                                                                        │
│  Verifier:                                                             │
│  1. Takes candidate's submitted certificate document                   │
│  2. Uploads image/PDF OR scans embedded QR code via webcam / 1-click   │
│  3. Clearinghouse automatically verifies against university registry   │
│  4. Validates SHA-256 cryptographic signature & accreditation status   │
│  5. Issues official Background Verification (BGV) Clearance Report     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│  MIT Reg.    │            │ Stanford Reg.│            │ Oxford Reg.  │
│  (Cryptographic           │ (Cryptographic           │ (Cryptographic
│   Trust Node)│            │  Trust Node) │            │  Trust Node) │
└──────────────┘            └──────────────┘            └──────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Launch the Server
In `C:\Users\kamal jayanthi\.gemini\antigravity\scratch\smart_cert_platform`, run:

```bash
# Windows Command Prompt:
run.bat

# Or PowerShell:
.\run.ps1

# Or directly with Python:
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Open the Platform
Navigate to: **[http://localhost:8000](http://localhost:8000)**

---

## 📋 The 10 Pending Candidate Cases in Your Worklist

| # | Candidate Name | Requesting Employer | Claimed University | Claimed Degree | Expected Verdict |
| :- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Ethan Vance** | **Google Inc.** | MIT | M.S. in Computer Science | **✓ VERIFIED / AUTHENTIC** (Conferred & Validated) |
| **2** | **Aarav Sharma** | **Microsoft** | Stanford University | Ph.D. in Artificial Intelligence | **✓ VERIFIED / AUTHENTIC** (Conferred & Validated) |
| **3** | **Claire Dubois** | **Goldman Sachs** | University of Oxford | M.Sc. in Mathematical Finance | **✓ VERIFIED / AUTHENTIC** (Conferred & Validated) |
| **4** | **Liam Gallagher** | **Tesla Inc.** | University of Cambridge | B.Eng. Robotics & Control | **⚠ REVOKED** (Honor Code Revocation / Expelled) |
| **5** | **Mei-Ling Zhou** | **Apple Inc.** | National University of Singapore | Bachelor of Computing | **✓ VERIFIED / AUTHENTIC** (Conferred & Validated) |
| **6** | **Vikramaditya Roy** | **McKinsey & Co.** | Harvard University | MBA (Forged Summa Cum Laude) | **🚨 FLAGGED FORGERY** (SHA-256 Hash Mismatch) |
| **7** | **Sergei Petrov** | **Amazon AWS** | Saint Petersburg Tech | B.S. in Information Security | **✖ DIPLOMA MILL** (Unaccredited Institution) |
| **8** | **Ananya Patel** | **Pfizer Global** | Imperial College London | M.Sc. in Computational Genomics | **✓ VERIFIED / AUTHENTIC** (Conferred & Validated) |
| **9** | **Marcus Adebayo** | **Siemens Energy** | Apex Global University | B.Eng. in Electronics | **✓ VERIFIED / AUTHENTIC** (Conferred & Validated) |
| **10**| **Jessica Miller** | **Deloitte Advisory**| Apex Global University | Master of Business Admin | **⚠ SUPERSEDED** (Replaced by `CERT-2026-00331`) |

---

## 🔍 How to Test the Verification Flow

1. In the **Verification Queue**, click **"Upload & Verify"** on any candidate card.
2. The verification modal will display the candidate's dossier and their **submitted certificate document** with its embedded QR code.
3. Choose how you want to verify:
   * **1-Click Auto Scan:** Simulates immediate scanning of the candidate's document in 1 second.
   * **Upload Image / File:** Click "Download Test Image" to save the candidate's PNG diploma to your PC, then drag and drop it into the upload box. The in-browser `jsQR` engine reads the QR code and checks the clearinghouse!
   * **Live Webcam Scanner:** Click "Live Webcam" and point your laptop camera at the QR code.
4. Watch the real-time verdict appear (Authentic, Forgery Alarm, Revocation Notice, or Unaccredited Mill).
5. Click **"Generate BGV Clearance Certificate"** to open and print the formal audit report for the hiring company!
6. Click **"Reset 10 Cases"** in the top navigation anytime to reset the queue back to 10 pending cases.
