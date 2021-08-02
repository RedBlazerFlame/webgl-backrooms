import { glHelper, repeat, repeatCallback } from "./client-helper.js";

export interface PlaneVertex {
    pos: {
        x: number;
        y: number;
        z: number;
    };
    uv?: {
        u: number;
        v: number;
    };
    color?: {
        r: number;
        g: number;
        b: number;
    };
}

export type PlaneIndex = number[];

export class Plane<DataSchema = null> {
    private __planeVertices: [
        PlaneVertex,
        PlaneVertex,
        PlaneVertex,
        PlaneVertex
    ];
    public readonly planeIndices: PlaneIndex = [0, 1, 2, 0, 2, 3];
    public static classConstructor = Plane;
    private __useTexture: boolean;
    public texture: WebGLTexture;
    public data: DataSchema;

    get planeVertices() {
        return this.__planeVertices;
    }

    get useTexture() {
        return this.__useTexture;
    }

    public normalizePlaneVertexColors() {
        this.__planeVertices = this.__planeVertices.map((i) => ({
            pos: i.pos,
            color: {
                r: i.color.r / 255.0,
                g: i.color.g / 255.0,
                b: i.color.b / 255.0,
            },
        })) as [PlaneVertex, PlaneVertex, PlaneVertex, PlaneVertex];

        return this;
    }

    public unnormalizePlaneVertexColors() {
        this.__planeVertices = this.__planeVertices.map((i) => ({
            pos: i.pos,
            color: {
                r: i.color.r * 255.0,
                g: i.color.g * 255.0,
                b: i.color.b * 255.0,
            },
        })) as [PlaneVertex, PlaneVertex, PlaneVertex, PlaneVertex];

        return this;
    }

    public translatePlane([x, y, z]: number[]) {
        this.__planeVertices = this.__planeVertices.map((i) => ({
            pos: {
                x: i.pos.x + x,
                y: i.pos.y + y,
                z: i.pos.z + z,
            },
            color: i.color,
        })) as [PlaneVertex, PlaneVertex, PlaneVertex, PlaneVertex];
    }

    public convertVerticesToBufferData(): number[] {
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

    public getIndexData(indexOffset = 0): number[] {
        return this.planeIndices.map((i) => i + indexOffset);
    }

    public draw(
        gl: WebGLRenderingContext,
        program: WebGLProgram,
        vertexBuffer: WebGLBuffer,
        indexBuffer: WebGLBuffer,
        setup: (gl: WebGLRenderingContext) => any,
        glTexture?: WebGLTexture
    ) {
        // Sending Data as Buffer to WebGL
        const vertexData = this.convertVerticesToBufferData();
        const indexData = this.getIndexData(0);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(vertexData),
            gl.STATIC_DRAW
        );
        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(indexData),
            gl.STATIC_DRAW
        );

        // Enabling Attributes
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

    public static XY({
        origin: [x = 0, y = 0, z = 0] = [0, 0, 0],
        delta: [dx = 1, dy = 1] = [1, 1],
        uvOrigin: [u = 0, v = 0] = [0, 0],
        uvDelta: [du = 1, dv = 1] = [1, 1],
        useTexture = false,
        color: { r = 1, g = 1, b = 1 } = { r: 1, g: 1, b: 1 },
        texture = null,
    }: {
        origin?: [number, number, number];
        delta?: [number, number];
        uvOrigin?: [number, number];
        uvDelta?: [number, number];
        useTexture?: boolean;
        color?: { r: number; g: number; b: number };
        texture?: WebGLTexture;
    }) {
        return new this.classConstructor(
            [
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
            })) as [PlaneVertex, PlaneVertex, PlaneVertex, PlaneVertex],
            useTexture,
            texture
        );
    }

    public static XZ({
        origin: [x = 0, y = 0, z = 0] = [0, 0, 0],
        delta: [dx = 1, dz = 1] = [1, 1],
        uvOrigin: [u = 0, v = 0] = [0, 0],
        uvDelta: [du = 1, dv = 1] = [1, 1],
        useTexture = false,
        color: { r = 1, g = 1, b = 1 } = { r: 1, g: 1, b: 1 },
        texture = null,
    }: {
        origin?: [number, number, number];
        delta?: [number, number];
        uvOrigin?: [number, number];
        uvDelta?: [number, number];
        useTexture?: boolean;
        color?: { r: number; g: number; b: number };
        texture?: WebGLTexture;
    }) {
        return new this.classConstructor(
            [
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
            })) as [PlaneVertex, PlaneVertex, PlaneVertex, PlaneVertex],
            useTexture,
            texture
        );
    }

    public static YZ({
        origin: [x = 0, y = 0, z = 0] = [0, 0, 0],
        delta: [dy = 1, dz = 1] = [1, 1],
        uvOrigin: [u = 0, v = 0] = [0, 0],
        uvDelta: [du = 1, dv = 1] = [1, 1],
        useTexture = false,
        color: { r = 1, g = 1, b = 1 } = { r: 1, g: 1, b: 1 },
        texture = null,
    }: {
        origin?: [number, number, number];
        delta?: [number, number];
        uvOrigin?: [number, number];
        uvDelta?: [number, number];
        useTexture?: boolean;
        color?: { r: number; g: number; b: number };
        texture?: WebGLTexture;
    }) {
        return new this.classConstructor(
            [
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
            })) as [PlaneVertex, PlaneVertex, PlaneVertex, PlaneVertex],
            useTexture,
            texture
        );
    }

    constructor(
        initPlaneVertices: [PlaneVertex, PlaneVertex, PlaneVertex, PlaneVertex],
        useTexture: boolean = false,
        texture?: WebGLTexture,
        data: DataSchema = null
    ) {
        this.__planeVertices = initPlaneVertices;
        this.__useTexture = useTexture;
        this.texture = texture;
        this.data = data;
    }
}

