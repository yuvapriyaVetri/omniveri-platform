/**
 * OmniVeri: Universal Academic Credential & Background Verification Clearinghouse
 * Frontend Application Controller & Worklist Verification Engine
 */

const App = {
  currentRoute: 'worklist',
  routeParams: {},
  currentWorkItem: null,
  activeFilter: 'ALL',

  init: function() {
    // Check direct path routing (e.g. /verify/CERT-MIT-88412)
    const path = window.location.pathname;
    if (path.startsWith('/verify/')) {
      const certId = path.replace('/verify/', '').trim();
      if (certId) {
        this.navigate('verify', { certificate_id: certId });
        return;
      }
    }

    // Default route: Universal Verification Queue
    this.navigate('worklist');
    this.refreshMetrics();
  },

  navigate: function(route, params = {}) {
    this.currentRoute = route;
    this.routeParams = params;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const mount = document.getElementById('view-mount-point');
    if (!mount) return;

    switch (route) {
      case 'worklist':
        this.renderWorklist(mount);
        break;
      case 'universities':
        this.renderUniversities(mount);
        break;
      case 'analytics':
        this.renderAnalytics(mount);
        break;
      case 'verify':
        this.renderVerify(mount, params.certificate_id);
        break;
      case 'report':
        this.renderClearanceReport(mount, params.request_id);
        break;
      default:
        this.renderWorklist(mount);
        break;
    }

    if (window.lucide) window.lucide.createIcons();
    this.refreshMetrics();
  },

  refreshMetrics: async function() {
    try {
      const res = await fetch('/api/worklist');
      const data = await res.json();
      const m = data.metrics;
      const badge = document.getElementById('nav-pending-badge');
      if (badge) {
        badge.textContent = `${m.pending_count} Pending`;
        if (m.pending_count === 0) {
          badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-emerald-950';
          badge.textContent = 'All Cleared ✓';
        } else {
          badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950';
        }
      }
    } catch (e) {
      console.warn("Could not refresh worklist metrics", e);
    }
  },

  // ==========================================
  // VIEW 1: UNIVERSAL VERIFICATION WORKLIST
  // ==========================================
  renderWorklist: async function(mount) {
    mount.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-brand-800"></i>
      </div>
    `;

    try {
      const res = await fetch('/api/worklist');
      const data = await res.json();
      const m = data.metrics;
      const requests = data.requests;

      mount.innerHTML = `
        <div class="space-y-8">
          
          <!-- Clearinghouse Header & Mission -->
          <div class="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-brand-700 relative overflow-hidden">
            <div class="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-gold-500/10 blur-3xl pointer-events-none"></div>
            
            <div class="max-w-3xl relative z-10 space-y-4">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 text-xs font-semibold border border-gold-500/30">
                <i data-lucide="globe-2" class="w-3.5 h-3.5 text-gold-400"></i> Neutral Clearinghouse Architecture
              </div>
              <h1 class="text-2xl sm:text-4xl font-serif-title font-extrabold tracking-tight leading-tight">
                Universal Credential Verification Clearinghouse
              </h1>
              <p class="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                There is <strong>no direct integration required</strong> between hiring companies and individual universities. As an independent verifier, you inspect submitted candidate certificates, scan their cryptographic QR gateways, and cross-reference them against 120+ accredited institutional registers in real time.
              </p>
            </div>
          </div>

          <!-- Queue Progress & KPI Bar -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Worklist</span>
              <div class="text-2xl font-black text-slate-900 mt-1">${m.total_cases} Candidates</div>
              <p class="text-[11px] text-slate-500 mt-0.5">Assigned to your queue</p>
            </div>

            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-[10px] font-bold uppercase tracking-wider text-amber-500">Awaiting Verification</span>
              <div class="text-2xl font-black text-amber-600 mt-1">${m.pending_count} Pending</div>
              <p class="text-[11px] text-slate-500 mt-0.5">Upload or scan to verify</p>
            </div>

            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Verified & Conferred</span>
              <div class="text-2xl font-black text-emerald-600 mt-1">${m.verified_count} Cleared</div>
              <p class="text-[11px] text-slate-500 mt-0.5">Authenticity verified</p>
            </div>

            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-[10px] font-bold uppercase tracking-wider text-red-500">Flagged / Fraud / Revoked</span>
              <div class="text-2xl font-black text-red-600 mt-1">${m.flagged_count} Flagged</div>
              <p class="text-[11px] text-slate-500 mt-0.5">Discrepancies caught</p>
            </div>
          </div>

          <!-- Overall Queue Completion Progress Bar -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="text-slate-700">Verification Worklist Progress: ${m.total_cases - m.pending_count} of ${m.total_cases} Completed</span>
              <span class="text-brand-800 font-bold">${m.completion_percentage}%</span>
            </div>
            <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-brand-700 to-emerald-600 rounded-full transition-all duration-500" style="width: ${m.completion_percentage}%"></div>
            </div>
          </div>

          <!-- Filter Tabs & Actions -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
              <button onclick="App.setWorklistFilter('ALL')" class="px-3 py-1.5 rounded-lg ${App.activeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}">
                All Cases (${requests.length})
              </button>
              <button onclick="App.setWorklistFilter('PENDING')" class="px-3 py-1.5 rounded-lg ${App.activeFilter === 'PENDING' ? 'bg-white text-amber-800 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}">
                Pending (${m.pending_count})
              </button>
              <button onclick="App.setWorklistFilter('VERIFIED')" class="px-3 py-1.5 rounded-lg ${App.activeFilter === 'VERIFIED' ? 'bg-white text-emerald-800 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}">
                Verified (${m.verified_count})
              </button>
              <button onclick="App.setWorklistFilter('FLAGGED')" class="px-3 py-1.5 rounded-lg ${App.activeFilter === 'FLAGGED' ? 'bg-white text-red-800 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}">
                Flagged / Fraud (${m.flagged_count})
              </button>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="App.verifyAllRemaining()" class="px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5">
                <i data-lucide="zap" class="w-3.5 h-3.5 text-gold-400"></i> Auto-Verify All 10 (Demo)
              </button>
              <button onclick="App.resetWorklist()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5 text-slate-500"></i> Reset Queue
              </button>
            </div>
          </div>

          <!-- 10 Candidate Verification Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${requests.filter(r => {
              if (App.activeFilter === 'PENDING') return r.status === 'PENDING';
              if (App.activeFilter === 'VERIFIED') return r.status === 'VERIFIED';
              if (App.activeFilter === 'FLAGGED') return r.status !== 'PENDING' && r.status !== 'VERIFIED';
              return true;
            }).map((r, idx) => `
              <div class="bg-white rounded-2xl border ${r.status === 'PENDING' ? 'border-amber-200 shadow-sm' : r.status === 'VERIFIED' ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'} p-6 transition hover:shadow-md flex flex-col justify-between space-y-4">
                
                <!-- Card Header: Candidate & Requesting Company -->
                <div>
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 rounded-xl bg-brand-800 text-gold-400 font-bold text-lg flex items-center justify-center shadow-inner">
                        ${r.candidate_name.charAt(0)}
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <h3 class="font-bold text-slate-900 text-base leading-tight">${r.candidate_name}</h3>
                          <span class="font-mono text-[10px] text-slate-400">${r.request_id}</span>
                        </div>
                        <p class="text-xs text-slate-500 font-medium">${r.candidate_email}</p>
                      </div>
                    </div>

                    <!-- Status Pill -->
                    <div>
                      <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' :
                        r.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        r.status === 'REVOKED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        'bg-red-100 text-red-800 border border-red-200'
                      }">
                        ${r.status === 'PENDING' ? '⏳ PENDING REVIEW' : r.status === 'VERIFIED' ? '✓ VERIFIED' : r.status === 'REVOKED' ? '⚠ REVOKED' : '🚨 FLAGGED / FRAUD'}
                      </span>
                    </div>
                  </div>

                  <!-- Application Details -->
                  <div class="mt-4 p-3.5 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                    <div class="flex justify-between">
                      <span class="text-slate-400">Requesting Employer:</span>
                      <span class="font-bold text-slate-800 flex items-center gap-1">
                        <i data-lucide="building" class="w-3.5 h-3.5 text-brand-700"></i> ${r.requesting_company}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Target Position:</span>
                      <span class="font-medium text-slate-700">${r.position_applied}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Claimed University:</span>
                      <span class="font-bold text-brand-800">${r.claimed_university}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Claimed Degree:</span>
                      <span class="font-medium text-slate-700 text-right max-w-[200px] truncate" title="${r.claimed_degree}">${r.claimed_degree}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Submitted Cert ID:</span>
                      <span class="font-mono font-bold text-slate-800">${r.claimed_certificate_id}</span>
                    </div>
                  </div>

                  <!-- Verification Result Banner if already evaluated -->
                  ${r.verification_result_summary ? `
                    <div class="mt-3 p-3 rounded-xl text-xs ${
                      r.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
                      r.status === 'REVOKED' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
                      'bg-red-50 text-red-900 border border-red-200'
                    }">
                      <div class="font-bold flex items-center gap-1 mb-0.5">
                        <i data-lucide="${r.status === 'VERIFIED' ? 'check-circle' : 'alert-triangle'}" class="w-3.5 h-3.5"></i>
                        <span>Audit Verdict:</span>
                      </div>
                      <p class="text-[11px] leading-relaxed">${r.verification_result_summary}</p>
                    </div>
                  ` : ''}
                </div>

                <!-- Action Toolbar -->
                <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button onclick="App.openWorkspaceModal('${r.request_id}')" class="flex-1 py-2 px-3 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5">
                    <i data-lucide="scan-line" class="w-3.5 h-3.5 text-gold-400"></i> ${r.status === 'PENDING' ? 'Upload & Verify' : 'Re-Inspect Case'}
                  </button>

                  ${r.status === 'PENDING' ? `
                    <button onclick="App.quickScanFromCard('${r.request_id}')" class="py-2 px-3 bg-gold-500 hover:bg-gold-600 text-brand-900 rounded-xl text-xs font-bold transition flex items-center gap-1" title="1-Click Auto Scan Simulation">
                      <i data-lucide="zap" class="w-3.5 h-3.5"></i> Auto
                    </button>
                  ` : `
                    <button onclick="App.navigate('report', { request_id: '${r.request_id}' })" class="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1">
                      <i data-lucide="printer" class="w-3.5 h-3.5 text-brand-700"></i> BGV Report
                    </button>
                  `}

                  <a href="/static/sample_certificates/${r.submitted_cert_filename}" download class="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition" title="Download Candidate Certificate PNG to test uploading">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (e) {
      mount.innerHTML = `<div class="p-8 text-center text-red-600">Failed to load verification worklist.</div>`;
    }
  },

  setWorklistFilter: function(filter) {
    this.activeFilter = filter;
    this.navigate('worklist');
  },

  // ==========================================
  // VIEW 2: VERIFICATION WORKSPACE MODAL
  // ==========================================
  openWorkspaceModal: async function(requestId) {
    const modal = document.getElementById('modal-verify-workspace');
    if (!modal) return;

    try {
      const res = await fetch(`/api/worklist/${requestId}`);
      const item = await res.json();
      this.currentWorkItem = item;

      // Populate elements
      document.getElementById('workspace-request-id-badge').textContent = item.request_id;
      document.getElementById('workspace-candidate-name').textContent = item.candidate_name;
      document.getElementById('workspace-candidate-email').textContent = item.candidate_email;
      document.getElementById('workspace-company').textContent = item.requesting_company;
      document.getElementById('workspace-position').textContent = item.position_applied;
      document.getElementById('workspace-university').textContent = item.claimed_university;
      document.getElementById('workspace-degree').textContent = item.claimed_degree;
      document.getElementById('workspace-cert-id').textContent = item.claimed_certificate_id;

      const img = document.getElementById('workspace-cert-preview-img');
      img.src = item.submitted_cert_url;

      const downloadBtn = document.getElementById('workspace-download-cert-btn');
      downloadBtn.href = item.submitted_cert_url;

      const statusBadge = document.getElementById('workspace-status-badge');
      statusBadge.textContent = item.status;
      statusBadge.className = `px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
        item.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
        item.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
        'bg-red-100 text-red-800'
      }`;

      // Reset verdict card
      const verdictCard = document.getElementById('workspace-verdict-card');
      if (item.status !== 'PENDING') {
        this.renderVerdictCard(item);
      } else {
        verdictCard.classList.add('hidden');
      }

      modal.classList.remove('hidden');
      this.setVerifyMethod('quick');
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      alert("Error loading request details.");
    }
  },

  closeWorkspaceModal: function() {
    const modal = document.getElementById('modal-verify-workspace');
    if (modal) modal.classList.add('hidden');
    QRScanner.stopCamera();
    this.refreshMetrics();
    if (this.currentRoute === 'worklist') {
      this.renderWorklist(document.getElementById('view-mount-point'));
    }
  },

  setVerifyMethod: function(method) {
    const btnQuick = document.getElementById('ws-btn-quick');
    const btnUpload = document.getElementById('ws-btn-upload');
    const btnCamera = document.getElementById('ws-btn-camera');

    const paneQuick = document.getElementById('ws-pane-quick');
    const paneUpload = document.getElementById('ws-pane-upload');
    const paneCamera = document.getElementById('ws-pane-camera');

    QRScanner.stopCamera();

    // Reset button styles
    [btnQuick, btnUpload, btnCamera].forEach(b => {
      b.className = 'p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 flex flex-col items-center gap-1 transition';
    });

    paneQuick.classList.add('hidden');
    paneUpload.classList.add('hidden');
    paneCamera.classList.add('hidden');

    if (method === 'quick') {
      btnQuick.className = 'p-2.5 rounded-xl border border-brand-800 bg-brand-50 text-brand-900 font-bold flex flex-col items-center gap-1 transition';
      paneQuick.classList.remove('hidden');
    } else if (method === 'upload') {
      btnUpload.className = 'p-2.5 rounded-xl border border-brand-800 bg-brand-50 text-brand-900 font-bold flex flex-col items-center gap-1 transition';
      paneUpload.classList.remove('hidden');
    } else if (method === 'camera') {
      btnCamera.className = 'p-2.5 rounded-xl border border-brand-800 bg-brand-50 text-brand-900 font-bold flex flex-col items-center gap-1 transition';
      paneCamera.classList.remove('hidden');
      QRScanner.startCamera('ws-camera-video', 'ws-camera-canvas', (decodedUrl) => {
        App.handleDecodedWorkspaceScan(decodedUrl, 'CAMERA_SCAN');
      }).catch(err => {
        alert("Camera could not be accessed. Please use 'Upload Image / File' or '1-Click Auto Scan'.");
        this.setVerifyMethod('upload');
      });
    }

    if (window.lucide) window.lucide.createIcons();
  },

  triggerDirectCertificateUpload: function() {
    // When user clicks on the certificate image preview, auto-run scan!
    this.executeCurrentQuickScan();
  },

  handleWorkspaceFileSelect: function(event) {
    const file = event.target.files[0];
    if (!file) return;

    QRScanner.scanFromFile(file, (decodedData) => {
      App.handleDecodedWorkspaceScan(decodedData, 'FILE_UPLOAD');
    }, (err) => {
      alert(err || "Could not read QR code from file.");
    });
  },

  executeCurrentQuickScan: async function() {
    if (!this.currentWorkItem) return;
    const reqId = this.currentWorkItem.request_id;
    try {
      const res = await fetch(`/api/worklist/${reqId}/quick-scan`, { method: 'POST' });
      const verdict = await res.json();
      this.renderVerdictCard(verdict);
      this.refreshMetrics();
    } catch (e) {
      alert("Error executing verification.");
    }
  },

  handleDecodedWorkspaceScan: async function(decodedText, method) {
    if (!this.currentWorkItem) return;
    const reqId = this.currentWorkItem.request_id;
    try {
      const res = await fetch(`/api/worklist/${reqId}/verify-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanned_qr_or_id: decodedText,
          verification_method: method,
          officer_notes: `Processed via ${method} at clearinghouse workstation`
        })
      });
      const verdict = await res.json();
      this.renderVerdictCard(verdict);
      this.refreshMetrics();
    } catch (e) {
      alert("Error sending verification upload.");
    }
  },

  quickScanFromCard: async function(requestId) {
    try {
      const res = await fetch(`/api/worklist/${requestId}/quick-scan`, { method: 'POST' });
      const verdict = await res.json();
      this.navigate('worklist');
    } catch (e) {
      alert("Error verifying case.");
    }
  },

  verifyAllRemaining: async function() {
    try {
      const res = await fetch('/api/worklist');
      const data = await res.json();
      const pendings = data.requests.filter(r => r.status === 'PENDING');

      for (const p of pendings) {
        await fetch(`/api/worklist/${p.request_id}/quick-scan`, { method: 'POST' });
      }

      alert("All candidate cases have been evaluated against clearinghouse registers!");
      this.navigate('worklist');
    } catch (e) {
      alert("Error running batch verification.");
    }
  },

  resetWorklist: async function() {
    try {
      await fetch('/api/worklist/reset', { method: 'POST' });
      alert("Worklist reset! All 10 candidate cases are back to PENDING review.");
      this.navigate('worklist');
    } catch (e) {
      alert("Error resetting worklist.");
    }
  },

  renderVerdictCard: function(verdict) {
    const card = document.getElementById('workspace-verdict-card');
    if (!card) return;

    const isVerified = verdict.status === 'VERIFIED';
    const isRevoked = verdict.status === 'REVOKED';
    const isFraud = verdict.status === 'FLAGGED_FRAUD';
    const isUnrec = verdict.status === 'UNRECOGNIZED';

    if (isVerified && window.confetti) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    }

    card.innerHTML = `
      <div class="p-4 rounded-xl text-white ${
        isVerified ? 'bg-gradient-to-r from-emerald-600 to-teal-700' :
        isRevoked ? 'bg-gradient-to-r from-rose-600 to-red-700' :
        'bg-gradient-to-r from-red-700 to-amber-700'
      } flex items-center gap-3 shadow-md">
        <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
          <i data-lucide="${isVerified ? 'shield-check' : 'alert-octagon'}" class="w-6 h-6 text-white"></i>
        </div>
        <div>
          <span class="text-[10px] uppercase font-bold tracking-wider opacity-80">Clearinghouse Decision</span>
          <h3 class="text-xl font-bold font-serif-title leading-tight">
            ${isVerified ? '✓ AUTHENTIC & CONFERRED' : isRevoked ? '⚠ REVOKED CREDENTIAL' : isFraud ? '🚨 FLAGGED FORGERY' : '✖ UNACCREDITED / UNKNOWN'}
          </h3>
          <p class="text-xs opacity-90 mt-0.5">Risk Level: <strong>${verdict.risk_level || 'ASSESSED'}</strong></p>
        </div>
      </div>

      <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-700">
        <div class="font-bold text-slate-900 flex items-center gap-1.5">
          <i data-lucide="file-check-2" class="w-4 h-4 text-brand-700"></i> Audit Report Summary:
        </div>
        <p class="leading-relaxed bg-white p-3 rounded-lg border border-slate-200 text-slate-800 font-medium">
          ${verdict.verification_result_summary || verdict.message}
        </p>
        
        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
          <span>Audit Ref: <strong class="font-mono text-slate-800">${verdict.audit_reference || 'BGV-AUDITED'}</strong></span>
          <span>Verified at: ${new Date(verdict.verified_at || Date.now()).toLocaleTimeString()}</span>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-2">
        <button onclick="App.navigate('report', { request_id: '${verdict.request_id || (App.currentWorkItem ? App.currentWorkItem.request_id : '')}' })" class="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5">
          <i data-lucide="printer" class="w-4 h-4 text-gold-400"></i> Generate BGV Clearance Certificate
        </button>
      </div>
    `;

    card.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  },

  // ==========================================
  // VIEW 3: OFFICIAL BGV CLEARANCE REPORT (PRINTABLE)
  // ==========================================
  renderClearanceReport: async function(mount, requestId) {
    mount.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-brand-800"></i>
      </div>
    `;

    try {
      const res = await fetch(`/api/worklist/${requestId}/report`);
      const r = await res.json();

      const isVerified = r.verification_status === 'VERIFIED';

      mount.innerHTML = `
        <div class="space-y-6 max-w-4xl mx-auto">
          <!-- Action Bar (no-print) -->
          <div class="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <button onclick="App.navigate('worklist')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">
              ← Return to Verification Queue
            </button>
            <button onclick="window.print()" class="px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition">
              <i data-lucide="printer" class="w-4 h-4"></i> Print Official BGV Report
            </button>
          </div>

          <!-- Official Clearance Document -->
          <div class="bg-white p-8 md:p-12 rounded-2xl border-4 border-slate-900 shadow-xl print-area space-y-6 relative overflow-hidden">
            
            <!-- Watermark -->
            <div class="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <div class="text-7xl font-black rotate-[-30deg] uppercase font-serif-title">
                ${isVerified ? 'VERIFIED' : 'AUDITED'}
              </div>
            </div>

            <!-- Top Header -->
            <div class="flex items-start justify-between border-b-2 border-slate-900 pb-6">
              <div>
                <h1 class="font-serif-title text-2xl md:text-3xl font-black text-brand-900 tracking-wider uppercase">
                  OmniVeri Global Clearinghouse
                </h1>
                <p class="text-xs uppercase font-bold tracking-widest text-gold-600 mt-0.5">
                  Academic Credential & Background Screening Authority
                </p>
                <p class="text-[11px] text-slate-500 mt-1">Inter-Institutional Verification Directorate • Reference: ${r.audit_reference}</p>
              </div>

              <div class="text-right">
                <div class="gold-seal w-16 h-16 rounded-full flex flex-col items-center justify-center text-white mx-auto mb-1">
                  <i data-lucide="shield-check" class="w-6 h-6 text-white"></i>
                </div>
                <span class="text-[9px] font-black uppercase tracking-wider text-slate-600 block">CLEARANCE STAMP</span>
              </div>
            </div>

            <!-- Status Banner -->
            <div class="p-4 rounded-xl text-xs flex items-center justify-between ${
              isVerified ? 'bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold' :
              'bg-red-50 border border-red-300 text-red-950 font-bold'
            }">
              <div class="flex items-center gap-2">
                <i data-lucide="${isVerified ? 'check-circle-2' : 'alert-octagon'}" class="w-5 h-5 ${isVerified ? 'text-emerald-700' : 'text-red-700'}"></i>
                <span class="text-sm">BACKGROUND VERIFICATION STATUS: ${r.verification_status} (Risk Level: ${r.risk_level})</span>
              </div>
              <span class="font-mono text-slate-600 text-[11px]">${r.verified_at ? new Date(r.verified_at).toUTCString() : ''}</span>
            </div>

            <!-- Subject & Inquiry Details Grid -->
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div class="p-3 bg-slate-50 rounded-xl space-y-1">
                <span class="text-slate-400 font-semibold uppercase text-[10px]">Candidate Details</span>
                <p class="font-bold text-slate-900 text-sm">${r.candidate_name}</p>
                <p class="text-slate-600 font-mono">${r.candidate_email}</p>
              </div>

              <div class="p-3 bg-slate-50 rounded-xl space-y-1">
                <span class="text-slate-400 font-semibold uppercase text-[10px]">Requesting Client</span>
                <p class="font-bold text-slate-900 text-sm">${r.requesting_company}</p>
                <p class="text-slate-600">Position: ${r.position_applied}</p>
              </div>

              <div class="p-3 bg-slate-50 rounded-xl space-y-1">
                <span class="text-slate-400 font-semibold uppercase text-[10px]">Claimed Academic Entity</span>
                <p class="font-bold text-brand-800 text-sm">${r.claimed_university}</p>
                <p class="text-slate-600">${r.claimed_degree}</p>
              </div>

              <div class="p-3 bg-slate-50 rounded-xl space-y-1">
                <span class="text-slate-400 font-semibold uppercase text-[10px]">Audited Credential ID</span>
                <p class="font-mono font-bold text-brand-900 text-sm">${r.claimed_certificate_id}</p>
                <p class="text-slate-500">Method: ${r.verification_method}</p>
              </div>
            </div>

            <!-- Detailed Audit Findings -->
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <span class="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Clearinghouse Verification Findings</span>
              <p class="text-slate-800 leading-relaxed font-medium">
                ${r.verification_summary}
              </p>
            </div>

            <!-- Signatures and Trust Guarantee -->
            <div class="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
              <div>
                <p class="text-[10px] text-slate-400 uppercase font-semibold">Verified & Audited By</p>
                <p class="font-bold text-slate-900 text-sm mt-1">${r.verified_by}</p>
                <p class="text-slate-500">Senior Background Screener • OmniVeri Network</p>
              </div>

              <div class="text-right">
                <p class="text-[10px] text-slate-400 uppercase font-semibold">Institutional Trust Anchor</p>
                <p class="font-mono text-slate-700 text-[11px] mt-1">${r.security_stamp}</p>
                <p class="text-slate-400 text-[10px]">Direct API Synchronization with University Registrars</p>
              </div>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      mount.innerHTML = `<div class="p-8 text-center text-red-600">Error generating BGV report.</div>`;
    }
  },

  // ==========================================
  // VIEW 4: PARTNER UNIVERSITIES DIRECTORY
  // ==========================================
  renderUniversities: async function(mount) {
    mount.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-brand-800"></i>
      </div>
    `;

    try {
      const res = await fetch('/api/universities');
      const universities = await res.json();

      mount.innerHTML = `
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-serif-title font-bold text-slate-900">Partner Universities Registry</h1>
              <p class="text-xs text-slate-500 mt-1">Institutions with synchronized cryptographic credential registries in the OmniVeri trust network</p>
            </div>
            <button onclick="App.navigate('worklist')" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold">
              ← Return to Verification Queue
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${universities.map(u => `
              <div class="bg-white p-6 rounded-2xl border ${u.accreditation_status === 'BLACKLISTED' ? 'border-red-300 bg-red-50/30' : 'border-slate-200'} shadow-sm space-y-4">
                <div class="flex items-start justify-between">
                  <div class="w-12 h-12 rounded-xl ${u.accreditation_status === 'BLACKLISTED' ? 'bg-red-100 text-red-700' : 'bg-brand-50 text-brand-800'} flex items-center justify-center">
                    <i data-lucide="${u.logo_icon || 'graduation-cap'}" class="w-6 h-6"></i>
                  </div>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    u.accreditation_status === 'ACCREDITED' ? 'bg-emerald-100 text-emerald-800' :
                    u.accreditation_status === 'BLACKLISTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }">
                    ${u.accreditation_status}
                  </span>
                </div>

                <div>
                  <h3 class="font-bold text-slate-900 text-base leading-tight">${u.name}</h3>
                  <p class="text-xs text-slate-500 mt-0.5">${u.country} • Est. ${u.established_year}</p>
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Trust Score: <strong class="${u.trust_score > 90 ? 'text-emerald-600' : 'text-red-600'} font-bold">${u.trust_score}/100</strong></span>
                  <span>Code: <code class="font-mono">${u.code}</code></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      mount.innerHTML = `<div class="p-8 text-center text-red-600">Error loading partner universities.</div>`;
    }
  },

  // ==========================================
  // VIEW 5: TELEMETRY & ANALYTICS
  // ==========================================
  renderAnalytics: async function(mount) {
    mount.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-brand-800"></i>
      </div>
    `;

    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      const k = data.kpis;
      const c = data.charts;

      mount.innerHTML = `
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-serif-title font-bold text-slate-900">Clearinghouse Telemetry & Analytics</h1>
              <p class="text-xs text-slate-500 mt-1">Cross-institutional verification metrics, queue completion, and fraud mitigation statistics</p>
            </div>
            <button onclick="App.navigate('worklist')" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold">
              ← Return to Verification Queue
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-xs text-slate-400 font-semibold uppercase">Total Verification Cases</span>
              <div class="text-3xl font-black text-slate-900 mt-1">${k.total_cases}</div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-xs text-slate-400 font-semibold uppercase">Pending In Queue</span>
              <div class="text-3xl font-black text-amber-600 mt-1">${k.pending_cases}</div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-xs text-slate-400 font-semibold uppercase">Verified Cleared</span>
              <div class="text-3xl font-black text-emerald-600 mt-1">${k.verified_cases}</div>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span class="text-xs text-slate-400 font-semibold uppercase">Fraud / Revoked Intercepted</span>
              <div class="text-3xl font-black text-red-600 mt-1">${k.fraud_cases}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 class="text-sm font-bold text-slate-800 mb-4">Verification Cases by Target University</h3>
              <div class="h-64">
                <canvas id="chart-uni-breakdown"></canvas>
              </div>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 class="text-sm font-bold text-slate-800 mb-4">Queue Clearance Distribution</h3>
              <div class="h-64">
                <canvas id="chart-queue-status"></canvas>
              </div>
            </div>
          </div>
        </div>
      `;

      setTimeout(() => {
        new Chart(document.getElementById('chart-uni-breakdown'), {
          type: 'bar',
          data: {
            labels: c.by_university.map(u => u.university.length > 18 ? u.university.substring(0, 16) + '...' : u.university),
            datasets: [{
              label: 'Cases',
              data: c.by_university.map(u => u.count),
              backgroundColor: '#1b4d7a',
              borderRadius: 6
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        new Chart(document.getElementById('chart-queue-status'), {
          type: 'doughnut',
          data: {
            labels: c.verification_status.map(s => s.status),
            datasets: [{
              data: c.verification_status.map(s => s.count),
              backgroundColor: ['#f59e0b', '#10b981', '#ef4444']
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }, 50);

      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      mount.innerHTML = `<div class="p-8 text-center text-red-600">Error rendering analytics.</div>`;
    }
  },

  // ==========================================
  // VIEW 6: PUBLIC DIRECT VERIFICATION (QR SCANS)
  // ==========================================
  renderVerify: async function(mount, certId) {
    if (!certId) {
      this.navigate('worklist');
      return;
    }

    mount.innerHTML = `
      <div class="flex items-center justify-center p-12">
        <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-brand-800"></i>
      </div>
    `;

    try {
      const res = await fetch(`/api/verify/${certId.trim().toUpperCase()}`);
      const data = await res.json();

      const isValid = data.status === 'VALID';
      const isRevoked = data.status === 'REVOKED';
      const isTampered = data.status === 'TAMPERED';
      const isInvalid = data.status === 'INVALID' || res.status === 404;

      if (isValid && window.confetti) {
        confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
      }

      mount.innerHTML = `
        <div class="max-w-3xl mx-auto space-y-6">
          <div class="text-center space-y-1">
            <p class="text-xs uppercase tracking-widest text-gold-600 font-bold">Universal Clearinghouse Gateway</p>
            <h1 class="font-serif-title text-2xl sm:text-3xl font-extrabold text-[#0f2b48] tracking-wider uppercase">
              ACADEMIC CREDENTIAL VERIFICATION
            </h1>
            <p class="text-xs text-slate-500">Directly synchronized with participating university registrar repositories</p>
          </div>

          ${isValid ? `
            <div class="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-lg flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                <i data-lucide="shield-check" class="w-8 h-8 text-white"></i>
              </div>
              <div>
                <span class="text-xs uppercase tracking-wider font-bold text-emerald-200">Clearinghouse Confirmation</span>
                <h2 class="text-2xl font-serif-title font-bold leading-tight">✓ VERIFIED / AUTHENTIC CERTIFICATE</h2>
                <p class="text-xs text-emerald-100 mt-1">Conferred by ${data.university_name} • SHA-256 Signature Verified</p>
              </div>
            </div>
          ` : isRevoked ? `
            <div class="bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-2xl p-6 shadow-lg flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                <i data-lucide="alert-octagon" class="w-8 h-8 text-white"></i>
              </div>
              <div>
                <span class="text-xs uppercase tracking-wider font-bold text-rose-200">Revocation Notice</span>
                <h2 class="text-2xl font-serif-title font-bold leading-tight">⚠ CERTIFICATE REVOKED</h2>
                <p class="text-xs text-rose-100 mt-1">${data.warning || 'This certificate was previously issued but has been officially revoked.'}</p>
              </div>
            </div>
          ` : isTampered ? `
            <div class="bg-gradient-to-r from-red-700 to-amber-700 text-white rounded-2xl p-6 shadow-lg flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                <i data-lucide="shield-alert" class="w-8 h-8 text-white"></i>
              </div>
              <div>
                <span class="text-xs uppercase tracking-wider font-bold text-amber-200">Security Alarm</span>
                <h2 class="text-2xl font-serif-title font-bold leading-tight">🚨 POSSIBLE TAMPERING DETECTED</h2>
                <p class="text-xs text-amber-100 mt-1">The cryptographic signature does not match the issuing university's master register.</p>
              </div>
            </div>
          ` : `
            <div class="bg-slate-800 text-white rounded-2xl p-6 shadow-lg flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                <i data-lucide="x-circle" class="w-8 h-8 text-red-400"></i>
              </div>
              <div>
                <span class="text-xs uppercase tracking-wider font-bold text-slate-400">Not Found</span>
                <h2 class="text-2xl font-serif-title font-bold leading-tight">✖ CERTIFICATE UNRECOGNIZED</h2>
                <p class="text-xs text-slate-300 mt-1">Certificate ID "${certId}" has no matching record in any accredited clearinghouse repository.</p>
              </div>
            </div>
          `}

          ${!isInvalid ? `
            <div class="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span class="text-slate-400 uppercase text-[10px] font-bold block">Graduate Name</span>
                  <span class="text-slate-900 font-bold text-sm">${data.student_name}</span>
                </div>
                <div>
                  <span class="text-slate-400 uppercase text-[10px] font-bold block">Issuing University</span>
                  <span class="text-brand-800 font-bold text-sm">${data.university_name}</span>
                </div>
                <div>
                  <span class="text-slate-400 uppercase text-[10px] font-bold block">Conferred Degree</span>
                  <span class="text-slate-900 font-semibold text-sm">${data.degree}</span>
                </div>
                <div>
                  <span class="text-slate-400 uppercase text-[10px] font-bold block">Certificate Identifier</span>
                  <span class="font-mono font-bold text-brand-900 text-sm">${data.certificate_id}</span>
                </div>
              </div>

              ${isRevoked && data.revocation_reason ? `
                <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
                  <strong>Official Revocation Reason:</strong> ${data.revocation_reason}
                </div>
              ` : ''}

              <div class="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Verified through: <strong>${data.verified_through}</strong></span>
                <button onclick="App.navigate('worklist')" class="text-brand-700 font-semibold hover:underline">
                  ← Return to Verifier Worklist
                </button>
              </div>
            </div>
          ` : `
            <div class="text-center pt-4">
              <button onclick="App.navigate('worklist')" class="px-5 py-2.5 bg-brand-800 text-white rounded-xl text-xs font-semibold">
                ← Return to Verification Queue
              </button>
            </div>
          `}
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      mount.innerHTML = `<div class="p-8 text-center text-red-600">Verification service unreachable.</div>`;
    }
  },

  // Direct QR Scanner Modal
  openScannerModal: function() {
    const modal = document.getElementById('modal-scanner');
    if (modal) {
      modal.classList.remove('hidden');
      this.switchScanTab('camera');
    }
  },

  closeScannerModal: function() {
    const modal = document.getElementById('modal-scanner');
    if (modal) modal.classList.add('hidden');
    QRScanner.stopCamera();
  },

  switchScanTab: function(tab) {
    const camPane = document.getElementById('scanner-camera-pane');
    const uploadPane = document.getElementById('scanner-upload-pane');
    const btnCam = document.getElementById('tab-btn-cam');
    const btnUpload = document.getElementById('tab-btn-upload');
    const errorBox = document.getElementById('scanner-error-msg');
    if (errorBox) errorBox.classList.add('hidden');

    if (tab === 'camera') {
      camPane.classList.remove('hidden');
      uploadPane.classList.add('hidden');
      btnCam.className = 'pb-2 border-b-2 border-brand-800 text-brand-800 px-4';
      btnUpload.className = 'pb-2 border-b-2 border-transparent text-slate-500 hover:text-brand-800 px-4';

      QRScanner.startCamera('qr-video', 'qr-canvas', (decodedUrl) => {
        this.closeScannerModal();
        let certId = decodedUrl.trim();
        if (certId.includes('/verify/')) {
          certId = certId.split('/verify/')[1].split('?')[0].split('#')[0];
        }
        this.navigate('verify', { certificate_id: certId });
      }).catch(err => {
        if (errorBox) {
          errorBox.textContent = "Camera access unavailable or declined. Please use 'Upload Image / File' tab.";
          errorBox.classList.remove('hidden');
        }
      });
    } else {
      QRScanner.stopCamera();
      camPane.classList.add('hidden');
      uploadPane.classList.remove('hidden');
      btnUpload.className = 'pb-2 border-b-2 border-brand-800 text-brand-800 px-4';
      btnCam.className = 'pb-2 border-b-2 border-transparent text-slate-500 hover:text-brand-800 px-4';
    }
  },

  handleQRFileUpload: function(event) {
    const file = event.target.files[0];
    const errorBox = document.getElementById('scanner-error-msg');
    if (!file) return;

    QRScanner.scanFromFile(file, (decodedData) => {
      this.closeScannerModal();
      let certId = decodedData.trim();
      if (certId.includes('/verify/')) {
        certId = certId.split('/verify/')[1].split('?')[0].split('#')[0];
      }
      this.navigate('verify', { certificate_id: certId });
    }, (errMsg) => {
      if (errorBox) {
        errorBox.textContent = errMsg;
        errorBox.classList.remove('hidden');
      }
    });
  }
};

// Initialize App upon DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
