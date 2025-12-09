// frontend/src/shaders/wind.vert.glsl
// Vertex Shader for Wind Particles

attribute vec2 a_position;
attribute vec2 a_velocity;
attribute float a_age;

uniform mat4 u_matrix;
uniform float u_time;
uniform float u_particleSize;

varying float v_age;
varying float v_speed;

void main() {
    // Calculate speed from velocity
    v_speed = length(a_velocity);
    v_age = a_age;
    
    // Apply position transformation
    gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
    
    // Particle size based on speed
    gl_PointSize = u_particleSize * (1.0 + v_speed * 0.5);
}
