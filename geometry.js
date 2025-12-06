var cubeBuffer;
var cubeIndexBuffer;
var cubeNormalBuffer;
var cubeTextureBuffer;

var terrainBuffer;
var terrainIndexBuffer;
var terrainNormalBuffer;
var terrainTextureBuffer;

function getTerrainHeight(x, z) {
    var y = Math.sin(x * 0.1) * 2.0 + Math.cos(z * 0.1) * 2.0;
    if(Math.abs(x) < 5 && Math.abs(z) < 15) {
        y *= 0.2;
    }
    return y;
}

function initBuffers() {
    // Cube Position
    cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    var vertices = [
        -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
        -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
        -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
        -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
        1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
        -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeBuffer.itemSize = 3; cubeBuffer.numItems = 24;

    // Cube Normals
    cubeNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuffer);
    var normals = [
        0,  0,  1,   0,  0,  1,   0,  0,  1,   0,  0,  1,
        0,  0, -1,   0,  0, -1,   0,  0, -1,   0,  0, -1,
        0,  1,  0,   0,  1,  0,   0,  1,  0,   0,  1,  0,
        0, -1,  0,   0, -1,  0,   0, -1,  0,   0, -1,  0,
        1,  0,  0,   1,  0,  0,   1,  0,  0,   1,  0,  0,
        -1,  0,  0,  -1,  0,  0,  -1,  0,  0,  -1,  0,  0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    cubeNormalBuffer.itemSize = 3;

    // Cube Textures
    cubeTextureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTextureBuffer);
    var coords = [
        0, 0,   1, 0,   1, 1,   0, 1,
        1, 0,   1, 1,   0, 1,   0, 0,
        0, 1,   0, 0,   1, 0,   1, 1,
        1, 1,   0, 1,   0, 0,   1, 0,
        1, 0,   1, 1,   0, 1,   0, 0,
        0, 0,   1, 0,   1, 1,   0, 1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
    cubeTextureBuffer.itemSize = 2;

    cubeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    var indices = [
        0, 1, 2,      0, 2, 3,
        4, 5, 6,      4, 6, 7,
        8, 9, 10,     8, 10, 11,
        12, 13, 14,   12, 14, 15,
        16, 17, 18,   16, 18, 19,
        20, 21, 22,   20, 22, 23
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // Terrain
    terrainBuffer = gl.createBuffer();
    terrainNormalBuffer = gl.createBuffer();
    terrainTextureBuffer = gl.createBuffer();

    var tVerts = [];
    var tNorms = [];
    var tTexs = [];
    var size = 60;
    var step = 1;

    for (var x = -size; x <= size; x += step) {
        for (var z = -size; z <= size; z += step) {
            var y = getTerrainHeight(x, z);
            tVerts.push(x, y - 2.5, z);

            var hL = getTerrainHeight(x - 0.1, z);
            var hR = getTerrainHeight(x + 0.1, z);
            var hD = getTerrainHeight(x, z - 0.1);
            var hU = getTerrainHeight(x, z + 0.1);

            var normX = hL - hR;
            var normZ = hD - hU;
            var normY = 2.0;
            var len = Math.sqrt(normX*normX + normY*normY + normZ*normZ);

            tNorms.push(normX/len, normY/len, normZ/len);
            tTexs.push((x + size)/10.0, (z + size)/10.0);
        }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, terrainBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tVerts), gl.STATIC_DRAW);
    terrainBuffer.itemSize = 3;

    gl.bindBuffer(gl.ARRAY_BUFFER, terrainNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tNorms), gl.STATIC_DRAW);
    terrainNormalBuffer.itemSize = 3;

    gl.bindBuffer(gl.ARRAY_BUFFER, terrainTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tTexs), gl.STATIC_DRAW);
    terrainTextureBuffer.itemSize = 2;

    terrainIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIndexBuffer);
    var tIndices = [];
    var rows = (size * 2) / step + 1;
    var cols = (size * 2) / step + 1;

    for (var i = 0; i < rows - 1; i++) {
        for (var j = 0; j < cols - 1; j++) {
            var a = i * cols + j;
            var b = a + 1;
            var c = (i + 1) * cols + j;
            var d = c + 1;
            tIndices.push(a, c, b);
            tIndices.push(b, c, d);
        }
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tIndices), gl.STATIC_DRAW);
    terrainBuffer.numItems = tIndices.length;
}