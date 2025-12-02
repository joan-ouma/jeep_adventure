var gl;
var shaderProgram;

// Buffers
var cubeBuffer;
var cubeIndexBuffer;

// Matrices
var projectionMatrix = mat4.create();
var modelViewMatrix = mat4.create();

// State variables (The Jeep's position and rotation)
var jeepX = 0;
var jeepZ = -10; // Start further back
var jeepAngle = 0;
var frontWheelAngle = 0; //Variable for steering the front wheels
var wheelRotation = 0;
var speed = 0;
var turnSpeed = 0;

// Key states
var currentlyPressedKeys = {};

// Using uniform color so we can paint wheels black and body green easily
const vsSource = `
    attribute vec3 aVertexPosition;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
    }
`;

// Shader Code (Fragment Shader)- takes uniform colour
const fsSource = `
    precision mediump float;
    uniform vec4 uColor;
    
    void main(void) {
        gl_FragColor = uColor;
    }
`;

window.onload = function() {
    var canvas = document.getElementById('glCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl = canvas.getContext('webgl');

    if (!gl) { alert('No WebGL'); return; }

    gl.clearColor(0.2, 0.2, 0.2, 1.0); // Dark gray background (road-ish)
    gl.enable(gl.DEPTH_TEST);

    initShaders();
    initBuffers();

    // Event Listeners for Keyboard
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    requestAnimationFrame(render);
};

function handleKeyDown(event) {
    currentlyPressedKeys[event.key] = true;
}

function handleKeyUp(event) {
    currentlyPressedKeys[event.key] = false;
}

function handleKeys() {
    // W - Forward
    if (currentlyPressedKeys["w"] || currentlyPressedKeys["W"]) {
        speed = 0.1;
    } else if (currentlyPressedKeys["s"] || currentlyPressedKeys["S"]) {
        speed = -0.1;
    } else {
        speed = 0;
    }

    // A/D - Turn clockwise and anticlockwise respectively
    if (currentlyPressedKeys["a"] || currentlyPressedKeys["A"]) {
        turnSpeed = 0.05;
        frontWheelAngle = 0.5; // Turn wheels left (approx 30 degrees)
    } else if (currentlyPressedKeys["d"] || currentlyPressedKeys["D"]) {
        turnSpeed = -0.05;
        frontWheelAngle = -0.5; // Turn wheels right
    } else {
        turnSpeed = 0;
        frontWheelAngle = 0; // Straighten wheels if not turning
    }
}

function initShaders() {
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Shader error: ' + gl.getProgramInfoLog(shaderProgram));
        return;
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "uColor");
}

function loadShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initBuffers() {
    cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);

    // Standard 1x1x1 Cube
    var vertices = [
        // Front face
        -1.0, -1.0,  1.0,
        1.0, -1.0,  1.0,
        1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        // Back face
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
        1.0,  1.0, -1.0,
        1.0, -1.0, -1.0,
        // Top face
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
        1.0,  1.0,  1.0,
        1.0,  1.0, -1.0,
        // Bottom face
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,
        // Right face
        1.0, -1.0, -1.0,
        1.0,  1.0, -1.0,
        1.0,  1.0,  1.0,
        1.0, -1.0,  1.0,
        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeBuffer.itemSize = 3;
    cubeBuffer.numItems = 24;

    cubeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    var cubeVertexIndices = [
        0, 1, 2,      0, 2, 3,    // Front
        4, 5, 6,      4, 6, 7,    // Back
        8, 9, 10,     8, 10, 11,  // Top
        12, 13, 14,   12, 14, 15, // Bottom
        16, 17, 18,   16, 18, 19, // Right
        20, 21, 22,   20, 22, 23  // Left
    ];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
}

