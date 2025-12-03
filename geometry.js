// geometry.js - Shape Definitions (Stable Version)

// Buffers
var cubeBuffer;
var cubeIndexBuffer;
var terrainBuffer;
var terrainIndexBuffer;

// Helper to calculate height at any X,Z
// This is the "Rolling Hills" math that worked smoothly
function getTerrainHeight(x, z) {
    var y = Math.sin(x * 0.1) * 2.0 + Math.cos(z * 0.1) * 2.0;

    // Flatten area near start so jeep sits nicely
    if(Math.abs(x) < 5 && Math.abs(z) < 15) {
        y *= 0.2;
    }
    return y;
}

function initBuffers() {
    // 1. CUBE (Jeep Body & Wheels)
    cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    var vertices = [
        -1, -1, 1,  1, -1, 1,  1, 1, 1,  -1, 1, 1, // Front
        -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1, // Back
        -1, 1, -1, -1, 1, 1,  1, 1, 1,  1, 1, -1, // Top
        -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, // Bottom
        1, -1, -1, 1, 1, -1, 1, 1, 1,  1, -1, 1, // Right
        -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1 // Left
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeBuffer.itemSize = 3; cubeBuffer.numItems = 24;

    cubeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    var indices = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11, 12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    cubeBuffer.numItems = 36;

    // 2. TERRAIN (The Hills)
    terrainBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, terrainBuffer);

    var terrainVertices = [];
    var size = 60; // Standard size (Stable)
    var step = 1;  // Standard detail

    for (var x = -size; x <= size; x += step) {
        for (var z = -size; z <= size; z += step) {
            var y = getTerrainHeight(x, z);
            terrainVertices.push(x, y - 2.5, z); // Shift down slightly
        }
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(terrainVertices), gl.STATIC_DRAW);
    terrainBuffer.itemSize = 3;

    terrainIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIndexBuffer);

    var terrainIndices = [];
    var rows = (size * 2) / step + 1;
    var cols = (size * 2) / step + 1;

    for (var i = 0; i < rows - 1; i++) {
        for (var j = 0; j < cols - 1; j++) {
            var topLeft = i * cols + j;
            var topRight = topLeft + 1;
            var bottomLeft = (i + 1) * cols + j;
            var bottomRight = bottomLeft + 1;

            terrainIndices.push(topLeft, bottomLeft, topRight);
            terrainIndices.push(topRight, bottomLeft, bottomRight);
        }
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(terrainIndices), gl.STATIC_DRAW);
    terrainBuffer.numItems = terrainIndices.length;
}