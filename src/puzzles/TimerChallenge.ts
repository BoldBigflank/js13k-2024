import { shuffle } from "@/core/Utils"
import { Clock } from "@/meshes/Clock"
const { TransformNode, Vector3 } = BABYLON

export class TimerChallenge {
    clocks?: BABYLON.Mesh[]
    scene: BABYLON.Scene
    parent: BABYLON.TransformNode
    state: 'intro'|'running'|'passed'|'failed'
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene
        this.parent = new TransformNode('TimerChallenge', this.scene)
        this.state = 'intro'
        this.reset()
    }

    
    get model() {
        return this.parent
    }

    set position(pos: BABYLON.Vector3) {
        this.parent.position = pos
    }

    set scale(s: BABYLON.Vector3) {
        this.parent.scaling = s
    }

    reset() {
        const BOX_SIZE = 12
        const BOX_HEIGHT = 6
        const CLOCK_COUNT = 13
        // Make the walls
        const color = BABYLON.Color3.Random()
        const box2 = BABYLON.MeshBuilder.CreateBox(`box_2timer`, { 
            height: BOX_HEIGHT,
            width: BOX_SIZE,
            depth: BOX_SIZE,
            sideOrientation: 1 })
        box2.checkCollisions = true
        box2.isPickable = false
        box2.setParent(this.parent)
        box2.position.y = 0.5 * BOX_HEIGHT + 0.01
        const mat2 = new BABYLON.PBRMaterial("")
        mat2.stencil.enabled = true
        mat2.albedoColor = color
        mat2.metallic = 0
        mat2.roughness = 1
        box2.material = mat2
        box2.receiveShadows = true
        // Make an instructional sign

        // Make clocks and position them around the room
        const shuffledClockPositions = shuffle([...Array(BOX_SIZE * BOX_HEIGHT * 4).keys()])
        for (let i = 0; i < CLOCK_COUNT; i++) {
            const c = new Clock({count: 30 + 5 * i}, this.scene)
            // Place each clock on the wall
            const faceIndex = Math.floor(shuffledClockPositions[i] / (BOX_SIZE * BOX_HEIGHT))
            const clockPositionIndex = shuffledClockPositions[i] % (BOX_SIZE * BOX_HEIGHT)
            const x = clockPositionIndex % BOX_SIZE + - 0.5 * BOX_SIZE + 0.5
            const y = Math.floor(clockPositionIndex / BOX_SIZE) + 0.5
            c.position = new Vector3(x, y, 0.5 * BOX_SIZE)
            c.model.rotateAround(this.parent.position, Vector3.UpReadOnly, 0.5 * Math.PI * faceIndex)
            c.model.onPointerPick = () => {
                c.stop()
                if (c.state === 'passed') { // Change to 13

                }
            }
        }

        // Watch for the challenge to be complete
        // Either through failed clocks or all passed
    }
}