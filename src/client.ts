// Importing Libraries
import {
    clamp,
    createImageElement,
    glHelper,
    repeatCallback,
    text,
    textAll,
    zip,
} from "./client-helper.js";
import { glMatrix, mat2, mat3, mat4, vec2, vec3 } from "./gl-matrix.js";
import { MarkovChain } from "./MarkovChain.js";
import { BidirectionalPlane, Box, Plane, ReversedPlane } from "./Plane.js";

// Declaring Constants and Variables
const DEBUG = true;
const INIT_BOXES = 60;
const MAX_BOXES = 120;
const FOV = glMatrix.toRadian(80);
const BOX_RENDERING_DISTANCE = 96;
const TURN_SENSITIVITY = 0.1;
const WALKING_SPEED = 0.3;
const KEYS_TO_WATCH = [
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyQ",
    "KeyE",
    "Space",
    "ArrowRight",
    "ArrowLeft",
    "ArrowUp",
    "ArrowDown",
];
const BIOME_CHECK_DISTANCE = 32;
const STATE = {
    keyIsDown: KEYS_TO_WATCH.map((key) => {
        let obj = {};
        obj[key] = false;
        return obj;
    }).reduce((acc, cur) => ({ ...acc, ...cur }), {}),
    rotX: 0.5,
    rotY: 0.5,
    mouseDX: 0,
    mouseDY: 0,
    mouseClickX: 0,
    mouseClickY: 0,
    mouseIsDown: false,
    rotXatClick: 0.5,
    rotYatClick: 0.5,
};
type BiomeStateIdentifier = "default" | "redWalls" | "greenWalls";
const BIOMES: BiomeStateIdentifier[] = ["default", "redWalls", "greenWalls"];
const BiomeState = new MarkovChain<null, BiomeStateIdentifier>(
    new Map([
        [
            "default",
            {
                data: null,
                probabilityLogits: new Map([
                    ["default", 5000],
                    ["redWalls", 0.5],
                    ["greenWalls", 0.5],
                ]),
            },
        ],
        [
            "redWalls",
            {
                data: null,
                probabilityLogits: new Map([
                    ["greenWalls", 0.5],
                    ["default", 0.5],
                    ["redWalls", 5000],
                ]),
            },
        ],
        [
            "greenWalls",
            {
                data: null,
                probabilityLogits: new Map([
                    ["redWalls", 0.5],
                    ["default", 0.5],
                    ["greenWalls", 5000],
                ]),
            },
        ],
    ]),
    "default"
);

// Getting Reference to HTML Elements

/// Setting up Canvas
const canvas: HTMLCanvasElement = document.getElementById(
    "canvas"
) as HTMLCanvasElement;

let gl: WebGLRenderingContext = canvas.getContext("webgl");

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

/// Setting up Body Element
let bodyElement: HTMLBodyElement = document.querySelector(
    "body"
) as HTMLBodyElement;

// Declaring Functions

/// Function that delays stuff
async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

