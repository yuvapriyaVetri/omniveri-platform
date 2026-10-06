"""
Pydantic schemas and models for request validation and type safety.
OmniVeri: Company Background Verification Hub
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date

class CompanyRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=4)
    contact_person: str = Field(..., min_length=2, max_length=100)
    industry: str = Field(default="Information Technology")
    registration_no: Optional[str] = None

class CompanyLoginRequest(BaseModel):
    email: str
    password: str

class CandidateCreateRequest(BaseModel):
    candidate_name: str = Field(..., min_length=2, max_length=100)
    candidate_email: str = Field(..., min_length=5, max_length=100)
    candidate_phone: Optional[str] = None
    position_applied: str = Field(..., min_length=2, max_length=100)
    claimed_university: str = Field(..., min_length=2, max_length=150)
    claimed_degree: str = Field(..., min_length=2, max_length=150)
    claimed_certificate_id: str = Field(..., min_length=3, max_length=50)
    hr_notes: Optional[str] = None

class HubVerifyUploadRequest(BaseModel):
    scanned_qr_or_id: str = Field(..., min_length=3)
    verification_method: str = Field(default="FILE_UPLOAD")
    hr_notes: Optional[str] = None
