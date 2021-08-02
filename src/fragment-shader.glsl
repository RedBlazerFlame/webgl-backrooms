precision mediump float;

varying vec3 fragColor;
uniform float useTexture;
varying vec2 fragTexCoords;
uniform sampler2D backroomsTextureSampler;
varying vec4 vectorCoordinates;
vec4 color;
float dis;
float disFromLightSource;
float originalLuminance;
float targetLuminance;
uniform vec3 fadeColor;
float fadeAmount;
float brightness;
const vec3 lightSource = vec3(0.0, 4.0, 0.0);

vec3 multiplyByScalar(vec3 vector, float scalar) {
    return vec3(vector.x * scalar, vector.y * scalar, vector.z * scalar);
}

vec3 stylizeColor(vec3 color, float level) {
    return multiplyByScalar(floor(multiplyByScalar(color, level)), 1.0 / level);
}

float luminance(vec3 color) {
    return 0.2125 * color.x + 0.7154 * color.y + 0.0721 * color.z;
}

vec3 stylizeLuminance(vec3 color, float level) {
    originalLuminance = luminance(color);
    targetLuminance = floor(originalLuminance * level) / level;

    return multiplyByScalar(color, targetLuminance / originalLuminance);
}

void main() {
    if(useTexture >= 0.5) {
        color = texture2D(backroomsTextureSampler, fragTexCoords);
    } else {
        color = vec4(fragColor, 1.0);
    }

    dis = distance(vectorCoordinates, vec4(0.0, 0.0, 0.0, 1.0));
    disFromLightSource = distance(vectorCoordinates, vec4(lightSource, 1.0));

    fadeAmount = max(1.0 - dis / 84.0, 0.0);
    brightness = max(1.0 - disFromLightSource / 32.0, 0.1);

    gl_FragColor = vec4((vec3(color.x, color.y, color.z) * fadeAmount + (1.0 - fadeAmount) * fadeColor) * brightness + vec3(0.0, 0.0, 0.0) * (1.0 - brightness) , 1.0);
}