/// Executing Main Async Code
(async function main() {
    // Setting up WebGL
    if (!gl) {
        throw new Error("Your Browser does not Support WebGL");
    }

    /// Enabling Depth Test
    gl.enable(gl.DEPTH_TEST);

    /// Enabling Back Face Culling
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    /// Setting up Shaders 🕶
    const [vertexShaderSource, fragmentShaderSource] = await textAll(
        "vertex-shader.glsl",
        "fragment-shader.glsl"
    );

    const [vertexShader, fragmentShader] = glHelper.createShaders(
        gl,
        gl.VERTEX_SHADER,
        gl.FRAGMENT_SHADER
    );

    glHelper.shaderSources(
        gl,
        [vertexShader, vertexShaderSource],
        [fragmentShader, fragmentShaderSource]
    );

    const shaderCompilationStatus = glHelper.compileShaders(
        gl,
        vertexShader,
        fragmentShader
    );

    if (shaderCompilationStatus.status === "Error") {
        let errorMessage = `At shader ${shaderCompilationStatus.shaderIndex}: \n${shaderCompilationStatus.errorMessage}`;
        console.error(errorMessage);

        throw new Error(errorMessage);
    }

    const program = gl.createProgram();
    glHelper.attachShaders(gl, program, vertexShader, fragmentShader);

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        let errorMessage = gl.getProgramInfoLog(program);
        console.trace();
        throw new Error(errorMessage);
    }

    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
        let errorMessage = gl.getProgramInfoLog(program);
        console.trace();
        throw new Error(errorMessage);
    }

    // Textures

    /// Backrooms Wall
    let backroomsWallCtx = await createImageElement(
        "./backroomsWall3.jpeg",
        64,
        64
    );
    let backroomsWallTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, backroomsWallTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        backroomsWallCtx.canvas
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);

    let redRoomsWallCtx = await createImageElement("./redWall1.jpeg", 64, 64);
    let redRoomsWallTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, redRoomsWallTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        redRoomsWallCtx.canvas
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);

    let greenRoomsWallCtx = await createImageElement(
        "./greenWall2.jpeg",
        64,
        64
    );
    let greenRoomsWallTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, greenRoomsWallTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        greenRoomsWallCtx.canvas
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);

    /// Backrooms Floor
    let woodTextureCtx = await createImageElement(
        "./woodFloor1.jpeg",
        256,
        256
    );
    let woodTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, woodTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        woodTextureCtx.canvas
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);

    /// Backrooms Ceiling
    let backroomsCeilingTextureCtx = await createImageElement(
        "./tiles1.jpeg",
        256,
        256
    );
    let defaultCeilingTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, defaultCeilingTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        ((ctx) => {
            let vCanvas = document.createElement("canvas");
            let newCtx: CanvasRenderingContext2D = vCanvas.getContext(
                "2d"
            ) as CanvasRenderingContext2D;
            [newCtx.canvas.width, newCtx.canvas.height] = [
                ctx.canvas.width,
                ctx.canvas.height,
            ];
            newCtx.drawImage(ctx.canvas, 0, 0);
            newCtx.fillStyle = "rgba(200, 170, 0, 0.2)";
            newCtx.fillRect(0, 0, 256, 256);
            return newCtx.canvas;
        })(backroomsCeilingTextureCtx)
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);

    let redRoomCeilingTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, redRoomCeilingTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        backroomsCeilingTextureCtx.canvas
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // Creating Buffers
    /// Creating some Planes
    let boxes: Box<BiomeStateIdentifier>[] = [...new Array(INIT_BOXES)].map(
        (_, index) =>
            new Box(
                (() => {
                    let [alpha, d] = [0, 0];
                    let [boxX, boxZ] = [0, 0];

                    let [dx, dz] = repeatCallback(
                        2,
                        () => Math.floor(Math.random() * 5 + 2) * 4
                    );

                    while (
                        Math.pow(boxX, 2) + Math.pow(boxZ, 2) >=
                            Math.pow(BOX_RENDERING_DISTANCE, 2) ||
                        (0 >= boxX - 4 &&
                            0 <= boxX + dx + 4 &&
                            0 >= boxZ - 4 &&
                            0 <= boxZ + dz + 4)
                    ) {
                        d =
                            Math.floor(
                                (Math.random() * BOX_RENDERING_DISTANCE) / 4 + 0
                            ) * 4;
                        alpha = Math.random() * 2 * Math.PI;
                        [boxX, boxZ] = [
                            d * Math.cos(alpha),
                            d * Math.sin(alpha),
                        ];

                        [boxX, boxZ] = [boxX, boxZ].map(
                            (i) => Math.floor(i / 4) * 4
                        );
                    }
                    return {
                        origin: [boxX, 0, boxZ] as [number, number, number],
                        delta: [dx, 4, dz] as [number, number, number],
                        uvOrigin: [0, 0] as [number, number],
                        uvDelta: [
                            [dx, 4],
                            [dx, 4],
                            [dx, dz],
                            [dx, dz],
                            [4, dz],
                            [4, dz],
                        ] as [number, number][],
                        color: { r: 0, g: 0, b: 0 },
                    };
                })(),
                true,
                backroomsWallTexture,
                "default"
            )
    );
    let extraPlanes: BidirectionalPlane[] = [
        BidirectionalPlane.XZ({
            origin: [-Math.pow(2, 10), 0, -Math.pow(2, 10)],
            delta: [Math.pow(2, 11), Math.pow(2, 11)],
            color: { r: 0.8, g: 0.7, b: 0.4 },
            uvOrigin: [0, 0],
            uvDelta: [Math.pow(2, 9), Math.pow(2, 9)],
            useTexture: false,
            texture: null,
        }),
        BidirectionalPlane.XZ({
            origin: [-Math.pow(2, 10), 4, -Math.pow(2, 10)],
            delta: [Math.pow(2, 11), Math.pow(2, 11)],
            color: { r: 0.8, g: 0.7, b: 0.4 },
            uvOrigin: [0, 0],
            uvDelta: [Math.pow(2, 10), Math.pow(2, 10)],
            useTexture: true,
            texture: defaultCeilingTexture,
        }),
        ...new Box({
            color: { r: 0, g: 0, b: 0 },
            origin: [-96, -1, -96],
            delta: [192, 6, 192],
        }).planeArray,
    ];
    let planeArray: BidirectionalPlane[] = [
        // ...[...new Array(10)].map((_, index) =>
        //     BidirectionalPlane.XY({
        //         origin: [0, 0, index * 8],
        //         delta: [4, 4],
        //         color: { r: index * 0.1, g: index * 0.1, b: index * 0.1 },
        //         uvOrigin: [0, 0],
        //         uvDelta: [4, 4],
        //         useTexture: index % 2 == 0 ? true : false,
        //         texture: backroomsWallTexture,
        //     })
        // ),
        // BidirectionalPlane.XZ({
        //     origin: [
        //         -Number.MAX_SAFE_INTEGER / 1024,
        //         0,
        //         -Number.MAX_SAFE_INTEGER / 1024,
        //     ],
        //     delta: [
        //         Number.MAX_SAFE_INTEGER / 512,
        //         Number.MAX_SAFE_INTEGER / 512,
        //     ],
        //     color: { r: 0, g: 0, b: 0 },
        //     uvOrigin: [0, 0],
        //     uvDelta: [
        //         Number.MAX_SAFE_INTEGER / 512,
        //         Number.MAX_SAFE_INTEGER / 512,
        //     ],
        //     useTexture: true,
        // }),
        ...boxes.map((box) => box.planeArray).flat(1),
        ...extraPlanes,
    ];
    //console.log((ReversedPlane.XY()).planeIndices())

    /// Binding all Planes into one Buffer
    let vertexData = planeArray
        .map((plane) => plane.convertVerticesToBufferData())
        .flat(1);
    let indexData = planeArray
        .map((plane, index) => plane.getIndexData(index * 4))
        .flat(1);

    let vertexBuffer = gl.createBuffer();
    glHelper.allocateBuffer(
        gl,
        vertexBuffer,
        vertexData,
        gl.ARRAY_BUFFER,
        gl.STATIC_DRAW
    );

    let indexBuffer = gl.createBuffer();
    glHelper.allocateBuffer(
        gl,
        indexBuffer,
        indexData,
        gl.ELEMENT_ARRAY_BUFFER,
        gl.STATIC_DRAW,
        "uint16"
    );

    // Attributes

    /// Vector Positon and Color
    const TOTAL_ATTRIBUTE_SIZE = 8 * Float32Array.BYTES_PER_ELEMENT;

    const [
        positionAttributeLocation,
        colorAttributeLocation,
        vertTexAttributeLocation,
    ] = glHelper.attribLocs(
        gl,
        program,
        "vectorPosition",
        "vectorColor",
        "vertTexCoords"
    );
    glHelper.enableAttribute(
        gl,
        positionAttributeLocation,
        gl.FLOAT,
        0,
        3,
        TOTAL_ATTRIBUTE_SIZE,
        Float32Array.BYTES_PER_ELEMENT,
        false
    );

    glHelper.enableAttribute(
        gl,
        colorAttributeLocation,
        gl.FLOAT,
        3,
        3,
        TOTAL_ATTRIBUTE_SIZE,
        Float32Array.BYTES_PER_ELEMENT,
        false
    );

    glHelper.enableAttribute(
        gl,
        vertTexAttributeLocation,
        gl.FLOAT,
        6,
        2,
        TOTAL_ATTRIBUTE_SIZE,
        Float32Array.BYTES_PER_ELEMENT,
        false
    );

    // Uniforms
    gl.useProgram(program);

    /// World, View, and Projection Matrices
    const [
        worldMatrixLocation,
        viewMatrixLocation,
        projMatrixLocation,
        useTextureLocation,
        fadeColorLocation,
    ] = glHelper.uniformLocs(
        gl,
        program,
        "worldMatrix",
        "viewMatrix",
        "projectionMatrix",
        "useTexture",
        "fadeColor"
    );

    const [worldMatrix, viewMatrix, projMatrix] = glHelper.float32Array2d(
        3,
        16
    );

    let fadeColor = new Float32Array([1.0, 0.8, 0.4]);

    const useTexture = 1.0;

    mat4.identity(worldMatrix);
    mat4.lookAt(viewMatrix, [0, 0, -5], [0, 0, 0], [0, 1, 0]);
    mat4.perspective(
        projMatrix,
        FOV,
        (gl.canvas as HTMLCanvasElement).clientWidth /
            (gl.canvas as HTMLCanvasElement).clientHeight,
        0.1,
        1000.0
    );

    zip(
        [worldMatrix, viewMatrix, projMatrix],
        [worldMatrixLocation, viewMatrixLocation, projMatrixLocation]
    ).map(([matrixData, matrixLocation]) =>
        gl.uniformMatrix4fv(matrixLocation, false, matrixData)
    );

    gl.uniform1f(useTextureLocation, useTexture);

    gl.uniform3fv(fadeColorLocation, fadeColor);

    // Rendering Loop

    /// Setting up the Identity function
    const identity = new Float32Array(16);
    mat4.identity(identity);

    /// Initializing World Angle
    let worldRotY = 0;
    let worldRotX = 0;

    /// Initializing View Matrix Parameters
    let camPosX = 0;
    let camPosY = 2;
    let camPosZ = 0;
    let camRotX = 0;
    let camRotY = 0;
    let jumpSpeed = 0;
    let camPosVec = new Float32Array(3);
    vec3.set(camPosVec, camPosX, camPosY, camPosZ);

    // Box Sampler
    function sampleBox(
        camPosX,
        camPosZ,
        angle,
        biomeState: BiomeStateIdentifier
    ) {
        return new Box(
            (() => {
                let d =
                    Math.floor(
                        (Math.random() * BOX_RENDERING_DISTANCE) / 16 +
                            BOX_RENDERING_DISTANCE / 4
                    ) *
                        4 -
                    8;
                let alpha = angle + Math.random() * FOV * 2 - FOV;

                let [dx, dz] = repeatCallback(
                    2,
                    () => Math.floor(Math.random() * 5 + 2) * 4
                );

                let [boxX, boxZ] = [
                    d * Math.cos(alpha) + camPosX - dx / 2,
                    d * Math.sin(alpha) + camPosZ - dz / 2,
                ];

                [boxX, boxZ] = [boxX, boxZ].map((i) => Math.floor(i / 4) * 4);
                return {
                    origin: [boxX, 0, boxZ] as [number, number, number],
                    delta: [dx, 4, dz] as [number, number, number],
                    uvOrigin: [0, 0] as [number, number],
                    uvDelta: (function (biomeState) {
                        switch (biomeState) {
                            case "default":
                                return [
                                    [dx, 4],
                                    [dx, 4],
                                    [dx, dz],
                                    [dx, dz],
                                    [4, dz],
                                    [4, dz],
                                ];
                            case "greenWalls":
                            case "redWalls":
                                return [
                                    [dx / 4, 1],
                                    [dx / 4, 1],
                                    [dx / 4, dz / 4],
                                    [dx / 4, dz / 4],
                                    [1, dz / 4],
                                    [1, dz / 4],
                                ];
                        }
                    })(biomeState) as [number, number][],
                    color: (function (biomeState) {
                        switch (biomeState) {
                            case "default":
                                return { r: 0.0, g: 0.0, b: 0.0 };
                            case "redWalls":
                                return { r: 1.0, g: 0.1, b: 0.2 };
                            case "greenWalls":
                                return { r: 0.4, g: 0.5, b: 0.4 };
                        }
                    })(biomeState),
                };
            })(),
            ...(function (biomeState): [boolean, WebGLTexture] {
                //console.log(biomeState);
                switch (biomeState) {
                    case "default":
                        return [true, backroomsWallTexture];
                    case "redWalls":
                        return [true, redRoomsWallTexture];
                    case "greenWalls":
                        return [true, greenRoomsWallTexture];
                }
            })(biomeState),
            biomeState
        );
    }

    function draw() {
        // Reset Projection Matrix
        mat4.identity(projMatrix);
        mat4.perspective(
            projMatrix,
            FOV,
            (gl.canvas as HTMLCanvasElement).clientWidth /
                (gl.canvas as HTMLCanvasElement).clientHeight,
            0.1,
            1000.0
        );
        gl.uniformMatrix4fv(projMatrixLocation, false, projMatrix);

        // Transforming World Matrix
        // worldRotY = (performance.now() / 6000) * 2 * Math.PI;
        // worldRotX = (performance.now() / 5000) * 2 * Math.PI;
        mat4.rotate(worldMatrix, identity, worldRotY, [0, 1, 0]);
        mat4.rotate(worldMatrix, worldMatrix, worldRotX, [1, 0, 0]);
        gl.uniformMatrix4fv(worldMatrixLocation, false, worldMatrix);

        // Updating Velocity
        jumpSpeed = camPosY >= 2 ? jumpSpeed - 0.008 : Math.max(0, jumpSpeed);
        camPosY += jumpSpeed;
        // console.clear();
        // console.table({ camPosX, camPosY, camPosZ });

        // Translating View Matrix
        vec3.set(camPosVec, camPosX, camPosY, camPosZ);

        mat4.rotate(viewMatrix, identity, camRotY, [0, 1, 0]);
        mat4.rotate(viewMatrix, viewMatrix, camRotX, [
            Math.cos(camRotY),
            0,
            Math.sin(camRotY),
        ]);
        handleKeyPress();
        vec3.set(camPosVec, camPosX, camPosY, camPosZ);
        mat4.translate(
            viewMatrix,
            viewMatrix,
            camPosVec.map((i) => -i)
        );

        gl.uniformMatrix4fv(viewMatrixLocation, false, viewMatrix);

        gl.uniform3fv(fadeColorLocation, fadeColor);

        // Clearing Canvas
        gl.clearColor(fadeColor[0], fadeColor[1], fadeColor[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Activating Backrooms Texture

        // Drawing on the Canvas
        planeArray.forEach((plane, index) => {
            if (plane.useTexture) {
                gl.bindTexture(gl.TEXTURE_2D, plane.texture);
                gl.activeTexture(gl.TEXTURE0);
            }
            gl.uniform1f(useTextureLocation, plane.useTexture ? 1 : 0);
            gl.drawElements(
                gl.TRIANGLES,
                12,
                gl.UNSIGNED_SHORT,
                index * 12 * Uint16Array.BYTES_PER_ELEMENT
            );
        });
    }

    // Setting up Event Listeners
    window.addEventListener("keydown", (ev) => {
        if (
            STATE.keyIsDown["Space"] === false &&
            ev.code === "Space" &&
            jumpSpeed === 0
        )
            jumpSpeed = 0.17;
        STATE.keyIsDown[ev.code] = true;
    });

    window.addEventListener("keyup", (ev) => {
        STATE.keyIsDown[ev.code] = false;
    });

    function handleKeyPress() {
        let key = STATE.keyIsDown;

        //console.log([STATE.mouseDX, STATE.mouseDY, STATE.mouseIsDown]);
        camRotY = STATE.rotX * 2 * Math.PI;
        camRotX = (STATE.rotY - 0.5) * Math.PI;

        let directionMatrix = new Float32Array(16);
        mat4.rotate(directionMatrix, identity, camRotY, [0, 1, 0]);

        let [prevCamX, prevCamY, prevCamZ] = [camPosX, camPosY, camPosZ];

        if (key["KeyW"]) {
            camPosX += directionMatrix[8] * WALKING_SPEED;
            camPosY += directionMatrix[9] * WALKING_SPEED;
            camPosZ -= directionMatrix[10] * WALKING_SPEED;
        }
        if (key["KeyS"]) {
            camPosX -= directionMatrix[8] * WALKING_SPEED;
            camPosY -= directionMatrix[9] * WALKING_SPEED;
            camPosZ += directionMatrix[10] * WALKING_SPEED;
        }
        if (key["KeyD"]) {
            camPosX += directionMatrix[0] * WALKING_SPEED;
            camPosY += directionMatrix[1] * WALKING_SPEED;
            camPosZ -= directionMatrix[2] * WALKING_SPEED;
        }
        if (key["KeyA"]) {
            camPosX -= directionMatrix[0] * WALKING_SPEED;
            camPosY -= directionMatrix[1] * WALKING_SPEED;
            camPosZ += directionMatrix[2] * WALKING_SPEED;
        }
        // if (key["KeyE"]) camPosY -= 0.1;
        // if (key["KeyQ"]) camPosY += 0.1;
        // if (key["Space"]) jumpSpeed = -0.15;
        // if (key["ArrowRight"]) camRotY += TURN_SENSITIVITY;
        // if (key["ArrowLeft"]) camRotY -= TURN_SENSITIVITY;
        // if (key["ArrowUp"]) camRotX -= TURN_SENSITIVITY;
        // if (key["ArrowDown"]) camRotX += TURN_SENSITIVITY;

        camRotX = clamp(-Math.PI / 2, camRotX, Math.PI / 2);

        // Checking for Box Collisions
        let collidesX: boolean = boxes
            .map((i) =>
                i.pointWithinMargin(1, 1, 1, camPosX, prevCamY, prevCamZ)
            )
            .reduce((acc, cur) => acc || cur, false);

        let collidesY: boolean = boxes
            .map((i) =>
                i.pointWithinMargin(1, 1, 1, prevCamX, camPosY, prevCamZ)
            )
            .reduce((acc, cur) => acc || cur, false);

        let collidesZ: boolean = boxes
            .map((i) =>
                i.pointWithinMargin(1, 1, 1, prevCamX, prevCamY, camPosZ)
            )
            .reduce((acc, cur) => acc || cur, false);

        if (collidesX) {
            camPosX = prevCamX;
        }

        if (collidesY) {
            camPosY = prevCamY;
        }

        if (collidesZ) {
            camPosZ = prevCamZ;
        }

        if (
            !(collidesX && collidesY && collidesZ) &&
            (camPosX !== prevCamX || camPosZ !== prevCamX)
        ) {
            // Updating Box Array

            /// Filtering Boxes to those that are within render distance
            let filteredBoxes = boxes.filter((box) => {
                let [boxCenterX, boxCenterZ] = [
                    box.boundingBox[0] + box.boundingBox[3],
                    box.boundingBox[2] + box.boundingBox[5],
                ].map((i) => 0.5 * i);
                return (
                    Math.pow(boxCenterX - camPosX, 2) +
                        Math.pow(boxCenterZ - camPosZ, 2) <=
                    Math.pow(BOX_RENDERING_DISTANCE, 2)
                );
            });

            /// Calculating Movement Angle
            let angle =
                Math.sign(camPosZ - prevCamZ) *
                Math.acos(
                    (camPosX - prevCamX) /
                        (Math.sqrt(
                            Math.pow(camPosX - prevCamX, 2) +
                                Math.pow(camPosZ - prevCamZ, 2)
                        ) +
                            0.0001)
                );

            console.log([camPosX, camPosZ]);

            /// Updating Biome (with weighted probabilities)
            BiomeState.evolveStateM();

            for (let i = 0; i < 4; i++) {
                if (filteredBoxes.length <= MAX_BOXES) {
                    console.log("Box Replaced");
                    filteredBoxes.push(
                        sampleBox(
                            camPosX,
                            camPosZ,
                            angle,
                            BiomeState.currentState
                        )
                    );
                }
            }

            console.log(`Box Count: ${boxes.length}`);

            /// Updating Boxes
            boxes = filteredBoxes;

            /// Checking Biome
            let prevalentBiome = [
                ...filteredBoxes
                    .filter((box) => {
                        let [boxCenterX, boxCenterZ] = [
                            box.boundingBox[0] + box.boundingBox[3],
                            box.boundingBox[2] + box.boundingBox[5],
                        ].map((i) => 0.5 * i);
                        return (
                            Math.pow(boxCenterX - camPosX, 2) +
                                Math.pow(boxCenterZ - camPosZ, 2) <=
                            Math.pow(BIOME_CHECK_DISTANCE, 2)
                        );
                    })
                    .reduce((acc, cur) => {
                        acc.set(cur.data, acc.get(cur.data) + 1);
                        return acc;
                    }, new Map<BiomeStateIdentifier, number>(BIOMES.map((i) => [i, 0])))
                    .entries(),
            ].reduce(
                (acc, cur) => (cur[1] > acc[1] ? cur : acc),
                ["default", 0]
            )[0];

            /// Updating Fog Color
            fadeColor = new Float32Array(
                (function (biome) {
                    switch (biome) {
                        case "default":
                            return [1.0, 0.8, 0.4];
                        case "redWalls":
                            return [1.0, 0.8, 0.8];
                        case "greenWalls":
                            return [0.8, 1.0, 0.8];
                    }
                })(prevalentBiome)
            );

            /// Updating Extra Planes to Reflect the Biome
            extraPlanes[0] = BidirectionalPlane.XZ({
                origin: [camPosX - 96, 0, camPosZ - 96],
                delta: [192, 192],
                uvOrigin: [(camPosX - 96) / 4, (camPosZ - 96) / 4],
                uvDelta: [48, 48],
                useTexture: (function (prevalentBiome) {
                    return [].includes(prevalentBiome);
                })(prevalentBiome),
                texture: (function (prevalentBiome) {
                    switch (prevalentBiome) {
                        default:
                        case "default":
                        case "greenWalls":
                        case "redWalls":
                            return null;
                    }
                })(prevalentBiome),
                color: (function (prevalentBiome) {
                    switch (prevalentBiome) {
                        default:
                        case "default":
                            return { r: 0.8, g: 0.7, b: 0.4 };
                        case "redWalls":
                            return { r: 1.0, g: 1.0, b: 1.0 };
                        case "greenWalls":
                            return { r: 0.4, g: 0.6, b: 0.5 };
                    }
                })(prevalentBiome),
            });

            extraPlanes[1] = BidirectionalPlane.XZ({
                origin: [camPosX - 96, 4, camPosZ - 96],
                delta: [192, 192],
                uvOrigin: [(camPosX - 96) / 2, (camPosZ - 96) / 2],
                uvDelta: [96, 96],
                useTexture: (function (prevalentBiome) {
                    return ["default", "redWalls", "greenWalls"].includes(
                        prevalentBiome
                    );
                })(prevalentBiome),
                texture: (function (prevalentBiome) {
                    switch (prevalentBiome) {
                        case "default":
                            return defaultCeilingTexture;
                        case "redWalls":
                        case "greenWalls":
                            return redRoomCeilingTexture;
                    }
                })(prevalentBiome),
                color: (function (prevalentBiome) {
                    switch (prevalentBiome) {
                        case "default":
                            return { r: 0.8, g: 0.7, b: 0.4 };
                        case "redWalls":
                            return { r: 1.0, g: 1.0, b: 1.0 };
                        case "greenWalls":
                            return { r: 0.4, g: 0.6, b: 0.5 };
                    }
                })(prevalentBiome),
            });

            [
                extraPlanes[2],
                extraPlanes[3],
                extraPlanes[4],
                extraPlanes[5],
                extraPlanes[6],
                extraPlanes[7],
            ] = new Box({
                color: { r: 0, g: 0, b: 0 },
                origin: [-96 + camPosX, -1, -96 + camPosZ],
                delta: [192, 6, 192],
            }).planeArray;

            /// Updating PlaneArray
            planeArray = [
                ...boxes.map((box) => box.planeArray).flat(1),
                ...extraPlanes,
            ];

            /// Generating Buffer Data
            vertexData = planeArray
                .map((plane) => plane.convertVerticesToBufferData())
                .flat(1);
            indexData = planeArray
                .map((plane, index) => plane.getIndexData(index * 4))
                .flat(1);

            /// Rebinding Buffers
            glHelper.allocateBuffer(
                gl,
                vertexBuffer,
                vertexData,
                gl.ARRAY_BUFFER,
                gl.STATIC_DRAW,
                "float32"
            );
            glHelper.allocateBuffer(
                gl,
                indexBuffer,
                indexData,
                gl.ELEMENT_ARRAY_BUFFER,
                gl.STATIC_DRAW,
                "uint16"
            );
        }
    }

    window.addEventListener("resize", (ev) => {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        draw();
    });

    // Starting Draw Loop
    function drawLoop() {
        draw();
        requestAnimationFrame(drawLoop);
    }

    drawLoop();
})();

