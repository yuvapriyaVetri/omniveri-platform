"""
Database schema, connection management, and sample data seeding for
OmniVeri: Company BGV Hub with Multi-Tenant Company Portals & Universal Verification.
"""

import sqlite3
import hashlib
import json
import os
from datetime import datetime, timezone
import qrcode
from PIL import Image, ImageDraw

DB_PATH = os.path.join(os.path.dirname(__file__), "certificates.db")
SAMPLE_CERTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "sample_certificates")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def compute_certificate_hash(data: dict) -> str:
    canonical_string = (
        f"{str(data.get('certificate_id', '')).strip()}|"
        f"{str(data.get('student_name', '')).strip()}|"
        f"{str(data.get('register_number', '')).strip()}|"
        f"{str(data.get('degree', '')).strip()}|"
        f"{str(data.get('department', '')).strip()}|"
        f"{str(data.get('university_name', '')).strip()}|"
        f"{str(data.get('graduation_year', '')).strip()}|"
        f"{str(data.get('issue_date', '')).strip()}"
    )
    return hashlib.sha256(canonical_string.encode('utf-8')).hexdigest()

def init_db():
    os.makedirs(SAMPLE_CERTS_DIR, exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")

    # 1. Companies Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        contact_person TEXT NOT NULL,
        industry TEXT NOT NULL,
        registration_no TEXT,
        logo_icon TEXT DEFAULT 'building-2',
        created_at TEXT NOT NULL
    );
    """)

    # 2. Partner Universities Registry
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS universities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        university_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        country TEXT NOT NULL,
        accreditation_status TEXT NOT NULL CHECK(accreditation_status IN ('ACCREDITED', 'UNDER_REVIEW', 'BLACKLISTED')),
        established_year INTEGER,
        trust_score INTEGER DEFAULT 98,
        logo_icon TEXT DEFAULT 'graduation-cap',
        created_at TEXT NOT NULL
    );
    """)

    # 3. Master Certificates Registry
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        certificate_id TEXT UNIQUE NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        register_number TEXT NOT NULL,
        certificate_type TEXT NOT NULL,
        degree TEXT NOT NULL,
        department TEXT NOT NULL,
        university_id TEXT NOT NULL,
        university_name TEXT NOT NULL,
        graduation_year INTEGER NOT NULL,
        issue_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('DRAFT', 'ISSUED', 'ACTIVE', 'REVOKED', 'REPLACED', 'TAMPERED')),
        qr_verification_url TEXT NOT NULL,
        certificate_hash TEXT NOT NULL,
        revocation_reason TEXT,
        replacement_certificate_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # 4. Candidate BGV Profiles (Scoped to each registered Company!)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS candidate_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT UNIQUE NOT NULL,
        company_id TEXT NOT NULL,
        candidate_name TEXT NOT NULL,
        candidate_email TEXT NOT NULL,
        candidate_phone TEXT,
        position_applied TEXT NOT NULL,
        claimed_university TEXT NOT NULL,
        claimed_degree TEXT NOT NULL,
        claimed_certificate_id TEXT NOT NULL,
        submitted_cert_filename TEXT NOT NULL,
        bgv_status TEXT NOT NULL CHECK(bgv_status IN ('PENDING', 'COMPLETED')),
        verification_verdict TEXT NOT NULL CHECK(verification_verdict IN ('PENDING', 'VERIFIED_AUTHENTIC', 'FLAGGED_FRAUD', 'REVOKED', 'UNACCREDITED_MILL')),
        risk_score TEXT CHECK(risk_score IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNASSESSED')),
        bgv_reference_no TEXT,
        verification_method TEXT,
        verified_at TEXT,
        audit_summary TEXT,
        hr_notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(company_id) REFERENCES companies(company_id)
    );
    """)

    # 5. Verification History Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS verification_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        verification_id TEXT UNIQUE NOT NULL,
        certificate_id TEXT NOT NULL,
        company_name TEXT,
        university_name TEXT,
        verification_time TEXT NOT NULL,
        result TEXT NOT NULL CHECK(result IN ('VALID', 'INVALID', 'REVOKED', 'TAMPERED', 'UNACCREDITED')),
        verification_method TEXT NOT NULL,
        ip_address TEXT DEFAULT '127.0.0.1',
        details TEXT
    );
    """)

    conn.commit()
    seed_data(conn)
    conn.close()

