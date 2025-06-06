//precision mediump float;
//
//uniform vec2 u_resolution;
//uniform float u_time;
//uniform vec3 u_color;
//
//void main() {
//    vec2 st = (gl_FragCoord.xy / u_resolution.xy) - 0.5;
//    st.x *= u_resolution.x / u_resolution.y; // aspect ratio
//
//    float r = length(st);
//    float angle = atan(st.y, st.x);
//
//    // Wir + pulsacja
//    float wave = sin(10.0 * r - u_time * 4.0 + angle * 4.0);
//    float ring = smoothstep(0.01, 0.02, wave * 0.05 + 0.3 - r);
//
//    vec3 color = u_color * ring;
//
//    gl_FragColor = vec4(color, 1.0);
//}

