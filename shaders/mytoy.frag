#version 450
#extension GL_GOOGLE_include_directive : require

#include <shadertoy.glsl>
#include <noise.glsl>



mat2 rotate2d(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float sdf_circle(vec2 p, float r) {
  return length(p) - r;
}

float sdf_box(vec2 p, vec2 hs) {
  vec2 q = abs(p) - hs;
  return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0);
}

float sdf_rounded_box(vec2 p, vec2 hs, float r) {
  return sdf_box(p, hs - vec2(r)) - r;
}

float op_smooth_union(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

float op_subtract(float d1, float d2) {
  return max(d1, -d2);
}

vec2 interaction_point() {
  vec2 mouse = (2.0 * iMouse.xy - iResolution.xy) / iResolution.y;
  vec2 automatic = vec2(0.58 * cos(iTime * 0.73),
                        0.30 * sin(iTime * 1.07));
  return (iMouse.z > 0.0) ? mouse : automatic;
}

float scene_sdf(vec2 p, vec2 attractor) {
  vec2 bodyP = rotate2d(0.10 * sin(iTime * 0.55)) * p;
  float body = sdf_rounded_box(bodyP, vec2(0.43, 0.18), 0.13);

  vec2 orbitA = vec2(0.42 * cos(iTime * 0.82),
                     0.24 * sin(iTime * 0.82));
  vec2 orbitB = vec2(0.34 * cos(-iTime * 1.13 + 2.1),
                     0.31 * sin(-iTime * 1.13 + 2.1));

  float d = op_smooth_union(body, sdf_circle(p - orbitA, 0.105), 0.11);
  d = op_smooth_union(d, sdf_circle(p - orbitB, 0.075), 0.09);
  d = op_smooth_union(d, sdf_circle(p - attractor, 0.09), 0.08);

  float core = sdf_circle(bodyP, 0.075 + 0.012 * sin(iTime * 2.0));
  return op_subtract(d, core);
}

vec3 distance_contours(float d) {
  vec3 inside = vec3(1.00, 0.34, 0.18);
  vec3 outside = vec3(0.10, 0.42, 0.92);
  vec3 col = (d < 0.0) ? inside : outside;
  col *= 0.58 + 0.42 * cos(42.0 * d);
  float edge = 1.0 - smoothstep(0.0, 0.008, abs(d));
  return mix(col, vec3(1.0), edge);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  vec2 attractor = interaction_point();

  // Two inexpensive noise layers form a drifting nebula. Five plus three
  // octaves keep the effect comfortably inside the lab's GPU-time budget.
  vec2 drift = vec2(-0.10, 0.055) * iTime;
  float cloud = fbm(p * 1.75 + drift + vec2(3.1, 7.4), 5u);
  float detail = fbm(p * 3.60 - drift * 1.7 + vec2(8.2, 1.6), 3u);

  vec3 navy = vec3(0.010, 0.018, 0.075);
  vec3 cyan = vec3(0.030, 0.330, 0.470);
  vec3 violet = vec3(0.280, 0.055, 0.390);
  vec3 col = mix(navy, cyan, smoothstep(0.18, 0.82, cloud));
  col = mix(col, violet, smoothstep(0.46, 0.86, detail) * 0.62);

  float d = scene_sdf(p, attractor);
  float aa = max(fwidth(d), 1e-5);
  float fill = 1.0 - smoothstep(-aa, aa, d);
  float outerGlow = exp(-13.0 * max(d, 0.0));
  float rimGlow = exp(-38.0 * abs(d));

  vec3 warm = vec3(1.00, 0.25, 0.08);
  vec3 gold = vec3(1.00, 0.78, 0.22);
  vec3 material = mix(warm, gold,
                      0.5 + 0.5 * sin(iTime * 1.4 + p.x * 4.0));
  material *= 0.78 + 0.22 * detail;

  col += outerGlow * vec3(0.02, 0.26, 0.58);
  col += rimGlow * vec3(0.55, 0.18, 0.72);
  col = mix(col, material, fill);

  float vignette = 1.0 - 0.28 * smoothstep(0.35, 1.55, length(p));
  col *= vignette;

  // Debug views: noise layers, raw signed distance, and SDF contours.
  if (iMode == 1u) {
    col = vec3(cloud, detail, 1.0 - cloud);
  }
  else if (iMode == 2u) {
    col = vec3(clamp(0.5 + 0.8 * d, 0.0, 1.0));
  }
  else if (iMode == 3u) {
    col = distance_contours(d);
  }

  fragColor = vec4(pow(max(col, vec3(0.0)), vec3(0.90)), 1.0);
}
