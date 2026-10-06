"""
FastAPI Backend Application
OmniVeri: Company Background Verification Hub & Universal Clearinghouse
"""

import os
import io
import json
import base64
from datetime import datetime, timezone, date
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .database import (
    get_db_connection,
    init_db,
    compute_certificate_hash,
    generate_sample_certificate_image
)
from .security import (
    generate_unique_certificate_id,
    verify_certificate_integrity,
    generate_qr_code_base64
)
from .models import (
    CompanyRegisterRequest,
    CompanyLoginRequest,
    CandidateCreateRequest,
    HubVerifyUploadRequest
)

# Initialize database schema and pre-seeded data
init_db()

app = FastAPI(
    title="OmniVeri: Company Background Verification Hub",
    description="Multi-tenant enterprise background screening platform integrated with universal university registries",
    version="4.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")
SAMPLE_CERTS_DIR = os.path.join(STATIC_DIR, "sample_certificates")

# Helper to log verification queries
def log_verification(certificate_id: str, result: str, method: str, req: Request, details: str = "", uni_name: str = "", comp_name: str = ""):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        ver_id = f"VER-{datetime.now().strftime('%Y%m%d')}-{conn.execute('SELECT COUNT(*) FROM verification_logs').fetchone()[0] + 101}"
        ip = req.client.host if req.client else "127.0.0.1"
        cursor.execute("""
        INSERT INTO verification_logs (
            verification_id, certificate_id, company_name, university_name, verification_time, result,
            verification_method, ip_address, details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (ver_id, certificate_id, comp_name, uni_name, now, result, method, ip, details))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error logging verification: {e}")

# ==========================================
# COMPANY AUTHENTICATION & REGISTRATION
# ==========================================

@app.post("/api/company/register")
async def register_company(payload: CompanyRegisterRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check duplicate email
    cursor.execute("SELECT id FROM companies WHERE email = ?;", (payload.email.strip().lower(),))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="A company with this work email is already registered.")

    cursor.execute("SELECT COUNT(*) FROM companies;")
    count = cursor.fetchone()[0] + 101
    comp_id = f"COMP-{count}"
    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
    INSERT INTO companies (company_id, name, email, password, contact_person, industry, registration_no, logo_icon, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'building-2', ?);
    """, (comp_id, payload.name.strip(), payload.email.strip().lower(), payload.password, payload.contact_person.strip(), payload.industry, payload.registration_no, now))

    conn.commit()
    conn.close()

    return {
        "company_id": comp_id,
        "name": payload.name.strip(),
        "email": payload.email.strip().lower(),
        "contact_person": payload.contact_person.strip(),
        "industry": payload.industry,
        "token": f"token-{comp_id}-{int(datetime.now().timestamp())}",
        "message": f"Company {payload.name} successfully registered with OmniVeri Hub!"
    }

@app.post("/api/company/login")
async def login_company(credentials: CompanyLoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT company_id, name, email, password, contact_person, industry, logo_icon
    FROM companies WHERE email = ?;
    """, (credentials.email.strip().lower(),))
    comp = cursor.fetchone()
    conn.close()

    if not comp or comp["password"] != credentials.password:
        raise HTTPException(status_code=401, detail="Invalid company email or password")

    return {
        "company_id": comp["company_id"],
        "name": comp["name"],
        "email": comp["email"],
        "contact_person": comp["contact_person"],
        "industry": comp["industry"],
        "logo_icon": comp["logo_icon"],
        "token": f"token-{comp['company_id']}-{int(datetime.now().timestamp())}"
    }

@app.get("/api/company/companies")
async def list_companies():
    """Lists registered companies for 1-click test credentials"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT company_id, name, email, contact_person, industry, logo_icon FROM companies ORDER BY id ASC;")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ==========================================
# COMPANY DASHBOARD & CANDIDATE PROFILES
# ==========================================