window.addEventListener(
    "mousedown",
    (ev) => {
        [STATE.mouseClickX, STATE.mouseClickY] = [
            ev.x / window.innerWidth,
            ev.y / window.innerHeight,
        ];
        STATE.rotY = clamp(0, STATE.rotY, 1);
        [STATE.rotXatClick, STATE.rotYatClick] = [STATE.rotX, STATE.rotY];

        STATE.mouseIsDown = true;
        console.log("Mouse Down");
    },
    {
        capture: false,
    }
);

window.addEventListener(
    "mousemove",
    (ev) => {
        if (STATE.mouseIsDown) {
            [STATE.mouseDX, STATE.mouseDY] = [
                ev.x / window.innerWidth - STATE.mouseClickX,
                ev.y / window.innerHeight - STATE.mouseClickY,
            ];
            //console.log([STATE.mouseDX, STATE.mouseDY]);
            [STATE.rotX, STATE.rotY] = [
                STATE.rotXatClick + STATE.mouseDX,
                STATE.rotYatClick + STATE.mouseDY,
            ];
        }
        STATE.rotY = clamp(0, STATE.rotY, 1);
        console.log("Mouse Moved");
    },
    {
        capture: false,
    }
);

window.addEventListener(
    "mouseup",
    (ev) => {
        [STATE.rotXatClick, STATE.rotYatClick] = [
            STATE.rotXatClick + STATE.mouseDX,
            STATE.rotYatClick + STATE.mouseDY,
        ];

        STATE.mouseIsDown = false;
        console.log("Mouse Up");
    },
    {
        capture: false,
    }
);
