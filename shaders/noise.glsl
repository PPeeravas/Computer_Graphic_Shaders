#ifndef NOISE_GLSL_INCLUDED
#define NOISE_GLSL_INCLUDED

uint pcg(uint v) {
  v = v * 747796405u + 2891336453u;
  uint w = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u;
  return (w >> 22u) ^ w;
}

float hash(uvec2 p) { return float(pcg(p.x ^ pcg(p.y))) / 4294967296.0; }


float value_noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  
  uvec2 i = uvec2(ivec2(cell) + 1000);

  float a = hash(i);                    
  float b = hash(i + uvec2(1u, 0u));    
  float c = hash(i + uvec2(0u, 1u));    
  float d = hash(i + uvec2(1u, 1u));    


  f = f * f * (3.0 - 2.0 * f);

  float bottom = mix(a, b, f.x);
  float top    = mix(c, d, f.x);
  return mix(bottom, top, f.y);
}


float fbm(vec2 p, uint octaves) {
  float sum = 0.0;
  float A = 0.5;
  float f = 1.0;
  for(uint i = 0 ; i < octaves ; i++){

    sum += A * value_noise(p * f);
    f *= 2.0;
    A *= 0.5;
  }
  
  return sum;
}

#endif
