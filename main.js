// main.js - Off-Road Jeep Adventure

var gl;
var shaderProgram;

var grassTexture;
var metalTexture;
var dustTexture;

var projectionMatrix = mat4.create();
var modelViewMatrix = mat4.create();
var normalMatrix = mat4.create();
var modelMatrix = mat4.create(); // New: Keeps track of where objects are in the world

// Car State
var jeepX = 0; var jeepZ = -10; var jeepAngle = 0;
var frontWheelAngle = 0; var wheelRotation = 0;
var speed = 0; var turnSpeed = 0;

// Camera
var cameraDistance = 15; var cameraHeight = 6;
var currentCameraHeight = 6;
var currentlyPressedKeys = {};

// Particles
var particles = [];

// Base64 Textures (To ensure they load without internet/server)
const grassSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const metalSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
const dustSrc  = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/8/QAQAJAQP/O/4KjQAAAABJRU5ErkJggg=="; // Slightly orange pixel

// --- VERTEX SHADER ---
const vsSource = `
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec2 aTextureCoord;

    uniform mat4 uModelViewMatrix; // For Camera
    uniform mat4 uProjectionMatrix; // For Screen
    uniform mat4 uModelMatrix;      // For World Position (New!)
    uniform mat4 uNormalMatrix;

    varying vec2 vTextureCoord;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition; // We pass world pos to fragment shader

    void main(void) {
        // Calculate screen position
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
        
        // Pass texture coords
        vTextureCoord = aTextureCoord;

        // Calculate World Position (Crucial for correct lighting!)
        vWorldPosition = (uModelMatrix * vec4(aVertexPosition, 1.0)).xyz;
        
        // Calculate World Normal
        vWorldNormal = normalize((uModelMatrix * vec4(aVertexNormal, 0.0)).xyz);
    }
`;

// --- FRAGMENT SHADER (High Beams Logic) ---
const fsSource = `
    precision mediump float;
    
    varying vec2 vTextureCoord;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    uniform sampler2D uSampler;
    uniform vec4 uColorOverride;
    uniform vec3 uAmbientColor;

    // Headlights
    uniform vec3 uHeadlightPos;
    uniform vec3 uHeadlightDir; // Direction the jeep is facing

    void main(void) {
        vec4 texColor = texture2D(uSampler, vTextureCoord);
        vec4 finalColor;
        
        if(uColorOverride.a > 0.0) {
             finalColor = uColorOverride;
        } else {
             finalColor = texColor;
        }

        // --- SPOTLIGHT CALCULATION (High Beams) ---
        
        // 1. Vector from Light to this Pixel
        vec3 lightToPixel = normalize(vWorldPosition - uHeadlightPos);
        
        // 2. Check alignment with Jeep direction (Dot Product)
        // If result is close to 1.0, the pixel is directly in front of the jeep
        float spotFactor = dot(lightToPixel, normalize(uHeadlightDir));
        
        // 3. Define the Cone (0.85 = wide beam, 0.95 = tight beam)
        float inLight = 0.0;
        if (spotFactor > 0.85) { 
            inLight = 1.0; 
        }

        // 4. Brightness (Distance)
        // We reduce attenuation so the light travels "till the end"
        float dist = distance(uHeadlightPos, vWorldPosition);
        float brightness = 150.0 / (dist * dist + 10.0); // Powerful beam
        
        // Clamp brightness so the road isn't white-washed
        brightness = min(brightness, 1.5);

        // Combine: Ambient + (Spotlight * Brightness)
        vec3 lighting = uAmbientColor + (vec3(1.0, 0.9, 0.7) * inLight * brightness);

        gl_FragColor = vec4(finalColor.rgb * lighting, finalColor.a);
    }
`;

window.onload = function() {
    var canvas = document.getElementById('glCanvas');
    gl = canvas.getContext('webgl');
    if (!gl) { alert("No WebGL"); return; }

    resizeCanvas();
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Night Mode
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    initShaders();
    initBuffers();

    // Load textures
    grassTexture = loadTexture(gl, grassSrc, [20, 100, 20, 255]);
    metalTexture = loadTexture(gl, metalSrc, [100, 100, 100, 255]);
    dustTexture  = loadTexture(gl, dustSrc,  [180, 140, 80, 255]); // Bright dust color

    document.onkeydown = (e) => currentlyPressedKeys[e.key] = true;
    document.onkeyup = (e) => currentlyPressedKeys[e.key] = false;

    requestAnimationFrame(render);
};