export class ReversedPlane extends Plane {
    public readonly planeIndices: PlaneIndex = [2, 1, 0, 3, 2, 0];
    public static classConstructor = ReversedPlane;
}

export class BidirectionalPlane extends Plane {
    public readonly planeIndices: PlaneIndex = [
        2, 1, 0, 3, 2, 0, 0, 1, 2, 0, 2, 3,
    ];
    public static classConstructor = BidirectionalPlane;
}

export class Box<DataSchema = null> {
    private __planes: [
        BidirectionalPlane,
        BidirectionalPlane,
        BidirectionalPlane,
        BidirectionalPlane,
        BidirectionalPlane,
        BidirectionalPlane
    ];
    private __useTexture: boolean;
    public texture: WebGLTexture;
    public data: DataSchema;

    public readonly boundingBox: [
        number,
        number,
        number,
        number,
        number,
        number
    ];

    get planeArray() {
        return this.__planes;
    }

    public convertVerticesToBufferData() {
        return this.__planes
            .map((i) => i.convertVerticesToBufferData())
            .flat(1);
    }

    public getIndexData(offset: number) {
        return this.__planes.map((plane, index) =>
            plane.getIndexData(index * 4 + offset)
        );
    }

    public pointCollides(x: number, y: number, z: number) {
        return (
            x >= this.boundingBox[0] &&
            x <= this.boundingBox[3] &&
            y >= this.boundingBox[1] &&
            y <= this.boundingBox[4] &&
            z >= this.boundingBox[2] &&
            z <= this.boundingBox[5]
        );
    }

    public pointWithinMargin(
        mx: number,
        my: number,
        mz: number,
        x: number,
        y: number,
        z: number
    ) {
        return (
            x >= this.boundingBox[0] - mx &&
            x <= this.boundingBox[3] + mx &&
            y >= this.boundingBox[1] - my &&
            y <= this.boundingBox[4] + my &&
            z >= this.boundingBox[2] - mz &&
            z <= this.boundingBox[5] + mz
        );
    }

    constructor(
        {
            origin: [x = 0, y = 0, z = 0] = [0, 0, 0],
            delta: [dx = 1, dy = 1, dz = 1] = [1, 1, 1],
            uvOrigin: [u = 0, v = 0] = [0, 0],
            uvDelta = repeat(6, [1, 1]),
            color: { r = 0, g = 0, b = 0 } = { r: 0, g: 0, b: 0 },
        },
        useTexture: boolean = false,
        texture?: WebGLTexture,
        data: DataSchema = null
    ) {
        this.__useTexture = useTexture;
        this.texture = texture;
        this.boundingBox = [x, y, z, x + dx, y + dy, z + dz];
        this.data = data;

        this.__planes = [
            BidirectionalPlane.XY({
                origin: [x, y, z],
                delta: [dx, dy],
                uvOrigin: [u, v],
                uvDelta: uvDelta[0] as [number, number],
                useTexture: useTexture,
                texture: texture,
                color: { r, g, b },
            }),
            BidirectionalPlane.XY({
                origin: [x, y, z + dz],
                delta: [dx, dy],
                uvOrigin: [u, v],
                uvDelta: uvDelta[1] as [number, number],
                useTexture: useTexture,
                texture: texture,
                color: { r, g, b },
            }),
            BidirectionalPlane.XZ({
                origin: [x, y, z],
                delta: [dx, dz],
                uvOrigin: [u, v],
                uvDelta: uvDelta[2] as [number, number],
                useTexture: useTexture,
                texture: texture,
                color: { r, g, b },
            }),
            BidirectionalPlane.XZ({
                origin: [x, y + dy, z],
                delta: [dx, dz],
                uvOrigin: [u, v],
                uvDelta: uvDelta[3] as [number, number],
                useTexture: useTexture,
                texture: texture,
                color: { r, g, b },
            }),
            BidirectionalPlane.YZ({
                origin: [x, y, z],
                delta: [dy, dz],
                uvOrigin: [u, v],
                uvDelta: uvDelta[4] as [number, number],
                useTexture: useTexture,
                texture: texture,
                color: { r, g, b },
            }),
            BidirectionalPlane.YZ({
                origin: [x + dx, y, z],
                delta: [dy, dz],
                uvOrigin: [u, v],
                uvDelta: uvDelta[5] as [number, number],
                useTexture: useTexture,
                texture: texture,
                color: { r, g, b },
            }),
        ];
    }
}
