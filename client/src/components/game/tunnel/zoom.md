Zoom Effect Overview: Trigger a dramatic "rush" on synced dual-hold (Deck A + B keys): Magnify tunnel (scale 1x → 1.8x), curve walls outward (straight hex tunnel → fisheye barrel distortion), intensify colors/opacity, pulse sway speed. Fade out over 500-800ms for combo reward feel.
Detection Logic (Parent Tunnel Component):
Track hold states: isHoldingA: boolean, isHoldingB: boolean from keydown/keyup events.
Compute sync: const isSynced = isHoldingA && isHoldingB && (holdDurationA > 100ms) && (holdDurationB > 100ms).
On sync start: Set zoomProgress: 0 → animate to 1 over 300ms (use RAF or Framer Motion).
On any release: Decay zoomProgress to 0 over 500ms.
Tie to score: Boost multiplier while zoomed; perfect sync extends duration.

Magnify Implementation:
Wrap parallax layers + foreground in <g id="zoomGroup">.
Animate scale: transform: scale(${1 + zoomProgress * 0.8}) on group; origin at VP (vanishing point).
Adjust VP position: Lerp VP closer to center (vpY -= zoomProgress * 50) for "rushing forward".
Boost hex radii: effectiveMaxRadius = maxRadius * (1 + zoomProgress * 0.3) in vertex calc.

Curve/Warp Implementation (Per-Layer in ParallaxHexLayers):
Add curveAmount: number = zoomProgress * 2.0 prop.
Warp vertices radially: For each point (x,y) from VP:
Compute dist = hypot(x - vpX, y - vpY).
Warp offset = sin(dist * warpFreq) * curveAmount * (1 - progress)  // Deeper layers curve more.
New angle = atan2(y - vpY, x - vpX) + warpOffset.
Adjusted r = dist * (1 + curveAmount * 0.1 * sin(6 * angle))  // Barrel distortion.
Set x' = vpX + adjustedR * cos(newAngle), y' = vpY + adjustedR * sin(newAngle).

Freq = 0.02-0.05; tweak for subtle → extreme bow.

Visual Polish:
Opacity: (baseOpacity + zoomProgress * 0.3); strokeWidth * (1 + zoomProgress * 0.5).
Color shift: Tint rayColor toward white/brighter (hsl(hue, sat * (1 - zoomProgress * 0.4), light + zoomProgress * 0.2)).
Sway boost: swaySpeed *= (1 + zoomProgress * 2); add radial pulse: scale += sin(time * 20) * zoomProgress * 0.1.
Particles: Spawn 20-50 SVG circles from VP outward during zoom, scaling with progress.

Alternative: SVG Filter for Easy Warp (Zero Vertex Math):
Define <feTurbulence baseFrequency="0.01" numOctaves="3" result="warp"/> <feDisplacementMap in="SourceGraphic" in2="warp" scale="${zoomProgress * 50}" xChannelSelector="R" yChannelSelector="G"/>.
Apply filter="url(#zoomWarp)" to tunnel group; animate scale dynamically.
Pros: Instant curve/magnify; Cons: Less precise control, potential perf hit (test on mobile).

Animation Loop:
Pass zoomProgress prop to ParallaxHexLayers.
In RAF: zoomProgress += (targetZoom - zoomProgress) * 0.15 (easeInOut).
Sync to beatAmplitude: zoomIntensity *= beatAmp for extra thump.

Tuning & Edge Cases:
Duration: Sync hold >200ms to trigger; max zoom 800ms to prevent spam.
Perf: Limit warp to 3-5 layers; use will-change: transform.
Feedback: Screen flash + score popup on peak zoom; audio pitch bend up.
Test: Simulate keys; adjust curveFreq=0.03, scale=1.6 for "whoa" factor without nausea.

Copilot Prompt: "Implement SVG hexagon warp with radial distortion prop in React, using hypot/atan2 for barrel effect."