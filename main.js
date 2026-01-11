/* ===================================
   Main JavaScript - Chris Lin Portfolio
   Puzzle Navigation System
   =================================== */

document.addEventListener('DOMContentLoaded', () => {
    initPuzzleNavigation();
    initContactForm();
});

/* ===================================
   Puzzle Navigation with Docking Spheres
   =================================== */
function initPuzzleNavigation() {
    const canvas = document.getElementById('warpGrid');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    // Grid settings - subtle for space theme
    const gridSpacing = 60;
    const gridColor = 'rgba(40, 60, 100, 0.15)';

    // Central star settings
    const centralStar = {
        baseRadius: 70,
        pulsePhase: 0,
        glowColor: '#FFA500'
    };

    // Star field (cached for performance)
    let starField = null;
    let starFieldCanvas = null;

    // Sphere definitions with orbital properties
    // COLOR PALETTES:
    // Deep Space Jewels (alt):  Sapphire, Amethyst, Emerald, Amber
    // Warm Metallics (current): Silver, Bronze, Patina, Gold
    const spheres = [
        { 
            sectionId: 'about', label: 'About',
            radius: 38, 
            semiMajorAxis: 0.20,  // As fraction of min(width,height)
            eccentricity: 0.15,
            orbitTilt: 0.1,  // Radians
            angle: 0,
            baseAngularVelocity: 0.003,
            // Deep Space Jewels - Sapphire
            // colors: { highlight: '#7090c0', mid: '#506a98', dark: '#3a4a70', shadow: '#2a3a50' },
            // Warm Metallics - Silver
            colors: { highlight: '#c0d0e0', mid: '#90a0b0', dark: '#607080', shadow: '#405060' },
            trail: [],
            vx: 0, vy: 0,
            orbitCenterX: 0, orbitCenterY: 0
        },
        { 
            sectionId: 'projects', label: 'Projects',
            radius: 34, 
            semiMajorAxis: 0.30,
            eccentricity: 0.2,
            orbitTilt: -0.15,
            angle: Math.PI * 0.5,
            baseAngularVelocity: 0.0022,
            // Deep Space Jewels - Amethyst
            // colors: { highlight: '#9878a8', mid: '#785888', dark: '#583868', shadow: '#382848' },
            // Warm Metallics - Bronze
            colors: { highlight: '#e0c8b0', mid: '#c0a080', dark: '#907050', shadow: '#605030' },
            trail: [],
            vx: 0, vy: 0,
            orbitCenterX: 0, orbitCenterY: 0
        },
        { 
            sectionId: 'blog', label: 'Blog',
            radius: 30, 
            semiMajorAxis: 0.40,
            eccentricity: 0.12,
            orbitTilt: 0.2,
            angle: Math.PI,
            baseAngularVelocity: 0.0016,
            // Deep Space Jewels - Emerald
            // colors: { highlight: '#60b8a0', mid: '#409078', dark: '#306858', shadow: '#204838' },
            // Warm Metallics - Patina
            colors: { highlight: '#b0c8c0', mid: '#80a098', dark: '#507068', shadow: '#304840' },
            trail: [],
            vx: 0, vy: 0,
            orbitCenterX: 0, orbitCenterY: 0
        },
        { 
            sectionId: 'contact', label: 'Contact',
            radius: 28, 
            semiMajorAxis: 0.50,
            eccentricity: 0.18,
            orbitTilt: -0.05,
            angle: Math.PI * 1.5,
            baseAngularVelocity: 0.0012,
            // Deep Space Jewels - Amber
            // colors: { highlight: '#c8a060', mid: '#a88040', dark: '#786030', shadow: '#584020' },
            // Warm Metallics - Gold
            colors: { highlight: '#e8d8a0', mid: '#c8b070', dark: '#988050', shadow: '#685030' },
            trail: [],
            vx: 0, vy: 0,
            orbitCenterX: 0, orbitCenterY: 0
        }
    ];

    // State
    let time = 0;
    let draggedSphere = null;
    let isDragging = false;
    let hoveredSphere = null;
    let isMobile = 'ontouchstart' in window;
    
    // Click vs drag detection
    let mouseDownTime = 0;
    let mouseDownX = 0;
    let mouseDownY = 0;
    const CLICK_TIME_THRESHOLD = 200;  // ms
    const CLICK_DISTANCE_THRESHOLD = 5;  // px
    
    // Drag resistance spring
    let dragAnchorX = 0;
    let dragAnchorY = 0;
    let dragAnchorAngle = 0;
    const DRAG_SPRING_STRENGTH = 0.02;

    // DOM elements
    const contentPanel = document.getElementById('content-panel');
    const panelContent = document.getElementById('panel-content');
    const panelClose = document.getElementById('panel-close');
    const panelBackdrop = document.getElementById('panel-backdrop');
    const hintText = document.getElementById('hint-text');
    
    // Generate star field
    function generateStarField() {
        starFieldCanvas = document.createElement('canvas');
        starFieldCanvas.width = canvas.width;
        starFieldCanvas.height = canvas.height;
        const starCtx = starFieldCanvas.getContext('2d');
        
        // Dark space background
        starCtx.fillStyle = '#0a0a1a';
        starCtx.fillRect(0, 0, starFieldCanvas.width, starFieldCanvas.height);
        
        // Generate random stars
        const starCount = Math.floor((canvas.width * canvas.height) / 3000);
        for (let i = 0; i < starCount; i++) {
            const x = Math.random() * starFieldCanvas.width;
            const y = Math.random() * starFieldCanvas.height;
            const size = Math.random() * 1.5 + 0.5;
            const opacity = Math.random() * 0.5 + 0.3;
            
            starCtx.beginPath();
            starCtx.arc(x, y, size, 0, Math.PI * 2);
            starCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            starCtx.fill();
        }
        
        // Add a few brighter stars
        for (let i = 0; i < starCount / 10; i++) {
            const x = Math.random() * starFieldCanvas.width;
            const y = Math.random() * starFieldCanvas.height;
            const size = Math.random() * 1 + 1.5;
            
            // Glow effect
            const glow = starCtx.createRadialGradient(x, y, 0, x, y, size * 3);
            glow.addColorStop(0, 'rgba(200, 220, 255, 0.8)');
            glow.addColorStop(0.5, 'rgba(150, 180, 255, 0.3)');
            glow.addColorStop(1, 'rgba(100, 150, 255, 0)');
            
            starCtx.beginPath();
            starCtx.arc(x, y, size * 3, 0, Math.PI * 2);
            starCtx.fillStyle = glow;
            starCtx.fill();
        }
        
        starField = starFieldCanvas;
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Regenerate star field on resize
        generateStarField();
        
        // Calculate center point for orbits
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const orbitScale = Math.min(canvas.width, canvas.height);
        
        // Initialize sphere orbital positions
        for (const sphere of spheres) {
            sphere.orbitCenterX = centerX;
            sphere.orbitCenterY = centerY;
            sphere.orbitScale = orbitScale;
            
            // Calculate initial position from orbital parameters
            if (!sphere.x) {
                updateSphereOrbitalPosition(sphere);
            }
        }
    }
    
    // Calculate position on elliptical orbit
    function updateSphereOrbitalPosition(sphere) {
        const a = sphere.semiMajorAxis * sphere.orbitScale;  // Semi-major axis
        const e = sphere.eccentricity;
        const b = a * Math.sqrt(1 - e * e);  // Semi-minor axis
        
        // Kepler's equation: vary angular velocity based on distance (faster near perihelion)
        const r = a * (1 - e * e) / (1 + e * Math.cos(sphere.angle));
        const keplerFactor = (a / r) * (a / r);  // Speed up when closer
        
        sphere.currentAngularVelocity = sphere.baseAngularVelocity * Math.sqrt(keplerFactor);
        
        // Position on tilted ellipse
        const cosT = Math.cos(sphere.orbitTilt);
        const sinT = Math.sin(sphere.orbitTilt);
        const x = a * Math.cos(sphere.angle);
        const y = b * Math.sin(sphere.angle);
        
        sphere.x = sphere.orbitCenterX + x * cosT - y * sinT;
        sphere.y = sphere.orbitCenterY + x * sinT + y * cosT;
    }

    // Find sphere at position
    function getSphereAtPosition(x, y) {
        for (let i = spheres.length - 1; i >= 0; i--) {
            const sphere = spheres[i];
            const dx = x - sphere.x;
            const dy = y - sphere.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= sphere.radius + 5) {  // Small hit area buffer
                return sphere;
            }
        }
        return null;
    }

    // Show content panel
    function showContentPanel(sectionId) {
        const template = document.getElementById(`template-${sectionId}`);
        if (!template) return;

        panelContent.innerHTML = '';
        panelContent.appendChild(template.content.cloneNode(true));
        contentPanel.classList.add('active');

        // Hide hint
        if (hintText) hintText.classList.add('hidden');

        // Re-init contact form if showing contact section
        if (sectionId === 'contact') {
            initContactForm();
        }
    }

    // Hide content panel
    function hideContentPanel() {
        contentPanel.classList.remove('active');

        // Show hint again
        if (hintText) hintText.classList.remove('hidden');
    }

    // Mouse handlers
    function handleDocumentMouseMove(e) {
        const x = e.clientX;
        const y = e.clientY;

        if (isDragging && draggedSphere) {
            // Apply drag with spring resistance toward orbit
            const targetX = x;
            const targetY = y;
            
            // Calculate orbital anchor position (where sphere would be on orbit)
            const tempAngle = dragAnchorAngle + (Date.now() - mouseDownTime) * draggedSphere.baseAngularVelocity * 0.001;
            const a = draggedSphere.semiMajorAxis * draggedSphere.orbitScale;
            const e_val = draggedSphere.eccentricity;
            const b = a * Math.sqrt(1 - e_val * e_val);
            const cosT = Math.cos(draggedSphere.orbitTilt);
            const sinT = Math.sin(draggedSphere.orbitTilt);
            const ox = a * Math.cos(tempAngle);
            const oy = b * Math.sin(tempAngle);
            const anchorX = draggedSphere.orbitCenterX + ox * cosT - oy * sinT;
            const anchorY = draggedSphere.orbitCenterY + ox * sinT + oy * cosT;
            
            // Spring force toward anchor (resistance)
            const dx = targetX - anchorX;
            const dy = targetY - anchorY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDrag = 150;  // Maximum distance sphere can be pulled from orbit
            
            if (dist > maxDrag) {
                // Limit drag distance
                draggedSphere.x = anchorX + (dx / dist) * maxDrag;
                draggedSphere.y = anchorY + (dy / dist) * maxDrag;
            } else {
                draggedSphere.x = targetX;
                draggedSphere.y = targetY;
            }

            e.preventDefault();
        } else {
            // Check hover state
            hoveredSphere = getSphereAtPosition(x, y);

            if (hoveredSphere) {
                canvas.style.pointerEvents = 'auto';
                canvas.style.cursor = 'pointer';
                document.body.style.cursor = 'pointer';
            } else {
                canvas.style.pointerEvents = 'none';
                canvas.style.cursor = 'default';
                document.body.style.cursor = '';
            }
        }
    }

    function handleCanvasMouseDown(e) {
        const x = e.clientX;
        const y = e.clientY;

        const sphere = getSphereAtPosition(x, y);
        if (sphere) {
            mouseDownTime = Date.now();
            mouseDownX = x;
            mouseDownY = y;
            draggedSphere = sphere;
            dragAnchorAngle = sphere.angle;
            canvas.style.cursor = 'grabbing';
            document.body.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }

    function handleDocumentMouseUp(e) {
        if (draggedSphere) {
            const x = e.clientX;
            const y = e.clientY;
            const timeDelta = Date.now() - mouseDownTime;
            const distDelta = Math.sqrt((x - mouseDownX) ** 2 + (y - mouseDownY) ** 2);
            
            // Check if this was a click (not a drag)
            if (timeDelta < CLICK_TIME_THRESHOLD && distDelta < CLICK_DISTANCE_THRESHOLD) {
                // It's a click - open the section
                showContentPanel(draggedSphere.sectionId);
            } else if (isDragging) {
                // It was a drag - recalculate orbit from new position
                recalculateOrbitFromPosition(draggedSphere);
            }

            isDragging = false;
            draggedSphere = null;
            canvas.style.cursor = 'default';
            document.body.style.cursor = '';
        }
    }
    
    // Check if dragging has started (movement threshold)
    function checkDragStart(x, y) {
        if (draggedSphere && !isDragging) {
            const distDelta = Math.sqrt((x - mouseDownX) ** 2 + (y - mouseDownY) ** 2);
            const timeDelta = Date.now() - mouseDownTime;
            if (distDelta >= CLICK_DISTANCE_THRESHOLD || timeDelta >= CLICK_TIME_THRESHOLD) {
                isDragging = true;
            }
        }
    }
    
    // Recalculate orbital parameters after drag
    function recalculateOrbitFromPosition(sphere) {
        const centerX = sphere.orbitCenterX;
        const centerY = sphere.orbitCenterY;
        
        // Calculate new distance from center
        const dx = sphere.x - centerX;
        const dy = sphere.y - centerY;
        const newDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate new angle
        sphere.angle = Math.atan2(dy, dx);
        
        // Adjust semi-major axis based on new distance (with limits)
        const minOrbit = 0.12;
        const maxOrbit = 0.48;
        const newSemiMajor = Math.max(minOrbit, Math.min(maxOrbit, newDistance / sphere.orbitScale));
        
        // Slightly perturb eccentricity based on drag intensity
        const dragIntensity = Math.abs(newSemiMajor - sphere.semiMajorAxis) / sphere.semiMajorAxis;
        sphere.eccentricity = Math.min(0.7, sphere.eccentricity + dragIntensity * 0.1);
        
        sphere.semiMajorAxis = newSemiMajor;
        
        // Clear trail when orbit changes
        sphere.trail = [];
    }

    // Touch handlers for mobile
    function handleTouchStart(e) {
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;

        const sphere = getSphereAtPosition(x, y);
        if (sphere) {
            mouseDownTime = Date.now();
            mouseDownX = x;
            mouseDownY = y;
            draggedSphere = sphere;
            dragAnchorAngle = sphere.angle;
            e.preventDefault();
        }
    }

    function handleTouchMove(e) {
        if (draggedSphere && e.touches[0]) {
            const x = e.touches[0].clientX;
            const y = e.touches[0].clientY;
            
            checkDragStart(x, y);
            
            if (isDragging) {
                // Apply drag with spring resistance (same as mouse)
                const a = draggedSphere.semiMajorAxis * draggedSphere.orbitScale;
                const e_val = draggedSphere.eccentricity;
                const b = a * Math.sqrt(1 - e_val * e_val);
                const cosT = Math.cos(draggedSphere.orbitTilt);
                const sinT = Math.sin(draggedSphere.orbitTilt);
                const tempAngle = dragAnchorAngle + (Date.now() - mouseDownTime) * draggedSphere.baseAngularVelocity * 0.001;
                const ox = a * Math.cos(tempAngle);
                const oy = b * Math.sin(tempAngle);
                const anchorX = draggedSphere.orbitCenterX + ox * cosT - oy * sinT;
                const anchorY = draggedSphere.orbitCenterY + ox * sinT + oy * cosT;
                
                const dx = x - anchorX;
                const dy = y - anchorY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDrag = 150;
                
                if (dist > maxDrag) {
                    draggedSphere.x = anchorX + (dx / dist) * maxDrag;
                    draggedSphere.y = anchorY + (dy / dist) * maxDrag;
                } else {
                    draggedSphere.x = x;
                    draggedSphere.y = y;
                }
            }

            e.preventDefault();
        }
    }

    function handleTouchEnd(e) {
        if (draggedSphere) {
            const timeDelta = Date.now() - mouseDownTime;
            const x = draggedSphere.x;
            const y = draggedSphere.y;
            const distDelta = Math.sqrt((x - mouseDownX) ** 2 + (y - mouseDownY) ** 2);
            
            // Check if this was a tap (not a drag)
            if (timeDelta < CLICK_TIME_THRESHOLD && distDelta < CLICK_DISTANCE_THRESHOLD) {
                showContentPanel(draggedSphere.sectionId);
            } else if (isDragging) {
                recalculateOrbitFromPosition(draggedSphere);
            }

            isDragging = false;
            draggedSphere = null;
        }
    }

    // Panel close handlers
    if (panelClose) {
        panelClose.addEventListener('click', () => {
            hideContentPanel();
        });
    }

    if (panelBackdrop) {
        panelBackdrop.addEventListener('click', () => {
            hideContentPanel();
        });
    }

    // Event listeners
    document.addEventListener('mousemove', (e) => {
        checkDragStart(e.clientX, e.clientY);
        handleDocumentMouseMove(e);
    });
    document.addEventListener('mouseup', handleDocumentMouseUp);
    canvas.addEventListener('mousedown', handleCanvasMouseDown);

    // Touch support
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    // Grid displacement calculations - simplified for space theme
    function getDisplacement(px, py, sphere) {
        const dx = px - sphere.x;
        const dy = py - sphere.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const effectRadius = sphere.radius * 4;

        if (distance < effectRadius && distance > 0) {
            const factor = 1 - (distance / effectRadius);
            const strength = factor * factor * sphere.radius * 0.3;
            const dirX = dx / distance;
            const dirY = dy / distance;

            return {
                x: -dirX * strength * 0.3,
                y: -dirY * strength * 0.3
            };
        }
        return { x: 0, y: 0 };
    }

    function getTotalDisplacement(px, py) {
        let totalDx = 0;
        let totalDy = 0;

        for (const sphere of spheres) {
            const d = getDisplacement(px, py, sphere);
            totalDx += d.x;
            totalDy += d.y;
        }

        return { x: totalDx, y: totalDy };
    }

    // Drawing functions
    function drawGrid() {
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;

        const width = canvas.width;
        const height = canvas.height;

        // Draw horizontal lines
        for (let y = 0; y <= height + gridSpacing; y += gridSpacing) {
            ctx.beginPath();
            for (let x = 0; x <= width; x += 8) {
                const d = getTotalDisplacement(x, y);
                const newX = x + d.x;
                const newY = y + d.y;

                if (x === 0) {
                    ctx.moveTo(newX, newY);
                } else {
                    ctx.lineTo(newX, newY);
                }
            }
            ctx.stroke();
        }

        // Draw vertical lines
        for (let x = 0; x <= width + gridSpacing; x += gridSpacing) {
            ctx.beginPath();
            for (let y = 0; y <= height; y += 8) {
                const d = getTotalDisplacement(x, y);
                const newX = x + d.x;
                const newY = y + d.y;

                if (y === 0) {
                    ctx.moveTo(newX, newY);
                } else {
                    ctx.lineTo(newX, newY);
                }
            }
            ctx.stroke();
        }
    }
    
    // Draw central star
    function drawCentralStar() {
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        const pulse = Math.sin(centralStar.pulsePhase) * 0.05 + 1;
        const radius = centralStar.baseRadius * pulse;
        
        // Outer glow
        const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
        outerGlow.addColorStop(0, 'rgba(255, 200, 100, 0.15)');
        outerGlow.addColorStop(0.3, 'rgba(255, 150, 50, 0.08)');
        outerGlow.addColorStop(0.6, 'rgba(255, 100, 0, 0.03)');
        outerGlow.addColorStop(1, 'rgba(255, 80, 0, 0)');
        
        ctx.beginPath();
        ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = outerGlow;
        ctx.fill();
        
        // Core glow
        const coreGlow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        coreGlow.addColorStop(0, 'rgba(255, 250, 230, 0.9)');
        coreGlow.addColorStop(0.3, 'rgba(255, 220, 150, 0.7)');
        coreGlow.addColorStop(0.6, 'rgba(255, 180, 80, 0.4)');
        coreGlow.addColorStop(1, 'rgba(255, 140, 40, 0)');
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = coreGlow;
        ctx.fill();
    }
    
    // Draw orbital trail for a sphere
    function drawTrail(sphere) {
        if (sphere.trail.length < 2) return;
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (let i = 1; i < sphere.trail.length; i++) {
            const prev = sphere.trail[i - 1];
            const curr = sphere.trail[i];
            const progress = i / sphere.trail.length;  // 0 at tail, 1 at head
            const alpha = progress * 0.35;  // Fade from 0 to 35% max
            const lineWidth = 1 + progress * 3;  // Taper from 1px to 4px
            
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.strokeStyle = `rgba(${hexToRgb(sphere.colors.mid)}, ${alpha})`;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }
    
    // Draw projected orbit path (dotted ellipse)
    function drawOrbitPath(sphere) {
        const centerX = sphere.orbitCenterX;
        const centerY = sphere.orbitCenterY;
        const a = sphere.semiMajorAxis * sphere.orbitScale;  // Semi-major axis
        const e = sphere.eccentricity;
        const b = a * Math.sqrt(1 - e * e);  // Semi-minor axis
        const tilt = sphere.orbitTilt;
        
        ctx.strokeStyle = `rgba(${hexToRgb(sphere.colors.dark)}, 0.25)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);  // Dotted line pattern
        
        ctx.beginPath();
        
        // Draw ellipse by plotting points
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const cosT = Math.cos(tilt);
            const sinT = Math.sin(tilt);
            const x = a * Math.cos(angle);
            const y = b * Math.sin(angle);
            
            const rotatedX = centerX + x * cosT - y * sinT;
            const rotatedY = centerY + x * sinT + y * cosT;
            
            if (i === 0) {
                ctx.moveTo(rotatedX, rotatedY);
            } else {
                ctx.lineTo(rotatedX, rotatedY);
            }
        }
        
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);  // Reset to solid line
    }
    
    // Helper to convert hex to rgb
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            '255, 255, 255';
    }

    function drawSphere(sphere) {
        const { x, y, radius, colors } = sphere;
        const isHovered = sphere === hoveredSphere;
        const isDragged = sphere === draggedSphere;

        // Scale up slightly when hovered
        const scaleMultiplier = isHovered ? 1.15 : 1.0;
        const drawRadius = radius * scaleMultiplier;

        // Highlight ring for hovered
        if (isHovered && !isDragged) {
            ctx.beginPath();
            ctx.arc(x, y, drawRadius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Outer glow
        const glowGradient = ctx.createRadialGradient(x, y, drawRadius * 0.5, x, y, drawRadius * 2);
        glowGradient.addColorStop(0, `rgba(${hexToRgb(colors.mid)}, 0.3)`);
        glowGradient.addColorStop(0.5, `rgba(${hexToRgb(colors.dark)}, 0.1)`);
        glowGradient.addColorStop(1, `rgba(${hexToRgb(colors.shadow)}, 0)`);
        
        ctx.beginPath();
        ctx.arc(x, y, drawRadius * 2, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Main sphere gradient
        const gradient = ctx.createRadialGradient(
            x - drawRadius * 0.3, y - drawRadius * 0.3, 0,
            x, y, drawRadius
        );
        gradient.addColorStop(0, colors.highlight);
        gradient.addColorStop(0.3, colors.mid);
        gradient.addColorStop(0.7, colors.dark);
        gradient.addColorStop(1, colors.shadow);

        // Draw sphere
        ctx.beginPath();
        ctx.arc(x, y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Rim highlight
        ctx.beginPath();
        ctx.arc(x, y, drawRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${isHovered ? 0.4 : 0.2})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw label on hover
        if (isHovered || isMobile) {
            drawSphereLabel(sphere, scaleMultiplier);
        }
    }

    function drawSphereLabel(sphere, scaleMultiplier = 1) {
        const { x, y, label, radius } = sphere;
        const drawRadius = radius * scaleMultiplier;

        ctx.font = '600 11px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelY = y + drawRadius + 18;
        const padding = 6;
        const textWidth = ctx.measureText(label.toUpperCase()).width;

        // Label background - dark for space theme
        ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
        ctx.fillRect(x - textWidth/2 - padding, labelY - 8, textWidth + padding * 2, 16);

        // Label border
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - textWidth/2 - padding, labelY - 8, textWidth + padding * 2, 16);

        // Label text
        ctx.fillStyle = '#a0c0e0';
        ctx.fillText(label.toUpperCase(), x, labelY);
    }

    // Physics: Apply soft boundary force near edges
    function applySoftBoundaryForce(sphere) {
        const margin = 60;
        const strength = 0.5;
        
        // Left edge
        if (sphere.x < margin) {
            sphere.vx += (margin - sphere.x) * strength * 0.1;
        }
        // Right edge
        if (sphere.x > canvas.width - margin) {
            sphere.vx -= (sphere.x - (canvas.width - margin)) * strength * 0.1;
        }
        // Top edge
        if (sphere.y < margin) {
            sphere.vy += (margin - sphere.y) * strength * 0.1;
        }
        // Bottom edge
        if (sphere.y > canvas.height - margin) {
            sphere.vy -= (sphere.y - (canvas.height - margin)) * strength * 0.1;
        }
    }

    // Physics: Keep spheres within canvas bounds (hard constraint)
    function constrainSpheresToCanvas() {
        for (const sphere of spheres) {
            if (sphere === draggedSphere) continue;

            const margin = sphere.radius;

            // Left bound
            if (sphere.x < margin) {
                sphere.x = margin;
                sphere.vx *= -0.3;
            }
            // Right bound
            if (sphere.x > canvas.width - margin) {
                sphere.x = canvas.width - margin;
                sphere.vx *= -0.3;
            }
            // Top bound
            if (sphere.y < margin) {
                sphere.y = margin;
                sphere.vy *= -0.3;
            }
            // Bottom bound
            if (sphere.y > canvas.height - margin) {
                sphere.y = canvas.height - margin;
                sphere.vy *= -0.3;
            }
        }
    }

    // Physics: Update orbital motion
    function updateOrbitalMotion() {
        for (const sphere of spheres) {
            if (sphere === draggedSphere) continue;
            
            // Update orbit center in case of resize
            sphere.orbitCenterX = canvas.width / 2;
            sphere.orbitCenterY = canvas.height / 2;
            sphere.orbitScale = Math.min(canvas.width, canvas.height);
            
            // Apply energy dampening (orbits slowly stabilize)
            sphere.eccentricity *= 0.9997;
            if (sphere.eccentricity < 0.05) sphere.eccentricity = 0.05 + Math.random() * 0.1;
            
            // Update angle based on Kepler-adjusted angular velocity
            sphere.angle += sphere.currentAngularVelocity || sphere.baseAngularVelocity;
            
            // Keep angle in bounds
            if (sphere.angle > Math.PI * 2) sphere.angle -= Math.PI * 2;
            if (sphere.angle < 0) sphere.angle += Math.PI * 2;
            
            // Calculate new position
            updateSphereOrbitalPosition(sphere);
            
            // Apply soft boundary forces
            applySoftBoundaryForce(sphere);
            
            // Add current position to trail (only every few frames to reduce density)
            if (!sphere.trailCounter) sphere.trailCounter = 0;
            sphere.trailCounter++;
            if (sphere.trailCounter >= 2) {  // Add point every 2 frames
                sphere.trail.push({ x: sphere.x, y: sphere.y });
                sphere.trailCounter = 0;
            }
            
            // Limit trail length
            const maxTrailLength = 60;
            if (sphere.trail.length > maxTrailLength) {
                sphere.trail.shift();
            }
        }
        
        // Hard boundary constraints
        constrainSpheresToCanvas();
    }

    function updateSpherePositions() {
        updateOrbitalMotion();
    }

    function draw() {
        // Clear the entire canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw star field background
        if (starField) {
            ctx.drawImage(starField, 0, 0);
        } else {
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Update time
        time += 16;
        centralStar.pulsePhase += 0.02;

        // Update positions
        updateSpherePositions();

        // Draw subtle warped grid
        drawGrid();
        
        // Draw central star
        drawCentralStar();
        
        // Draw projected orbit paths (dotted ellipses)
        for (const sphere of spheres) {
            drawOrbitPath(sphere);
        }
        
        // Draw trails (behind spheres)
        for (const sphere of spheres) {
            drawTrail(sphere);
        }

        // Draw spheres
        for (const sphere of spheres) {
            drawSphere(sphere);
        }

        animationId = requestAnimationFrame(draw);
    }

    // Initialize
    resize();
    window.addEventListener('resize', resize);

    // Start animation
    draw();

    // Performance optimization
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animationId);
        } else {
            draw();
        }
    });
}

/* ===================================
   Contact Form
   =================================== */
function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    // Remove existing listeners to avoid duplicates
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = newForm.querySelector('.submit-btn');
        const originalText = submitBtn.innerHTML;

        submitBtn.innerHTML = 'sending... <span class="cursor">_</span>';
        submitBtn.disabled = true;

        await new Promise(resolve => setTimeout(resolve, 1500));

        submitBtn.innerHTML = 'message_sent() ✓';
        submitBtn.style.borderColor = 'var(--accent-tertiary)';
        submitBtn.style.color = 'var(--accent-tertiary)';

        setTimeout(() => {
            newForm.reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            submitBtn.style.borderColor = '';
            submitBtn.style.color = '';
        }, 3000);
    });
}

/* ===================================
   Utility Functions
   =================================== */
function debounce(func, wait = 20) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit = 100) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
