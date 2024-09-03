import { ColorMaterial, TextMaterial } from '@/core/textures'
import { TickSFX } from '@/core/Sounds'
import { InteractiveMesh } from '@/Types'

const { TransformNode, 
    MeshBuilder,
    Vector3
} = BABYLON
let pc = 0

export type ClockOpts = {
    shape?: 'box'|'triangle'|'sphere'
    count?: number
    target?: number
}

export class Clock {
    scene: BABYLON.Scene
    parent: InteractiveMesh
    startDt: number
    endDt: number
    target: number
    value: number
    tickSFX?: BABYLON.Sound
    face?: BABYLON.Mesh
    body?: BABYLON.Mesh
    state: 'intro'|'running'|'passed'|'failed'
    materials: Record<string, BABYLON.Material>

    constructor(opts: ClockOpts, scene: BABYLON.Scene) {
        this.scene = scene
        this.startDt = Date.now()
        this.endDt = this.startDt + (opts.count ? opts.count : 30) * 1000
        this.parent = new TransformNode('Clock', this.scene) as InteractiveMesh
        this.value = 0
        this.state = 'intro'
        this.target = opts.target || 13
        this.materials = {
            red: ColorMaterial("#ff0000", scene),
            green: ColorMaterial("#BAD455", scene),
            blue: ColorMaterial("#0000ff", scene)
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
        this.tickSFX = new BABYLON.Sound('Tick', TickSFX().buffer, this.scene, null, {
            loop: false, autoplay: false, spatialSound: true, maxDistance: 25
        })
        this.tickSFX.switchPanningModelToHRTF()

        // Body
        const body = MeshBuilder.CreateBox(`body${++pc}`, {
            width: 0.8,
            height: 0.6,
            depth: 0.25
        })
        body.material = this.materials.blue
        body.setParent(this.parent)
        body.position = new Vector3(0, 0, 0)
        this.tickSFX.attachToMesh(body)
        this.body = body

        const face = MeshBuilder.CreatePlane('billboard', {
            width: 0.7,
            height: 0.5,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene)
        face.setParent(this.parent)
        face.isPickable = false
        face.position = new Vector3(0, 0, -0.126)
        this.face = face

        this.scene.registerBeforeRender(() => {
            if (this.state === 'running') {
                const newValue = Math.max(0, Math.ceil((this.endDt - Date.now()) / 1000))
                if (newValue !== this.value) {
                    if (newValue < this.target + 6) {
                        this.tickSFX?.play()
                    }
                    if (newValue < this.target) this.fail()
                }
                this.value = newValue
                if (this.face) this.face.material = TextMaterial([`${this.value}`], this.scene)
            }
        })
        
        return parent
    }

    start() {
        console.log('clock starting')
        this.state = 'running'
        if (this.body) this.body.material = this.materials.blue
    }

    stop() {
        (this.value === this.target) ? this.pass() : this.fail()
    }

    pass() {
        this.state = "passed"
        if (this.body) this.body.material = this.materials.green
    }

    fail() {
        this.state = 'failed'
        if (this.body) this.body.material = this.materials.red
    }

}
