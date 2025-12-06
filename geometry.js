// geometry.js - shapes and terrain stuff

// buffers for the cube (jeep parts)
var cubeBuffer;
var cubeIndexBuffer;
var cubeNormalBuffer;
var cubeTextureBuffer;

// terrain buffers
var terrainBuffer;
var terrainIndexBuffer;
var terrainNormalBuffer;
var terrainTextureBuffer;

// path buffer for the dusty road in the middle
var pathBuffer;
var pathIndexBuffer;
var pathNormalBuffer;
var pathTextureBuffer;

// calculate terrain height at any x,z position
// creates hills at regular intervals along the road (every ~30 units = 300m)
function getTerrainHeight(x, z) {
    var y = 0;

    // create periodic hills along the z-axis (driving direction)
    // every 30 units (300m), create a hill that goes up then down
    var hillSpacing = 30.0; // spacing between hill starts
    var normalizedZ = z + 60; // shift so we start at 0
    var hillPosition = normalizedZ % hillSpacing; // position within current hill cycle

    // create hill shape - goes up, peaks, then goes down to flat
    // hill takes up about 12 units (going up), then 12 units (going down), then flat
    var hillUpLength = 12.0;
    var hillDownLength = 12.0;

    if (hillPosition < hillUpLength) {
        // going up the hill
        var hillProgress = hillPosition / hillUpLength; // 0 to 1
        var hillHeight = Math.sin(hillProgress * Math.PI / 2.0) * 5.0; // smooth hill up to 5 units high
        y += hillHeight;
    } else if (hillPosition < hillUpLength + hillDownLength) {
        // going down the hill
        var hillProgress = (hillPosition - hillUpLength) / hillDownLength; // 0 to 1
        var hillHeight = Math.cos(hillProgress * Math.PI / 2.0) * 5.0; // smooth descent from 5 to 0
        y += hillHeight;
    } else {
        // flat terrain between hills
        y += 0;
    }

    // add some small variation on the sides (grass areas), but keep road flat
    // only add variation outside the road area
    if (Math.abs(x) > 6) {
        y += Math.sin(x * 0.12) * 0.8; // small side hills in grass areas
    }

    // make starting area completely flat so jeep starts safely
    if (z < -55) {
        y *= 0.05; // almost completely flat
    }

    return y;
}

