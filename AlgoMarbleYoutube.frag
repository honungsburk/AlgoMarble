#version 330 core

#ifdef GL_ES
precision mediump float;
#endif

#define PROCESSING_COLOR_SHADER

uniform vec2 u_resolution;
uniform float u_time;


// FBM
uniform float u_numOctaves;
uniform float u_zoom;


// Color
uniform vec3 u_cc;
uniform vec3 u_dd;

// Noise Params
uniform vec2 u_q_h;
uniform vec2 u_r_h;
uniform float u_pattern_h;

// Structure to noise

uniform vec2 u_center_point;
uniform float u_pixel_distance_choice;

// Interpolation 
// Should be between 0-3
uniform float u_interpolation_choice;


// To break similarity between images we must introduce these random vectors
uniform vec2 u_q_fbm_displace_1;
uniform vec2 u_q_fbm_displace_2;
uniform vec2 u_r_fbm_displace_1;
uniform vec2 u_r_fbm_displace_2;


uniform float u_color_speed;

// output color
out vec4 fragColor;



/////////////////// RANDOMNESS ////////////////////

// Implementation found on StackOverflow: 
// https://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl#4275343

// A single iteration of Bob Jenkins' One-At-A-Time hashing algorithm.
uint hash( uint x ) {
    x += ( x << 10u );
    x ^= ( x >>  6u );
    x += ( x <<  3u );
    x ^= ( x >> 11u );
    x += ( x << 15u );
    return x;
}

// Compound versions of the hashing algorithm I whipped together.
uint hash( uvec2 v ) { return hash( v.x ^ hash(v.y)                         ); }
uint hash( uvec3 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z)             ); }
uint hash( uvec4 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w) ); }



// Construct a float with half-open range [0:1] using low 23 bits.
// All zeroes yields 0.0, all ones yields the next smallest representable value below 1.0.
float floatConstruct( uint m ) {
    const uint ieeeMantissa = 0x007FFFFFu; // binary32 mantissa bitmask
    const uint ieeeOne      = 0x3F800000u; // 1.0 in IEEE binary32

    m &= ieeeMantissa;                     // Keep only mantissa bits (fractional part)
    m |= ieeeOne;                          // Add fractional part to 1.0

    float  f = uintBitsToFloat( m );       // Range [1:2]
    return f - 1.0;                        // Range [0:1]
}