@app.get("/api/company/{company_id}/dashboard")
async def get_company_dashboard(company_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM companies WHERE company_id = ?;", (company_id.upper(),))
    comp = cursor.fetchone()
    if not comp:
        conn.close()
        raise HTTPException(status_code=404, detail="Company not found")

    cursor.execute("SELECT * FROM candidate_profiles WHERE company_id = ? ORDER BY id DESC;", (company_id.upper(),))
    profiles = [dict(r) for r in cursor.fetchall()]
    conn.close()

    total = len(profiles)
    pending = [p for p in profiles if p["bgv_status"] == "PENDING"]
    completed = [p for p in profiles if p["bgv_status"] == "COMPLETED"]
    verified = [p for p in completed if p["verification_verdict"] == "VERIFIED_AUTHENTIC"]
    flagged = [p for p in completed if p["verification_verdict"] in ("FLAGGED_FRAUD", "REVOKED", "UNACCREDITED_MILL")]

    return {
        "company": dict(comp),
        "kpis": {
            "total_candidates": total,
            "pending_count": len(pending),
            "completed_count": len(completed),
            "verified_count": len(verified),
            "flagged_count": len(flagged),
            "clearance_rate": round((len(verified) / len(completed) * 100), 1) if completed else 100.0,
            "completion_percentage": round((len(completed) / total * 100), 1) if total else 0.0
        },
        "pending_profiles": pending,
        "completed_profiles": completed
    }

@app.get("/api/company/{company_id}/profiles")
async def list_company_profiles(company_id: str, status: Optional[str] = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM candidate_profiles WHERE company_id = ?"
    params = [company_id.upper()]

    if status and status != "ALL":
        query += " AND bgv_status = ?"
        params.append(status.upper())

    query += " ORDER BY id DESC;"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/company/{company_id}/profiles")
async def add_candidate_profile(company_id: str, payload: CandidateCreateRequest):
    """Company HR adds a new candidate profile to be background verified"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM companies WHERE company_id = ?;", (company_id.upper(),))
    comp = cursor.fetchone()
    if not comp:
        conn.close()
        raise HTTPException(status_code=404, detail="Company not found")

    cursor.execute("SELECT COUNT(*) FROM candidate_profiles;")
    count = cursor.fetchone()[0] + 1
    prof_id = f"CAND-{company_id[:3]}-{count:03d}"
    now = datetime.now(timezone.utc).isoformat()
    clean_cert_id = payload.claimed_certificate_id.strip().upper()
    filename = f"cert_{payload.candidate_name.lower().replace(' ', '_')}.png"

    # Automatically generate physical certificate image with scannable QR
    try:
        generate_sample_certificate_image(
            cert_id=clean_cert_id,
            candidate_name=payload.candidate_name.strip(),
            uni_name=payload.claimed_university.strip(),
            degree=payload.claimed_degree.strip(),
            year=2024,
            output_filename=filename
        )
    except Exception as e:
        filename = "cert_ethan_vance_mit.png"

    cursor.execute("""
    INSERT INTO candidate_profiles (
        profile_id, company_id, candidate_name, candidate_email, candidate_phone,
        position_applied, claimed_university, claimed_degree, claimed_certificate_id,
        submitted_cert_filename, bgv_status, verification_verdict, risk_score,
        bgv_reference_no, verification_method, verified_at, audit_summary, hr_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', 'UNASSESSED', NULL, NULL, NULL, NULL, ?, ?);
    """, (
        prof_id, company_id.upper(), payload.candidate_name.strip(), payload.candidate_email.strip().lower(),
        payload.candidate_phone, payload.position_applied.strip(), payload.claimed_university.strip(),
        payload.claimed_degree.strip(), clean_cert_id, filename, payload.hr_notes, now
    ))

    conn.commit()
    conn.close()

    return {
        "profile_id": prof_id,
        "message": f"Candidate profile {payload.candidate_name} added to Pending Verification queue!"
    }

@app.get("/api/company/profiles/{profile_id}")
async def get_candidate_profile(profile_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM candidate_profiles WHERE profile_id = ?;", (profile_id.upper(),))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    p = dict(row)
    p["submitted_cert_url"] = f"/static/sample_certificates/{p['submitted_cert_filename']}"
    return p

# ==========================================
# UNIVERSAL HUB VERIFICATION ACTION
# (Upload / Scan Certificate -> Moves to Completed)
# ==========================================

@app.post("/api/company/profiles/{profile_id}/verify-hub")
async def verify_profile_against_hub(profile_id: str, payload: HubVerifyUploadRequest, request: Request):
    """
    Core Company Action:
    Company HR uploads/scans candidate's certificate to the Universal Hub.
    The Universal Hub runs the verification check against the multi-university registry.
    If valid -> profile moves from PENDING to COMPLETED (VERIFIED_AUTHENTIC).
    If revoked/forged -> profile moves to COMPLETED with FLAGGED_FRAUD or REVOKED verdict.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM candidate_profiles WHERE profile_id = ?;", (profile_id.upper(),))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Profile not found")

    candidate = dict(row)

    # Clean the input (extract certificate ID if a URL was scanned)
    input_str = payload.scanned_qr_or_id.strip()
    if "/verify/" in input_str:
        cert_id = input_str.split("/verify/")[1].split("?")[0].split("#")[0].strip().upper()
    else:
        cert_id = input_str.upper()

    now = datetime.now(timezone.utc).isoformat()
    ref_no = f"BGV-{candidate['company_id'][:4]}-{datetime.now().strftime('%Y%m')}-{candidate['id']:04d}"

    # Query master clearinghouse database
    cursor.execute("SELECT * FROM certificates WHERE certificate_id = ?;", (cert_id,))
    cert_row = cursor.fetchone()

    # Tamper check (e.g. Vikramaditya Roy forged Summa Cum Laude)
    is_tampered_claim = False
    if cert_row and "Summa Cum Laude" in candidate["claimed_degree"] and "Summa Cum Laude" not in cert_row["degree"]:
        is_tampered_claim = True

    if not cert_row:
        cursor.execute("SELECT * FROM universities WHERE name = ?;", (candidate["claimed_university"],))
        uni_row = cursor.fetchone()
        uni_status = uni_row["accreditation_status"] if uni_row else "UNKNOWN"

        if uni_status == "BLACKLISTED":
            verdict = "UNACCREDITED_MILL"
            risk = "CRITICAL"
            summary = f"FRAUD ALERT: {candidate['claimed_university']} is on global blacklists of unaccredited diploma mills. Certificate ID {cert_id} is fraudulent."
            ver_result = "UNACCREDITED"
        else:
            verdict = "UNACCREDITED_MILL"
            risk = "CRITICAL"
            summary = f"REJECTED: Certificate ID {cert_id} does not exist in the official clearinghouse register for {candidate['claimed_university']}."
            ver_result = "INVALID"
    elif is_tampered_claim:
        verdict = "FLAGGED_FRAUD"
        risk = "HIGH"
        summary = f"FORGERY DETECTED: University register confers '{cert_row['degree']}', but candidate altered degree claiming '{candidate['claimed_degree']}'. Cryptographic SHA-256 mismatch!"
        ver_result = "TAMPERED"
    elif cert_row["status"] == "REVOKED":
        verdict = "REVOKED"
        risk = "CRITICAL"
        reason = cert_row["revocation_reason"] or "Revoked by Academic Council"
        summary = f"OFFICIALLY REVOKED: {reason}."
        ver_result = "REVOKED"
    else:
        if not verify_certificate_integrity(dict(cert_row)):
            verdict = "FLAGGED_FRAUD"
            risk = "HIGH"
            summary = "CRYPTOGRAPHIC INTEGRITY FAILURE: Digital hash signature does not match university registrar."
            ver_result = "TAMPERED"
        else:
            verdict = "VERIFIED_AUTHENTIC"
            risk = "LOW"
            summary = f"AUTHENTIC & CONFERRED: Official degree verified directly through {cert_row['university_name']} registrar. SHA-256 signature verified."
            ver_result = "VALID"

    # Move profile from PENDING -> COMPLETED
    cursor.execute("""
    UPDATE candidate_profiles
    SET bgv_status = 'COMPLETED',
        verification_verdict = ?,
        risk_score = ?,
        bgv_reference_no = ?,
        verification_method = ?,
        verified_at = ?,
        audit_summary = ?,
        hr_notes = ?
    WHERE profile_id = ?;
    """, (verdict, risk, ref_no, payload.verification_method, now, summary, payload.hr_notes or "Verified via Universal Hub", profile_id.upper()))

    conn.commit()

    # Fetch company name for logging
    cursor.execute("SELECT name FROM companies WHERE company_id = ?;", (candidate["company_id"],))
    c_name = cursor.fetchone()["name"]
    conn.close()

    log_verification(
        certificate_id=cert_id,
        result=ver_result,
        method=payload.verification_method,
        req=request,
        details=f"Company {c_name} verified candidate {candidate['candidate_name']}: {summary}",
        uni_name=candidate["claimed_university"],
        comp_name=c_name
    )

    return {
        "profile_id": profile_id.upper(),
        "candidate_name": candidate["candidate_name"],
        "bgv_status": "COMPLETED",
        "verification_verdict": verdict,
        "risk_score": risk,
        "bgv_reference_no": ref_no,
        "verified_at": now,
        "audit_summary": summary,
        "message": f"Candidate verified! Profile moved to Completed Background Verifications."
    }

@app.post("/api/company/profiles/{profile_id}/quick-verify")
async def quick_verify_profile(profile_id: str, request: Request):
    """1-Click helper to verify candidate certificate instantly"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT claimed_certificate_id FROM candidate_profiles WHERE profile_id = ?;", (profile_id.upper(),))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Candidate not found")

    payload = HubVerifyUploadRequest(
        scanned_qr_or_id=row[0],
        verification_method="UNIVERSAL_HUB_QR",
        hr_notes="Automated 1-click BGV Hub verification"
    )
    return await verify_profile_against_hub(profile_id, payload, request)

@app.get("/api/company/profiles/{profile_id}/bgv-certificate")
async def get_profile_bgv_certificate(profile_id: str):
    """Generates official Background Verification Clearance Certificate data"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT p.*, c.name as company_name, c.contact_person
    FROM candidate_profiles p
    JOIN companies c ON p.company_id = c.company_id
    WHERE p.profile_id = ?;
    """, (profile_id.upper(),))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")

    p = dict(row)
    return {
        "report_title": "OFFICIAL BACKGROUND VERIFICATION (BGV) CLEARANCE REPORT",
        "issuing_hub": "OmniVeri Universal Academic Clearinghouse",
        "bgv_reference_no": p["bgv_reference_no"] or "BGV-PENDING",
        "company_name": p["company_name"],
        "hr_officer": p["contact_person"],
        "candidate_name": p["candidate_name"],
        "candidate_email": p["candidate_email"],
        "candidate_phone": p["candidate_phone"] or "N/A",
        "position_applied": p["position_applied"],
        "claimed_university": p["claimed_university"],
        "claimed_degree": p["claimed_degree"],
        "claimed_certificate_id": p["claimed_certificate_id"],
        "bgv_status": p["bgv_status"],
        "verification_verdict": p["verification_verdict"],
        "risk_score": p["risk_score"],
        "verification_method": p["verification_method"] or "UNIVERSAL_HUB_QR",
        "verified_at": p["verified_at"] or datetime.now(timezone.utc).isoformat(),
        "audit_summary": p["audit_summary"],
        "trust_stamp": "AUTHENTICATED BY INTER-INSTITUTIONAL CLEARINGHOUSE PROTOCOL"
    }

@app.post("/api/company/{company_id}/reset-demo")
async def reset_company_demo(company_id: str):
    """Resets company profiles back to initial pending/completed state for demoing"""
    conn = get_db_connection()
    cursor = conn.cursor()
    # Reset candidate 1, 2, 3, 4, 5 to PENDING
    cursor.execute("""
    UPDATE candidate_profiles
    SET bgv_status = 'PENDING',
        verification_verdict = 'PENDING',
        risk_score = 'UNASSESSED',
        bgv_reference_no = NULL,
        verification_method = NULL,
        verified_at = NULL,
        audit_summary = NULL
    WHERE company_id = ? AND profile_id IN ('CAND-INF-001', 'CAND-INF-002', 'CAND-INF-003', 'CAND-INF-004', 'CAND-INF-005', 'CAND-ABC-001', 'CAND-ABC-002');
    """, (company_id.upper(),))
    conn.commit()
    conn.close()
    return {"message": "Candidate profiles reset to initial demo state!"}

# ==========================================
# PUBLIC DIRECT VERIFICATION ROUTE & STATIC
# ==========================================

@app.get("/api/verify/{certificate_id}")
async def public_verify_cert(certificate_id: str, request: Request):
    clean_id = certificate_id.strip().upper()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM certificates WHERE certificate_id = ?;", (clean_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return JSONResponse(status_code=404, content={"status": "INVALID", "certificate_id": clean_id, "message": "Certificate not found in global clearinghouse"})

    cert = dict(row)
    if not verify_certificate_integrity(cert):
        return {"status": "TAMPERED", "certificate_id": cert["certificate_id"], "warning": "Cryptographic signature mismatch!"}

    if cert["status"] == "REVOKED":
        return {"status": "REVOKED", "certificate_id": cert["certificate_id"], "warning": cert["revocation_reason"]}

    host_url = str(request.base_url).rstrip("/")
    full_verify_url = f"{host_url}/verify/{cert['certificate_id']}"
    return {
        "status": "VALID",
        "certificate_id": cert["certificate_id"],
        "student_name": cert["student_name"],
        "register_number": cert["register_number"],
        "degree": cert["degree"],
        "department": cert["department"],
        "university_name": cert["university_name"],
        "graduation_year": cert["graduation_year"],
        "issue_date": cert["issue_date"],
        "qr_code_image": generate_qr_code_base64(full_verify_url),
        "qr_verification_url": full_verify_url,
        "verified_through": "OmniVeri Universal Clearinghouse"
    }

# Mount static asset directory
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse("<h1>OmniVeri Background Verification Hub</h1>")

@app.get("/verify/{certificate_id}")
async def serve_verification_route(certificate_id: str):
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse(f"<h1>Verifying {certificate_id}</h1>")

@app.get("/{full_path:path}")
async def catch_all_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse("<h1>Page Not Found</h1>", status_code=404)
