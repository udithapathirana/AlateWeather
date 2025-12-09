precision mediump float;

varying float v_age;
varying float v_speed;

uniform vec3 u_color;
uniform float u_maxAge;
uniform float u_opacity;

void main() {
    // Calculate distance from center of point
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    // Create smooth circle
    if (dist > 0.5) {
        discard;
    }
    
    // Fade based on age
    float ageFade = 1.0 - (v_age / u_maxAge);
    
    // Color intensity based on speed
    float speedIntensity = clamp(v_speed * 0.5, 0.3, 1.0);
    
    // Smooth edge falloff
    float edgeFalloff = 1.0 - smoothstep(0.3, 0.5, dist);
    
    // Final alpha
    float alpha = ageFade * edgeFalloff * u_opacity * speedIntensity;
    
    // Color with speed-based intensity
    vec3 finalColor = u_color * speedIntensity;
    
    gl_FragColor = vec4(finalColor, alpha);
}
