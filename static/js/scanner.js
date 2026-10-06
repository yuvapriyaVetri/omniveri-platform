/**
 * QR Code Scanner Module
 * Supports both webcam video scanning and image file drag & drop.
 */

window.QRScanner = {
  videoStream: null,
  isScanning: false,
  animationFrameId: null,

  startCamera: async function(videoElementId, canvasElementId, onScanSuccess) {
    const video = document.getElementById(videoElementId);
    const canvas = document.getElementById(canvasElementId);
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    this.isScanning = true;

    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      video.srcObject = this.videoStream;
      video.setAttribute('playsinline', true);
      await video.play();

      const tick = () => {
        if (!this.isScanning) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          if (window.jsQR) {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              this.stopCamera();
              onScanSuccess(code.data);
              return;
            }
          }
        }
        this.animationFrameId = requestAnimationFrame(tick);
      };

      this.animationFrameId = requestAnimationFrame(tick);
    } catch (err) {
      console.warn("Camera access denied or unavailable:", err);
      throw err;
    }
  },

  stopCamera: function() {
    this.isScanning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
  },

  scanFromFile: function(file, onScanSuccess, onError) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (window.jsQR) {
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            onScanSuccess(code.data);
          } else {
            onError("No readable QR code found in this image. Please upload a clear photo or screenshot.");
          }
        } else {
          onError("QR engine not loaded.");
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
};
