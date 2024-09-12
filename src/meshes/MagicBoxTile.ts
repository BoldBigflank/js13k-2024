import { ColorMaterial } from '@/core/textures'
import { TickSFX } from '@/core/Sounds'
import { InteractiveMesh } from '@/Types'

const { TransformNode, MeshBuilder, Vector3 } = BABYLON
let pc = 0

export type MagicBoxTileOpts = {
    shape?: 'box' | 'triangle' | 'sphere'
    value?: number
    locked?: boolean
    target?: number
}

export class MagicBoxTile {
    scene: BABYLON.Scene
    parent: InteractiveMesh
    value: number
    tickSFX?: BABYLON.Sound
    face?: BABYLON.Mesh
    body?: BABYLON.Mesh
    locked?: boolean
    materials: Record<string, BABYLON.Material>

    constructor(opts: MagicBoxTileOpts, scene: BABYLON.Scene) {
        this.scene = scene
        this.parent = new TransformNode(
            'MagicBoxTile',
            this.scene
        ) as InteractiveMesh
        this.value = opts.value || 0
        this.locked = opts.locked || false
        this.materials = {
            red: ColorMaterial('#ff0000', { glow: true }, scene),
            green: ColorMaterial('#BAD455', { glow: true }, scene),
            blue: ColorMaterial('#0000ff', { glow: true }, scene),
        }
        this.reset()
    }

    set position(pos: BABYLON.Vector3) {
        this.parent.position = pos
    }

    set rotation(rot: BABYLON.Vector3) {
        this.parent.rotation = rot
    }

    get model() {
        return this.parent
    }
    reset() {
        // Sounds
        this.tickSFX = new BABYLON.Sound(
            'Tick',
            TickSFX().buffer,
            this.scene,
            null,
            {
                loop: false,
                autoplay: false,
                spatialSound: true,
                maxDistance: 25,
            }
        )
        this.tickSFX.switchPanningModelToHRTF()

        // Body
        const body = MeshBuilder.CreateBox(`body${++pc}`, {
            width: 0.8,
            height: 0.6,
            depth: 0.25,
        })
        body.material = this.locked ? this.materials.red : this.materials.blue
        body.setParent(this.parent)
        body.position = new Vector3(0, 0, 0)
        this.tickSFX.attachToMesh(body)
        this.body = body

        const face = MeshBuilder.CreatePlane(
            'billboard',
            {
                width: 0.7,
                height: 0.5,
                sideOrientation: BABYLON.Mesh.DOUBLESIDE,
            },
            this.scene
        )
        face.setParent(this.parent)
        face.isPickable = false
        face.position = new Vector3(0, 0, -0.126)
        this.face = face

        return parent
    }
}
