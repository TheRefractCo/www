export const vertexShader = `
attribute vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const fragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerEnergy;
uniform float uTime;
uniform float uIntro;
uniform vec3 uAccent;
uniform vec3 uAccent2;
uniform float uDualColor;
uniform float uLightMode;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = rotation * p * 2.03 + 9.17;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = (gl_FragCoord.xy * 2.0 - uResolution.xy)
    / min(uResolution.x, uResolution.y);
  float aspect = uResolution.x / uResolution.y;
  vec2 pointer = vec2(
    (uPointer.x * 2.0 - 1.0) * aspect,
    uPointer.y * 2.0 - 1.0
  );

  float time = uTime * 0.085;
  float angle = -0.19;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 q = rot * p;
  vec2 qPointer = rot * pointer;
  vec2 pointerDelta = (q - qPointer) * vec2(0.68, 1.0);
  float influence = exp(-dot(pointerDelta, pointerDelta) * 1.38)
    * uPointerEnergy;

  float broadNoise = fbm(vec2(
    q.x * 0.31 - time * 0.24,
    q.y * 0.44 + time * 0.08
  ));
  vec2 flowCoord = vec2(
    q.x * 0.76 + broadNoise * 0.62 - time * 0.48,
    q.y * 0.92 + broadNoise * 0.52
  );
  float flowNoise = noise(flowCoord) * 0.72
    + noise(flowCoord * 2.03 + 7.4) * 0.28;

  float expansion = smoothstep(-1.42, 1.46, q.x);
  float cursorWarp = (qPointer.y - q.y) * influence * 0.19;
  float center = -0.07
    + expansion * 0.075
    + (broadNoise - 0.5) * mix(0.018, 0.072, expansion)
    + sin(q.x * 0.48 - time * 0.38) * mix(0.008, 0.022, expansion)
    + cursorWarp;
  float signedDistance = q.y - center;

  float width = mix(0.145, 0.79, pow(expansion, 0.78))
    + (flowNoise - 0.5) * mix(0.012, 0.065, expansion)
    + influence * 0.12;
  float wideTransverse = signedDistance / max(width, 0.001);
  float modeWidth = width * mix(1.0, 0.72, uLightMode);
  float transverse = signedDistance / max(modeWidth, 0.001);
  float body = exp(-pow(abs(transverse) / 0.88, 2.0));
  float core = exp(-pow(abs(transverse) / 0.43, 1.88));
  float veil = exp(-pow(abs(transverse) / 1.55, 1.82));

  float smokeLarge = fbm(vec2(
    q.x * 0.72 - time * 0.34,
    transverse * 1.42 + flowNoise * 0.72 + time * 0.055
  ));
  vec2 smokeFineCoord = vec2(
    q.x * 1.78 - time * 0.61,
    transverse * 3.55 + smokeLarge * 0.92
  );
  float smokeFine = noise(smokeFineCoord) * 0.68
    + noise(smokeFineCoord * 1.91 + 11.3) * 0.32;
  float smokeDensity = clamp(
    0.52
      + (smokeLarge - 0.5) * 0.58
      + (smokeFine - 0.5) * 0.28,
    0.0,
    1.0
  );
  float shaftA = exp(-pow(
    (transverse - 0.08 - (smokeLarge - 0.5) * 0.14) / 0.27,
    2.0
  ));
  float shaftB = exp(-pow(
    (transverse + 0.37 + (smokeFine - 0.5) * 0.09) / 0.36,
    2.0
  ));
  float softShafts = (shaftA * 0.66 + shaftB * 0.25)
    * (0.76 + smokeFine * 0.24);

  float longitudinal = smoothstep(-2.55, -1.52, q.x)
    * (1.0 - smoothstep(2.05, 2.95, q.x));
  vec3 primaryAccent = clamp(uAccent, 0.0, 1.0);
  vec3 secondaryAccent = clamp(uAccent2, 0.0, 1.0);
  float chromaBlend = smoothstep(
    -0.72,
    0.88,
    transverse
      + (flowNoise - 0.5) * 0.24
      + sin(q.x * 0.7 - time) * 0.055
  );
  vec3 accent = mix(primaryAccent, secondaryAccent, chromaBlend * uDualColor);
  vec3 deepInk = mix(vec3(0.004, 0.014, 0.040), accent * 0.045, 0.22);
  vec3 midnight = mix(vec3(0.008, 0.035, 0.105), accent * 0.22, 0.42);
  vec3 cobalt = mix(accent * 0.48, vec3(0.018, 0.255, 0.69), 0.22);
  vec3 cyan = mix(accent, vec3(1.0), 0.13);
  vec3 ice = mix(accent, vec3(1.0), 0.69);
  float ambient = 0.5
    + 0.5 * sin(uv.x * 1.7 - uv.y * 1.25 + time * 0.24);
  vec3 darkBackground = mix(deepInk, midnight, 0.18 + ambient * 0.13);
  vec3 paleAccent = mix(accent, vec3(1.0), 0.92);
  vec3 lightBackground = mix(
    vec3(0.89, 0.915, 0.928),
    paleAccent,
    0.08 + ambient * 0.04
  );
  vec3 background = mix(darkBackground, lightBackground, uLightMode);

  vec2 dustCoord = vec2(
    q.x * 21.0 - time * 0.72,
    q.y * 19.0 + flowNoise * 1.7
  );
  vec2 dustCell = floor(dustCoord);
  vec2 dustLocal = fract(dustCoord) - 0.5;
  vec2 dustOffset = vec2(hash(dustCell), hash(dustCell + 7.31)) - 0.5;
  float dustPoint = 1.0 - smoothstep(
    0.025,
    0.125,
    length(dustLocal - dustOffset * 0.62)
  );
  dustPoint *= smoothstep(0.80, 0.97, hash(dustCell + 19.7));
  float dustTwinkle = 0.55
    + 0.45 * sin(time * 7.0 + hash(dustCell + 3.2) * 6.2831);
  dustPoint *= dustTwinkle * body * longitudinal;

  vec2 farCoord = vec2(
    q.x * 34.0 - time * 1.08,
    q.y * 31.0 + broadNoise * 1.15
  );
  vec2 farCell = floor(farCoord);
  vec2 farLocal = fract(farCoord) - 0.5;
  vec2 farOffset = vec2(hash(farCell + 4.8), hash(farCell + 11.6)) - 0.5;
  float farPoint = 1.0 - smoothstep(
    0.018,
    0.105,
    length(farLocal - farOffset * 0.70)
  );
  farPoint *= smoothstep(0.84, 0.985, hash(farCell + 23.4));
  farPoint *= 0.62
    + 0.38 * sin(time * 8.6 + hash(farCell) * 6.2831);
  farPoint *= body * longitudinal;

  vec2 nearCoord = vec2(
    q.x * 10.5 - time * 0.28,
    q.y * 9.2 + flowNoise * 0.65
  );
  vec2 nearCell = floor(nearCoord);
  vec2 nearLocal = fract(nearCoord) - 0.5;
  vec2 nearOffset = vec2(hash(nearCell + 6.1), hash(nearCell + 14.2)) - 0.5;
  float nearDistance = length(nearLocal - nearOffset * 0.58);
  float nearPoint = 1.0 - smoothstep(0.025, 0.115, nearDistance);
  float nearHalo = 1.0 - smoothstep(0.06, 0.30, nearDistance);
  float nearPresence = smoothstep(0.925, 0.995, hash(nearCell + 28.5));
  float nearTwinkle = 0.50
    + 0.50 * sin(time * 4.2 + hash(nearCell + 1.8) * 6.2831);
  nearPoint *= nearPresence * nearTwinkle * body * longitudinal;
  nearHalo *= nearPresence * nearTwinkle * body * longitudinal;

  float cursorDust = exp(-dot(pointerDelta, pointerDelta) * 2.15)
    * uPointerEnergy;
  float ignitionPosition = mix(
    -1.38,
    1.72,
    smoothstep(0.0, 1.0, uIntro)
  );
  float ignitionSweep = exp(-pow((q.x - ignitionPosition) / 0.24, 2.0))
    * body
    * (1.0 - smoothstep(0.78, 1.0, uIntro));

  vec3 darkColor = background;
  darkColor += cobalt * body * 0.21
    * (0.76 + smokeLarge * 0.24)
    * longitudinal;
  darkColor += ice * core * 0.34 * longitudinal;
  darkColor += cyan * veil * smokeDensity * 0.05 * longitudinal;
  darkColor += ice * farPoint * (0.30 + expansion * 0.12);
  darkColor += ice * dustPoint * (0.82 + cursorDust * 0.72);
  darkColor += cyan * dustPoint * expansion * 0.32;
  darkColor += ice * nearPoint * 1.05;
  darkColor += cyan * nearHalo * (0.075 + expansion * 0.11);
  darkColor += ice * ignitionSweep * 0.48;
  darkColor += vec3(0.28, 0.76, 1.0) * influence * body * 0.18;
  darkColor += ice * cursorDust * smokeDensity * body * 0.07;

  vec3 refractedInk = mix(vec3(0.055, 0.08, 0.12), accent, 0.84);
  float lightOuterVeil = exp(-pow(abs(wideTransverse) / 1.16, 2.35));
  float opticalCore = exp(-pow(
    (transverse - 0.035 - (smokeFine - 0.5) * 0.055) / 0.31,
    2.0
  ));
  float beamOpacity = clamp(
    (lightOuterVeil * 0.035 + body * 0.19 + core * 0.17)
      * longitudinal
      * (0.72 + smokeDensity * 0.38),
    0.0,
    0.45
  );
  beamOpacity *= mix(0.74, 1.12, expansion);
  vec3 lightColor = mix(lightBackground, refractedInk, beamOpacity);
  lightColor = mix(
    lightColor,
    mix(refractedInk, vec3(0.035, 0.055, 0.08), 0.18),
    opticalCore * longitudinal * (0.065 + expansion * 0.055)
  );
  lightColor += mix(accent, vec3(1.0), 0.62)
    * softShafts
    * body
    * longitudinal
    * (0.032 + expansion * 0.028);
  lightColor += mix(accent, vec3(1.0), 0.80)
    * ignitionSweep
    * 0.34;

  float dustSilhouette = clamp(
    farPoint * 0.72 + dustPoint * 1.34 + nearPoint * 1.72,
    0.0,
    1.0
  );
  vec3 dustInk = mix(
    vec3(0.035, 0.055, 0.085),
    accent * 0.62,
    0.58
  );
  lightColor = mix(
    lightColor,
    dustInk,
    clamp(dustSilhouette * 1.20 + nearHalo * 0.065, 0.0, 0.96)
  );
  lightColor += mix(accent, vec3(1.0), 0.84)
    * (
      farPoint * 0.20
      + dustPoint * 0.38
      + nearPoint * 0.58
      + nearHalo * 0.035
    );
  lightColor = mix(lightColor, refractedInk, influence * body * 0.055);

  vec3 color = mix(darkColor, lightColor, uLightMode);
  float vignette = 1.0 - smoothstep(
    0.55,
    1.28,
    length((uv - 0.5) * vec2(0.95, 1.28))
  );
  color *= mix(
    0.70 + vignette * 0.34,
    0.94 + vignette * 0.06,
    uLightMode
  );

  float sensorGrain = hash(gl_FragCoord.xy * 0.73) - 0.5;
  color *= 1.0 + sensorGrain * (0.055 + body * 0.075);
  color += sensorGrain / 175.0;
  color = mix(background, color, smoothstep(0.0, 1.0, uIntro));

  gl_FragColor = vec4(color, 1.0);
}
`;
