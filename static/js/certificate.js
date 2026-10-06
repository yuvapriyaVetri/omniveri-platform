/**
 * Certificate Rendering and Export Utilities
 */

window.CertificateRenderer = {
  renderOfficialDiploma: function(cert, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const qrImage = cert.qr_code_image || `/api/qr/${cert.certificate_id}.png`;
    const isRevoked = cert.status === 'REVOKED';

    container.innerHTML = `
      <div class="certificate-frame p-8 md:p-12 relative bg-white overflow-hidden rounded-lg print-area">
        ${isRevoked ? `
          <div class="absolute inset-0 bg-red-600/10 pointer-events-none flex items-center justify-center z-20">
            <div class="border-8 border-red-600 text-red-600 text-4xl md:text-6xl font-black tracking-widest px-8 py-4 rotate-[-25deg] uppercase opacity-60">
              REVOKED
            </div>
          </div>
        ` : ''}

        <!-- Top Header & Crest -->
        <div class="text-center relative z-10">
          <div class="flex items-center justify-center gap-3 mb-2">
            <div class="w-14 h-14 rounded-full bg-[#0f2b48] text-white flex items-center justify-center shadow-lg border-2 border-[#c59b27]">
              <i data-lucide="graduation-cap" class="w-8 h-8 text-[#c59b27]"></i>
            </div>
          </div>
          <h2 class="font-serif-title text-2xl md:text-4xl font-extrabold tracking-wider text-[#0f2b48] uppercase">
            ${cert.university_name || 'Apex Global University'}
          </h2>
          <p class="text-xs uppercase tracking-widest text-[#c59b27] font-semibold mt-1">
            Chartered Under Act of Parliament • Office of Academic Credentials
          </p>
          <div class="w-48 h-0.5 bg-gradient-to-r from-transparent via-[#c59b27] to-transparent mx-auto my-3"></div>
        </div>

        <!-- Body -->
        <div class="text-center my-6 z-10 relative">
          <p class="font-diploma italic text-lg text-slate-600 mb-2">This is to officially certify that</p>
          <h1 class="font-serif-title text-3xl md:text-5xl font-bold text-slate-900 tracking-wide my-3 border-b-2 border-slate-200 pb-2 inline-block max-w-2xl px-6">
            ${cert.student_name}
          </h1>
          <p class="text-xs text-slate-500 font-mono tracking-wider mb-4">
            STUDENT REGISTER NO: <span class="font-bold text-slate-800">${cert.register_number}</span>
          </p>
          <p class="text-base text-slate-700 max-w-xl mx-auto leading-relaxed">
            having fulfilled all academic and institutional prerequisites prescribed by the Academic Council,
            has been duly conferred the credential of
          </p>
          <h3 class="text-2xl md:text-3xl font-serif-title font-bold text-[#0f2b48] mt-3">
            ${cert.degree}
          </h3>
          <p class="text-sm font-semibold text-slate-600 tracking-wide mt-1">
            Department of ${cert.department}
          </p>
          <p class="text-xs text-slate-500 mt-1">Class of ${cert.graduation_year}</p>
        </div>

        <!-- Bottom Row: Signatures, Seal, QR Code -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mt-10 pt-6 border-t border-slate-200 z-10 relative">
          <!-- Left: University Seal & Registrar -->
          <div class="text-center md:text-left flex flex-col items-center md:items-start">
            <div class="gold-seal w-20 h-20 rounded-full flex flex-col items-center justify-center text-white mb-3">
              <i data-lucide="award" class="w-8 h-8 text-white"></i>
              <span class="text-[9px] font-black tracking-widest uppercase">OFFICIAL SEAL</span>
            </div>
            <div class="border-t border-slate-400 w-36 pt-1 text-center">
              <p class="text-xs font-serif-title font-bold text-slate-800">Dr. Eleanor Vance</p>
              <p class="text-[10px] text-slate-500 uppercase tracking-wider">Dean of Academics</p>
            </div>
          </div>

          <!-- Middle: Metadata & Integrity Fingerprint -->
          <div class="text-center text-xs text-slate-500 space-y-1">
            <p><span class="font-semibold text-slate-700">Certificate ID:</span> <span class="font-mono text-[#0f2b48] font-bold">${cert.certificate_id}</span></p>
            <p><span class="font-semibold text-slate-700">Conferred Date:</span> ${cert.issue_date}</p>
            <p><span class="font-semibold text-slate-700">Status:</span> 
              <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold ${cert.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : cert.status === 'REVOKED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}">
                ${cert.status}
              </span>
            </p>
            <p class="text-[9px] text-slate-400 font-mono truncate max-w-xs mx-auto" title="${cert.certificate_hash}">
              SHA-256: ${cert.certificate_hash ? cert.certificate_hash.substring(0, 18) + '...' : 'SECURE'}
            </p>
          </div>

          <!-- Right: Verification Gateway QR Code -->
          <div class="flex flex-col items-center md:items-end text-center">
            <div class="bg-white p-2 border-2 border-slate-300 rounded shadow-sm">
              <img src="${qrImage}" alt="Official Verification QR" class="w-24 h-24 object-contain">
            </div>
            <p class="text-[9px] font-bold text-[#0f2b48] tracking-wider mt-1 uppercase">Scan to Verify Authenticity</p>
            <p class="text-[8px] text-slate-400">Trusted University Gateway</p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  printCertificate: function() {
    window.print();
  }
};
