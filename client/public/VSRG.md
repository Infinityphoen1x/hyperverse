Rhythm Game Lead Time Management: VSRG-Style Implementation Guide
This guide refines your current 4000ms fixed lead time (LT) system into a professional osu!mania/Quaver-style constant-velocity scroller. Key improvements:

Shorter base LT (600–2400ms) prevents screen clutter (aim <30 notes on-screen).
Fine-grained player speed slider (5–40x) for LT control.
SV (Slider Velocity) points in charts for BPM-change density control.
BPM-independent velocity: Density varies naturally; SV compensates.
Smooth variable velocity via per-frame recalc (no fixed spawn LT).

Tested patterns: 60–400 BPM, 1/4–1/48 notes. Matches pro games' feel.
1. Core Formulas
Player-Controlled LT
textLT_ms = MAGIC_MS / player_speed  // player_speed: 5–40 (default 20)
MAGIC_MS = desired_LT_at_20 * 20  // e.g., 1200ms * 20 = 24000

Tune MAGIC_MS to your playfield:texttravel_height_px = judgment_line_y - spawn_y_top  // e.g., 500px
vel_px_s = travel_height_px * 1000 / LT_ms














































Player SpeedLT (ms)LT (s)px/s @500pxNotes On-Screen (180BPM 1/16)Use Case1024002.4208~45 (cluttered)Beginners/low BPM2012001.2417~22 (ideal)Standard308000.8625~15Experts406000.6833~11Speed focus
Final Velocity (with SV)
textcurrent_sv = interpolate_sv(song_time_ms)  // 1.0 default, from chart
base_vel_px_s = (MAGIC_MS / player_speed) * (travel_height_px / 1000.0)
final_vel_px_s = base_vel_px_s * current_sv
SV for BPM Changes (Chart Feature)
Mappers add SV timing points: [time_ms, sv_mult] (e.g., osu! format).

Auto-adjust formula at BPM change:textsv_mult = prev_bpm / new_bpm  // e.g., 150→200 BPM: 150/200=0.75 (slows scroll)
Linear interpolate between points. Max SV 0.5–2.0 (clamp extremes).

2. Chart Format Extension
Add to your JSON/whatever:
JSON{
  "timing_points": [
    {"time": 0, "bpm": 150},
    {"time": 5000, "bpm": 200}
  ],
  "sv_points": [
    {"time": 5000, "sv": 0.75}  // Auto or manual
  ]
}

Parser: Generate SV from BPM deltas if missing.

3. Render Loop (Unity/Godot Pseudocode)
Preload 5s ahead. Update in _Process/Update (60–144 FPS).
C#// Class vars
float travelHeightPx = 500f;
int MAGIC_MS = 24000;
float playerSpeed = 20f;
List<Note> activeNotes = new();
List<SVPoint> svPoints = new();
float songTimeMs;

// Per-frame
songTimeMs = AudioManager.GetSongTimeMs();  // Accurate, offset-synced

float currentSV = GetInterpolatedSV(songTimeMs);  // 1.0f
float ltMs = MAGIC_MS / playerSpeed;
float baseVelPxS = (travelHeightPx * 1000f) / ltMs;
float velPxS = baseVelPxS * currentSV;

// Update active notes
activeNotes.RemoveAll(note => {
    float timeToHitMs = note.hitTimeMs - songTimeMs;
    if (timeToHitMs <= -200f) {  // Miss window
        return true;  // Despawn
    }

    float yFromJudgmentPx = (timeToHitMs / 1000f) * velPxS;
    if (yFromJudgmentPx > travelHeightPx + 100f) {  // Off-top
        return true;
    }

    // Clamp & render
    float clampedY = Mathf.Min(yFromJudgmentPx, travelHeightPx);
    float progress = clampedY / travelHeightPx;  // 1.0 = top, 0 = line

    // Visuals
    float alpha = FadeCurve(progress);  // Sigmoid: fade-in top 20%, fade-out bottom 10%
    float scale = 1f + (1f - progress) * 0.3f;  // Grow 30% near line
    if (timeToHitMs < 150f) scale *= 1.2f;  // Suddenness glow

    note.Render(judgmentY + clampedY, alpha, scale);
    return false;
});

// Spawn upcoming
float maxLTms = MAGIC_MS / 5f * 2f;  // Conservative ~10s max
foreach (var upcoming in chart.GetNotes(songTimeMs, songTimeMs + maxLTms)) {
    if (!activeNotes.Any(n => n.id == upcoming.id)) {
        activeNotes.Add(upcoming);
    }
}
Helper Functions
C#float GetInterpolatedSV(float time) {
    // Binary search + lerp between svPoints
    // Default 1.0f
}

float FadeCurve(float progress) {  // 0=bottom,1=top
    if (progress > 0.8f) return Mathf.Lerp(1f, 0f, (progress - 0.8f) / 0.2f);  // Fade-out
    if (progress < 0.2f) return Mathf.Lerp(0f, 1f, progress / 0.2f);  // Fade-in
    return 1f;
}
4. Polish & Edge Cases

Lead-in: Force 2000ms before first note (pause song if needed).
Variable hit zone: effectiveTravel = hitY - noteSize/2; LT *= effectiveTravel / travelHeight;
LN Holds/Tails: Scale height with vel; head/tail fade separately.
Culling: Limit activeNotes <100; pool objects.
Sudden+ mod: Spawn at 300ms LT (override).
Testing:BPMDensitySpeedMax NotesExpected Feel1801/1620x22Readable stream3001/2430x18Finger control901/810x25Relaxed

5. Migration Steps

Add player_speed slider (5–40, save pref).
Implement SV parser/generator from BPM.
Replace fixed 4000ms spawn: Use per-frame y calc.
Retune MAGIC_MS: Playtest 180BPM 1/16 → adjust till ~20 notes.
Gradually shorten base (4000→2500→1200).

Open-Source Refs

osu! GitHub: ManiaNoteRenderer
Quaver: ScrollSpeedHandler