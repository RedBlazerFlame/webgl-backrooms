var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * @param  {number} repeatCount
 * @param  {T} repeatItem
 *
 * Returns an array with an item repeated repeatCount times
 */
export function repeat(repeatCount, repeatItem) {
    return [...new Array(repeatCount)].map((_) => repeatItem);
}
/**
 * @param  {number} repeatCount
 * @param  {(item:undefined,index:number)=>T} repeatItem
 * Returns an array with an item repeated repeatCount times. The item is obtained via a callback (useful for things like generating an array of different random numbers).
 */
export function repeatCallback(repeatCount, repeatItem) {
    return [...new Array(repeatCount)].map(repeatItem);
}
/**
 * @param  {string} filePath
 *
 * Fetches a file and returns it in string format
 */
export function text(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield fetch(filePath)
            .then((res) => res.text())
            .catch((e) => {
            throw e;
        });
    });
}
/**
 * @param  {string[]} filePaths
 *
 * Fetches multiple files and returns them in a string format
 */
export function textAll(...filePaths) {
    return __awaiter(this, void 0, void 0, function* () {
        let fileDataPromises = filePaths.map((path) => text(path));
        return yield Promise.all(fileDataPromises);
    });
}
/**
 * @param  {any[][]} ...arrays
 *
 * Zips multiple arrays into an array of tuples. The output length is the minimum of the lengths of all of the arrays.
 */
export function zip(...arrays) {
    let arrayLengths = arrays.map((i) => i.length);
    let resultLength = Math.min(...arrayLengths);
    let result = [];
    for (let i = 0; i < resultLength; i++) {
        result.push(arrays.map((array) => array[i]));
    }
    return result;
}
/**
 * @param  {any[][]} array
 *
 * Flattens an Array
 */
export function flattenArray(array) {
    return array.reduce((acc, cur) => [...acc, ...cur], []);
}
/**
 * @param  {number} min
 * @param  {number} val
 * @param  {number} max
 *
 * Clamps a value val to be in the range [min, max]
 */
export function clamp(min, val, max) {
    if (min > max) {
        throw new Error(`ValueError: Min (${min}) > Max (${max})`);
    }
    else {
        return Math.min(Math.max(val, min), max);
    }
}
/**
 * @param  {string} src
 *
 * Fetches an image using a URL and returns a Promise of an HTML Image Element with that URL as its source
 */
export function createImageElement(src, resizeX = -1, resizeY = -1, canvasCallback = (ctx) => { }) {
    return __awaiter(this, void 0, void 0, function* () {
        let imgElement = document.createElement("img");
        imgElement.src = src;
        return yield new Promise((resolve) => {
            imgElement.onload = () => {
                let outputCanvas = document.createElement("canvas");
                let vctx = outputCanvas.getContext("2d");
                if (resizeX > 0 && resizeY > 0) {
                    vctx.canvas.width = resizeX;
                    vctx.canvas.height = resizeY;
                    vctx.drawImage(imgElement, 0, 0, resizeX, resizeY);
                }
                else {
                    vctx.canvas.width = imgElement.width;
                    vctx.canvas.height = imgElement.height;
                    vctx.drawImage(imgElement, 0, 0);
                }
                canvasCallback(vctx);
                resolve(vctx);
            };
        });
    });
}
/**
 * @param  {WebGLRenderingContext} gl
 * @param  {[WebGLShaderstring][]} ...shaderSources
 *
 * This function applies multiple shaders to a WebGL Rendering Context
 */
function shaderSources(gl, ...shaderSources) {
    let shaderSourcesLength = shaderSources.length;
    for (let i = 0; i < shaderSourcesLength; i++) {
        gl.shaderSource(...shaderSources[i]);
    }
}
/**
 * @param  {WebGLRenderingContext} gl
 * @param  {number[]} ...types
 *
 * This function creates multiple WebGL Shaders
 */
function createShaders(gl, ...types) {
    return types.map((type) => gl.createShader(type));
}
/**
 * @param  {WebGLRenderingContext} gl
 * @param  {WebGLShader[]} ...shaders
 *
 * Compiles a List of Shaders and returns the compilation status
 */
function compileShaders(gl, ...shaders) {
    let shadersLength = shaders.length;
    for (let i = 0; i < shadersLength; i++) {
        let shader = shaders[i];
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return {
                status: "Error",
                errorMessage: gl.getShaderInfoLog(shader),
                shaderIndex: i,
            };
        }
    }
    return {
        status: "OK",
    };
}
/**
 * @param  {WebGLRenderingContext} gl
 * @param  {WebGLProgram} program
 * @param  {WebGLShader[]} ...shaders
 *
 * This function attaches multiple shaders to a WebGL Program
 */
function attachShaders(gl, program, ...shaders) {
    let shadersLength = shaders.length;
    for (let i = 0; i < shadersLength; i++) {
        let shader = shaders[i];
        gl.attachShader(program, shader);
    }
}
/**
 * @param  {WebGLRenderingContext} gl
 * @param  {number[]} data
 * @param  {number} bufferType
 * @param  {number} bufferUsage
 * @param  {32|64=32} precision
 *
 * This function allocates some data onto WebGL and returns a WebGL Buffer
 */
function allocateBuffer(gl, buffer, data, bufferType, bufferUsage, precision = "float32") {
    gl.bindBuffer(bufferType, buffer);
    gl.bufferData(bufferType, (function (data) {
        switch (precision) {
            case "float32":
                return new Float32Array(data);
            case "float64":
                return new Float64Array(data);
            case "uint16":
                return new Uint16Array(data);
        }
    })(data), bufferUsage);
}
/**
 * @param  {WebGLRenderingContext} gl
 * @param  {number} address
 * @param  {number} type
 * @param  {number=0} offset
 * @param  {number} attribLength
 * @param  {number=4} sizePerElem
 * @param  {boolean=false} isNormalized
 *
 * Enables a WebGL Attribute
 */
function enableAttribute(gl, address, type, offset = 0, attribLength, totalAttribSize, sizePerElem = 4, isNormalized = false) {
    gl.vertexAttribPointer(address, attribLength, type, isNormalized, totalAttribSize, offset * sizePerElem);
    gl.enableVertexAttribArray(address);
}
/**
 * @param  {WebGLRenderingContext} gl
 * @param  {WebGLProgram} program
 * @param  {string[]} ...attributes
 *
 * Gets the locations of Attributes
 */
function attribLocs(gl, program, ...attributes) {
    return attributes.map((attribute) => gl.getAttribLocation(program, attribute));
}
/**
 * @param  {WebGLRenderingContext} gl
 * @param  {WebGLProgram} program
 * @param  {string[]} ...uniforms
 *
 * Gets the locations of Uniforms
 */
function uniformLocs(gl, program, ...uniforms) {
    return uniforms.map((uniform) => gl.getUniformLocation(program, uniform));
}
/**
 * @param  {number} dim1
 * @param  {number} dim2
 *
 * Creates a 2D Float32Array
 */
function float32Array2d(dim1, dim2) {
    return [...Array(dim1)].map((i) => new Float32Array(dim2));
}
export const glHelper = {
    shaderSources,
    createShaders,
    compileShaders,
    attachShaders,
    allocateBuffer,
    enableAttribute,
    attribLocs,
    uniformLocs,
    float32Array2d,
};
