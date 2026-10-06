"""
Security utilities:
- Cryptographic SHA-256 hash calculation and verification for tamper-proofing
- Base64 QR code image generator pointing to official verification URLs
- Unique Certificate ID generation
- Authentication verification
"""

import io
import base64
import random
import string
import hashlib
from datetime import datetime, timezone
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import SolidFillColorMask

def generate_unique_certificate_id(year: int, existing_ids: set) -> str:
    """
    Generates a university-standard unique certificate ID:
    e.g., CERT-2026-04821
    Guarantees no collision with existing IDs.
    """
    while True:
        num = random.randint(10000, 99999)
        cert_id = f"CERT-{year}-{num}"
        if cert_id not in existing_ids:
            return cert_id

def compute_certificate_hash(
    certificate_id: str,
    student_name: str,
    register_number: str,
    degree: str,
    department: str,
    university_name: str,
    graduation_year: int,
    issue_date: str
) -> str:
    """
    Produces a SHA-256 digital fingerprint across the immutable attributes of the credential.
    Any single-character alteration results in an entirely different digest (avalanche effect).
    """
    canonical_payload = (
        f"{certificate_id.strip()}|"
        f"{student_name.strip()}|"
        f"{register_number.strip()}|"
        f"{degree.strip()}|"
        f"{department.strip()}|"
        f"{university_name.strip()}|"
        f"{str(graduation_year).strip()}|"
        f"{str(issue_date).strip()}"
    )
    return hashlib.sha256(canonical_payload.encode('utf-8')).hexdigest()

def verify_certificate_integrity(cert_record: dict) -> bool:
    """
    Recalculates the cryptographic hash from current record fields
    and checks if it strictly matches the stored certificate_hash.
    """
    computed = compute_certificate_hash(
        certificate_id=cert_record["certificate_id"],
        student_name=cert_record["student_name"],
        register_number=cert_record["register_number"],
        degree=cert_record["degree"],
        department=cert_record["department"],
        university_name=cert_record["university_name"],
        graduation_year=cert_record["graduation_year"],
        issue_date=cert_record["issue_date"]
    )
    return computed == cert_record["certificate_hash"]

def generate_qr_code_base64(target_url: str) -> str:
    """
    Generates a crisp, scannable QR Code containing the official verification URL
    encoded as a Base64 PNG data URI.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=3,
    )
    qr.add_data(target_url)
    qr.make(fit=True)

    # University navy/gold aesthetic
    img = qr.make_image(fill_color="#0f2b48", back_color="#ffffff")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"
