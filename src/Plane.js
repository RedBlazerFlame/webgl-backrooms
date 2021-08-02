import { glHelper, repeat } from "./client-helper.js";
export class Plane {
    constructor(initPlaneVertices, useTexture = false, texture, data = null) {
        this.planeIndices = [0, 1, 2, 0, 2, 3];
        this.__planeVertices = initPlaneVertices;
        this.__useTexture = useTexture;
        this.texture = texture;
        this.data = data;
    }
    get planeVertices() {
        return this.__planeVertices;
    }
    get useTexture() {
        return this.__useTexture;
    }
    normalizePlaneVertexColors() {
        this.__planeVertices = this.__planeVertices.map((i) => ({
            pos: i.pos,
            color: {
                r: i.color.r / 255.0,
                g: i.color.g / 255.0,
                b: i.color.b / 255.0,
            },
        }));
        return this;
    }
    unnormalizePlaneVertexColors() {
        this.__planeVertices = this.__planeVertices.map((i) => ({
            pos: i.pos,
            color: {
                r: i.color.r * 255.0,
                g: i.color.g * 255.0,
                b: i.color.b * 255.0,
            },
        }));
        return this;
    }
    translatePlane([x, y, z]) {
        this.__planeVertices = this.__planeVertices.map((i) => ({
            pos: {
                x: i.pos.x + x,
                y: i.pos.y + y,
                z: i.pos.z + z,
            },
            color: i.color,
        }));
    }
    convertVerticesToBufferData() {
        return this.__planeVertices
            .map((i) => [
            i.pos.x,
            i.pos.y,
            i.pos.z,
            i.color.r,
            i.color.g,
            i.color.b,
            i.uv.u,
            i.uv.v,
        ])
            .flat(1);
    }
    getIndexData(indexOffset = 0) {
        return this.planeIndices.map((i) => i + indexOffset);
    }
    draw(gl, program, vertexBuffer, indexBuffer, setup, glTexture) {
        // Sending Data as Buffer to WebGL
        const vertexData = this.convertVerticesToBufferData();
        const indexData = this.getIndexData(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
        // Enabling Attributes
        const TOTAL_ATTRIBUTE_SIZE = 8 * Float32Array.BYTES_PER_ELEMENT;
        const [positionAttributeLocation, colorAttributeLocation, vertTexAttributeLocation,] = glHelper.attribLocs(gl, program, "vectorPosition", "vectorColor", "vertTexCoords");
        glHelper.enableAttribute(gl, positionAttributeLocation, gl.FLOAT, 0, 3, TOTAL_ATTRIBUTE_SIZE, Float32Array.BYTES_PER_ELEMENT, false);
        glHelper.enableAttribute(gl, colorAttributeLocation, gl.FLOAT, 3, 3, TOTAL_ATTRIBUTE_SIZE, Float32Array.BYTES_PER_ELEMENT, false);
        glHelper.enableAttribute(gl, vertTexAttributeLocation, gl.FLOAT, 6, 2, TOTAL_ATTRIBUTE_SIZE, Float32Array.BYTES_PER_ELEMENT, false);
        // Setting Some Uniforms
        setup.call(this, gl);
        // Drawing Plane
        if (this.__useTexture) {
            gl.bindTexture(gl.TEXTURE_2D, glTexture);
            gl.activeTexture(gl.TEXTURE0);
        }
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, indexData.length, gl.UNSIGNED_SHORT, 0);
    }
    static XY({ origin: [x = 0, y = 0, z = 0] = [0, 0, 0], delta: [dx = 1, dy = 1] = [1, 1], uvOrigin: [u = 0, v = 0] = [0, 0], uvDelta: [du = 1, dv = 1] = [1, 1], useTexture = false, color: { r = 1, g = 1, b = 1 } = { r: 1, g: 1, b: 1 }, texture = null, }) {
        return new this.classConstructor([
            {
                pos: {
                    x: x,
                    y: y,
                    z: z,
                },
                uv: {
                    u,
                    v,
                },
            },
            {
                pos: {
                    x: x + dx,
                    y,
                    z,
                },
                uv: {
                    u: u + du,
                    v,
                },
            },
            {
                pos: {
                    x: x + dx,
                    y: y + dy,
                    z,
                },
                uv: {
                    u: u + du,
                    v: v + dv,
                },
            },
            {
                pos: {
                    x,
                    y: y + dy,
                    z,
                },
                uv: {
                    u,
                    v: v + dv,
                },
            },
        ].map((i) => ({
            pos: i.pos,
            uv: i.uv,
            color: {
                r,
                g,
                b,
            },
        })), useTexture, texture);
    }
    static XZ({ origin: [x = 0, y = 0, z = 0] = [0, 0, 0], delta: [dx = 1, dz = 1] = [1, 1], uvOrigin: [u = 0, v = 0] = [0, 0], uvDelta: [du = 1, dv = 1] = [1, 1], useTexture = false, color: { r = 1, g = 1, b = 1 } = { r: 1, g: 1, b: 1 }, texture = null, }) {
        return new this.classConstructor([
            {
                pos: {
                    x: x,
                    y: y,
                    z: z,
                },
                uv: {
                    u,
                    v,
                },
            },
            {
                pos: {
                    x: x + dx,
                    y,
                    z,
                },
                uv: {
                    u: u + du,
                    v,
                },
            },
            {
                pos: {
                    x: x + dx,
                    y,
                    z: z + dz,
                },
                uv: {
                    u: u + du,
                    v: v + dv,
                },
            },
            {
                pos: {
                    x,
                    y,
                    z: z + dz,
                },
                uv: {
                    u,
                    v: v + dv,
                },
            },
        ].map((i) => ({
            pos: i.pos,
            uv: i.uv,
            color: {
                r,
                g,
                b,
            },
        })), useTexture, texture);
    }
    static YZ({ origin: [x = 0, y = 0, z = 0] = [0, 0, 0], delta: [dy = 1, dz = 1] = [1, 1], uvOrigin: [u = 0, v = 0] = [0, 0], uvDelta: [du = 1, dv = 1] = [1, 1], useTexture = false, color: { r = 1, g = 1, b = 1 } = { r: 1, g: 1, b: 1 }, texture = null, }) {
        return new this.classConstructor([
            {
                pos: {
                    x: x,
                    y: y,
                    z: z,
                },
                uv: {
                    u,
                    v,
                },
            },
            {
                pos: {
                    x,
                    y: y + dy,
                    z,
                },
                uv: {
                    u: u + du,
                    v,
                },
            },
            {
                pos: {
                    x,
                    y: y + dy,
                    z: z + dz,
                },
                uv: {
                    u: u + du,
                    v: v + dv,
                },
            },
            {
                pos: {
                    x,
                    y,
                    z: z + dz,
                },
                uv: {
                    u,
                    v: v + dv,
                },
            },
        ].map((i) => ({
            pos: i.pos,
            uv: i.uv,
            color: {
                r,
                g,
                b,
            },
        })), useTexture, texture);
    }
}
Plane.classConstructor = Plane;
export class ReversedPlane extends Plane {
    constructor() {
        super(...arguments);
        this.planeIndices = [2, 1, 0, 3, 2, 0];
    }
}
ReversedPlane.classConstructor = ReversedPlane;
export class BidirectionalPlane extends Plane {
    constructor() {
        super(...arguments);
        this.planeIndices = [
            2, 1, 0, 3, 2, 0, 0, 1, 2, 0, 2, 3,
        ];
    }
}
BidirectionalPlane.classConstructor = BidirectionalPlane;
export class Box {
    constructor({ origin: [x = 0, y = 0, z = 0] = [0, 0, 0], delta: [dx = 1, dy = 1, dz = 1] = [1, 1, 1], uvOrigin: [u = 0, v = 0] = [0, 0], uvDelta = repeat(6, [1, 1]), color: { r = 0, g = 0, b = 0 } = { r: 0, g: 0, b: 0 }, }, useTexture = false, texture, data = null) {
        this.__useTexture = useTexture;
        this.texture = texture;
        this.boundingBox = [x, y, z, x + dx, y + dy, z + dz];
        this.data = data;
        this.__planes = [
            BidirectionalPlane.XY({
                origin: [x, y, z],
                delta: [dx, dy],
                uvOrigin: [u, v],
                uvDelta: uvDelta[0],
                useTexture: useTexture,
                texture: texture,
                color: { r, g, b },
            }),
            BidirectionalPlane.XY({
                origin: [x, y, z + dz],
                delta: [dx, dy],
                uvOrigin: [u, v],
                uvDelta: uvDelta[1],
                useTexture: useTexture,
                texture: texture,
                color: { r, g, b },
            }),
            BidirectionalPlane.XZ({
                origin: [x, y, z],
                delta: [dx, dz],
                uvOrigin: [u, v],
                uvDelta: uvDelta[2],
                useTexture: useTexture,
                texture: texture,
                color: { r, g, b },
            }),
            BidirectionalPlane.XZ({
                origin: [x, y + dy, z],
                delta: [dx, dz],
                uvOrigin: [u, v],
                uvDelta: uvDelta[3],
                useTexture: useTexture,
                texture: texture,
                color: { r, g, b },
            }),
            BidirectionalPlane.YZ({
                origin: [x, y, z],
                delta: [dy, dz],
                uvOrigin: [u, v],
                uvDelta: uvDelta[4],
                useTexture: useTexture,
                texture: texture,
                color: { r, g, b },
            }),
            BidirectionalPlane.YZ({
                origin: [x + dx, y, z],
                delta: [dy, dz],
                uvOrigin: [u, v],
                uvDelta: uvDelta[5],
                useTexture: useTexture,
                texture: texture,
                color: { r, g, b },
            }),
        ];
    }
    get planeArray() {
        return this.__planes;
    }
    convertVerticesToBufferData() {
        return this.__planes
            .map((i) => i.convertVerticesToBufferData())
            .flat(1);
    }
    getIndexData(offset) {
        return this.__planes.map((plane, index) => plane.getIndexData(index * 4 + offset));
    }
    pointCollides(x, y, z) {
        return (x >= this.boundingBox[0] &&
            x <= this.boundingBox[3] &&
            y >= this.boundingBox[1] &&
            y <= this.boundingBox[4] &&
            z >= this.boundingBox[2] &&
            z <= this.boundingBox[5]);
    }
    pointWithinMargin(mx, my, mz, x, y, z) {
        return (x >= this.boundingBox[0] - mx &&
            x <= this.boundingBox[3] + mx &&
            y >= this.boundingBox[1] - my &&
            y <= this.boundingBox[4] + my &&
            z >= this.boundingBox[2] - mz &&
            z <= this.boundingBox[5] + mz);
    }
}