function initBuffers() {
    // setup the cube geometry (used for jeep body, wheels, etc)

    // vertex positions
    cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    var vertices = [
        // Front face
        -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
        // Back face
        -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
        // Top face
        -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
        // Bottom face
        -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
        // Right face
        1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
        // Left face
        -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeBuffer.itemSize = 3; cubeBuffer.numItems = 24;

    // normals for lighting (which direction each face points)
    cubeNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuffer);
    var normals = [
        0,  0,  1,   0,  0,  1,   0,  0,  1,   0,  0,  1, // Front
        0,  0, -1,   0,  0, -1,   0,  0, -1,   0,  0, -1, // Back
        0,  1,  0,   0,  1,  0,   0,  1,  0,   0,  1,  0, // Top
        0, -1,  0,   0, -1,  0,   0, -1,  0,   0, -1,  0, // Bottom
        1,  0,  0,   1,  0,  0,   1,  0,  0,   1,  0,  0, // Right
        -1,  0,  0,  -1,  0,  0,  -1,  0,  0,  -1,  0,  0  // Left
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    cubeNormalBuffer.itemSize = 3;

    // texture coordinates (where to put the texture on each face)
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

    // indices - connect vertices to make triangles
    cubeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    var indices = [
        0, 1, 2,      0, 2, 3,    // Front
        4, 5, 6,      4, 6, 7,    // Back
        8, 9, 10,     8, 10, 11,  // Top
        12, 13, 14,   12, 14, 15, // Bottom
        16, 17, 18,   16, 18, 19, // Right
        20, 21, 22,   20, 22, 23  // Left
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);


    // setup the terrain (ground)
    terrainBuffer = gl.createBuffer();
    terrainNormalBuffer = gl.createBuffer();
    terrainTextureBuffer = gl.createBuffer();

    var tVerts = [];
    var tNorms = [];
    var tTexs = [];
    var size = 60; // how big the map is
    var step = 1;  // spacing between points

    // Loop through x and z to create the grid
    for (var x = -size; x <= size; x += step) {
        for (var z = -size; z <= size; z += step) {
            var y = getTerrainHeight(x, z);
            tVerts.push(x, y - 2.5, z); // shift down so flat ground is lower

            // calculate normals for lighting
            // check nearby heights to figure out the slope direction
            var hL = getTerrainHeight(x - 0.1, z);
            var hR = getTerrainHeight(x + 0.1, z);
            var hD = getTerrainHeight(x, z - 0.1);
            var hU = getTerrainHeight(x, z + 0.1);

            var normX = hL - hR;
            var normZ = hD - hU;
            var normY = 2.0; // Y is always up-ish

            // normalize the vector (make it length 1)
            var len = Math.sqrt(normX*normX + normY*normY + normZ*normZ);
            tNorms.push(normX/len, normY/len, normZ/len);

            // texture coordinates (repeat texture every 10 units)
            tTexs.push((x + size)/10.0, (z + size)/10.0);
        }
    }

    // Bind all the terrain buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, terrainBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tVerts), gl.STATIC_DRAW);
    terrainBuffer.itemSize = 3;

    gl.bindBuffer(gl.ARRAY_BUFFER, terrainNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tNorms), gl.STATIC_DRAW);
    terrainNormalBuffer.itemSize = 3;

    gl.bindBuffer(gl.ARRAY_BUFFER, terrainTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tTexs), gl.STATIC_DRAW);
    terrainTextureBuffer.itemSize = 2;

    // Connect the terrain grid triangles
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

            // make two triangles for each square in the grid
            tIndices.push(a, c, b);
            tIndices.push(b, c, d);
        }
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tIndices), gl.STATIC_DRAW);
    terrainBuffer.numItems = tIndices.length;

    // --- 3. SETUP THE DUSTY PATH (road in the middle) ---
    // create a uniform dusty road that runs down the middle (around x=0)
    // this road extends the full length and follows the terrain (including hills)
    pathBuffer = gl.createBuffer();
    pathNormalBuffer = gl.createBuffer();
    pathTextureBuffer = gl.createBuffer();

    var pVerts = [];
    var pNorms = [];
    var pTexs = [];
    var pathWidth = 10; // make road wider so it's more visible
    var pathStep = 0.5; // smaller step for smoother road

    // create path vertices - a strip down the middle
    for (var x = -pathWidth/2; x <= pathWidth/2; x += pathStep) {
        for (var z = -size; z <= size; z += pathStep) {
            var y = getTerrainHeight(x, z);
            pVerts.push(x, y - 2.5, z);

            // calculate normals same way as terrain
            var hL = getTerrainHeight(x - 0.1, z);
            var hR = getTerrainHeight(x + 0.1, z);
            var hD = getTerrainHeight(x, z - 0.1);
            var hU = getTerrainHeight(x, z + 0.1);

            var normX = hL - hR;
            var normZ = hD - hU;
            var normY = 2.0;

            var len = Math.sqrt(normX*normX + normY*normY + normZ*normZ);
            pNorms.push(normX/len, normY/len, normZ/len);

            // texture coords
            pTexs.push((x + pathWidth/2)/5.0, (z + size)/10.0);
        }
    }

    // bind path buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, pathBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pVerts), gl.STATIC_DRAW);
    pathBuffer.itemSize = 3;

    gl.bindBuffer(gl.ARRAY_BUFFER, pathNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pNorms), gl.STATIC_DRAW);
    pathNormalBuffer.itemSize = 3;

    gl.bindBuffer(gl.ARRAY_BUFFER, pathTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pTexs), gl.STATIC_DRAW);
    pathTextureBuffer.itemSize = 2;

    // path indices
    pathIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pathIndexBuffer);
    var pIndices = [];
    var pathRows = (pathWidth / pathStep) + 1;
    var pathCols = (size * 2) / pathStep + 1;

    for (var i = 0; i < pathRows - 1; i++) {
        for (var j = 0; j < pathCols - 1; j++) {
            var a = i * pathCols + j;
            var b = a + 1;
            var c = (i + 1) * pathCols + j;
            var d = c + 1;

            pIndices.push(a, c, b);
            pIndices.push(b, c, d);
        }
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(pIndices), gl.STATIC_DRAW);
    pathBuffer.numItems = pIndices.length;
}