//Draws a scaled cube at the current matrix location
function drawCube(matrix, color, scale) {
    // 1. Send Matrix
    var mvMatrix = mat4.clone(matrix);
    mat4.scale(mvMatrix, mvMatrix, scale); // Scale it (make wheels small, body big)

    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    // 2. Send Color
    gl.uniform4fv(shaderProgram.colorUniform, color);

    // 3. Draw
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

function render() {
    handleKeys();

    // Update Physics
    jeepAngle += turnSpeed;
    // Calculate new X/Z based on angle (Basic Trigonometry)
    jeepX -= Math.sin(jeepAngle) * speed;
    jeepZ -= Math.cos(jeepAngle) * speed;

    if(speed !== 0) {
        wheelRotation += speed * 10; // Wheels spin faster than car moves
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Setup Camera (Perspective)
    mat4.perspective(projectionMatrix, 45 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, projectionMatrix);

    // --- SCENE GRAPH START ---

    // 1. World View (Camera) - Move the whole world opposite to the jeep to follow it (Chase Cam Basic)
    //Camera fixed high up so we can see the driving
    mat4.identity(modelViewMatrix);
    mat4.translate(modelViewMatrix, modelViewMatrix, [0, -5, -20]); // Move camera up and back
    mat4.rotate(modelViewMatrix, modelViewMatrix, 0.3, [1, 0, 0]); // Tilt down slightly

    // 2. Draw The Jeep (Parent)
    // We move the matrix to where the jeep is
    var jeepMatrix = mat4.clone(modelViewMatrix);
    mat4.translate(jeepMatrix, jeepMatrix, [jeepX, 0, jeepZ]);
    mat4.rotate(jeepMatrix, jeepMatrix, jeepAngle, [0, 1, 0]); // Rotate the jeep body

    // Draw Body
    // Scale: 1.5 wide, 1.0 high, 2.5 long
    drawCube(jeepMatrix, [0.0, 0.5, 0.0, 1.0], [1.5, 0.8, 2.5]); // Green Body

    // 3. Draw Wheels (Children)
    // We use the jeepMatrix as the base, so wheels move WITH the jeep
    // Front Left Wheel (Steering included)
    var wheelMatrix = mat4.clone(jeepMatrix);
    mat4.translate(wheelMatrix, wheelMatrix, [-1.5, -0.5, 1.5]);
    mat4.rotate(wheelMatrix, wheelMatrix, frontWheelAngle, [0, 1, 0]); // <--- STEER (Y-axis)
    mat4.rotate(wheelMatrix, wheelMatrix, wheelRotation, [1, 0, 0]);   // <--- SPIN (X-axis)
    drawCube(wheelMatrix, [0.1, 0.1, 0.1, 1.0], [0.4, 0.4, 0.4]);


    // Front Right Wheel (Steering included)
    wheelMatrix = mat4.clone(jeepMatrix);
    mat4.translate(wheelMatrix, wheelMatrix, [1.5, -0.5, 1.5]);
    mat4.rotate(wheelMatrix, wheelMatrix, frontWheelAngle, [0, 1, 0]); // <--- STEER (Y-axis)
    mat4.rotate(wheelMatrix, wheelMatrix, wheelRotation, [1, 0, 0]);   // <--- SPIN (X-axis)
    drawCube(wheelMatrix, [0.1, 0.1, 0.1, 1.0], [0.4, 0.4, 0.4]);

    // Back Left
    wheelMatrix = mat4.clone(jeepMatrix);
    mat4.translate(wheelMatrix, wheelMatrix, [-1.5, -0.5, -1.5]);
    mat4.rotate(wheelMatrix, wheelMatrix, wheelRotation, [1, 0, 0]);
    drawCube(wheelMatrix, [0.1, 0.1, 0.1, 1.0], [0.4, 0.4, 0.4]);

    // Back Right
    wheelMatrix = mat4.clone(jeepMatrix);
    mat4.translate(wheelMatrix, wheelMatrix, [1.5, -0.5, -1.5]);
    mat4.rotate(wheelMatrix, wheelMatrix, wheelRotation, [1, 0, 0]);
    drawCube(wheelMatrix, [0.1, 0.1, 0.1, 1.0], [0.4, 0.4, 0.4]);

    requestAnimationFrame(render);
}