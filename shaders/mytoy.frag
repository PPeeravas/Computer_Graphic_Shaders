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
  vec2 q = rotate2d(0.12 * sin(iTime * 0.45)) * p;
  float shell = sdf_circle(q, 0.34 + 0.012 * sin(iTime * 1.8));

  vec2 orbitA = vec2(0.34 * cos(iTime * 0.82),
                     0.25 * sin(iTime * 0.82));
  vec2 orbitB = vec2(0.29 * cos(-iTime * 1.13 + 2.1),
                     0.34 * sin(-iTime * 1.13 + 2.1));

  shell = op_smooth_union(shell, sdf_circle(p - orbitA, 0.105), 0.10);
  shell = op_smooth_union(shell, sdf_circle(p - orbitB, 0.080), 0.09);
  shell = op_smooth_union(shell, sdf_circle(p - attractor, 0.070), 0.07);

  float core = sdf_circle(q, 0.175 + 0.014 * sin(iTime * 2.4));
  return op_subtract(shell, core);
}

float star_field(vec2 p) {
  vec2 scaled = p * 18.0;
  ivec2 cell = ivec2(floor(scaled));
  vec2 local = fract(scaled) - 0.5;
  float seed = hash(uvec2(cell + ivec2(1000)));
  float star = smoothstep(0.075, 0.0, length(local));
  float visible = step(0.965, seed);
  float twinkle = 0.55 + 0.45 * sin(iTime * (2.0 + seed * 4.0) + seed * 31.0);
  return star * visible * twinkle;
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

  // Two inexpensive noise layers form a drifting nebula.
  vec2 drift = vec2(-0.10, 0.055) * iTime;
  float cloud = fbm(p * 1.75 + drift + vec2(3.1, 7.4), 5u);
  float detail = fbm(p * 3.60 - drift * 1.7 + vec2(8.2, 1.6), 3u);

  vec3 navy = vec3(0.004, 0.008, 0.040);
  vec3 cyan = vec3(0.010, 0.260, 0.420);
  vec3 violet = vec3(0.300, 0.025, 0.400);
  vec3 col = mix(navy, cyan, smoothstep(0.18, 0.82, cloud));
  col = mix(col, violet, smoothstep(0.46, 0.86, detail) * 0.62);
  col += star_field(p + drift * 0.12) * vec3(0.55, 0.82, 1.0);

  float d = scene_sdf(p, attractor);
  float aa = max(fwidth(d), 1e-5);
  float fill = 1.0 - smoothstep(-aa, aa, d);
  float outerGlow = exp(-10.0 * max(d, 0.0));
  float rimGlow = exp(-45.0 * abs(d));

  float angle = atan(p.y, p.x);
  float radius = length(p);
  float energy = 0.5 + 0.5 * sin(angle * 7.0 - iTime * 3.2
                                 + detail * 8.0 + radius * 15.0);

  vec3 magenta = vec3(1.00, 0.08, 0.52);
  vec3 gold = vec3(1.00, 0.76, 0.16);
  vec3 material = mix(magenta, gold, energy);
  material *= 0.70 + 0.45 * detail;

  col += outerGlow * vec3(0.01, 0.20, 0.75);
  col += rimGlow * mix(vec3(0.18, 0.45, 1.0), vec3(1.0, 0.12, 0.65), energy);
  col = mix(col, material, fill);

  // Energy rings and a rotating sweep make the portal feel deeper.
  float ringA = exp(-90.0 * abs(radius - (0.48 + 0.015 * sin(iTime * 2.0))));
  float ringB = exp(-110.0 * abs(radius - 0.57));
  float sweep = pow(max(0.0, cos(angle - iTime * 0.9)), 28.0);
  col += (ringA * 0.28 + ringB * 0.14) * vec3(0.12, 0.48, 1.0);
  col += sweep * exp(-5.0 * radius) * vec3(0.35, 0.12, 0.65);

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