def seed_data(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM companies;")
    if cursor.fetchone()[0] > 0:
        return  # Already seeded

    now = datetime.now(timezone.utc).isoformat()

    # 1. Seed Registered Companies
    companies_data = [
        ("COMP-INFOSYS", "Infosys Technologies Ltd.", "hr@infosys.com", "infosys123", "Priya Sharma (Senior HR Lead)", "Information Technology", "CIN-L85110KA1981PLC013115", "laptop", now),
        ("COMP-ABC", "ABC Tech Solutions", "hr@abctech.com", "abctech123", "Michael Scott (Talent Acquisition)", "Enterprise Software", "CIN-U72200MH2012PTC231456", "building-2", now),
        ("COMP-GOOGLE", "Google LLC", "bgv@google.com", "google123", "David Miller (Staff Background Screening Specialist)", "Cloud & Artificial Intelligence", "DEL-REG-991204", "cloud", now),
        ("COMP-TCS", "Tata Consultancy Services", "hr@tcs.com", "tcs123", "Sunita Nair (HR Director)", "IT Consulting", "CIN-L22210MH1995PLC084781", "briefcase", now),
    ]
    cursor.executemany("""
    INSERT INTO companies (company_id, name, email, password, contact_person, industry, registration_no, logo_icon, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, companies_data)

    # 2. Seed Partner Universities
    universities = [
        ("UNI-MIT", "Massachusetts Institute of Technology", "MIT", "United States", "ACCREDITED", 1861, 99, "cpu"),
        ("UNI-STAN", "Stanford University", "STANFORD", "United States", "ACCREDITED", 1885, 99, "compass"),
        ("UNI-OXF", "University of Oxford", "OXFORD", "United Kingdom", "ACCREDITED", 1096, 99, "book-open"),
        ("UNI-CAM", "University of Cambridge", "CAMBRIDGE", "United Kingdom", "ACCREDITED", 1209, 99, "award"),
        ("UNI-NUS", "National University of Singapore", "NUS", "Singapore", "ACCREDITED", 1905, 98, "globe"),
        ("UNI-HARV", "Harvard University", "HARVARD", "United States", "ACCREDITED", 1636, 99, "landmark"),
        ("UNI-IMP", "Imperial College London", "IMPERIAL", "United Kingdom", "ACCREDITED", 1907, 98, "atom"),
        ("UNI-APEX", "Apex Global University", "AGU", "International", "ACCREDITED", 1984, 96, "shield-check"),
        ("UNI-SPTI", "Saint Petersburg Technical Institute", "SPTI", "Russia", "BLACKLISTED", 2018, 12, "alert-triangle"),
    ]
    cursor.executemany("""
    INSERT INTO universities (university_id, name, code, country, accreditation_status, established_year, trust_score, logo_icon, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [(u[0], u[1], u[2], u[3], u[4], u[5], u[6], u[7], now) for u in universities])

    # 3. Seed Master Certificates
    certs_data = [
        {
            "certificate_id": "CERT-MIT-88412",
            "student_id": "STU-MIT-0991",
            "student_name": "Ethan Vance",
            "register_number": "MIT-2024-CS-981",
            "certificate_type": "Degree Certificate",
            "degree": "Master of Science in Computer Science",
            "department": "Electrical Engineering & Computer Science",
            "university_id": "UNI-MIT",
            "university_name": "Massachusetts Institute of Technology",
            "graduation_year": 2024,
            "issue_date": "2024-06-07",
            "status": "ACTIVE",
            "qr_verification_url": "/verify/CERT-MIT-88412",
            "revocation_reason": None,
            "replacement_certificate_id": None
        },
        {
            "certificate_id": "CERT-STAN-90214",
            "student_id": "STU-STAN-4412",
            "student_name": "Aarav Sharma",
            "register_number": "STAN-2023-AI-118",
            "certificate_type": "Degree Certificate",
            "degree": "Ph.D. in Artificial Intelligence",
            "department": "Stanford Artificial Intelligence Laboratory",
            "university_id": "UNI-STAN",
            "university_name": "Stanford University",
            "graduation_year": 2023,
            "issue_date": "2023-06-18",
            "status": "ACTIVE",
            "qr_verification_url": "/verify/CERT-STAN-90214",
            "revocation_reason": None,
            "replacement_certificate_id": None
        },
        {
            "certificate_id": "CERT-OXF-33109",
            "student_id": "STU-OXF-7719",
            "student_name": "Claire Dubois",
            "register_number": "OXF-2024-MF-042",
            "certificate_type": "Degree Certificate",
            "degree": "Master of Science in Mathematical Finance",
            "department": "Mathematical Institute",
            "university_id": "UNI-OXF",
            "university_name": "University of Oxford",
            "graduation_year": 2024,
            "issue_date": "2024-07-12",
            "status": "ACTIVE",
            "qr_verification_url": "/verify/CERT-OXF-33109",
            "revocation_reason": None,
            "replacement_certificate_id": None
        },
        {
            "certificate_id": "CERT-CAM-51204",
            "student_id": "STU-CAM-1994",
            "student_name": "Liam Gallagher",
            "register_number": "CAM-2023-ENG-882",
            "certificate_type": "Degree Certificate",
            "degree": "Bachelor of Engineering in Robotics & Control",
            "department": "Department of Engineering",
            "university_id": "UNI-CAM",
            "university_name": "University of Cambridge",
            "graduation_year": 2023,
            "issue_date": "2023-06-25",
            "status": "REVOKED",
            "qr_verification_url": "/verify/CERT-CAM-51204",
            "revocation_reason": "Conferral revoked by the Cambridge Syndicate following academic integrity violation and thesis fabrication.",
            "replacement_certificate_id": None
        },
        {
            "certificate_id": "CERT-NUS-77291",
            "student_id": "STU-NUS-3012",
            "student_name": "Mei-Ling Zhou",
            "register_number": "NUS-2024-BC-501",
            "certificate_type": "Degree Certificate",
            "degree": "Bachelor of Computing (Computer Science)",
            "department": "School of Computing",
            "university_id": "UNI-NUS",
            "university_name": "National University of Singapore",
            "graduation_year": 2024,
            "issue_date": "2024-07-20",
            "status": "ACTIVE",
            "qr_verification_url": "/verify/CERT-NUS-77291",
            "revocation_reason": None,
            "replacement_certificate_id": None
        },
        {
            "certificate_id": "CERT-HARV-10944",
            "student_id": "STU-HARV-8821",
            "student_name": "Vikramaditya Roy",
            "register_number": "HBS-2022-MBA-610",
            "certificate_type": "Degree Certificate",
            "degree": "Master of Business Administration (General Management)",
            "department": "Harvard Business School",
            "university_id": "UNI-HARV",
            "university_name": "Harvard University",
            "graduation_year": 2022,
            "issue_date": "2022-05-26",
            "status": "ACTIVE",
            "qr_verification_url": "/verify/CERT-HARV-10944",
            "revocation_reason": None,
            "replacement_certificate_id": None
        },
        {
            "certificate_id": "CERT-IMP-66380",
            "student_id": "STU-IMP-5541",
            "student_name": "Ananya Patel",
            "register_number": "IMP-2024-BIO-229",
            "certificate_type": "Degree Certificate",
            "degree": "Master of Science in Computational Genomics",
            "department": "Faculty of Natural Sciences",
            "university_id": "UNI-IMP",
            "university_name": "Imperial College London",
            "graduation_year": 2024,
            "issue_date": "2024-09-14",
            "status": "ACTIVE",
            "qr_verification_url": "/verify/CERT-IMP-66380",
            "revocation_reason": None,
            "replacement_certificate_id": None
        },
        {
            "certificate_id": "CERT-2025-00088",
            "student_id": "STU-2022-003",
            "student_name": "Marcus Adebayo",
            "register_number": "REG-2022-EE-045",
            "certificate_type": "Degree Certificate",
            "degree": "Bachelor of Engineering in Electronics",
            "department": "Electrical & Computer Engineering",
            "university_id": "UNI-APEX",
            "university_name": "Apex Global University",
            "graduation_year": 2025,
            "issue_date": "2025-05-18",
            "status": "ACTIVE",
            "qr_verification_url": "/verify/CERT-2025-00088",
            "revocation_reason": None,
            "replacement_certificate_id": None
        },
        {
            "certificate_id": "CERT-2026-00330",
            "student_id": "STU-2022-004",
            "student_name": "Jessica Miller",
            "register_number": "REG-2022-BA-211",
            "certificate_type": "Degree Certificate",
            "degree": "Master of Business Administration",
            "department": "School of Business",
            "university_id": "UNI-APEX",
            "university_name": "Apex Global University",
            "graduation_year": 2026,
            "issue_date": "2026-06-10",
            "status": "REVOKED",
            "qr_verification_url": "/verify/CERT-2026-00330",
            "revocation_reason": "Clerical title amendment. Replaced by CERT-2026-00331.",
            "replacement_certificate_id": "CERT-2026-00331"
        },
        {
            "certificate_id": "CERT-2026-00331",
            "student_id": "STU-2022-004",
            "student_name": "Jessica Miller",
            "register_number": "REG-2022-BA-211",
            "certificate_type": "Degree Certificate",
            "degree": "Master of Business Administration (Audit & Assurance)",
            "department": "School of Business",
            "university_id": "UNI-APEX",
            "university_name": "Apex Global University",
            "graduation_year": 2026,
            "issue_date": "2026-06-18",
            "status": "ACTIVE",
            "qr_verification_url": "/verify/CERT-2026-00331",
            "revocation_reason": None,
            "replacement_certificate_id": None
        },
    ]

    for cert in certs_data:
        h = compute_certificate_hash(cert)
        cursor.execute("""
        INSERT INTO certificates (
            certificate_id, student_id, student_name, register_number,
            certificate_type, degree, department, university_id, university_name,
            graduation_year, issue_date, status, qr_verification_url,
            certificate_hash, revocation_reason, replacement_certificate_id,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            cert["certificate_id"], cert["student_id"], cert["student_name"], cert["register_number"],
            cert["certificate_type"], cert["degree"], cert["department"], cert["university_id"], cert["university_name"],
            cert["graduation_year"], cert["issue_date"], cert["status"], cert["qr_verification_url"],
            h, cert["revocation_reason"], cert["replacement_certificate_id"],
            now, now
        ))

    # 4. Seed Candidate Profiles for INFOSYS (Pending & Completed)
    infosys_candidates = [
        # Pending Profiles for Infosys:
        (
            "CAND-INF-001", "COMP-INFOSYS", "Ethan Vance", "e.vance@techmail.org", "+91 98450 11234",
            "Senior Cloud Architect", "Massachusetts Institute of Technology", "Master of Science in Computer Science",
            "CERT-MIT-88412", "cert_ethan_vance_mit.png", "PENDING", "PENDING", "UNASSESSED",
            None, None, None, None, "Candidate offered Senior Cloud Architect role. Awaiting BGV verification clearance before joining date.", now
        ),
        (
            "CAND-INF-002", "COMP-INFOSYS", "Aarav Sharma", "aarav.sharma@stanfordalumni.org", "+91 98110 54321",
            "Lead AI Research Scientist", "Stanford University", "Ph.D. in Artificial Intelligence",
            "CERT-STAN-90214", "cert_aarav_sharma_stanford.png", "PENDING", "PENDING", "UNASSESSED",
            None, None, None, None, "AI Labs key hire. Degree submitted for automated registrar check.", now
        ),
        (
            "CAND-INF-003", "COMP-INFOSYS", "Vikramaditya Roy", "v.roy.mba@alumni.org", "+91 99201 88765",
            "Principal Consultant", "Harvard University", "Master of Business Administration (Summa Cum Laude Forged)",
            "CERT-HARV-10944", "cert_vikram_roy_harvard.png", "PENDING", "PENDING", "UNASSESSED",
            None, None, None, None, "Candidate submitted Harvard MBA diploma claiming top honors. Flagged for verification.", now
        ),
        (
            "CAND-INF-004", "COMP-INFOSYS", "Jessica Miller", "jessica.m@consultant.com", "+91 97412 33456",
            "Enterprise Audit Specialist", "Apex Global University", "Master of Business Administration",
            "CERT-2026-00330", "cert_jessica_miller_apex.png", "PENDING", "PENDING", "UNASSESSED",
            None, None, None, None, "Submitted MBA diploma for internal compliance auditing practice.", now
        ),
        (
            "CAND-INF-005", "COMP-INFOSYS", "Liam Gallagher", "liam.g@cantab.net", "+44 7700 900123",
            "Robotics Automation Specialist", "University of Cambridge", "Bachelor of Engineering in Robotics & Control",
            "CERT-CAM-51204", "cert_liam_gallagher_cambridge.png", "PENDING", "PENDING", "UNASSESSED",
            None, None, None, None, "International candidate profile for autonomous drone inspection wing.", now
        ),
        # Completed Profiles for Infosys:
        (
            "CAND-INF-006", "COMP-INFOSYS", "Claire Dubois", "claire.dubois@oxon.org", "+91 98452 77123",
            "Quantitative Finance Specialist", "University of Oxford", "Master of Science in Mathematical Finance",
            "CERT-OXF-33109", "cert_claire_dubois_oxford.png", "COMPLETED", "VERIFIED_AUTHENTIC", "LOW",
            "BGV-INF-2026-0042", "UNIVERSAL_HUB_QR", "2026-09-28T10:14:00Z",
            "AUTHENTIC & CONFERRED: Official degree verified directly through University of Oxford registrar registry. SHA-256 signature verified.",
            "Candidate verified and cleared for immediate onboarding.", now
        ),
        (
            "CAND-INF-007", "COMP-INFOSYS", "Marcus Adebayo", "marcus.adebayo@university.edu", "+91 94481 99012",
            "Systems Infrastructure Engineer", "Apex Global University", "Bachelor of Engineering in Electronics",
            "CERT-2025-00088", "cert_marcus_adebayo_apex.png", "COMPLETED", "VERIFIED_AUTHENTIC", "LOW",
            "BGV-INF-2026-0039", "UNIVERSAL_HUB_QR", "2026-09-25T14:30:00Z",
            "AUTHENTIC & CONFERRED: Official degree verified directly through Apex Global University registrar. SHA-256 signature verified.",
            "Verified by clearinghouse. Offer accepted.", now
        )
    ]
    cursor.executemany("""
    INSERT INTO candidate_profiles (
        profile_id, company_id, candidate_name, candidate_email, candidate_phone,
        position_applied, claimed_university, claimed_degree, claimed_certificate_id,
        submitted_cert_filename, bgv_status, verification_verdict, risk_score,
        bgv_reference_no, verification_method, verified_at, audit_summary, hr_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, infosys_candidates)

    # 5. Seed Candidate Profiles for ABC TECH SOLUTIONS
    abc_candidates = [
        (
            "CAND-ABC-001", "COMP-ABC", "Mei-Ling Zhou", "ml.zhou@u.nus.edu", "+65 9123 4567",
            "Embedded Systems Engineer", "National University of Singapore", "Bachelor of Computing (Computer Science)",
            "CERT-NUS-77291", "cert_meiling_zhou_nus.png", "PENDING", "PENDING", "UNASSESSED",
            None, None, None, None, "Singapore campus hire candidate. Pending degree verification.", now
        ),
        (
            "CAND-ABC-002", "COMP-ABC", "Sergei Petrov", "sergei.petrov@defmail.com", "+7 911 234-56-78",
            "Security Threat Hunter", "Saint Petersburg Technical Institute", "Bachelor of Science in Information Security",
            "CERT-SPTI-00912", "cert_sergei_petrov_spti.png", "PENDING", "PENDING", "UNASSESSED",
            None, None, None, None, "Overseas degree submission. Requires accreditation authenticity check.", now
        ),
        (
            "CAND-ABC-003", "COMP-ABC", "Ananya Patel", "ananya.patel@biotech.ac.uk", "+44 7911 123456",
            "Senior Bioinformatics Developer", "Imperial College London", "Master of Science in Computational Genomics",
            "CERT-IMP-66380", "cert_ananya_patel_imperial.png", "COMPLETED", "VERIFIED_AUTHENTIC", "LOW",
            "BGV-ABC-2026-0019", "UNIVERSAL_HUB_QR", "2026-09-29T11:20:00Z",
            "AUTHENTIC & CONFERRED: Official degree verified directly through Imperial College London registrar.",
            "Cleared for healthcare systems deployment.", now
        )
    ]
    cursor.executemany("""
    INSERT INTO candidate_profiles (
        profile_id, company_id, candidate_name, candidate_email, candidate_phone,
        position_applied, claimed_university, claimed_degree, claimed_certificate_id,
        submitted_cert_filename, bgv_status, verification_verdict, risk_score,
        bgv_reference_no, verification_method, verified_at, audit_summary, hr_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, abc_candidates)

    conn.commit()
    generate_all_sample_certificate_images(conn)

def generate_sample_certificate_image(cert_id: str, candidate_name: str, uni_name: str, degree: str, year: int, output_filename: str):
    output_path = os.path.join(SAMPLE_CERTS_DIR, output_filename)
    if os.path.exists(output_path):
        return

    width = 1000
    height = 700
    img = Image.new("RGB", (width, height), color="#fcfbf7")
    draw = ImageDraw.Draw(img)

    # Ornate Border
    draw.rectangle([20, 20, width - 20, height - 20], outline="#0f2b48", width=10)
    draw.rectangle([34, 34, width - 34, height - 34], outline="#c59b27", width=3)
    draw.rectangle([40, 40, width - 40, height - 40], outline="#0f2b48", width=1)

    # University Header
    draw.text((width // 2, 90), uni_name.upper(), fill="#0f2b48", anchor="mm", font_size=28)
    draw.text((width // 2, 130), "OFFICIAL CERTIFICATE OF ACADEMIC ACHIEVEMENT", fill="#c59b27", anchor="mm", font_size=15)
    draw.line([(width // 2 - 180, 150), (width // 2 + 180, 150)], fill="#c59b27", width=2)

    # Body
    draw.text((width // 2, 210), "This is to certify that", fill="#555555", anchor="mm", font_size=20)
    draw.text((width // 2, 265), candidate_name, fill="#111827", anchor="mm", font_size=40)
    draw.line([(width // 2 - 220, 295), (width // 2 + 220, 295)], fill="#d1d5db", width=1)

    draw.text((width // 2, 340), "has successfully completed all prescribed requirements and is awarded the degree of", fill="#4b5563", anchor="mm", font_size=16)
    draw.text((width // 2, 395), degree, fill="#0f2b48", anchor="mm", font_size=30)
    draw.text((width // 2, 440), f"Class of {year}", fill="#6b7280", anchor="mm", font_size=17)

    # Generate QR Code
    verify_url = f"http://localhost:8000/verify/{cert_id}"
    qr = qrcode.QRCode(version=1, box_size=4, border=2)
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0f2b48", back_color="#ffffff").convert("RGB")

    # Paste QR Code on bottom right
    img.paste(qr_img, (width - 240, height - 230))
    draw.text((width - 150, height - 55), "SCAN TO VERIFY", fill="#0f2b48", anchor="mm", font_size=11)
    draw.text((width - 150, height - 40), cert_id, fill="#6b7280", anchor="mm", font_size=11)

    # Seal & Signature on bottom left
    draw.ellipse([80, height - 200, 200, height - 80], outline="#c59b27", width=4, fill="#faf5e8")
    draw.text((140, height - 150), "OFFICIAL", fill="#c59b27", anchor="mm", font_size=15)
    draw.text((140, height - 130), "ACCREDITED", fill="#c59b27", anchor="mm", font_size=11)
    draw.text((140, height - 110), "SEAL", fill="#c59b27", anchor="mm", font_size=15)

    draw.line([(260, height - 90), (430, height - 90)], fill="#374151", width=2)
    draw.text((345, height - 70), "Office of Academic Registrar", fill="#4b5563", anchor="mm", font_size=13)
    draw.text((345, height - 50), "Authorized University Signatory", fill="#9ca3af", anchor="mm", font_size=11)

    img.save(output_path, "PNG")

def generate_all_sample_certificate_images(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT claimed_certificate_id, candidate_name, claimed_university, claimed_degree, submitted_cert_filename FROM candidate_profiles;")
    rows = cursor.fetchall()
    for r in rows:
        try:
            generate_sample_certificate_image(
                cert_id=r[0],
                candidate_name=r[1],
                uni_name=r[2],
                degree=r[3],
                year=2024,
                output_filename=r[4]
            )
        except Exception as e:
            print(f"Error generating sample certificate image {r[4]}: {e}")
