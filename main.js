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
        gridLines: { horizontal: 57, vertical: 57 },  // Denser grid for better gravity visualization
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
            radius: 32,
            semiMajorAxis: 0.17,  // As fraction of min(width,height) - reduced 15%
            eccentricity: 0.15,
            orbitTilt: 0.1,  // Radians
            angle: Math.random() * Math.PI * 2,  // Random starting position
            baseAngularVelocity: 0.003,
            rotation: 0,  // Surface rotation angle for rolling effect
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
            radius: 28,
            semiMajorAxis: 0.255,  // reduced 15%
            eccentricity: 0.2,
            orbitTilt: -0.15,
            angle: Math.random() * Math.PI * 2,  // Random starting position
            baseAngularVelocity: 0.0022,
            rotation: 0,  // Surface rotation angle for rolling effect
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
            radius: 25,
            semiMajorAxis: 0.34,  // reduced 15%
            eccentricity: 0.12,
            orbitTilt: 0.2,
            angle: Math.random() * Math.PI * 2,  // Random starting position
            baseAngularVelocity: 0.0016,
            rotation: 0,  // Surface rotation angle for rolling effect
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
            radius: 22,
            semiMajorAxis: 0.425,  // reduced 15%
            eccentricity: 0.18,
            orbitTilt: -0.05,
            angle: Math.random() * Math.PI * 2,  // Random starting position
            baseAngularVelocity: 0.0012,
            rotation: 0,  // Surface rotation angle for rolling effect
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
    let hoveredSphere = null;
    let isMobile = 'ontouchstart' in window || window.innerWidth < 768;

    // Spacecraft array - supports multiple spacecraft in flight
    const spacecrafts = [];
    const spacecraftConfig = {
        journeyDuration: 900,  // Frames for journey - slower than planetary orbits (like real spacecraft)
        size: 8                // Slightly larger for visibility
    };
    
    // Mobile scaling - reduce planet sizes on smaller screens
    const mobileScale = isMobile ? 0.6 : 1.0;
    for (const sphere of spheres) {
        sphere.radius *= mobileScale;
    }
    // Also scale the central star
    centralStar.baseRadius *= mobileScale;

    // DOM elements
    const contentPanel = document.getElementById('content-panel');
    const panelContent = document.getElementById('panel-content');
    const panelClose = document.getElementById('panel-close');
    const panelBackdrop = document.getElementById('panel-backdrop');
    const hintText = document.getElementById('hint-text');
    const viewToggle = document.getElementById('view-toggle');
    const launchBtn = document.getElementById('launch-btn');

    // View state for smooth transitions
    const TILT_3D = 0.55;  // Isometric tilt
    const TILT_FLAT = 0;   // Top-down view (parallel to grid)

    // Load saved view preference from localStorage
    const savedViewFlat = localStorage.getItem('viewFlat') === 'true';
    const viewState = {
        targetTilt: savedViewFlat ? TILT_FLAT : TILT_3D,
        isFlat: savedViewFlat
    };

    // Apply saved state immediately (no animation on load)
    if (savedViewFlat) {
        perspectiveConfig.tiltAngle = TILT_FLAT;
        if (viewToggle) {
            viewToggle.classList.add('flat');
            const label = viewToggle.querySelector('.view-label');
            if (label) label.textContent = 'Iso';
        }
    }

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

    // Predict planet position after framesAhead frames
    // Simulates orbital motion frame-by-frame to account for:
    // - Elliptical orbit shape
    // - Variable angular velocity (Kepler's 2nd law)
    // - Orbit tilt rotation
    function predictPlanetPosition(planet, framesAhead) {
        const a = planet.semiMajorAxis * planet.orbitScale;
        const e = planet.eccentricity;
        const b = a * Math.sqrt(1 - e * e);

        // Simulate orbital motion frame by frame
        let angle = planet.angle;
        for (let i = 0; i < framesAhead; i++) {
            // Calculate radius at current angle (ellipse equation)
            const r = a * (1 - e * e) / (1 + e * Math.cos(angle));

            // Calculate Kepler factor (faster when closer)
            const keplerFactor = (a / r) * (a / r);
            const angularVel = planet.baseAngularVelocity * Math.sqrt(keplerFactor);

            // Advance angle
            angle += angularVel;
        }

        // Calculate position on ellipse at predicted angle
        const x = a * Math.cos(angle);
        const y = b * Math.sin(angle);

        // Apply orbit tilt rotation
        const cosT = Math.cos(planet.orbitTilt);
        const sinT = Math.sin(planet.orbitTilt);

        return {
            x: planet.orbitCenterX + x * cosT - y * sinT,
            y: planet.orbitCenterY + x * sinT + y * cosT,
            angle: angle
        };
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

    function handleCanvasClick(e) {
        const x = e.clientX;
        const y = e.clientY;

        const sphere = getSphereAtPosition(x, y);
        if (sphere) {
            showContentPanel(sphere.sectionId);
            e.preventDefault();
        }
    }

    // Touch handlers for mobile
    function handleTouchTap(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;

            const sphere = getSphereAtPosition(x, y);
            if (sphere) {
                showContentPanel(sphere.sectionId);
                e.preventDefault();
            }
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
    document.addEventListener('mousemove', handleDocumentMouseMove);
    canvas.addEventListener('click', handleCanvasClick);

    // Touch support
    canvas.addEventListener('touchstart', handleTouchTap, { passive: false });

    // View toggle handler
    if (viewToggle) {
        viewToggle.addEventListener('click', () => {
            viewState.isFlat = !viewState.isFlat;
            viewState.targetTilt = viewState.isFlat ? TILT_FLAT : TILT_3D;

            // Save preference to localStorage
            localStorage.setItem('viewFlat', viewState.isFlat);

            // Update button appearance
            viewToggle.classList.toggle('flat', viewState.isFlat);
            const label = viewToggle.querySelector('.view-label');
            if (label) {
                label.textContent = viewState.isFlat ? 'Iso' : '2D';
            }
        });
    }

    // Launch button handler
    if (launchBtn) {
        launchBtn.addEventListener('click', () => {
            // Limit to 3 concurrent spacecraft
            if (spacecrafts.length < 3) {
                launchSpacecraft();
            }
        });
    }

    // Grid displacement calculations with gravity well depth
    function getGravityWellDisplacement(px, py, sphere) {
        const dx = px - sphere.x;
        const dy = py - sphere.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const wellRadius = sphere.radius * 6;  // Gravity influence radius
        const coreRadius = sphere.radius * 0.8;  // Flat bottom zone to prevent spikes
        const maxDepth = sphere.radius * perspectiveConfig.wellDepthMultiplier * 3;

        if (distance >= wellRadius || distance === 0) {
            return { x: 0, y: 0, depth: 0 };
        }

        // Use effective distance that stops at core radius (creates flat bottom)
        const effectiveDistance = Math.max(distance, coreRadius);
        const normalizedDist = effectiveDistance / wellRadius;

        // Radial displacement (pulling toward center of well)
        const pullStrength = Math.pow(1 - normalizedDist, 2) * sphere.radius * 0.96;
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Depth calculation (inverse square falloff with smooth edge)
        const depthFactor = Math.pow(1 - normalizedDist, 2);
        const edgeFactor = Math.cos(normalizedDist * Math.PI * 0.5);
        const depth = depthFactor * edgeFactor * maxDepth;

        return {
            x: -dirX * pullStrength * 0.6,
            y: -dirY * pullStrength * 0.6,
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
        
        // Sun gravity well (center of screen)
        const sunX = canvas.width / 2;
        const sunY = canvas.height / 2;
        const sunDx = px - sunX;
        const sunDy = py - sunY;
        const sunDistance = Math.sqrt(sunDx * sunDx + sunDy * sunDy);
        const sunWellRadius = centralStar.baseRadius * 6;
        const sunCoreRadius = centralStar.baseRadius * 1.5;  // Larger flat bottom zone
        const sunMaxDepth = centralStar.baseRadius * perspectiveConfig.wellDepthMultiplier * 2.4;  // 20% increase
        
        if (sunDistance < sunWellRadius && sunDistance > 0) {
            // Use effective distance that stops at core radius (creates flat bottom)
            const effectiveDistance = Math.max(sunDistance, sunCoreRadius);
            const normalizedDist = effectiveDistance / sunWellRadius;
            const pullStrength = Math.pow(1 - normalizedDist, 2) * centralStar.baseRadius * 0.36;  // 20% increase
            const dirX = sunDx / sunDistance;
            const dirY = sunDy / sunDistance;
            const depthFactor = Math.pow(1 - normalizedDist, 2);
            const edgeFactor = Math.cos(normalizedDist * Math.PI * 0.5);
            const depth = depthFactor * edgeFactor * sunMaxDepth;
            
            totalDx += -dirX * pullStrength * 0.36;  // 20% increase
            totalDy += -dirY * pullStrength * 0.36;
            maxDepth = Math.max(maxDepth, depth);
        }

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
    
    // Helper to get heatmap color based on depth intensity (0-1)
    function getGravityHeatColor(intensity, baseAlpha) {
        // Clamp intensity to 0-1
        const t = Math.min(1, Math.max(0, intensity));
        
        // Color gradient: deep blue -> cyan -> green -> yellow -> orange -> red
        let r, g, b;
        if (t < 0.2) {
            // Blue to cyan
            const lt = t / 0.2;
            r = 30;
            g = Math.floor(60 + lt * 140);
            b = Math.floor(150 + lt * 50);
        } else if (t < 0.4) {
            // Cyan to green
            const lt = (t - 0.2) / 0.2;
            r = Math.floor(30 + lt * 50);
            g = Math.floor(200 - lt * 30);
            b = Math.floor(200 - lt * 150);
        } else if (t < 0.6) {
            // Green to yellow
            const lt = (t - 0.4) / 0.2;
            r = Math.floor(80 + lt * 175);
            g = Math.floor(170 + lt * 55);
            b = Math.floor(50 - lt * 30);
        } else if (t < 0.8) {
            // Yellow to orange
            const lt = (t - 0.6) / 0.2;
            r = 255;
            g = Math.floor(225 - lt * 100);
            b = Math.floor(20);
        } else {
            // Orange to red
            const lt = (t - 0.8) / 0.2;
            r = 255;
            g = Math.floor(125 - lt * 75);
            b = Math.floor(20 + lt * 30);
        }
        
        // Boost alpha for high intensity areas
        const alpha = baseAlpha + t * 0.5;
        return `rgba(${r}, ${g}, ${b}, ${Math.min(1, alpha)})`;
    }

    // Draw isometric grid with gravity well depressions and heatmap coloring
    function drawPerspectiveGrid() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Grid extends beyond visible area
        const gridRadius = Math.max(canvas.width, canvas.height) * 1.2;

        // Calculate grid spacing based on sphere size (use average sphere radius)
        // This keeps grid resolution consistent regardless of window size
        const avgSphereRadius = spheres.reduce((sum, s) => sum + s.radius, 0) / spheres.length;
        const gridSpacing = avgSphereRadius * 1.5;  // Grid cells ~1.5x sphere radius

        // Calculate number of lines needed to cover the grid area
        const numHLines = Math.ceil(gridRadius / gridSpacing);
        const numVLines = numHLines;
        
        // Max depth for normalization (based on sun's max depth)
        const maxDepthReference = centralStar.baseRadius * perspectiveConfig.wellDepthMultiplier * 3;

        // Draw horizontal lines (these become angled lines in isometric view)
        // In world space they're horizontal (constant Y), but we project them
        for (let i = -numHLines; i <= numHLines; i++) {
            const worldY = centerY + i * gridSpacing;

            // Alpha fades toward edges
            const distFromCenter = Math.abs(i) / numHLines;
            const baseAlpha = 0.08 + (1 - distFromCenter) * 0.12;

            const segments = 60;
            let prevProj = null;
            
            for (let j = 0; j <= segments; j++) {
                const segT = j / segments;
                const worldX = centerX - gridRadius + segT * gridRadius * 2;

                // Get gravity well displacement
                const d = getTotalDisplacement(worldX, worldY);

                // Project to screen using isometric projection
                const proj = projectToScreen(worldX + d.x, worldY + d.y, d.depth);
                
                // Calculate intensity based on depth
                const intensity = d.depth / maxDepthReference;

                if (prevProj) {
                    // Draw segment with heatmap color
                    ctx.beginPath();
                    ctx.moveTo(prevProj.x, prevProj.y);
                    ctx.lineTo(proj.x, proj.y);
                    ctx.strokeStyle = getGravityHeatColor(intensity, baseAlpha);
                    ctx.lineWidth = 0.8 + intensity * 1.5;  // Thicker lines in high gravity
                    ctx.stroke();
                }
                
                prevProj = proj;
            }
        }

        // Draw vertical lines (constant X in world space)
        for (let i = -numVLines; i <= numVLines; i++) {
            const worldX = centerX + i * gridSpacing;

            // Alpha fades toward edges
            const distFromCenter = Math.abs(i) / numVLines;
            const baseAlpha = 0.08 + (1 - distFromCenter) * 0.12;

            const segments = 60;
            let prevProj = null;
            
            for (let j = 0; j <= segments; j++) {
                const segT = j / segments;
                const worldY = centerY - gridRadius + segT * gridRadius * 2;

                // Get gravity well displacement
                const d = getTotalDisplacement(worldX, worldY);

                // Project to screen using isometric projection
                const proj = projectToScreen(worldX + d.x, worldY + d.y, d.depth);
                
                // Calculate intensity based on depth
                const intensity = d.depth / maxDepthReference;

                if (prevProj) {
                    // Draw segment with heatmap color
                    ctx.beginPath();
                    ctx.moveTo(prevProj.x, prevProj.y);
                    ctx.lineTo(proj.x, proj.y);
                    ctx.strokeStyle = getGravityHeatColor(intensity, baseAlpha);
                    ctx.lineWidth = 0.8 + intensity * 1.5;  // Thicker lines in high gravity
                    ctx.stroke();
                }
                
                prevProj = proj;
            }
        }

        // Draw clean ellipse outline around the sun's equator (where grid meets sun)
        // Project actual points on the world-space circle to get correct screen-space ellipse
        // (This is drawn later, after the sun, so it appears on top)
    }

    // Draw the sun's equator ellipse outline (front arc only, rotated 90° CCW)
    function drawSunEquatorEllipse() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const sunHoleRadius = centralStar.baseRadius;  // Static size (no pulse)
        
        ctx.beginPath();
        const ellipseSegments = 64;
        let started = false;
        
        // Draw front arc rotated 45° from previous: angles from -PI/4 to 3*PI/4
        const startAngle = -Math.PI / 4;
        const endAngle = Math.PI * 3 / 4;
        const arcSegments = ellipseSegments / 2;
        
        for (let i = 0; i <= arcSegments; i++) {
            const angle = startAngle + (i / arcSegments) * (endAngle - startAngle);
            const worldX = centerX + Math.cos(angle) * sunHoleRadius;
            const worldY = centerY + Math.sin(angle) * sunHoleRadius;
            const proj = projectToScreen(worldX, worldY);
            
            if (!started) {
                ctx.moveTo(proj.x, proj.y);
                started = true;
            } else {
                ctx.lineTo(proj.x, proj.y);
            }
        }
        
        // Stroke outline only (no fill, no close)
        ctx.strokeStyle = 'rgba(80, 60, 40, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
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

    // Draw central star as wireframe sphere
    function drawCentralStar() {
        const worldX = canvas.width / 2;
        const worldY = canvas.height / 2;

        // Project center to screen space
        const proj = projectToScreen(worldX, worldY);
        const centerX = proj.x;
        const centerY = proj.y;
        const radius = centralStar.baseRadius * proj.scale;
        
        // Wireframe settings
        const numLatitudes = 8;   // Horizontal circles
        const numLongitudes = 12; // Vertical meridians
        const segments = 48;      // Smoothness of each line
        
        // Spin rotation (use pulsePhase as rotation angle)
        const spinAngle = centralStar.pulsePhase * 0.2;  // Slower spin (60% reduction)
        const cosS = Math.cos(spinAngle);
        const sinS = Math.sin(spinAngle);
        
        // Isometric projection constants (matching grid/orbit projection)
        const tilt = perspectiveConfig.tiltAngle;
        const cos45 = Math.cos(Math.PI / 4);
        const sin45 = Math.sin(Math.PI / 4);
        
        ctx.strokeStyle = 'rgba(255, 180, 80, 0.7)';
        ctx.lineWidth = 1.2;
        
        // Helper to project a 3D point on sphere to 2D screen
        // Uses same isometric projection as grid/orbits so equator matches orbit paths
        function projectSpherePoint(theta, phi) {
            // Spherical to Cartesian (theta = longitude, phi = latitude from pole)
            // X and Y are in the orbital plane, Z is up (pole direction)
            let x3d = radius * Math.sin(phi) * Math.cos(theta);
            let y3d = radius * Math.sin(phi) * Math.sin(theta);
            const z3d = radius * Math.cos(phi);  // Z is up (pole direction)

            // Apply spin rotation around Z axis (vertical spin)
            const spinX = x3d * cosS - y3d * sinS;
            const spinY = x3d * sinS + y3d * cosS;

            // Isometric rotation of XY plane by 45 degrees
            const rotX = spinX * cos45 - spinY * sin45;
            const rotY = spinX * sin45 + spinY * cos45;

            // For spherical appearance: compress Y based on tilt
            // At tilt=0 (flat), no compression - sphere appears as circle from above
            // At tilt=0.55 (iso), apply perspective compression
            const equatorCompression = (1 - tilt);  // Same as grid
            const poleCompression = 1 - tilt * 0.27;  // Scale pole compression with tilt
            const zFactor = Math.abs(z3d) / radius;  // 0 at equator, 1 at poles
            const compression = equatorCompression + (poleCompression - equatorCompression) * zFactor;

            // Z offset also scales with tilt (0 when flat, full effect when tilted)
            const screenX = centerX + rotX;
            const screenY = centerY + rotY * compression - z3d * 0.68 * (tilt / 0.55);

            // Return depth for potential hidden line removal
            return { x: screenX, y: screenY, z: rotY };
        }
        
        // Draw latitude lines (horizontal circles at different heights)
        for (let i = 1; i < numLatitudes; i++) {
            const phi = (i / numLatitudes) * Math.PI;  // 0 to PI (pole to pole)
            
            ctx.beginPath();
            for (let j = 0; j <= segments; j++) {
                const theta = (j / segments) * Math.PI * 2;
                const pt = projectSpherePoint(theta, phi);
                
                if (j === 0) {
                    ctx.moveTo(pt.x, pt.y);
                } else {
                    ctx.lineTo(pt.x, pt.y);
                }
            }
            ctx.stroke();
        }
        
        // Draw longitude lines (meridians from pole to pole)
        for (let i = 0; i < numLongitudes; i++) {
            const theta = (i / numLongitudes) * Math.PI * 2;
            
            ctx.beginPath();
            for (let j = 0; j <= segments; j++) {
                const phi = (j / segments) * Math.PI;  // 0 to PI (pole to pole)
                const pt = projectSpherePoint(theta, phi);
                
                if (j === 0) {
                    ctx.moveTo(pt.x, pt.y);
                } else {
                    ctx.lineTo(pt.x, pt.y);
                }
            }
            ctx.stroke();
        }
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
    // Skips segments that pass through the sun
    function drawOrbitPath(sphere) {
        const centerX = sphere.orbitCenterX;
        const centerY = sphere.orbitCenterY;
        const a = sphere.semiMajorAxis * sphere.orbitScale;  // Semi-major axis
        const e = sphere.eccentricity;
        const b = a * Math.sqrt(1 - e * e);  // Semi-minor axis
        const tilt = sphere.orbitTilt;
        
        // Sun hole radius to avoid drawing through
        const sunRadius = centralStar.baseRadius * 1.1;

        ctx.strokeStyle = `rgba(${hexToRgb(sphere.colors.dark)}, 0.25)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);  // Dotted line pattern

        // Draw ellipse by plotting points, breaking at sun intersection
        const steps = 60;
        let inPath = false;
        
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const cosT = Math.cos(tilt);
            const sinT = Math.sin(tilt);
            const ox = a * Math.cos(angle);
            const oy = b * Math.sin(angle);

            const worldX = centerX + ox * cosT - oy * sinT;
            const worldY = centerY + ox * sinT + oy * cosT;
            
            // Check if inside sun
            const dx = worldX - centerX;
            const dy = worldY - centerY;
            const insideSun = (dx * dx + dy * dy) < (sunRadius * sunRadius);
            
            if (insideSun) {
                if (inPath) {
                    ctx.stroke();
                    inPath = false;
                }
                continue;
            }

            // Project to screen space
            const proj = projectToScreen(worldX, worldY);

            if (!inPath) {
                ctx.beginPath();
                ctx.moveTo(proj.x, proj.y);
                inPath = true;
            } else {
                ctx.lineTo(proj.x, proj.y);
            }
        }

        if (inPath) {
            ctx.stroke();
        }
        ctx.setLineDash([]);  // Reset to solid line
    }
    
    // Helper to convert hex to rgb
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            '255, 255, 255';
    }

    // Enhanced 3D sphere rendering as wireframe with isometric perspective
    function drawSphere3D(sphere) {
        const { radius, colors } = sphere;
        const isHovered = sphere === hoveredSphere;

        // Project sphere position to screen space
        const proj = projectToScreen(sphere.x, sphere.y);
        const centerX = proj.x;
        const centerY = proj.y;

        // Scale radius by perspective
        const hoverMultiplier = isHovered ? 1.15 : 1.0;
        const r = radius * proj.scale * hoverMultiplier;

        // Store projected position for hit detection
        sphere.screenX = centerX;
        sphere.screenY = centerY;
        sphere.screenRadius = r;

        // Wireframe settings
        const numLatitudes = 6;   // Horizontal circles
        const numLongitudes = 8;  // Vertical meridians
        const segments = 32;      // Smoothness of each line
        
        // Use sphere rotation for spin
        const spinAngle = (sphere.rotation || 0) * 0.5;
        const cosS = Math.cos(spinAngle);
        const sinS = Math.sin(spinAngle);
        
        // Isometric projection constants (matching grid/orbit/sun projection)
        const tilt = perspectiveConfig.tiltAngle;
        const cos45 = Math.cos(Math.PI / 4);
        const sin45 = Math.sin(Math.PI / 4);
        
        // Get color for wireframe from sphere's colors
        const wireColor = colors.mid;
        ctx.strokeStyle = `rgba(${hexToRgb(wireColor)}, 0.7)`;
        ctx.lineWidth = 1;
        
        // Helper to project a 3D point on sphere to 2D screen
        function projectSpherePoint(theta, phi) {
            // Spherical to Cartesian
            let x3d = r * Math.sin(phi) * Math.cos(theta);
            let y3d = r * Math.sin(phi) * Math.sin(theta);
            const z3d = r * Math.cos(phi);

            // Apply spin rotation around Z axis
            const spinX = x3d * cosS - y3d * sinS;
            const spinY = x3d * sinS + y3d * cosS;

            // Isometric rotation of XY plane by 45 degrees
            const rotX = spinX * cos45 - spinY * sin45;
            const rotY = spinX * sin45 + spinY * cos45;

            // For spherical appearance: compress Y based on tilt
            // At tilt=0 (flat), no compression - sphere appears as circle from above
            // At tilt=0.55 (iso), apply perspective compression
            const equatorCompression = (1 - tilt);  // Same as grid
            const poleCompression = 1 - tilt * 0.27;  // Scale pole compression with tilt (0.85 at full tilt)
            const zFactor = Math.abs(z3d) / r;  // 0 at equator, 1 at poles
            const compression = equatorCompression + (poleCompression - equatorCompression) * zFactor;

            // Z offset also scales with tilt (0 when flat, full effect when tilted)
            const screenX = centerX + rotX;
            const screenY = centerY + rotY * compression - z3d * 0.68 * (tilt / 0.55);

            return { x: screenX, y: screenY, z: rotY };
        }
        
        // Draw latitude lines
        for (let i = 1; i < numLatitudes; i++) {
            const phi = (i / numLatitudes) * Math.PI;
            
            ctx.beginPath();
            for (let j = 0; j <= segments; j++) {
                const theta = (j / segments) * Math.PI * 2;
                const pt = projectSpherePoint(theta, phi);
                
                if (j === 0) {
                    ctx.moveTo(pt.x, pt.y);
                } else {
                    ctx.lineTo(pt.x, pt.y);
                }
            }
            ctx.stroke();
        }
        
        // Draw longitude lines
        for (let i = 0; i < numLongitudes; i++) {
            const theta = (i / numLongitudes) * Math.PI * 2;
            
            ctx.beginPath();
            for (let j = 0; j <= segments; j++) {
                const phi = (j / segments) * Math.PI;
                const pt = projectSpherePoint(theta, phi);
                
                if (j === 0) {
                    ctx.moveTo(pt.x, pt.y);
                } else {
                    ctx.lineTo(pt.x, pt.y);
                }
            }
            ctx.stroke();
        }
        
        // === HOVER RING ===
        if (isHovered) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, r + 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw label at projected position
        if (isHovered || isMobile) {
            drawSphereLabelProjected(sphere, centerX, centerY, r);
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

        const scaleMultiplier = isHovered ? 1.15 : 1.0;
        const drawRadius = radius * scaleMultiplier;

        if (isHovered) {
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
            // Update orbit center in case of resize
            sphere.orbitCenterX = canvas.width / 2;
            sphere.orbitCenterY = canvas.height / 2;
            sphere.orbitScale = Math.min(canvas.width, canvas.height);
            
            // Apply energy dampening (orbits slowly stabilize)
            sphere.eccentricity *= 0.9997;
            if (sphere.eccentricity < 0.05) sphere.eccentricity = 0.05 + Math.random() * 0.1;
            
            // Update angle based on Kepler-adjusted angular velocity
            sphere.angle += sphere.currentAngularVelocity || sphere.baseAngularVelocity;
            
            // Update surface rotation for rolling effect
            // The planet rotates based on distance traveled along orbit
            const orbitRadius = sphere.semiMajorAxis * sphere.orbitScale;
            const arcLength = (sphere.currentAngularVelocity || sphere.baseAngularVelocity) * orbitRadius;
            sphere.rotation += arcLength / sphere.radius * 0.5;  // Rolling speed factor
            
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

        // Update spacecraft
        updateSpacecraft();
    }

    // Launch spacecraft using Hohmann transfer orbit
    // Strategy: Calculate where both planets WILL BE after countdown, then plan transfer between those positions
    function launchSpacecraft() {
        // Pick random departure and destination planets (different ones)
        const fromIndex = Math.floor(Math.random() * spheres.length);
        let toIndex = Math.floor(Math.random() * spheres.length);
        while (toIndex === fromIndex) {
            toIndex = Math.floor(Math.random() * spheres.length);
        }

        const fromPlanet = spheres[fromIndex];
        const toPlanet = spheres[toIndex];

        // Get orbit radii for Hohmann transfer calculation
        const r1 = fromPlanet.semiMajorAxis * fromPlanet.orbitScale;
        const r2 = toPlanet.semiMajorAxis * toPlanet.orbitScale;

        // Hohmann transfer orbit parameters
        const transferA = (r1 + r2) / 2;
        const transferE = Math.abs(r2 - r1) / (r2 + r1);

        // Calculate transfer time (frames) using Kepler's 3rd law (simplified)
        const baseTransferFrames = 400;
        const transferTime = baseTransferFrames * Math.pow(transferA / Math.min(r1, r2), 1.5);

        // Countdown duration in frames (~3 seconds at 60fps)
        const countdownFrames = 180;

        // Step 1: Predict where DEPARTURE planet will be AFTER countdown (launch moment)
        // Uses accurate elliptical orbit simulation with Kepler's 2nd law
        const departurePrediction = predictPlanetPosition(fromPlanet, countdownFrames);
        const departurePosAtLaunch = {
            x: departurePrediction.x,
            y: departurePrediction.y
        };
        const departureAngleAtLaunch = departurePrediction.angle;

        // Step 2: Predict where DESTINATION planet will be at ARRIVAL (after countdown + transfer)
        // Uses accurate elliptical orbit simulation with Kepler's 2nd law
        const totalFrames = countdownFrames + transferTime;
        const arrivalPrediction = predictPlanetPosition(toPlanet, totalFrames);
        const arrivalPosAtEnd = {
            x: arrivalPrediction.x,
            y: arrivalPrediction.y
        };
        const arrivalAngleAtEnd = arrivalPrediction.angle;

        // Step 3: Calculate launch angle from future departure to future arrival
        const launchAngle = Math.atan2(
            arrivalPosAtEnd.y - departurePosAtLaunch.y,
            arrivalPosAtEnd.x - departurePosAtLaunch.x
        );

        // Determine if we're going outward (to larger orbit) or inward
        const goingOutward = r2 > r1;

        // Create new spacecraft with countdown active
        // During countdown, spacecraft follows departure planet until it reaches departurePosAtLaunch
        const newSpacecraft = {
            active: true,
            x: fromPlanet.x + Math.cos(launchAngle) * fromPlanet.radius,
            y: fromPlanet.y + Math.sin(launchAngle) * fromPlanet.radius,
            progress: 0,
            fromPlanet: fromPlanet,
            toPlanet: toPlanet,
            rotation: launchAngle,
            trail: [],
            journeyDuration: transferTime,
            size: spacecraftConfig.size,

            // Countdown state
            countdownActive: true,
            countdownStart: Date.now(),
            countdownDuration: 3000, // 3 seconds

            // Hohmann transfer parameters (fixed - calculated for future positions)
            transferOrbit: {
                semiMajorAxis: transferA,
                eccentricity: transferE,
                semiMinorAxis: transferA * Math.sqrt(1 - transferE * transferE),
                departureOrbitRadius: r1,
                arrivalOrbitRadius: r2,
                goingOutward: goingOutward,
            },

            // These are the FUTURE positions where transfer will occur
            // departurePos = where departure planet will be when countdown ends
            // arrivalPos = where destination planet will be when spacecraft arrives
            departurePos: departurePosAtLaunch,
            arrivalPos: arrivalPosAtEnd,
            departureAngle: departureAngleAtLaunch,
            arrivalAngle: arrivalAngleAtEnd,
            launchAngle: launchAngle,
        };

        spacecrafts.push(newSpacecraft);
    }

    // Update all spacecraft positions and state
    function updateSpacecraft() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Update each spacecraft and remove completed ones
        for (let i = spacecrafts.length - 1; i >= 0; i--) {
            const craft = spacecrafts[i];

            // Handle countdown phase
            // Spacecraft follows departure planet, facing along the Hohmann transfer path
            if (craft.countdownActive) {
                const elapsed = Date.now() - craft.countdownStart;
                if (elapsed < craft.countdownDuration) {
                    // Still counting down - spacecraft rides on departure planet surface
                    // Face tangent to orbit (perpendicular to sun-planet line) in direction of travel
                    const radialAngle = Math.atan2(craft.fromPlanet.y - centerY, craft.fromPlanet.x - centerX);
                    // Tangent direction: +90° for counterclockwise (outward), -90° for clockwise (inward)
                    const tangentAngle = craft.transferOrbit.goingOutward
                        ? radialAngle + Math.PI / 2
                        : radialAngle - Math.PI / 2;
                    craft.x = craft.fromPlanet.x + Math.cos(tangentAngle) * craft.fromPlanet.radius;
                    craft.y = craft.fromPlanet.y + Math.sin(tangentAngle) * craft.fromPlanet.radius;
                    craft.rotation = tangentAngle;
                    continue;
                }
                // Countdown complete - launch!
                // Update departurePos to actual planet position so spacecraft lifts off from where it's sitting
                craft.departurePos = { x: craft.fromPlanet.x, y: craft.fromPlanet.y };
                craft.countdownActive = false;
                craft.progress = 0;
            }

            // Update journey progress
            craft.progress += 1 / craft.journeyDuration;

            if (craft.progress >= 1) {
                // Journey complete - remove from array
                spacecrafts.splice(i, 1);
                continue;
            }

            // Calculate position on Hohmann transfer ellipse
            // The ellipse is centered on the sun, with departure at one end and arrival at the other
            const t = craft.progress;
            const transfer = craft.transferOrbit;

            // Departure and arrival angles relative to sun center
            const depAngle = Math.atan2(craft.departurePos.y - centerY, craft.departurePos.x - centerX);
            const arrAngle = Math.atan2(craft.arrivalPos.y - centerY, craft.arrivalPos.x - centerX);

            // Interpolate angle around the transfer orbit
            // For Hohmann transfer, we go approximately 180 degrees around
            let angleDiff = arrAngle - depAngle;
            // Normalize to go the "long way" around (Hohmann is ~180 degrees)
            if (transfer.goingOutward) {
                // Going outward: travel counterclockwise (positive angle direction)
                if (angleDiff <= 0) angleDiff += 2 * Math.PI;
            } else {
                // Going inward: travel clockwise (negative angle direction)
                if (angleDiff >= 0) angleDiff -= 2 * Math.PI;
            }

            // Current angle along the transfer
            const currentAngle = depAngle + angleDiff * t;

            // Calculate radius at this point on the ellipse using the vis-viva style approach
            // r = a(1 - e²) / (1 + e*cos(θ)) where θ is true anomaly
            // For simplicity, interpolate between departure and arrival radii with elliptical curve
            const r1 = transfer.departureOrbitRadius;
            const r2 = transfer.arrivalOrbitRadius;

            // Use sine interpolation for smooth elliptical radius change
            // At t=0: r=r1, at t=0.5: r is at extreme (periapsis or apoapsis), at t=1: r=r2
            const radiusT = Math.sin(t * Math.PI / 2); // 0 to 1 over the journey
            const currentRadius = r1 + (r2 - r1) * radiusT;

            // Position on transfer orbit
            craft.x = centerX + currentRadius * Math.cos(currentAngle);
            craft.y = centerY + currentRadius * Math.sin(currentAngle);

            // Landing phase - smoothly blend toward actual planet surface in final 10% of journey
            const landingThreshold = 0.9;
            if (t > landingThreshold) {
                const landingProgress = (t - landingThreshold) / (1 - landingThreshold);
                // Use smoothstep easing for natural deceleration
                const easedProgress = landingProgress * landingProgress * (3 - 2 * landingProgress);

                // Calculate landing point on planet surface - use approach angle from current position
                const approachAngle = Math.atan2(craft.y - craft.toPlanet.y, craft.x - craft.toPlanet.x);
                const surfaceX = craft.toPlanet.x + Math.cos(approachAngle) * craft.toPlanet.radius;
                const surfaceY = craft.toPlanet.y + Math.sin(approachAngle) * craft.toPlanet.radius;

                // Blend between calculated orbit position and landing position
                craft.x = craft.x + (surfaceX - craft.x) * easedProgress;
                craft.y = craft.y + (surfaceY - craft.y) * easedProgress;
            }

            // Update rotation to face direction of travel
            if (craft.trail.length > 0) {
                const lastPos = craft.trail[craft.trail.length - 1];
                const dx = craft.x - lastPos.x;
                const dy = craft.y - lastPos.y;
                if (dx !== 0 || dy !== 0) {
                    craft.rotation = Math.atan2(dy, dx);
                }
            } else {
                craft.rotation = craft.launchAngle;
            }

            // Add to trail
            craft.trail.push({ x: craft.x, y: craft.y, age: 0 });

            // Limit trail length and age out old points
            const maxTrail = 20;
            if (craft.trail.length > maxTrail) {
                craft.trail.shift();
            }
        }
    }

    // Draw all spacecraft as 3D wireframes
    function drawSpacecraft() {
        const tilt = perspectiveConfig.tiltAngle;
        const cos45 = Math.cos(Math.PI / 4);
        const sin45 = Math.sin(Math.PI / 4);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        for (const craft of spacecrafts) {
            const proj = projectToScreen(craft.x, craft.y);
            const screenX = proj.x;
            const screenY = proj.y;

            // Draw countdown visualization if active
            if (craft.countdownActive) {
                const elapsed = Date.now() - craft.countdownStart;
                const remaining = Math.ceil((craft.countdownDuration - elapsed) / 1000);

                // Draw countdown number above spacecraft
                ctx.save();
                ctx.font = 'bold 20px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Pulsing effect
                const pulse = 1 + 0.15 * Math.sin(elapsed * 0.015);

                // Outer glow
                ctx.shadowColor = 'rgba(255, 180, 80, 0.8)';
                ctx.shadowBlur = 15 * pulse;
                ctx.fillStyle = `rgba(255, 200, 100, ${0.9})`;
                ctx.fillText(remaining.toString(), screenX, screenY - 30);
                ctx.shadowBlur = 0;

                // Draw pulsing ring around spacecraft
                ctx.beginPath();
                ctx.arc(screenX, screenY, 18 * pulse, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 150, 50, ${0.4 + 0.3 * Math.sin(elapsed * 0.012)})`;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw expanding rings
                const ringPhase = (elapsed % 1000) / 1000;
                const ringRadius = 15 + ringPhase * 25;
                const ringAlpha = 0.5 * (1 - ringPhase);
                ctx.beginPath();
                ctx.arc(screenX, screenY, ringRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 180, 100, ${ringAlpha})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.restore();
            }

            // Scale size based on journey progress - smaller during takeoff/landing, larger in middle
            // Uses sine curve for smooth altitude simulation
            const effectiveProgress = craft.countdownActive ? 0 : craft.progress;
            const altitudeScale = Math.sin(effectiveProgress * Math.PI);
            const minScale = 0.3;  // Minimum size when near planet surface
            const sizeScale = minScale + (1 - minScale) * altitudeScale;
            const size = craft.size * proj.scale * sizeScale;

            // Draw projected Hohmann transfer path as dotted ellipse
            ctx.save();
            const transfer = craft.transferOrbit;

            // Calculate path parameters (same as updateSpacecraft)
            const depAngle = Math.atan2(craft.departurePos.y - centerY, craft.departurePos.x - centerX);
            const arrAngle = Math.atan2(craft.arrivalPos.y - centerY, craft.arrivalPos.x - centerX);

            let angleDiff = arrAngle - depAngle;
            if (transfer.goingOutward) {
                if (angleDiff <= 0) angleDiff += 2 * Math.PI;
            } else {
                if (angleDiff >= 0) angleDiff -= 2 * Math.PI;
            }

            const r1 = transfer.departureOrbitRadius;
            const r2 = transfer.arrivalOrbitRadius;

            // Draw dots along the remaining transfer path
            const numDots = 35;
            const startProgress = craft.countdownActive ? 0 : craft.progress;
            for (let i = 0; i < numDots; i++) {
                const dotProgress = startProgress + (1 - startProgress) * (i / numDots);

                // Calculate position on Hohmann ellipse (same as spacecraft movement)
                const currentAngle = depAngle + angleDiff * dotProgress;
                const radiusT = Math.sin(dotProgress * Math.PI / 2);
                const currentRadius = r1 + (r2 - r1) * radiusT;

                const dotX = centerX + currentRadius * Math.cos(currentAngle);
                const dotY = centerY + currentRadius * Math.sin(currentAngle);

                const dotProj = projectToScreen(dotX, dotY);

                // Fade dots based on distance from spacecraft (not journey progress)
                // Dots closer to spacecraft are brighter, dots near destination are dimmer
                const fadeProgress = i / numDots;
                const alpha = 0.5 * (1 - fadeProgress * 0.7);

                ctx.beginPath();
                ctx.arc(dotProj.x, dotProj.y, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(150, 180, 220, ${alpha})`;
                ctx.fill();
            }

            // Draw destination marker (where planet will be at arrival)
            // Stays visible throughout the journey, fading slightly near the end
            const destAlpha = craft.progress > 0.9 ? (1 - craft.progress) * 10 : 1;
            if (destAlpha > 0) {
                const destProj = projectToScreen(craft.arrivalPos.x, craft.arrivalPos.y);
                ctx.beginPath();
                ctx.arc(destProj.x, destProj.y, 4, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(100, 200, 150, ${(0.4 + 0.2 * Math.sin(Date.now() * 0.005)) * destAlpha})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            ctx.restore();

            // Draw engine trail/exhaust (before the spacecraft)
            ctx.save();
            if (craft.trail.length > 1) {
                for (let i = 1; i < craft.trail.length; i++) {
                    const pt = craft.trail[i];
                    const prevPt = craft.trail[i - 1];
                    const projPt = projectToScreen(pt.x, pt.y);
                    const projPrev = projectToScreen(prevPt.x, prevPt.y);

                    const alpha = (i / craft.trail.length) * 0.7;
                    const width = (i / craft.trail.length) * 4;

                    ctx.beginPath();
                    ctx.moveTo(projPrev.x, projPrev.y);
                    ctx.lineTo(projPt.x, projPt.y);
                    ctx.strokeStyle = `rgba(255, 150, 50, ${alpha})`;
                    ctx.lineWidth = width;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }
            }
            ctx.restore();

            // 3D wireframe spacecraft - a simple elongated octahedron/rocket shape
            // Define vertices in local 3D space (x = forward, y = right, z = up)
            const len = size * 2;      // Length
            const craftWidth = size * 0.6;  // Width
            const height = size * 0.5; // Height

            // Vertices: nose, tail, and 4 points around the middle
            const vertices3D = [
                { x: len, y: 0, z: 0 },           // 0: nose
                { x: -len * 0.5, y: 0, z: 0 },    // 1: tail
                { x: 0, y: craftWidth, z: 0 },         // 2: right
                { x: 0, y: -craftWidth, z: 0 },        // 3: left
                { x: 0, y: 0, z: height },        // 4: top
                { x: 0, y: 0, z: -height },       // 5: bottom
                // Fins
                { x: -len * 0.3, y: craftWidth * 1.5, z: -height * 0.5 },   // 6: right fin
                { x: -len * 0.3, y: -craftWidth * 1.5, z: -height * 0.5 },  // 7: left fin
                { x: -len * 0.3, y: 0, z: height * 1.5 },              // 8: top fin
            ];

            // Edges to draw
            const edges = [
                // Main body
                [0, 2], [0, 3], [0, 4], [0, 5],  // Nose to middle points
                [1, 2], [1, 3], [1, 4], [1, 5],  // Tail to middle points
                [2, 4], [4, 3], [3, 5], [5, 2],  // Middle ring
                // Fins
                [2, 6], [1, 6],  // Right fin
                [3, 7], [1, 7],  // Left fin
                [4, 8], [1, 8],  // Top fin
            ];

            // Transform vertices based on spacecraft rotation and perspective
            const rot = craft.rotation;
            const cosR = Math.cos(rot);
            const sinR = Math.sin(rot);

            const projectedVertices = vertices3D.map(v => {
                // Rotate around Z axis (yaw - direction of travel)
                let x = v.x * cosR - v.y * sinR;
                let y = v.x * sinR + v.y * cosR;
                let z = v.z;

                // Apply isometric rotation (45 degrees)
                const isoX = x * cos45 - y * sin45;
                const isoY = x * sin45 + y * cos45;

                // Apply tilt compression (same as planets)
                const compression = 1 - tilt;
                const screenPosX = screenX + isoX;
                const screenPosY = screenY + isoY * compression - z * 0.68 * (tilt / 0.55);

                return { x: screenPosX, y: screenPosY, z: isoY };
            });

            // Draw wireframe edges
            ctx.strokeStyle = 'rgba(180, 200, 220, 0.8)';
            ctx.lineWidth = 1.2;
            ctx.lineCap = 'round';

            for (const [i, j] of edges) {
                const v1 = projectedVertices[i];
                const v2 = projectedVertices[j];

                ctx.beginPath();
                ctx.moveTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);
                ctx.stroke();
            }

            // Draw vertices as small dots
            ctx.fillStyle = 'rgba(220, 230, 255, 0.9)';
            for (const v of projectedVertices) {
                ctx.beginPath();
                ctx.arc(v.x, v.y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Engine glow at tail
            const tailProj = projectedVertices[1];
            const glowGradient = ctx.createRadialGradient(
                tailProj.x, tailProj.y, 0,
                tailProj.x, tailProj.y, size * 1.2
            );
            glowGradient.addColorStop(0, 'rgba(255, 200, 100, 0.8)');
            glowGradient.addColorStop(0.3, 'rgba(255, 120, 50, 0.4)');
            glowGradient.addColorStop(0.6, 'rgba(255, 80, 20, 0.2)');
            glowGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

            ctx.beginPath();
            ctx.arc(tailProj.x, tailProj.y, size * 1.2, 0, Math.PI * 2);
            ctx.fillStyle = glowGradient;
            ctx.fill();
        }
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

        // Smoothly interpolate tilt angle toward target
        const tiltDiff = viewState.targetTilt - perspectiveConfig.tiltAngle;
        if (Math.abs(tiltDiff) > 0.001) {
            perspectiveConfig.tiltAngle += tiltDiff * 0.08;  // Smooth easing
        } else {
            perspectiveConfig.tiltAngle = viewState.targetTilt;
        }

        // Update positions
        updateSpherePositions();

        // Draw central star (full sun - grid will only cover back half)
        drawCentralStar();

        // Draw subtle warped grid (has hole cut out only for back half of sun)
        drawGrid();
        
        // Draw the equator ellipse around sun
        drawSunEquatorEllipse();
        
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

        // Draw spacecraft
        drawSpacecraft();

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
const CONTACT_WORKER_URL = 'https://contact-form.christopher-lin-508.workers.dev/';

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

        // Get form data (includes honeypot field)
        const formData = {
            name: newForm.querySelector('#name').value.trim(),
            email: newForm.querySelector('#email').value.trim(),
            message: newForm.querySelector('#message').value.trim(),
            website: newForm.querySelector('#website').value // honeypot
        };

        submitBtn.innerHTML = 'sending... <span class="cursor">_</span>';
        submitBtn.disabled = true;

        try {
            const response = await fetch(CONTACT_WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Success
                submitBtn.innerHTML = 'message_sent() ✓';
                submitBtn.style.borderColor = 'var(--accent-tertiary)';
                submitBtn.style.color = 'var(--accent-tertiary)';
                newForm.reset();
            } else {
                // Server error
                throw new Error(result.error || 'Failed to send');
            }
        } catch (error) {
            console.error('Contact form error:', error);
            submitBtn.innerHTML = 'error() ✗';
            submitBtn.style.borderColor = 'var(--accent-red)';
            submitBtn.style.color = 'var(--accent-red)';
        }

        // Reset button after delay
        setTimeout(() => {
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
