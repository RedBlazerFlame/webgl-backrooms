precision mediump float;

attribute vec3 vectorPosition;
attribute vec3 vectorColor;
attribute vec2 vertTexCoords;
varying vec3 fragColor;
varying vec2 fragTexCoords;
// uniform float useTexture;
uniform mat4 worldMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
varying vec4 vectorCoordinates;

void main() {
    fragColor = vectorColor;
    fragTexCoords = vertTexCoords;
    vectorCoordinates = projectionMatrix * viewMatrix * worldMatrix * vec4(vectorPosition, 1.0);
    gl_Position = vectorCoordinates;
}