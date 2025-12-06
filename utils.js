// utils.js

function initShaders() {
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Shader Error"); return;
    }
    gl.useProgram(shaderProgram);

    // Attributes
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, 'aVertexNormal');
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    // Uniforms
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");

    // NEW: World Matrix Uniform
    shaderProgram.mMatrixUniform  = gl.getUniformLocation(shaderProgram, "uModelMatrix");

    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNormalMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
    shaderProgram.colorOverrideUniform = gl.getUniformLocation(shaderProgram, "uColorOverride");

    // Headlight Uniforms (Spotlight)
    shaderProgram.headlightPosUniform = gl.getUniformLocation(shaderProgram, "uHeadlightPos");
    shaderProgram.headlightDirUniform = gl.getUniformLocation(shaderProgram, "uHeadlightDir");
}

function loadShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { console.log(gl.getShaderInfoLog(shader)); return null; }
    return shader;
}

function loadTexture(gl, url, color) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(color));
    var image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if ((image.width & (image.width - 1)) == 0) { gl.generateMipmap(gl.TEXTURE_2D); }
        else { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); }
    };
    image.src = url;
    return texture;
}