"""
Automated Test Suite for OmniVeri: Universal Academic Credential Clearinghouse
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

class TestOmniVeriClearinghouse(unittest.TestCase):

    def test_01_worklist_initial_state(self):
        """Test that the worklist returns the 10 candidate cases"""
        response = client.get("/api/worklist")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("metrics", data)
        self.assertIn("requests", data)
        self.assertEqual(data["metrics"]["total_cases"], 10)
        self.assertEqual(len(data["requests"]), 10)

    def test_02_verify_valid_candidate_ethan_vance(self):
        """Test verifying Ethan Vance (MIT - CERT-MIT-88412) confers valid status"""
        res = client.post("/api/worklist/REQ-2026-001/quick-scan")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "VERIFIED")
        self.assertEqual(data["risk_level"], "LOW")
        self.assertIn("Massachusetts Institute of Technology", data["verification_result_summary"])

    def test_03_verify_revoked_candidate_liam_gallagher(self):
        """Test verifying Liam Gallagher (Cambridge - REVOKED) catches revocation"""
        res = client.post("/api/worklist/REQ-2026-004/quick-scan")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "REVOKED")
        self.assertEqual(data["risk_level"], "CRITICAL")
        self.assertIn("REVOKED", data["verification_result_summary"])

    def test_04_verify_tampered_candidate_vikram_roy(self):
        """Test verifying Vikramaditya Roy (Harvard - Forged Summa Cum Laude) catches forgery"""
        res = client.post("/api/worklist/REQ-2026-006/quick-scan")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "FLAGGED_FRAUD")
        self.assertEqual(data["risk_level"], "HIGH")
        self.assertIn("TAMPERING", data["verification_result_summary"])

    def test_05_verify_unaccredited_mill_sergei_petrov(self):
        """Test verifying Sergei Petrov from blacklisted institution flags unaccredited mill"""
        res = client.post("/api/worklist/REQ-2026-007/quick-scan")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "UNRECOGNIZED")
        self.assertEqual(data["risk_level"], "CRITICAL")

    def test_06_bgv_report_generation(self):
        """Test BGV clearance report endpoint generates full printable report"""
        res = client.get("/api/worklist/REQ-2026-001/report")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("report_title", data)
        self.assertEqual(data["candidate_name"], "Ethan Vance")
        self.assertEqual(data["requesting_company"], "Google Inc.")

    def test_07_universities_directory(self):
        """Test partner universities directory returns accredited institutions"""
        res = client.get("/api/universities")
        self.assertEqual(res.status_code, 200)
        unis = res.json()
        self.assertGreaterEqual(len(unis), 8)
        codes = [u["code"] for u in unis]
        self.assertIn("MIT", codes)
        self.assertIn("STANFORD", codes)

if __name__ == "__main__":
    unittest.main()