// Pseudo-random value in half-open range [0:1].
float random( float x ) { return floatConstruct(hash(floatBitsToUint(x))); }
float random( vec2  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
float random( vec3  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
float random( vec4  v ) { return floatConstruct(hash(floatBitsToUint(v))); }


/////////////////// Gradient_Noise ////////////////////

/*
 * Linear Interpolation
 */
float lin(float a0, float a1, float w){
    if (0.0 > w) return a0;
    if (1.0 < w) return a1;
    return (a1 - a0) * w + a0;
}

/*
 * cubic Interpolation
 */
float cubic(float a0, float a1, float w){
    if (0.0 > w) return a0;
    if (1.0 < w) return a1;
    return (a1 - a0) * (3.0 - w * 2.0) * w * w + a0;
}

/*
 * superSmooth Interpolation
 */
float superSmooth(float a0, float a1, float w){
    if (0.0 > w) return a0;
    if (1.0 < w) return a1;
    return (a1 - a0) * ((w * (w * 6.0 - 15.0) + 10.0) * w * w * w) + a0;
}

// This is basically perlin noise
float gradient_noise( in vec2 x )
{
    vec2 i = floor( x );

    // Here we compute the weights
    // There are many different kinds you could do
    vec2 f = fract( x );
    vec2 u = f;
    //vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    
    //Grid Nodes
    vec2 ia = i + vec2(0.0,0.0);
    vec2 ib = i + vec2(1.0,0.0);
    vec2 ic = i + vec2(0.0,1.0);
    vec2 id = i + vec2(1.0,1.0);

    // While we need the grid nodes to make sure the we get the same random 
    // vector in if two points share a border in their box. We don't want any
    // self similarity. It needs to be broken.
    float a_break = random(ia);
    float b_break = random(ib);
    float c_break = random(ic);
    float d_break = random(id);

    // The  -1 is because random(..) produces numbers between 0-1
    vec2 ga = normalize(vec2(random(ia.x + a_break) - 1.0, random(ia.y + a_break) - 1.0));
    vec2 gb = normalize(vec2(random(ib.x + b_break) - 1.0, random(ib.y + b_break) - 1.0));
    vec2 gc = normalize(vec2(random(ic.x + c_break) - 1.0, random(ic.y + c_break) - 1.0));
    vec2 gd = normalize(vec2(random(id.x + d_break) - 1.0, random(id.y + d_break) - 1.0));
    
    float va = dot( ga, f - vec2(0.0,0.0) );
    float vb = dot( gb, f - vec2(1.0,0.0) );
    float vc = dot( gc, f - vec2(0.0,1.0) );
    float vd = dot( gd, f - vec2(1.0,1.0) );

    float ix0;
    float ix1;
    float res;

    if (u_interpolation_choice < 1.0){
        ix0 = lin(va, vb, u.x);
        ix1 = lin(vc, vd, u.x);
        res = lin(ix0, ix1, u.y);
    } else if (u_interpolation_choice < 2.0){
        ix0 = cubic(va, vb, u.x);
        ix1 = cubic(vc, vd, u.x);
        res = cubic(ix0, ix1, u.y);
    } else {
        ix0 = superSmooth(va, vb, u.x);
        ix1 = superSmooth(vc, vd, u.x);
        res = superSmooth(ix0, ix1, u.y);
    }



    // Must be normalized between 0-1!
    // I've computed the function to be globally bound between
    // -sqrt(2)/2 and sqrt(2)/2
    return abs(res)/ (sqrt(2.0)/2.0);
}

// Fractional Brownian Motion
// By stacking perlin/gradient noise on top of each other
// with samller and smaller wavelength and lower amplitude you get fantastic
// textures.
float fbm( in vec2 x, in float H )
{    
    float G = exp2(-H);
    float f = 1.0;
    float a = 1.0;
    float t = 0.0;
    for( int i=0; i<u_numOctaves; i++ )
    {
        t += a*gradient_noise(f*x);
        f *= 2.0;
        a *= G;
    }
    return t;
}

// Again, by stacking the fbm on top of each other we get more intersting details.
float pattern( in vec2 p, out vec2 q, out vec2 r )
{
	float time = u_time / 500;

    // We add vectors provided by the CPU so as to make each image more unique
    q.x = fbm( p + u_q_fbm_displace_1 * time, u_q_h.x );
    q.y = fbm( p + u_q_fbm_displace_2 * time, u_q_h.y );

    r.x = fbm( p + 4.0*q + u_r_fbm_displace_1 * time, u_r_h.x );
    r.y = fbm( p + 4.0*q + u_r_fbm_displace_2 * time, u_r_h.y );

    return fbm( p + 4.0*r, u_pattern_h );
}

vec3 cos_color(in float f, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
    return a + b * cos(f * c + d);
}

float vertical_component(in vec2 v) {
    return atan(v.y / v.x) * length(v);
}

float manhattan_distance(in vec2 v1, in vec2 v2){
    vec2 tmp = abs(v1 - v2);
    return tmp.x + tmp.y;
}

void main() {
    // The point to send to pattern
    // now all points are between 0-1 ... I need a larger scope 0-10
    vec2 p = (gl_FragCoord.xy / u_resolution) * u_zoom; //* zoom;


    //Generate nice noise
    vec2 q = vec2( 0.0, 0.0);

    vec2 r = vec2( 0.0, 0.0);

    float noise = pattern(p, q, r);


    // Ensures the output is between 0-1
    vec3 aa = vec3(0.5);
    vec3 bb = vec3(0.5);

    // The default is that no extra is added
    float pixel_dist = 0.0;

    if (u_pixel_distance_choice < 0.05) {
        pixel_dist = p.x * u_color_speed;
    } else if (u_pixel_distance_choice < 0.1) {
        pixel_dist = p.y * u_color_speed;
    } else if (u_pixel_distance_choice < 0.15) {
        pixel_dist = length(u_center_point * u_zoom - p) * u_color_speed;
    } else if (u_pixel_distance_choice < 0.3) {
        pixel_dist = dot(p, q);
    } else if (u_pixel_distance_choice < 0.4) {
        pixel_dist = dot(q, r) / (length(q) * length(r));
    } else if (u_pixel_distance_choice < 0.5) {
        pixel_dist = dot(p, r) / (length(p) * length(r));
    } else if (u_pixel_distance_choice < 0.55) {
        pixel_dist = manhattan_distance(u_center_point * u_zoom, p) * u_color_speed;
    } else {
        pixel_dist = 0.0;
    }

    vec3 palette = cos_color(noise + pixel_dist, aa, bb, u_cc, u_dd);

    fragColor = vec4(palette, 1.0 );
}
