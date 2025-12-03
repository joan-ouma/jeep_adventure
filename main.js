// main.js - Logic & Rendering (Stable Version)

var gl;
var shaderProgram;

// Matrices
var projectionMatrix = mat4.create();
var modelViewMatrix = mat4.create();

// Jeep State
var jeepX = 0;
var jeepZ = -10;
var jeepAngle = 0;
var frontWheelAngle = 0;
var wheelRotation = 0;
var speed = 0;
var turnSpeed = 0;

// Camera State
var cameraDistance = 15;
var cameraHeight = 5;

var currentlyPressedKeys = {};

// Shader Source (Simple versions for Day 3)
const vsSource = `
    attribute vec3 aVertexPosition;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying float vHeight;
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
        vHeight = aVertexPosition.y; 
    }
`;

const fsSource = `
    precision mediump float;
    uniform vec4 uColor;
    varying float vHeight;
    void main(void) {
        // Darken low valleys for fake shadow effect
        if(uColor.g > 0.4 && uColor.b < 0.2) { 
             gl_FragColor = vec4(uColor.rgb * (0.5 + vHeight * 0.2), 1.0);
        } else {
             gl_FragColor = uColor;
        }
    }
`;

window.onload = function() {
    var canvas = document.getElementById('glCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl = canvas.getContext('webgl');
    if (!gl) { alert('No WebGL'); return; }

    gl.clearColor(0.5, 0.7, 1.0, 1.0); // Sky Blue
    gl.enable(gl.DEPTH_TEST);

    initShaders(); // In utils.js
    initBuffers(); // In geometry.js

    document.onkeydown = (e) => currentlyPressedKeys[e.key] = true;
    document.onkeyup = (e) => currentlyPressedKeys[e.key] = false;

    requestAnimationFrame(render);
};

function handleKeys() {
    if (currentlyPressedKeys["w"] || currentlyPressedKeys["W"]) speed = 0.2;
    else if (currentlyPressedKeys["s"] || currentlyPressedKeys["S"]) speed = -0.1;
    else speed = 0;

    if (currentlyPressedKeys["a"] || currentlyPressedKeys["A"]) {
        turnSpeed = 0.05;
        frontWheelAngle = 0.5;
    } else if (currentlyPressedKeys["d"] || currentlyPressedKeys["D"]) {
        turnSpeed = -0.05;
        frontWheelAngle = -0.5;
    } else {
        turnSpeed = 0;
        frontWheelAngle = 0;
    }
}

function drawCube(matrix, color, scale) {
    var mvMatrix = mat4.clone(matrix);
    mat4.scale(mvMatrix, mvMatrix, scale);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    gl.uniform4fv(shaderProgram.colorUniform, color);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    gl.drawElements(gl.TRIANGLES, cubeBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function render() {
    handleKeys();

    jeepAngle += turnSpeed;
    jeepX -= Math.sin(jeepAngle) * speed;
    jeepZ -= Math.cos(jeepAngle) * speed;

    // Get height from the terrain function in geometry.js
    var currentHeight = getTerrainHeight(jeepX, jeepZ);

    if(speed !== 0) wheelRotation += speed * 10;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(projectionMatrix, 45 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 0.1, 200.0);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, projectionMatrix);

    // --- CAMERA (Chase Logic) ---
    mat4.identity(modelViewMatrix);
    mat4.translate(modelViewMatrix, modelViewMatrix, [0, -cameraHeight, -cameraDistance]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, 0.3, [1, 0, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, -jeepAngle, [0, 1, 0]);
    mat4.translate(modelViewMatrix, modelViewMatrix, [-jeepX, -currentHeight, -jeepZ]);

    // --- TERRAIN ---
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, modelViewMatrix);
    gl.uniform4fv(shaderProgram.colorUniform, [0.5, 0.4, 0.2, 1.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, terrainBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, terrainBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIndexBuffer);
    gl.drawElements(gl.TRIANGLES, terrainBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    // --- JEEP ---
    var jeepMatrix = mat4.clone(modelViewMatrix);
    mat4.translate(jeepMatrix, jeepMatrix, [jeepX, currentHeight, jeepZ]);
    mat4.rotate(jeepMatrix, jeepMatrix, jeepAngle, [0, 1, 0]);

    drawCube(jeepMatrix, [0.0, 0.5, 0.0, 1.0], [1.5, 0.8, 2.5]); // Body

    // Wheels
    var wheelY = -0.5;

    // Front Left
    var wMat = mat4.clone(jeepMatrix);
    mat4.translate(wMat, wMat, [-1.5, wheelY, 1.5]);
    mat4.rotate(wMat, wMat, frontWheelAngle, [0, 1, 0]);
    mat4.rotate(wMat, wMat, wheelRotation, [1, 0, 0]);
    drawCube(wMat, [0.1, 0.1, 0.1, 1.0], [0.4, 0.4, 0.4]);

    // Front Right
    wMat = mat4.clone(jeepMatrix);
    mat4.translate(wMat, wMat, [1.5, wheelY, 1.5]);
    mat4.rotate(wMat, wMat, frontWheelAngle, [0, 1, 0]);
    mat4.rotate(wMat, wMat, wheelRotation, [1, 0, 0]);
    drawCube(wMat, [0.1, 0.1, 0.1, 1.0], [0.4, 0.4, 0.4]);

    // Back Left
    wMat = mat4.clone(jeepMatrix);
    mat4.translate(wMat, wMat, [-1.5, wheelY, -1.5]);
    mat4.rotate(wMat, wMat, wheelRotation, [1, 0, 0]);
    drawCube(wMat, [0.1, 0.1, 0.1, 1.0], [0.4, 0.4, 0.4]);

    // Back Right
    wMat = mat4.clone(jeepMatrix);
    mat4.translate(wMat, wMat, [1.5, wheelY, -1.5]);
    mat4.rotate(wMat, wMat, wheelRotation, [1, 0, 0]);
    drawCube(wMat, [0.1, 0.1, 0.1, 1.0], [0.4, 0.4, 0.4]);

    requestAnimationFrame(render);
}