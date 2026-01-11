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

    // Isometric projection configuration for 2.5D effect
    const perspectiveConfig = {
        enabled: true,
        // Isometric settings
        tiltAngle: 0.55,             // How much to tilt the orbital plane (0 = top-down, 1 = edge-on)
        gridLines: { horizontal: 30, vertical: 30 },  // Denser grid for better gravity visualization
        wellDepthMultiplier: 1.8,    // Gravity well depth intensity
        trailGrooveWidth: 8,         // Width of trail grooves
    };

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
    
    // Build perspective lookup table (placeholder for future optimizations)
    function buildPerspectiveLUT() {
        // Currently using real-time projection calculations
        // This function exists for potential future caching optimizations
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Regenerate star field on resize
        generateStarField();

        // Rebuild perspective lookup table
        buildPerspectiveLUT();

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

    // Find sphere at position (uses screen coordinates when in perspective mode)
    function getSphereAtPosition(x, y) {
        for (let i = spheres.length - 1; i >= 0; i--) {
            const sphere = spheres[i];

            // Use screen coordinates if available (set during draw), otherwise use world coords
            if (perspectiveConfig.enabled && sphere.screenX !== undefined) {
                const dx = x - sphere.screenX;
                const dy = y - sphere.screenY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= (sphere.screenRadius || sphere.radius) + 5) {
                    return sphere;
                }
            } else {
                const dx = x - sphere.x;
                const dy = y - sphere.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= sphere.radius + 5) {
                    return sphere;
                }
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

    // Grid displacement calculations with gravity well depth
    function getGravityWellDisplacement(px, py, sphere) {
        const dx = px - sphere.x;
        const dy = py - sphere.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const wellRadius = sphere.radius * 6;  // Gravity influence radius
        const maxDepth = sphere.radius * perspectiveConfig.wellDepthMultiplier * 2.5;

        if (distance >= wellRadius || distance === 0) {
            return { x: 0, y: 0, depth: 0 };
        }

        const normalizedDist = distance / wellRadius;

        // Radial displacement (pulling toward center of well)
        const pullStrength = Math.pow(1 - normalizedDist, 2) * sphere.radius * 0.8;
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Depth calculation (inverse square falloff with smooth edge)
        const depthFactor = Math.pow(1 - normalizedDist, 2);
        const edgeFactor = Math.cos(normalizedDist * Math.PI * 0.5);
        const depth = depthFactor * edgeFactor * maxDepth;

        return {
            x: -dirX * pullStrength * 0.5,
            y: -dirY * pullStrength * 0.5,
            depth: depth
        };
    }
    
    // Trail point displacement (smaller gravity wells along the trail)
    function getTrailDisplacement(px, py, trailPoint, baseRadius) {
        const dx = px - trailPoint.x;
        const dy = py - trailPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const wellRadius = baseRadius * 2.5;  // Smaller influence than planet
        const maxDepth = baseRadius * 0.4;  // Shallower depression

        if (distance >= wellRadius || distance === 0) {
            return { x: 0, y: 0, depth: 0 };
        }

        const normalizedDist = distance / wellRadius;
        const depthFactor = Math.pow(1 - normalizedDist, 2);
        const depth = depthFactor * maxDepth;

        return { x: 0, y: 0, depth: depth };
    }

    function getTotalDisplacement(px, py) {
        let totalDx = 0;
        let totalDy = 0;
        let maxDepth = 0;

        // Planet gravity wells
        for (const sphere of spheres) {
            // Early rejection for distant points
            const quickDist = Math.abs(px - sphere.x) + Math.abs(py - sphere.y);
            if (quickDist > sphere.radius * 8) continue;

            const d = getGravityWellDisplacement(px, py, sphere);
            totalDx += d.x;
            totalDy += d.y;
            maxDepth = Math.max(maxDepth, d.depth);
            
            // Trail groove displacement (sample every few trail points for performance)
            if (sphere.trail && sphere.trail.length > 0) {
                const trailStep = 3;  // Check every 3rd point
                for (let i = 0; i < sphere.trail.length; i += trailStep) {
                    const trailPoint = sphere.trail[i];
                    const trailQuickDist = Math.abs(px - trailPoint.x) + Math.abs(py - trailPoint.y);
                    if (trailQuickDist > sphere.radius * 4) continue;
                    
                    // Fade trail influence based on age (older = less effect)
                    const ageFactor = (i / sphere.trail.length) * 0.7 + 0.3;
                    const td = getTrailDisplacement(px, py, trailPoint, sphere.radius * ageFactor);
                    maxDepth = Math.max(maxDepth, td.depth);
                }
            }
        }

        return { x: totalDx, y: totalDy, depth: maxDepth };
    }

    // Drawing functions

    // Draw isometric grid with gravity well depressions
    function drawPerspectiveGrid() {
        const { horizontal: numHLines, vertical: numVLines } = perspectiveConfig.gridLines;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Grid extends beyond visible area
        const gridRadius = Math.max(canvas.width, canvas.height) * 0.8;
        const gridSpacing = gridRadius / numHLines;

        // Draw horizontal lines (these become angled lines in isometric view)
        // In world space they're horizontal (constant Y), but we project them
        for (let i = -numHLines; i <= numHLines; i++) {
            const worldY = centerY + i * gridSpacing;

            // Alpha fades toward edges
            const distFromCenter = Math.abs(i) / numHLines;
            const alpha = 0.08 + (1 - distFromCenter) * 0.12;

            ctx.beginPath();
            const segments = 60;
            for (let j = 0; j <= segments; j++) {
                const segT = j / segments;
                const worldX = centerX - gridRadius + segT * gridRadius * 2;

                // Get gravity well displacement
                const d = getTotalDisplacement(worldX, worldY);

                // Project to screen using isometric projection
                const proj = projectToScreen(worldX + d.x, worldY + d.y, d.depth);

                if (j === 0) {
                    ctx.moveTo(proj.x, proj.y);
                } else {
                    ctx.lineTo(proj.x, proj.y);
                }
            }

            ctx.strokeStyle = `rgba(50, 80, 130, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        // Draw vertical lines (constant X in world space)
        for (let i = -numVLines; i <= numVLines; i++) {
            const worldX = centerX + i * gridSpacing;

            // Alpha fades toward edges
            const distFromCenter = Math.abs(i) / numVLines;
            const alpha = 0.08 + (1 - distFromCenter) * 0.12;

            ctx.beginPath();
            const segments = 60;
            for (let j = 0; j <= segments; j++) {
                const segT = j / segments;
                const worldY = centerY - gridRadius + segT * gridRadius * 2;

                // Get gravity well displacement
                const d = getTotalDisplacement(worldX, worldY);

                // Project to screen using isometric projection
                const proj = projectToScreen(worldX + d.x, worldY + d.y, d.depth);

                if (j === 0) {
                    ctx.moveTo(proj.x, proj.y);
                } else {
                    ctx.lineTo(proj.x, proj.y);
                }
            }

            ctx.strokeStyle = `rgba(50, 80, 130, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
    }

    // Legacy flat grid (kept for reference/fallback)
    function drawGrid() {
        if (perspectiveConfig.enabled) {
            drawPerspectiveGrid();
            return;
        }

        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;

        const width = canvas.width;
        const height = canvas.height;

        for (let y = 0; y <= height + gridSpacing; y += gridSpacing) {
            ctx.beginPath();
            for (let x = 0; x <= width; x += 8) {
                const d = getTotalDisplacement(x, y);
                if (x === 0) {
                    ctx.moveTo(x + d.x, y + d.y);
                } else {
                    ctx.lineTo(x + d.x, y + d.y);
                }
            }
            ctx.stroke();
        }

        for (let x = 0; x <= width + gridSpacing; x += gridSpacing) {
            ctx.beginPath();
            for (let y = 0; y <= height; y += 8) {
                const d = getTotalDisplacement(x, y);
                if (y === 0) {
                    ctx.moveTo(x + d.x, y + d.y);
                } else {
                    ctx.lineTo(x + d.x, y + d.y);
                }
            }
            ctx.stroke();
        }
    }
    
    // Project a world position to screen position using isometric projection
    // This tilts the orbital plane toward the viewer while keeping parallel lines parallel
    function projectToScreen(worldX, worldY, depth = 0) {
        if (!perspectiveConfig.enabled) {
            return { x: worldX, y: worldY, scale: 1 };
        }

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const tilt = perspectiveConfig.tiltAngle;

        // Convert to coordinates relative to center
        const relX = worldX - centerX;
        const relY = worldY - centerY;

        // True isometric projection:
        // 1. Rotate 45 degrees around vertical axis
        // 2. Tilt forward (compress Y)
        const angle = Math.PI / 4;  // 45 degrees
        const cos45 = Math.cos(angle);
        const sin45 = Math.sin(angle);
        
        // Rotate in XY plane by 45 degrees
        const rotX = relX * cos45 - relY * sin45;
        const rotY = relX * sin45 + relY * cos45;
        
        // Apply tilt compression to Y axis and depth offset (+ depth pushes downward)
        const screenX = centerX + rotX;
        const screenY = centerY + rotY * (1 - tilt) + depth * tilt * 0.5;

        // In isometric, scale is constant (no size change with distance)
        return { x: screenX, y: screenY, scale: 1 };
    }

    // Draw central star
    function drawCentralStar() {
        const worldX = canvas.width / 2;
        const worldY = canvas.height / 2;
        const pulse = Math.sin(centralStar.pulsePhase) * 0.05 + 1;

        // Project to screen space
        const proj = projectToScreen(worldX, worldY);
        const x = proj.x;
        const y = proj.y;
        const radius = centralStar.baseRadius * pulse * proj.scale;

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

    // Draw orbital trail as a carved groove in the surface (with perspective projection)
    function drawTrailAsGroove(sphere) {
        if (sphere.trail.length < 2) return;

        const baseGrooveWidth = perspectiveConfig.trailGrooveWidth;
        const shadowOffset = 2;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Project all trail points to screen space
        const projectedTrail = sphere.trail.map(pt => projectToScreen(pt.x, pt.y));

        // Pass 1: Draw shadow edge (darker, offset down-right)
        ctx.beginPath();
        for (let i = 1; i < projectedTrail.length; i++) {
            const prev = projectedTrail[i - 1];
            const curr = projectedTrail[i];

            if (i === 1) {
                ctx.moveTo(prev.x + shadowOffset, prev.y + shadowOffset);
            }
            ctx.lineTo(curr.x + shadowOffset, curr.y + shadowOffset);
        }
        ctx.strokeStyle = 'rgba(5, 10, 25, 0.5)';
        ctx.lineWidth = baseGrooveWidth + 2;
        ctx.stroke();

        // Pass 2: Draw highlight edge (lighter, offset up-left)
        ctx.beginPath();
        for (let i = 1; i < projectedTrail.length; i++) {
            const prev = projectedTrail[i - 1];
            const curr = projectedTrail[i];

            if (i === 1) {
                ctx.moveTo(prev.x - shadowOffset * 0.5, prev.y - shadowOffset * 0.5);
            }
            ctx.lineTo(curr.x - shadowOffset * 0.5, curr.y - shadowOffset * 0.5);
        }
        ctx.strokeStyle = `rgba(${hexToRgb(sphere.colors.highlight)}, 0.15)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pass 3: Draw main groove (recessed center with gradient fade)
        for (let i = 1; i < projectedTrail.length; i++) {
            const prev = projectedTrail[i - 1];
            const curr = projectedTrail[i];
            const progress = i / projectedTrail.length;  // 0 at tail, 1 at head

            // Calculate segment angle for perpendicular gradient
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.1) continue;

            // Scale groove width by perspective
            const grooveWidth = baseGrooveWidth * curr.scale;

            // Perpendicular direction for gradient
            const perpX = -dy / len;
            const perpY = dx / len;
            const halfWidth = (grooveWidth * progress) / 2;

            // Create gradient perpendicular to trail segment
            const gradient = ctx.createLinearGradient(
                curr.x - perpX * halfWidth, curr.y - perpY * halfWidth,
                curr.x + perpX * halfWidth, curr.y + perpY * halfWidth
            );

            const baseAlpha = progress * 0.5;
            const darkColor = `rgba(${hexToRgb(sphere.colors.shadow)}, ${baseAlpha})`;
            const midColor = `rgba(${hexToRgb(sphere.colors.dark)}, ${baseAlpha * 0.8})`;
            const edgeColor = `rgba(${hexToRgb(sphere.colors.mid)}, ${baseAlpha * 0.3})`;

            gradient.addColorStop(0, edgeColor);
            gradient.addColorStop(0.3, darkColor);
            gradient.addColorStop(0.5, midColor);
            gradient.addColorStop(0.7, darkColor);
            gradient.addColorStop(1, edgeColor);

            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = grooveWidth * progress;
            ctx.stroke();
        }
    }

    // Legacy trail drawing (fallback)
    function drawTrail(sphere) {
        if (perspectiveConfig.enabled) {
            drawTrailAsGroove(sphere);
            return;
        }

        if (sphere.trail.length < 2) return;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < sphere.trail.length; i++) {
            const prev = sphere.trail[i - 1];
            const curr = sphere.trail[i];
            const progress = i / sphere.trail.length;
            const alpha = progress * 0.35;
            const lineWidth = 1 + progress * 3;

            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.strokeStyle = `rgba(${hexToRgb(sphere.colors.mid)}, ${alpha})`;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    // Draw projected orbit path (dotted ellipse, projected to perspective)
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
            const ox = a * Math.cos(angle);
            const oy = b * Math.sin(angle);

            const worldX = centerX + ox * cosT - oy * sinT;
            const worldY = centerY + ox * sinT + oy * cosT;

            // Project to screen space
            const proj = projectToScreen(worldX, worldY);

            if (i === 0) {
                ctx.moveTo(proj.x, proj.y);
            } else {
                ctx.lineTo(proj.x, proj.y);
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

    // Enhanced 3D sphere rendering with realistic lighting (projected into perspective)
    function drawSphere3D(sphere) {
        const { radius, colors } = sphere;
        const isHovered = sphere === hoveredSphere;
        const isDragged = sphere === draggedSphere;

        // Project sphere position to screen space
        const proj = projectToScreen(sphere.x, sphere.y);
        const x = proj.x;
        const y = proj.y;

        // Scale radius by perspective (spheres appear smaller when further away)
        const hoverMultiplier = isHovered ? 1.15 : 1.0;
        const r = radius * proj.scale * hoverMultiplier;

        // Store projected position for hit detection
        sphere.screenX = x;
        sphere.screenY = y;
        sphere.screenRadius = r;

        // === 1. DROP SHADOW (elliptical, beneath sphere) ===
        const shadowGradient = ctx.createRadialGradient(
            x + r * 0.2, y + r * 0.5, 0,
            x + r * 0.2, y + r * 0.5, r * 1.8
        );
        shadowGradient.addColorStop(0, 'rgba(0, 0, 15, 0.4)');
        shadowGradient.addColorStop(0.4, 'rgba(0, 0, 15, 0.2)');
        shadowGradient.addColorStop(1, 'rgba(0, 0, 15, 0)');

        ctx.beginPath();
        ctx.ellipse(x + r * 0.15, y + r * 0.4, r * 1.4, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = shadowGradient;
        ctx.fill();

        // === 2. OUTER GLOW (atmospheric haze) ===
        const glowGradient = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.2);
        glowGradient.addColorStop(0, `rgba(${hexToRgb(colors.mid)}, 0.25)`);
        glowGradient.addColorStop(0.5, `rgba(${hexToRgb(colors.dark)}, 0.08)`);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // === 3. MAIN SPHERE BODY (multi-stop gradient for depth) ===
        const bodyGradient = ctx.createRadialGradient(
            x - r * 0.35, y - r * 0.35, 0,
            x + r * 0.1, y + r * 0.1, r
        );
        bodyGradient.addColorStop(0, colors.highlight);
        bodyGradient.addColorStop(0.15, colors.mid);
        bodyGradient.addColorStop(0.4, colors.dark);
        bodyGradient.addColorStop(0.75, colors.shadow);
        bodyGradient.addColorStop(1, darkenColor(colors.shadow, 0.6));

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = bodyGradient;
        ctx.fill();

        // === 4. SPECULAR HIGHLIGHT (sharp white reflection) ===
        const specX = x - r * 0.35;
        const specY = y - r * 0.4;
        const specRadius = r * 0.22;

        const specGradient = ctx.createRadialGradient(
            specX, specY, 0,
            specX, specY, specRadius
        );
        specGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        specGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
        specGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(specX, specY, specRadius, 0, Math.PI * 2);
        ctx.fillStyle = specGradient;
        ctx.fill();

        // Secondary smaller specular
        const spec2X = x - r * 0.15;
        const spec2Y = y - r * 0.25;
        const spec2Gradient = ctx.createRadialGradient(
            spec2X, spec2Y, 0,
            spec2X, spec2Y, r * 0.12
        );
        spec2Gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        spec2Gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(spec2X, spec2Y, r * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = spec2Gradient;
        ctx.fill();

        // === 5. RIM LIGHTING (backlit edge on shadow side) ===
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();

        const rimGradient = ctx.createLinearGradient(
            x - r, y - r,
            x + r * 1.2, y + r * 1.2
        );
        rimGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        rimGradient.addColorStop(0.65, 'rgba(0, 0, 0, 0)');
        rimGradient.addColorStop(0.8, `rgba(${hexToRgb(colors.highlight)}, 0.25)`);
        rimGradient.addColorStop(0.95, `rgba(${hexToRgb(colors.highlight)}, 0.5)`);
        rimGradient.addColorStop(1, `rgba(255, 255, 255, 0.3)`);

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = rimGradient;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

        // === 6. TERMINATOR BAND (subtle darkening at light/shadow boundary) ===
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();

        const terminatorGradient = ctx.createLinearGradient(
            x - r * 0.3, y - r * 0.3,
            x + r * 0.5, y + r * 0.5
        );
        terminatorGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        terminatorGradient.addColorStop(0.35, 'rgba(0, 0, 0, 0)');
        terminatorGradient.addColorStop(0.45, 'rgba(0, 0, 20, 0.12)');
        terminatorGradient.addColorStop(0.55, 'rgba(0, 0, 20, 0.12)');
        terminatorGradient.addColorStop(0.65, 'rgba(0, 0, 0, 0)');
        terminatorGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = terminatorGradient;
        ctx.fill();
        ctx.restore();

        // === 7. OUTER RIM (subtle edge definition) ===
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${isHovered ? 0.35 : 0.15})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // === 8. HOVER RING ===
        if (isHovered && !isDragged) {
            ctx.beginPath();
            ctx.arc(x, y, r + 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw label at projected position
        if (isHovered || isMobile) {
            drawSphereLabelProjected(sphere, x, y, r);
        }
    }

    // Helper: darken a hex color
    function darkenColor(hex, factor) {
        const rgb = hexToRgb(hex).split(', ').map(Number);
        return `rgb(${Math.floor(rgb[0] * factor)}, ${Math.floor(rgb[1] * factor)}, ${Math.floor(rgb[2] * factor)})`;
    }

    // Legacy sphere drawing (fallback)
    function drawSphere(sphere) {
        if (perspectiveConfig.enabled) {
            drawSphere3D(sphere);
            return;
        }

        const { x, y, radius, colors } = sphere;
        const isHovered = sphere === hoveredSphere;
        const isDragged = sphere === draggedSphere;

        const scaleMultiplier = isHovered ? 1.15 : 1.0;
        const drawRadius = radius * scaleMultiplier;

        if (isHovered && !isDragged) {
            ctx.beginPath();
            ctx.arc(x, y, drawRadius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        const glowGradient = ctx.createRadialGradient(x, y, drawRadius * 0.5, x, y, drawRadius * 2);
        glowGradient.addColorStop(0, `rgba(${hexToRgb(colors.mid)}, 0.3)`);
        glowGradient.addColorStop(0.5, `rgba(${hexToRgb(colors.dark)}, 0.1)`);
        glowGradient.addColorStop(1, `rgba(${hexToRgb(colors.shadow)}, 0)`);

        ctx.beginPath();
        ctx.arc(x, y, drawRadius * 2, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        const gradient = ctx.createRadialGradient(
            x - drawRadius * 0.3, y - drawRadius * 0.3, 0,
            x, y, drawRadius
        );
        gradient.addColorStop(0, colors.highlight);
        gradient.addColorStop(0.3, colors.mid);
        gradient.addColorStop(0.7, colors.dark);
        gradient.addColorStop(1, colors.shadow);

        ctx.beginPath();
        ctx.arc(x, y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, drawRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${isHovered ? 0.4 : 0.2})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        if (isHovered || isMobile) {
            drawSphereLabel(sphere, scaleMultiplier);
        }
    }

    // Draw label at projected screen position
    function drawSphereLabelProjected(sphere, screenX, screenY, screenRadius) {
        const { label } = sphere;

        ctx.font = '600 11px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelY = screenY + screenRadius + 18;
        const padding = 6;
        const textWidth = ctx.measureText(label.toUpperCase()).width;

        // Label background - dark for space theme
        ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
        ctx.fillRect(screenX - textWidth/2 - padding, labelY - 8, textWidth + padding * 2, 16);

        // Label border
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX - textWidth/2 - padding, labelY - 8, textWidth + padding * 2, 16);

        // Label text
        ctx.fillStyle = '#a0c0e0';
        ctx.fillText(label.toUpperCase(), screenX, labelY);
    }

    // Legacy label drawing (for fallback mode)
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
            const maxTrailLength = 75;
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

        // Sort spheres by Y position for proper depth ordering (back to front)
        // In isometric view, objects with lower screen Y are further back
        const sortedSpheres = [...spheres].sort((a, b) => {
            const projA = projectToScreen(a.x, a.y);
            const projB = projectToScreen(b.x, b.y);
            return projA.y - projB.y;
        });

        // Draw spheres (use 3D version if perspective enabled)
        for (const sphere of sortedSpheres) {
            if (perspectiveConfig.enabled) {
                drawSphere3D(sphere);
            } else {
                drawSphere(sphere);
            }
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
