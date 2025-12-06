var gl;
var shaderProgram;

var grassTexture;
var metalTexture;

var projectionMatrix = mat4.create();
var modelViewMatrix = mat4.create();
var normalMatrix = mat4.create();

var jeepX = 0; var jeepZ = -10; var jeepAngle = 0;
var frontWheelAngle = 0; var wheelRotation = 0;
var speed = 0; var turnSpeed = 0;

var cameraDistance = 15; var cameraHeight = 5;
var currentlyPressedKeys = {};

const vsSource = `
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec2 aTextureCoord;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;

    uniform vec3 uAmbientColor;
    uniform vec3 uPointLightingLocation;
    uniform vec3 uPointLightingColor;

    varying vec2 vTextureCoord;
    varying vec3 vLightWeighting;

    void main(void) {
        vec4 mvPosition = uModelViewMatrix * vec4(aVertexPosition, 1.0);
        gl_Position = uProjectionMatrix * mvPosition;
        vTextureCoord = aTextureCoord;

        vec3 transformedNormal = (uNormalMatrix * vec4(aVertexNormal, 0.0)).xyz;
        float directionalLightWeighting = max(dot(transformedNormal, normalize(uPointLightingLocation - mvPosition.xyz)), 0.0);
        vLightWeighting = uAmbientColor + uPointLightingColor * directionalLightWeighting;
    }
`;

const fsSource = `
    precision mediump float;
    varying vec2 vTextureCoord;
    varying vec3 vLightWeighting;
    uniform sampler2D uSampler;

    void main(void) {
        vec4 textureColor = texture2D(uSampler, vTextureCoord);
        gl_FragColor = vec4(textureColor.rgb * vLightWeighting, textureColor.a);
    }
`;

window.onload = function() {
    var canvas = document.getElementById('glCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl = canvas.getContext('webgl');
    if (!gl) return;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    initShaders();
    initBuffers();

    grassTexture = loadTexture(gl, "grass.jpg");
    metalTexture = loadTexture(gl, "metal.jpg");

    document.onkeydown = (e) => currentlyPressedKeys[e.key] = true;
    document.onkeyup = (e) => currentlyPressedKeys[e.key] = false;

    requestAnimationFrame(render);
};

function handleKeys() {
    if (currentlyPressedKeys["w"] || currentlyPressedKeys["W"]) speed = 0.2;
    else if (currentlyPressedKeys["s"] || currentlyPressedKeys["S"]) speed = -0.1;
    else speed = 0;

    if (currentlyPressedKeys["a"] || currentlyPressedKeys["A"]) {
        turnSpeed = 0.05; frontWheelAngle = 0.5;
    } else if (currentlyPressedKeys["d"] || currentlyPressedKeys["D"]) {
        turnSpeed = -0.05; frontWheelAngle = -0.5;
    } else {
        turnSpeed = 0; frontWheelAngle = 0;
    }
}

function drawObject(buffer, normBuffer, texBuffer, indexBuffer, numItems, texture, scale) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, buffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, normBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, texBuffer.itemSize, gl.FLOAT, false, 0, 0);

    var mvMatrix = mat4.clone(modelViewMatrix);
    mat4.scale(mvMatrix, mvMatrix, scale);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    mat4.invert(normalMatrix, mvMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    gl.uniformMatrix4fv(shaderProgram.nMatrixUniform, false, normalMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, numItems, gl.UNSIGNED_SHORT, 0);
}

function render() {
    handleKeys();
    jeepAngle += turnSpeed;
    jeepX -= Math.sin(jeepAngle) * speed;
    jeepZ -= Math.cos(jeepAngle) * speed;
    var currentHeight = getTerrainHeight(jeepX, jeepZ);
    if(speed !== 0) wheelRotation += speed * 10;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.perspective(projectionMatrix, 45 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 0.1, 200.0);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, projectionMatrix);

    gl.uniform3f(shaderProgram.ambientColorUniform, 0.3, 0.3, 0.3);
    gl.uniform3f(shaderProgram.pointLightingLocationUniform, jeepX, currentHeight + 5.0, jeepZ - 5.0);
    gl.uniform3f(shaderProgram.pointLightingColorUniform, 0.8, 0.8, 0.8);

    mat4.identity(modelViewMatrix);
    mat4.translate(modelViewMatrix, modelViewMatrix, [0, -cameraHeight, -cameraDistance]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, 0.3, [1, 0, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, -jeepAngle, [0, 1, 0]);
    mat4.translate(modelViewMatrix, modelViewMatrix, [-jeepX, -currentHeight, -jeepZ]);

    var saveMatrix = mat4.clone(modelViewMatrix);
    drawObject(terrainBuffer, terrainNormalBuffer, terrainTextureBuffer, terrainIndexBuffer, terrainBuffer.numItems, grassTexture, [1,1,1]);

    modelViewMatrix = saveMatrix;
    mat4.translate(modelViewMatrix, modelViewMatrix, [jeepX, currentHeight, jeepZ]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, jeepAngle, [0, 1, 0]);

    drawObject(cubeBuffer, cubeNormalBuffer, cubeTextureBuffer, cubeIndexBuffer, 36, metalTexture, [1.5, 0.8, 2.5]);

    var wY = -0.5;
    var wMat = mat4.clone(modelViewMatrix);

    mat4.translate(modelViewMatrix, modelViewMatrix, [-1.5, wY, 1.5]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, frontWheelAngle, [0, 1, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, wheelRotation, [1, 0, 0]);
    drawObject(cubeBuffer, cubeNormalBuffer, cubeTextureBuffer, cubeIndexBuffer, 36, metalTexture, [0.4, 0.4, 0.4]);

    modelViewMatrix = wMat;
    var wMat2 = mat4.clone(modelViewMatrix);
    mat4.translate(modelViewMatrix, modelViewMatrix, [1.5, wY, 1.5]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, frontWheelAngle, [0, 1, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, wheelRotation, [1, 0, 0]);
    drawObject(cubeBuffer, cubeNormalBuffer, cubeTextureBuffer, cubeIndexBuffer, 36, metalTexture, [0.4, 0.4, 0.4]);

    modelViewMatrix = wMat2;
    var wMat3 = mat4.clone(modelViewMatrix);
    mat4.translate(modelViewMatrix, modelViewMatrix, [-1.5, wY, -1.5]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, wheelRotation, [1, 0, 0]);
    drawObject(cubeBuffer, cubeNormalBuffer, cubeTextureBuffer, cubeIndexBuffer, 36, metalTexture, [0.4, 0.4, 0.4]);

    modelViewMatrix = wMat3;
    mat4.translate(modelViewMatrix, modelViewMatrix, [1.5, wY, -1.5]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, wheelRotation, [1, 0, 0]);
    drawObject(cubeBuffer, cubeNormalBuffer, cubeTextureBuffer, cubeIndexBuffer, 36, metalTexture, [0.4, 0.4, 0.4]);

    requestAnimationFrame(render);
}