import {
    BLACK,
    BRICK1,
    BRICK2,
    BRICK3,
    BRICK4,
    BRICK5,
    DIRT1,
    DIRT2,
    GRASS1,
    GRASS2,
    GRASS3,
    GRASS4,
    GRASS5,
    GRAVEL0,
    GRAVEL1,
    GRAVEL2,
    GRAVEL3,
    GRAVEL4,
    GRAVEL5,
    MID_GREY,
    ORANGE,
    SPANISH_BLUE,
    WHITE,
} from './Colors'
import { initCanvas, sample, shuffle } from './Utils'

const { StandardMaterial, Texture } = BABYLON

let pc = 0

/* NEW TEXTURES */
const textures: Record<string, BABYLON.Material> = {}

export const CursorMaterial = (scene: BABYLON.Scene) => {
    const key = 'cursor'
    if (textures[key]) return textures[key]
    // Setup
    const [canvas, ctx] = initCanvas(512)
    ctx.imageSmoothingEnabled = false
    // TODO: Draw out a cursor
    ctx.lineCap = 'square'
    ctx.beginPath()
    ctx.moveTo(256 - 7, 256) // Left
    ctx.lineTo(256 - 5, 256)
    ctx.moveTo(256 + 5, 256) // Right
    ctx.lineTo(256 + 7, 256)

    ctx.moveTo(256, 256 - 7) // Up
    ctx.lineTo(256, 256 - 5)
    ctx.moveTo(256, 256 + 5) // Down
    ctx.lineTo(256, 256 + 7)

    // Outer
    ctx.lineWidth = 4
    ctx.strokeStyle = BLACK
    ctx.stroke()
    // Inner
    ctx.lineWidth = 2
    ctx.strokeStyle = WHITE
    ctx.stroke()

    const material = CanvasMaterial(canvas, scene)
    material.disableLighting = true
    material.emissiveColor = BABYLON.Color3.White()
    material.diffuseTexture!.hasAlpha = true
    textures[key] = material
    return material
}

/* HELPERS */

type ColorOpts = {
    glow?: boolean
}

export const ColorMaterial = (
    color: string,
    opts: ColorOpts,
    scene: BABYLON.Scene
) => {
    const key = `color_${opts.glow ? 'glow_' : ''}${color}`
    if (textures[key]) return textures[key]
    const material = new StandardMaterial(`${key}${++pc}`, scene)
    material.diffuseColor = BABYLON.Color3.FromHexString(color)
    if (opts.glow) material.emissiveColor = BABYLON.Color3.FromHexString(color)
    textures[key] = material
    return material
}

export const ColorTextureMaterial = (color: string, scene: BABYLON.Scene) => {
    const key = `colortexture${color}`
    if (textures[key]) return textures[key]
    const material = new StandardMaterial(`standardMaterial${++pc}`, scene)
    material.diffuseColor = BABYLON.Color3.FromHexString(color)
    const canvas = PerlinNoise()
    const texture = Texture.LoadFromDataString(
        `texture${++pc}`,
        canvas.toDataURL(),
        scene
    )
    material.diffuseColor = BABYLON.Color3.FromHexString(color)
    material.diffuseTexture = texture
    textures[key] = material
    return material
}

export const CanvasMaterial = (
    canvas: HTMLCanvasElement,
    scene: BABYLON.Scene
) => {
    const material = new StandardMaterial(`material${++pc}`, scene)
    const texture = Texture.LoadFromDataString(
        `texture${++pc}`,
        canvas.toDataURL(),
        scene
    )
    texture.hasAlpha = true
    material.diffuseTexture = texture
    return material
}

export const TextMaterial = (
    lines: string[],
    color: string,
    scene: BABYLON.Scene
) => {
    const key = `text-${color}-${lines.join('')}`
    if (textures[key]) return textures[key]
    const [canvas, ctx] = initCanvas(512)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = BLACK

    ctx.font = `64px Helvetica`
    ctx.scale(1.0, lines.length)
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    let fontSize = 64
    if (lines.length > 0) {
        const m = ctx.measureText(lines[0])
        fontSize = Math.min((64 * (512 - 64)) / m.width, 512)
        ctx.font = `${fontSize}px Helvetica`
    }
    lines.forEach((line, index) => {
        ctx.fillText(`${line}`, 32, 32 + fontSize * index)
    })
    const material = CanvasMaterial(canvas, scene)
    material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE
    textures[key] = material
    return material
}

export const PerlinNoise = () => {
    const size = 512
    const [noiseCanvas, noiseCtx] = initCanvas(size)
    const imageData = noiseCtx.getImageData(
        0,
        0,
        noiseCanvas.width,
        noiseCanvas.height
    )
    const pixels = imageData.data
    const n = pixels.length
    const alpha = 255
    for (let i = 0; i < n; i += 4) {
        pixels[i] = pixels[i + 1] = pixels[i + 2] = (Math.random() * 256) | 0
        pixels[i + 3] = alpha
    }
    noiseCtx.putImageData(imageData, 0, 0)

    const [canvas, ctx] = initCanvas(size)
    ctx.save()
    for (let size = 4; size <= noiseCanvas.width; size *= 2) {
        const x = (Math.random() * (noiseCanvas.width - size)) | 0
        const y = (Math.random() * (noiseCanvas.height - size)) | 0
        ctx.globalAlpha = 4 / size
        ctx.drawImage(
            noiseCanvas,
            x,
            y,
            size,
            size,
            0,
            0,
            canvas.width,
            canvas.height
        )
    }

    ctx.restore()

    return canvas
}
