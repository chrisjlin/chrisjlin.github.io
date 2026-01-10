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

    // Grid settings
    const gridSpacing = 40;
    const gridColor = 'rgba(160, 184, 208, 0.4)';
    const sphereColor = {
        highlight: '#ffffff',
        mid: '#9ab0c4',
        dark: '#4a6278',
        shadow: '#3d5266'
    };

    // Sphere definitions with section mappings and physics properties
    const spheres = [
        { xPct: 0.10, yPct: 0.25, radius: 80, depth: 160, phase: 0, sectionId: 'about', label: 'About', homeX: 0.10, homeY: 0.25, vx: 0, vy: 0, pressDepth: 1.0 },
        { xPct: 0.90, yPct: 0.30, radius: 70, depth: 140, phase: 2, sectionId: 'projects', label: 'Projects', homeX: 0.90, homeY: 0.30, vx: 0, vy: 0, pressDepth: 1.0 },
        { xPct: 0.12, yPct: 0.70, radius: 75, depth: 150, phase: 4, sectionId: 'blog', label: 'Blog', homeX: 0.12, homeY: 0.70, vx: 0, vy: 0, pressDepth: 1.0 },
        { xPct: 0.88, yPct: 0.75, radius: 65, depth: 130, phase: 6, sectionId: 'contact', label: 'Contact', homeX: 0.88, homeY: 0.75, vx: 0, vy: 0, pressDepth: 1.0 }
    ];

    // Receptacle settings
    const receptacle = {
        xPct: 0.5,
        yPct: 0.5,
        radius: 100,
        pulsePhase: 0
    };

    // State
    let time = 0;
    let draggedSphere = null;
    let isDragging = false;
    let dockedSphere = null;
    let hoveredSphere = null;
    let selectedSphere = null; // For mobile tap-to-select
    let isMobile = 'ontouchstart' in window;

    // DOM elements
    const contentPanel = document.getElementById('content-panel');
    const panelContent = document.getElementById('panel-content');
    const panelClose = document.getElementById('panel-close');
    const panelBackdrop = document.getElementById('panel-backdrop');
    const hintText = document.getElementById('hint-text');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Update receptacle position
        receptacle.x = receptacle.xPct * canvas.width;
        receptacle.y = receptacle.yPct * canvas.height;
        // Initialize/update sphere positions
        for (const sphere of spheres) {
            if (!sphere.isDocked && sphere !== draggedSphere) {
                sphere.x = sphere.xPct * canvas.width;
                sphere.y = sphere.yPct * canvas.height;
            }
        }
    }

    // Find sphere at position (excluding docked sphere)
    function getSphereAtPosition(x, y, includeDocked = true) {
        for (let i = spheres.length - 1; i >= 0; i--) {
            const sphere = spheres[i];
            if (!includeDocked && sphere === dockedSphere) continue;
            const dx = x - sphere.x;
            const dy = y - sphere.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= sphere.radius) {
                return sphere;
            }
        }
        return null;
    }

    // Check if position is in receptacle
    function isInReceptacle(x, y) {
        const dx = x - receptacle.x;
        const dy = y - receptacle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < receptacle.radius;
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

    // Dock sphere to receptacle
    function dockSphere(sphere) {
        // If another sphere is docked, undock it first
        if (dockedSphere && dockedSphere !== sphere) {
            undockSphere(dockedSphere);
        }

        dockedSphere = sphere;
        sphere.isDocked = true;

        // Snap to receptacle center
        sphere.x = receptacle.x;
        sphere.y = receptacle.y;
        sphere.xPct = receptacle.xPct;
        sphere.yPct = receptacle.yPct;

        showContentPanel(sphere.sectionId);
    }

    // Undock sphere from receptacle
    function undockSphere(sphere) {
        if (sphere !== dockedSphere) return;

        dockedSphere = null;
        sphere.isDocked = false;

        // Return to home position
        sphere.xPct = sphere.homeX;
        sphere.yPct = sphere.homeY;

        hideContentPanel();
    }

    // Mouse handlers
    function handleDocumentMouseMove(e) {
        const x = e.clientX;
        const y = e.clientY;

        if (isDragging && draggedSphere) {
            draggedSphere.x = x;
            draggedSphere.y = y;
            draggedSphere.xPct = x / canvas.width;
            draggedSphere.yPct = y / canvas.height;

            // Check if dragging out of receptacle
            if (draggedSphere.isDocked && !isInReceptacle(x, y)) {
                undockSphere(draggedSphere);
            }

            e.preventDefault();
        } else {
            // Check hover state
            hoveredSphere = getSphereAtPosition(x, y);

            if (hoveredSphere || isInReceptacle(x, y)) {
                canvas.style.pointerEvents = 'auto';
                canvas.style.cursor = hoveredSphere ? 'grab' : 'default';
                document.body.style.cursor = hoveredSphere ? 'grab' : '';
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
            isDragging = true;
            draggedSphere = sphere;
            canvas.style.cursor = 'grabbing';
            document.body.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }

    function handleDocumentMouseUp(e) {
        if (isDragging && draggedSphere) {
            const x = e.clientX;
            const y = e.clientY;

            // Check if dropped in receptacle
            if (isInReceptacle(x, y) && !draggedSphere.isDocked) {
                dockSphere(draggedSphere);
            }

            isDragging = false;
            draggedSphere = null;
            canvas.style.cursor = 'default';
            document.body.style.cursor = '';
        }
    }

    // Touch handlers for mobile
    function handleTouchStart(e) {
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;

        const sphere = getSphereAtPosition(x, y);

        if (sphere) {
            // On mobile, tap to select, tap receptacle to dock
            if (selectedSphere === sphere) {
                // Double tap to start dragging
                isDragging = true;
                draggedSphere = sphere;
            } else {
                selectedSphere = sphere;
            }
            e.preventDefault();
        } else if (isInReceptacle(x, y) && selectedSphere) {
            // Tap receptacle with selected sphere
            dockSphere(selectedSphere);
            selectedSphere = null;
            e.preventDefault();
        } else {
            selectedSphere = null;
        }
    }

    function handleTouchMove(e) {
        if (isDragging && draggedSphere && e.touches[0]) {
            const x = e.touches[0].clientX;
            const y = e.touches[0].clientY;
            draggedSphere.x = x;
            draggedSphere.y = y;
            draggedSphere.xPct = x / canvas.width;
            draggedSphere.yPct = y / canvas.height;

            // Check if dragging out of receptacle
            if (draggedSphere.isDocked && !isInReceptacle(x, y)) {
                undockSphere(draggedSphere);
            }

            e.preventDefault();
        }
    }

    function handleTouchEnd(e) {
        if (isDragging && draggedSphere) {
            // Use the last known position
            const x = draggedSphere.x;
            const y = draggedSphere.y;

            if (isInReceptacle(x, y) && !draggedSphere.isDocked) {
                dockSphere(draggedSphere);
            }

            isDragging = false;
            draggedSphere = null;
        }
    }

    // Panel close handlers
    if (panelClose) {
        panelClose.addEventListener('click', () => {
            if (dockedSphere) {
                undockSphere(dockedSphere);
            }
        });
    }

    if (panelBackdrop) {
        panelBackdrop.addEventListener('click', () => {
            if (dockedSphere) {
                undockSphere(dockedSphere);
            }
        });
    }

    // Event listeners
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);
    canvas.addEventListener('mousedown', handleCanvasMouseDown);

    // Touch support
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    // Grid displacement calculations
    function getDisplacement(px, py, sphere) {
        const dx = px - sphere.x;
        const dy = py - sphere.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Extend effect radius based on press depth for gravity well effect
        const effectRadius = sphere.depth * (1 + (sphere.pressDepth - 1) * 0.5);

        if (distance < effectRadius && distance > 0) {
            const factor = 1 - (distance / effectRadius);

            // INVERTED: Pressing DOWN increases warping (gravity well effect)
            // pressDepth animates from 1.0 (resting) to 3.0 (pressed)
            let warpMultiplier = sphere.pressDepth;
            if (sphere === hoveredSphere && sphere !== draggedSphere) {
                warpMultiplier = 1.3; // Slight preview of press effect on hover
            }

            const strength = factor * factor * sphere.depth * 0.5 * warpMultiplier;
            const dirX = dx / distance;
            const dirY = dy / distance;

            return {
                x: -dirX * strength * 0.5,
                y: -dirY * strength * 0.5 + strength * 0.35
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
            for (let x = 0; x <= width; x += 4) {
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
            for (let y = 0; y <= height; y += 4) {
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

    function drawReceptacle() {
        const { x, y, radius } = receptacle;
        const pulse = Math.sin(receptacle.pulsePhase) * 0.15 + 1;
        const currentRadius = radius * pulse;

        // Outer glow
        const glowGradient = ctx.createRadialGradient(x, y, currentRadius * 0.5, x, y, currentRadius * 1.5);
        glowGradient.addColorStop(0, 'rgba(255, 107, 0, 0.05)');
        glowGradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.08)');
        glowGradient.addColorStop(1, 'rgba(0, 212, 255, 0)');

        ctx.beginPath();
        ctx.arc(x, y, currentRadius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Main ring
        ctx.beginPath();
        ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = dockedSphere ? 'rgba(0, 255, 136, 0.6)' : 'rgba(0, 212, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner ring
        ctx.beginPath();
        ctx.arc(x, y, currentRadius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = dockedSphere ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 107, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Corner markers
        const markerSize = 15;
        ctx.strokeStyle = dockedSphere ? 'rgba(0, 255, 136, 0.8)' : 'rgba(255, 107, 0, 0.6)';
        ctx.lineWidth = 2;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(x - currentRadius, y - currentRadius + markerSize);
        ctx.lineTo(x - currentRadius, y - currentRadius);
        ctx.lineTo(x - currentRadius + markerSize, y - currentRadius);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + currentRadius - markerSize, y - currentRadius);
        ctx.lineTo(x + currentRadius, y - currentRadius);
        ctx.lineTo(x + currentRadius, y - currentRadius + markerSize);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x - currentRadius, y + currentRadius - markerSize);
        ctx.lineTo(x - currentRadius, y + currentRadius);
        ctx.lineTo(x - currentRadius + markerSize, y + currentRadius);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + currentRadius - markerSize, y + currentRadius);
        ctx.lineTo(x + currentRadius, y + currentRadius);
        ctx.lineTo(x + currentRadius, y + currentRadius - markerSize);
        ctx.stroke();
    }

    function drawSphere(sphere) {
        const { x, y } = sphere;
        const isHovered = sphere === hoveredSphere;
        const isSelected = sphere === selectedSphere;
        const isDocked = sphere === dockedSphere;
        const isDragged = sphere === draggedSphere;

        // Calculate press intensity (0 = normal, 1 = fully pressed)
        const pressIntensity = Math.max(0, (sphere.pressDepth - 1) / 2);

        // Scale DOWN slightly when pressed (pushed into surface)
        // Scale up slightly when hovered (preview)
        const scaleMultiplier = isDragged ? (1.0 - pressIntensity * 0.08) : (isHovered ? 1.05 : 1.0);
        const radius = sphere.radius * scaleMultiplier;

        // Depression ring effect when pressed (shows the gravity well)
        if (pressIntensity > 0.1) {
            const ringCount = 3;
            for (let i = 0; i < ringCount; i++) {
                const ringRadius = radius * (1.5 + i * 0.6) * (1 + pressIntensity * 0.5);
                const ringOpacity = 0.15 * pressIntensity * (1 - i / ringCount);

                ctx.beginPath();
                ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(74, 98, 120, ${ringOpacity})`;
                ctx.lineWidth = 2 - i * 0.5;
                ctx.stroke();
            }
        }

        // Inner glow/depression effect when pressed (darker, pulled into surface)
        if (isDragged && pressIntensity > 0.2) {
            const pressGlow = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2.5);
            pressGlow.addColorStop(0, `rgba(74, 98, 120, ${0.2 * pressIntensity})`);
            pressGlow.addColorStop(0.5, `rgba(61, 82, 102, ${0.1 * pressIntensity})`);
            pressGlow.addColorStop(1, 'rgba(61, 82, 102, 0)');

            ctx.beginPath();
            ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = pressGlow;
            ctx.fill();
        }

        // Highlight ring for hovered/selected (but not when pressed deep)
        if ((isHovered || isSelected) && !isDragged) {
            ctx.beginPath();
            ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 107, 0, 0.5)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Drop shadow - SMALLER and TIGHTER when pressed (pushed into surface)
        // Normal/larger when resting
        const shadowOffset = isDragged ? (2 * (1 - pressIntensity)) : (isHovered ? 4 : 3);
        const shadowSize = isDragged ? (1.2 - pressIntensity * 0.3) : 1.4;
        const shadowOpacity = isDragged ? (0.25 + pressIntensity * 0.15) : 0.25;

        const shadowGradient = ctx.createRadialGradient(
            x + shadowOffset * 0.5, y + shadowOffset,
            radius * 0.3,
            x + shadowOffset * 0.5, y + shadowOffset,
            radius * shadowSize
        );
        shadowGradient.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacity})`);
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(x + shadowOffset * 0.5, y + shadowOffset, radius * shadowSize, 0, Math.PI * 2);
        ctx.fillStyle = shadowGradient;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // Main sphere gradient - DARKER when pressed (pushed into shadow)
        const highlightOffset = isDragged ? 0.15 + pressIntensity * 0.15 : 0.3;
        const gradient = ctx.createRadialGradient(
            x - radius * highlightOffset, y - radius * highlightOffset, 0,
            x, y, radius
        );

        if (isDragged) {
            // Darker, more shadowed appearance when pressed
            const darkFactor = pressIntensity;
            gradient.addColorStop(0, `rgb(${Math.round(255 - 60 * darkFactor)}, ${Math.round(255 - 50 * darkFactor)}, ${Math.round(255 - 40 * darkFactor)})`);
            gradient.addColorStop(0.3, `rgb(${Math.round(154 - 40 * darkFactor)}, ${Math.round(176 - 40 * darkFactor)}, ${Math.round(196 - 40 * darkFactor)})`);
            gradient.addColorStop(0.7, `rgb(${Math.round(74 - 20 * darkFactor)}, ${Math.round(98 - 20 * darkFactor)}, ${Math.round(120 - 20 * darkFactor)})`);
            gradient.addColorStop(1, `rgb(${Math.round(61 - 15 * darkFactor)}, ${Math.round(82 - 15 * darkFactor)}, ${Math.round(102 - 15 * darkFactor)})`);
        } else {
            gradient.addColorStop(0, sphereColor.highlight);
            gradient.addColorStop(0.3, sphereColor.mid);
            gradient.addColorStop(0.7, sphereColor.dark);
            gradient.addColorStop(1, sphereColor.shadow);
        }

        // Draw sphere
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Rim - darker/shadowed when pressed, normal otherwise
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        if (isDragged) {
            // Darker rim when pressed (shadowed edge)
            ctx.strokeStyle = `rgba(61, 82, 102, ${0.4 + pressIntensity * 0.3})`;
            ctx.lineWidth = 2 + pressIntensity;
        } else if (isDocked) {
            ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 2;
        }
        ctx.stroke();

        // Draw label (always on mobile, on hover/select/dock/drag for desktop)
        if (isMobile || isHovered || isSelected || isDocked || isDragged) {
            drawSphereLabel(sphere, scaleMultiplier);
        }
    }

    function drawSphereLabel(sphere, scaleMultiplier = 1) {
        const { x, y, label } = sphere;
        const radius = sphere.radius * scaleMultiplier;

        ctx.font = '600 11px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelY = y + radius + 20;
        const padding = 6;
        const textWidth = ctx.measureText(label.toUpperCase()).width;

        // Label background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(x - textWidth/2 - padding, labelY - 8, textWidth + padding * 2, 16);

        // Label border
        ctx.strokeStyle = 'rgba(160, 184, 208, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - textWidth/2 - padding, labelY - 8, textWidth + padding * 2, 16);

        // Label text
        ctx.fillStyle = '#4a5a6a';
        ctx.fillText(label.toUpperCase(), x, labelY);
    }

    // Physics: Apply gravity attraction from pressed sphere
    function applyGravityFromPressedSphere(sphere, pressedSphere) {
        const dx = pressedSphere.x - sphere.x;
        const dy = pressedSphere.y - sphere.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Prevent division by zero and don't apply gravity when too close
        if (distance < 10) return;

        // Gravity strength based on press depth and inverse square-ish law
        const gravityStrength = (pressedSphere.pressDepth - 1) * 0.8;
        const force = gravityStrength / Math.max(distance * 0.02, 1);

        // Apply force as acceleration (normalize direction)
        sphere.vx += (dx / distance) * force;
        sphere.vy += (dy / distance) * force;
    }

    // Physics: Handle sphere-to-sphere collisions
    function handleSphereCollisions() {
        for (let i = 0; i < spheres.length; i++) {
            for (let j = i + 1; j < spheres.length; j++) {
                const a = spheres[i];
                const b = spheres[j];

                // Skip if both are docked (shouldn't happen) or both dragged
                if (a.isDocked && b.isDocked) continue;

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDist = a.radius + b.radius;

                if (distance < minDist && distance > 0) {
                    // Collision detected - push spheres apart
                    const overlap = minDist - distance;
                    const nx = dx / distance;
                    const ny = dy / distance;

                    // Move spheres apart (don't move dragged or docked spheres)
                    const aMovable = a !== draggedSphere && !a.isDocked;
                    const bMovable = b !== draggedSphere && !b.isDocked;

                    if (aMovable && bMovable) {
                        // Both can move - split the overlap
                        a.x -= nx * overlap * 0.5;
                        a.y -= ny * overlap * 0.5;
                        b.x += nx * overlap * 0.5;
                        b.y += ny * overlap * 0.5;

                        // Elastic collision - exchange velocities along collision normal
                        const relVelX = b.vx - a.vx;
                        const relVelY = b.vy - a.vy;
                        const relVelDotNormal = relVelX * nx + relVelY * ny;

                        // Only resolve if spheres are moving toward each other
                        if (relVelDotNormal < 0) {
                            const restitution = 0.2; // Low bounciness - spheres settle quickly
                            const impulse = -(1 + restitution) * relVelDotNormal * 0.5;

                            a.vx -= impulse * nx;
                            a.vy -= impulse * ny;
                            b.vx += impulse * nx;
                            b.vy += impulse * ny;
                        }
                    } else if (aMovable) {
                        // Only A can move
                        a.x -= nx * overlap;
                        a.y -= ny * overlap;

                        // Bounce off the immovable sphere
                        const velDotNormal = a.vx * nx + a.vy * ny;
                        if (velDotNormal > 0) {
                            a.vx -= 1.4 * velDotNormal * nx;
                            a.vy -= 1.4 * velDotNormal * ny;
                        }
                    } else if (bMovable) {
                        // Only B can move
                        b.x += nx * overlap;
                        b.y += ny * overlap;

                        // Bounce off the immovable sphere
                        const velDotNormal = b.vx * (-nx) + b.vy * (-ny);
                        if (velDotNormal > 0) {
                            b.vx += 1.4 * velDotNormal * nx;
                            b.vy += 1.4 * velDotNormal * ny;
                        }
                    }
                }
            }
        }
    }

    // Physics: Keep spheres within canvas bounds
    function constrainSpheresToCanvas() {
        for (const sphere of spheres) {
            if (sphere === draggedSphere || sphere.isDocked) continue;

            const margin = sphere.radius;

            // Left bound
            if (sphere.x < margin) {
                sphere.x = margin;
                sphere.vx *= -0.5;
            }
            // Right bound
            if (sphere.x > canvas.width - margin) {
                sphere.x = canvas.width - margin;
                sphere.vx *= -0.5;
            }
            // Top bound
            if (sphere.y < margin) {
                sphere.y = margin;
                sphere.vy *= -0.5;
            }
            // Bottom bound
            if (sphere.y > canvas.height - margin) {
                sphere.y = canvas.height - margin;
                sphere.vy *= -0.5;
            }
        }
    }

    // Physics: Main update function
    function updatePhysics() {
        // Animate pressDepth for dragged sphere
        for (const sphere of spheres) {
            if (sphere === draggedSphere) {
                // Animate toward pressed state (3.0)
                sphere.pressDepth += (3.0 - sphere.pressDepth) * 0.15;
            } else {
                // Animate back to resting state (1.0)
                sphere.pressDepth += (1.0 - sphere.pressDepth) * 0.1;
            }
        }

        // Apply physics to non-dragged, non-docked spheres
        for (const sphere of spheres) {
            if (sphere === draggedSphere || sphere.isDocked) continue;

            // Apply gravity attraction from pressed (dragged) sphere
            if (draggedSphere && draggedSphere.pressDepth > 1.5) {
                applyGravityFromPressedSphere(sphere, draggedSphere);
            }

            // Apply friction/damping (higher friction so spheres settle faster)
            sphere.vx *= 0.92;
            sphere.vy *= 0.92;

            // Stop very small velocities
            if (Math.abs(sphere.vx) < 0.01) sphere.vx = 0;
            if (Math.abs(sphere.vy) < 0.01) sphere.vy = 0;

            // Update position based on velocity
            sphere.x += sphere.vx;
            sphere.y += sphere.vy;

            // Update percentage position for home tracking
            sphere.xPct = sphere.x / canvas.width;
            sphere.yPct = sphere.y / canvas.height;
        }

        // Handle collisions between spheres
        handleSphereCollisions();

        // Keep spheres in bounds
        constrainSpheresToCanvas();
    }

    function updateSpherePositions() {
        // Only run physics simulation - no floating animation
        updatePhysics();
    }

    function draw() {
        // Clear canvas
        ctx.fillStyle = '#e8eef5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update time
        time += 16;
        receptacle.pulsePhase += 0.03;

        // Update positions
        updateSpherePositions();

        // Draw warped grid
        drawGrid();

        // Draw receptacle
        drawReceptacle();

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