function resizeCanvas() {
    var canvas = document.getElementById('glCanvas');
    if (canvas.width != window.innerWidth || canvas.height != window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

function handleKeys() {
    if (currentlyPressedKeys["w"] || currentlyPressedKeys["W"]) speed = 0.3;
    else if (currentlyPressedKeys["s"] || currentlyPressedKeys["S"]) speed = -0.15;
    else speed = 0;

    if (currentlyPressedKeys["a"] || currentlyPressedKeys["A"]) {
        turnSpeed = 0.05; frontWheelAngle = 0.5;
    } else if (currentlyPressedKeys["d"] || currentlyPressedKeys["D"]) {
        turnSpeed = -0.05; frontWheelAngle = -0.5;
    } else {
        turnSpeed = 0; frontWheelAngle = 0;
    }
}

// Updated drawObject to accept ModelMatrix
function drawObject(buffer, normBuffer, texBuffer, indexBuffer, numItems, texture, scale, colorOverride, objectWorldMatrix) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, buffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, normBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, texBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // 1. Send WORLD Matrix (Where the object actually is)
    gl.uniformMatrix4fv(shaderProgram.mMatrixUniform, false, objectWorldMatrix);

    // 2. Send MODEL-VIEW Matrix (Where the object is relative to camera)
    var mvMatrix = mat4.create();
    mat4.multiply(mvMatrix, modelViewMatrix, objectWorldMatrix);
    mat4.scale(mvMatrix, mvMatrix, scale); // Apply scale locally
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    // 3. Normal Matrix
    var nMatrix = mat4.create();
    mat4.invert(nMatrix, objectWorldMatrix); // Use World matrix for normals
    mat4.transpose(nMatrix, nMatrix);
    gl.uniformMatrix4fv(shaderProgram.nMatrixUniform, false, nMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    if(colorOverride) gl.uniform4fv(shaderProgram.colorOverrideUniform, colorOverride);
    else gl.uniform4fv(shaderProgram.colorOverrideUniform, [0,0,0,0]);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, numItems, gl.UNSIGNED_SHORT, 0);
}

function render() {
    resizeCanvas();
    handleKeys();

    jeepAngle += turnSpeed;
    jeepX -= Math.sin(jeepAngle) * speed;
    jeepZ -= Math.cos(jeepAngle) * speed;
    var currentHeight = 0;
    if (typeof getTerrainHeight === "function") currentHeight = getTerrainHeight(jeepX, jeepZ);
    currentCameraHeight += (currentHeight * 0.3 - currentCameraHeight) * 0.1;
    if(speed !== 0) wheelRotation += speed * 10;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.perspective(projectionMatrix, 45 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 0.1, 400.0);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, projectionMatrix);

    // --- LIGHTING ---
    // Ambient (Darkness)
    gl.uniform3f(shaderProgram.ambientColorUniform, 0.1, 0.1, 0.15);

    // Headlight Position (World Space)
    gl.uniform3f(shaderProgram.headlightPosUniform, jeepX, currentHeight + 2.0, jeepZ);

    // Headlight Direction (World Space - Facing Forward)
    // -sin(angle) and -cos(angle) is forward for our math
    gl.uniform3f(shaderProgram.headlightDirUniform, -Math.sin(jeepAngle), -0.2, -Math.cos(jeepAngle));

    // --- CAMERA ---
    mat4.identity(modelViewMatrix); // Reset view
    var cameraY = -cameraHeight + currentCameraHeight;
    mat4.translate(modelViewMatrix, modelViewMatrix, [0, cameraY, -cameraDistance]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, 0.3, [1, 0, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, -jeepAngle, [0, 1, 0]);
    mat4.translate(modelViewMatrix, modelViewMatrix, [-jeepX, -currentHeight, -jeepZ]);

    // --- DRAW WORLD (Terrain & Path) ---
    // Identity matrix for terrain (it doesn't move, the camera moves around it)
    var worldMat = mat4.create();

    // 1. Grass
    drawObject(terrainBuffer, terrainNormalBuffer, terrainTextureBuffer, terrainIndexBuffer, terrainBuffer.numItems, grassTexture, [1,1,1], null, worldMat);

    // 2. Dusty Path (The Road)
    // Draw it slightly higher (y + 0.05) to prevent flickering (z-fighting)
    var pathMat = mat4.create();
    mat4.translate(pathMat, pathMat, [0, 0.05, 0]);
    drawObject(pathBuffer, pathNormalBuffer, pathTextureBuffer, pathIndexBuffer, pathBuffer.numItems, dustTexture, [1,1,1], null, pathMat);

    // --- DRAW JEEP ---
    // Jeep Matrix (World Space)
    var jeepMat = mat4.create();
    mat4.translate(jeepMat, jeepMat, [jeepX, currentHeight, jeepZ]);
    mat4.rotate(jeepMat, jeepMat, jeepAngle, [0, 1, 0]);

    // Body
    drawObject(cubeBuffer, cubeNormalBuffer, cubeTextureBuffer, cubeIndexBuffer, 36, metalTexture, [1.5, 0.7, 2.5], [0.4, 0.5, 0.6, 1.0], jeepMat);

    // Lamps (Yellow)
    var lampMat = mat4.clone(jeepMat); mat4.translate(lampMat, lampMat, [-0.8, 0.0, -2.4]); // Front Left
    drawObject(cubeBuffer, cubeNormalBuffer, cubeTextureBuffer, cubeIndexBuffer, 36, metalTexture, [0.2, 0.2, 0.1], [1.0, 1.0, 0.5, 1.0], lampMat);

    lampMat = mat4.clone(jeepMat); mat4.translate(lampMat, lampMat, [0.8, 0.0, -2.4]); // Front Right
    drawObject(cubeBuffer, cubeNormalBuffer, cubeTextureBuffer, cubeIndexBuffer, 36, metalTexture, [0.2, 0.2, 0.1], [1.0, 1.0, 0.5, 1.0], lampMat);

    // Wheels
    var wY = -0.5;
    // FL
    var wMat = mat4.clone(jeepMat); mat4.translate(wMat, wMat, [-1.5, wY, 1.5]);
    mat4.rotate(wMat, wMat, frontWheelAngle, [0, 1, 0]); mat4.rotate(wMat, wMat, wheelRotation, [1, 0, 0]);
    drawObject(cubeBuffer, cubeNormalBuffer, cubeTextureBuffer, cubeIndexBuffer, 36, metalTexture, [0.4, 0.4, 0.4], [0.2, 0.2, 0.2, 1.0], wMat);
    // FR
    wMat = mat4.clone(jeepMat); mat4.translate(wMat, wMat, [1.5, wY, 1.5]);
    mat4.rotate(wMat, wMat, frontWheelAngle, [0, 1, 0]); mat4.rotate(wMat, wMat, wheelRotation, [1, 0, 0]);
    drawObject(cubeBuffer, cubeNormalBuffer, cubeTextureBuffer, cubeIndexBuffer, 36, metalTexture, [0.4, 0.4, 0.4], [0.2, 0.2, 0.2, 1.0], wMat);
    // BL
    wMat = mat4.clone(jeepMat); mat4.translate(wMat, wMat, [-1.5, wY, -1.5]);
    mat4.rotate(wMat, wMat, wheelRotation, [1, 0, 0]);
    drawObject(cubeBuffer, cubeNormalBuffer, cubeTextureBuffer, cubeIndexBuffer, 36, metalTexture, [0.4, 0.4, 0.4], [0.2, 0.2, 0.2, 1.0], wMat);
    // BR
    wMat = mat4.clone(jeepMat); mat4.translate(wMat, wMat, [1.5, wY, -1.5]);
    mat4.rotate(wMat, wMat, wheelRotation, [1, 0, 0]);
    drawObject(cubeBuffer, cubeNormalBuffer, cubeTextureBuffer, cubeIndexBuffer, 36, metalTexture, [0.4, 0.4, 0.4], [0.2, 0.2, 0.2, 1.0], wMat);

    requestAnimationFrame(render);
}