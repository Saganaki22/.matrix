class DottedEffect {
    constructor() {
        // Canvas and context
        this.canvas = document.getElementById('outputCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.fileInput = document.getElementById('fileInput');
        
        // Container elements
        this.dropZone = document.querySelector('.drop-zone');
        this.dropMessage = document.querySelector('.drop-message');
        
        // Settings panel elements
        this.settingsPanel = document.querySelector('.settings-panel');
        this.settingsToggle = document.querySelector('.settings-toggle');
        this.dotSizeInput = document.getElementById('dotSize');
        this.spacingInput = document.getElementById('spacing');
        this.thresholdInput = document.getElementById('threshold');
        
        // Button elements
        this.downloadBtn = document.getElementById('downloadBtn');
        this.downloadVideoBtn = document.getElementById('downloadVideo');
        this.clearBtn = document.getElementById('clearMedia');
        this.cancelBtn = document.getElementById('cancelProcessing');
        
        // Media state
        this.currentMedia = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        
        // Hide buttons initially
        this.downloadBtn.style.display = 'none';
        this.downloadVideoBtn.style.display = 'none';
        this.cancelBtn.style.display = 'none';
        this.clearBtn.style.display = 'none';

        // Add resize observer
        this.resizeObserver = new ResizeObserver(() => {
            if (this.currentMedia) {
                this.updateCanvasSize();
            }
        });
        this.resizeObserver.observe(this.dropZone);

        this.setupEventListeners();
        window.addEventListener('resize', () => this.updateCanvasSize());
        this.showDropMessage();
    }

    setupEventListeners() {
        // Settings panel toggle
        this.settingsToggle.addEventListener('click', () => {
            this.settingsPanel.classList.toggle('retracted');
        });

        // Slider event listeners
        this.dotSizeInput.addEventListener('input', () => this.applyEffect());
        this.spacingInput.addEventListener('input', () => this.applyEffect());
        this.thresholdInput.addEventListener('input', () => this.applyEffect());

        // File input event listeners
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.type.startsWith('image/')) {
                this.handleImageUpload(file);
            } else if (file.type.startsWith('video/')) {
                this.handleVideoUpload(file);
            }
        });

        // Drop zone event listeners
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.add('dragover');
        });

        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('dragover');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('dragover');
            
            const file = e.dataTransfer.files[0];
            if (!file) return;
            
            if (file.type.startsWith('image/')) {
                this.handleImageUpload(file);
            } else if (file.type.startsWith('video/')) {
                this.handleVideoUpload(file);
            }
        });

        // Click on drop zone to trigger file input
        this.dropZone.addEventListener('click', (e) => {
            if (!this.currentMedia && this.dropMessage.style.display === 'block') {
                this.fileInput.click();
            }
        });

        // Button event listeners
        this.downloadBtn.addEventListener('click', () => this.downloadResult());
        this.downloadVideoBtn.addEventListener('click', () => this.processVideo());
        this.cancelBtn.addEventListener('click', () => this.cancelProcessing());
        this.clearBtn.addEventListener('click', () => this.clearMedia());
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            this.handleImageUpload(file);
        } else if (file.type.startsWith('video/')) {
            this.handleVideoUpload(file);
        }
    }

    handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentMedia = {
                    type: 'image',
                    element: img,
                    width: img.width,
                    height: img.height
                };
                
                this.hideDropMessage();
                this.downloadBtn.style.display = 'block';
                this.downloadVideoBtn.style.display = 'none';
                this.clearBtn.style.display = 'block';
                this.cancelBtn.style.display = 'none';
                
                this.updateCanvasSize();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleVideoUpload(file) {
        const url = URL.createObjectURL(file);
        this.video = document.createElement('video');
        this.video.src = url;
        this.video.style.display = 'none';
        this.video.loop = true;
        this.video.muted = true;
        
        this.video.onloadedmetadata = () => {
            this.currentMedia = {
                type: 'video',
                element: this.video,
                width: this.video.videoWidth,
                height: this.video.videoHeight
            };
            
            this.hideDropMessage();
            this.downloadBtn.style.display = 'none';
            this.downloadVideoBtn.style.display = 'block';
            this.clearBtn.style.display = 'block';
            this.cancelBtn.style.display = 'none';
            
            this.updateCanvasSize();
            this.startVideoPlayback();
        };
    }

    startVideoPlayback() {
        if (!this.currentMedia || this.currentMedia.type !== 'video') return;
        
        const video = this.currentMedia.element;
        video.play();

        const animate = () => {
            if (!this.currentMedia || this.currentMedia.type !== 'video') return;
            this.applyEffect();
            this.animationFrame = requestAnimationFrame(animate);
        };

        animate();
    }

    applyEffect() {
        if (!this.currentMedia) return;

        const dotSize = parseInt(this.dotSizeInput.value);
        const spacing = parseInt(this.spacingInput.value);
        const threshold = parseInt(this.thresholdInput.value);

        const sourceElement = this.currentMedia.element;
        this.processImage(sourceElement, this.canvas.width, this.canvas.height, dotSize, spacing, threshold);
    }

    processImage(source, width, height, dotSize = 5, spacing = 8, threshold = 128, ctx = this.ctx) {
        // Create a temporary canvas for processing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;

        // Draw the source image/video frame
        tempCtx.drawImage(source, 0, 0, width, height);
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Clear the target canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';

        // Process pixels
        for (let y = 0; y < height; y += spacing) {
            for (let x = 0; x < width; x += spacing) {
                const i = (Math.floor(y) * width + Math.floor(x)) * 4;
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                
                if (brightness > threshold) {
                    const radius = dotSize * (brightness / 255);
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    downloadResult() {
        // Create a full resolution version
        const originalWidth = this.currentMedia.width;
        const originalHeight = this.currentMedia.height;
        
        const hiddenCanvas = document.createElement('canvas');
        hiddenCanvas.width = originalWidth;
        hiddenCanvas.height = originalHeight;
        const hiddenCtx = hiddenCanvas.getContext('2d');
        
        const dotSize = parseInt(this.dotSizeInput.value);
        const spacing = parseInt(this.spacingInput.value);
        const threshold = parseInt(this.thresholdInput.value);
        
        this.processImage(
            this.currentMedia.element,
            originalWidth,
            originalHeight,
            dotSize,
            spacing,
            threshold,
            hiddenCtx
        );

        // Download at full resolution
        const link = document.createElement('a');
        link.download = 'dotted-effect.png';
        link.href = hiddenCanvas.toDataURL('image/png');
        link.click();
    }

    processVideo() {
        if (this.isRecording || !this.currentMedia || this.currentMedia.type !== 'video') return;

        // Pause the looping preview while processing
        cancelAnimationFrame(this.animationFrame);
        this.currentMedia.element.pause();

        this.isRecording = true;
        this.downloadVideoBtn.classList.add('processing');
        this.downloadVideoBtn.disabled = true;
        this.cancelBtn.style.display = 'inline-block';

        // Start dots animation
        let dots = 0;
        const updateDots = () => {
            if (!this.isRecording) return;
            dots = (dots + 1) % 4;
            this.downloadVideoBtn.textContent = 'Processing' + '.'.repeat(dots);
            setTimeout(updateDots, 500);
        };
        updateDots();

        // Set hidden canvas to original video dimensions
        const originalWidth = this.currentMedia.width;
        const originalHeight = this.currentMedia.height;
        const hiddenCanvas = document.createElement('canvas');
        hiddenCanvas.width = originalWidth;
        hiddenCanvas.height = originalHeight;
        const hiddenCtx = hiddenCanvas.getContext('2d');

        // Use basic WebM format with higher bitrate
        const stream = hiddenCanvas.captureStream();
        try {
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm',
                videoBitsPerSecond: 8000000
            });
        } catch (e) {
            console.error('MediaRecorder error:', e);
            return;
        }

        this.recordedChunks = [];

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                this.recordedChunks.push(e.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            if (this.recordedChunks.length > 0) {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'dotted-effect.webm';
                a.click();
                URL.revokeObjectURL(url);
            }
            this.finishProcessing();
            
            // Resume the looping preview
            this.startVideoPlayback();
        };

        // Set up video for processing
        const video = this.currentMedia.element;
        video.currentTime = 0;
        video.playbackRate = 1;
        video.loop = false; // Disable looping during processing

        const dotSize = parseInt(this.dotSizeInput.value);
        const spacing = parseInt(this.spacingInput.value);
        const threshold = parseInt(this.thresholdInput.value);

        // Start recording immediately
        this.mediaRecorder.start();

        const processFrame = () => {
            if (!this.isRecording) {
                video.pause();
                this.mediaRecorder.stop();
                return;
            }

            // Process the current frame
            this.processImage(
                video,
                originalWidth,
                originalHeight,
                dotSize,
                spacing,
                threshold,
                hiddenCtx
            );

            // Check if we've reached the end
            if (video.currentTime >= video.duration - 0.1) {
                video.pause();
                this.mediaRecorder.stop();
            } else {
                requestAnimationFrame(processFrame);
            }
        };

        // Start processing
        video.play();
        processFrame();
    }

    cancelProcessing() {
        if (this.isRecording) {
            this.isRecording = false;
            this.video.pause();
            this.video.currentTime = 0;
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
        }
    }

    finishProcessing() {
        this.isRecording = false;
        this.downloadVideoBtn.classList.remove('processing');
        this.downloadVideoBtn.disabled = false;
        this.downloadVideoBtn.textContent = 'Process Video';
        this.cancelBtn.style.display = 'none';
        this.recordedChunks = [];
        this.mediaRecorder = null;

        // Re-enable looping for preview
        if (this.currentMedia && this.currentMedia.type === 'video') {
            this.currentMedia.element.loop = true;
        }
    }

    clearMedia() {
        if (this.currentMedia && this.currentMedia.type === 'video') {
            cancelAnimationFrame(this.animationFrame);
            this.currentMedia.element.pause();
            this.currentMedia.element.src = '';
        }
        this.currentMedia = null;
        this.downloadBtn.style.display = 'none';
        this.downloadVideoBtn.style.display = 'none';
        this.clearBtn.style.display = 'none';
        this.cancelBtn.style.display = 'none';
        this.canvas.width = 0;
        this.canvas.height = 0;
        this.canvas.style.display = 'none';
        
        // Keep dropzone empty until clicked
        this.dropMessage.style.display = 'none';
        this.dropZone.style.cursor = 'pointer';
        
        const onClick = (e) => {
            e.stopPropagation(); // Prevent triggering the file input click
            this.showDropMessage();
            this.dropZone.removeEventListener('click', onClick);
        };
        
        // Remove any existing click handlers and add new one
        this.dropZone.removeEventListener('click', onClick);
        this.dropZone.addEventListener('click', onClick);
    }

    showDropMessage() {
        this.dropMessage.style.display = 'block';
        this.canvas.style.display = 'none';
    }

    hideDropMessage() {
        this.dropMessage.style.display = 'none';
        this.canvas.style.display = 'block';
    }

    updateCanvasSize() {
        if (!this.currentMedia) return;

        const containerWidth = this.dropZone.clientWidth;
        const containerHeight = this.dropZone.clientHeight;
        const imageAspect = this.currentMedia.width / this.currentMedia.height;
        
        let canvasWidth, canvasHeight;
        
        if (containerWidth / containerHeight > imageAspect) {
            // Container is wider than image aspect ratio
            canvasHeight = Math.min(containerHeight, this.currentMedia.height);
            canvasWidth = canvasHeight * imageAspect;
        } else {
            // Container is taller than image aspect ratio
            canvasWidth = Math.min(containerWidth, this.currentMedia.width);
            canvasHeight = canvasWidth / imageAspect;
        }
        
        // Update canvas size
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        this.canvas.style.display = 'block';
        
        // Apply the effect immediately
        this.applyEffect();
    }
}

// Initialize the application
new DottedEffect();
