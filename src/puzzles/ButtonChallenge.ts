import { ColorMaterial, TextMaterial } from "@/core/textures"
import { debug, shuffle } from "@/core/Utils"
import { InteractiveMesh } from "@/Types"
const { TransformNode, Vector3, MeshBuilder } = BABYLON

const infoText = [
    'Hit the correct buttons', 
    'to reveal the answer.', 
    'Beware RESET buttons.'
]

const lightWall = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,0,0,1,1,1,0,0,0],
    [0,0,0,0,1,0,0,0,0,0,1,0,0],
    [0,0,0,0,1,0,0,0,1,1,0,0,0],
    [0,0,0,0,1,0,0,0,0,0,1,0,0],
    [0,0,0,0,1,0,0,1,0,0,1,0,0],
    [0,0,1,1,1,1,0,0,1,1,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0]
]

export class ButtonChallenge {
    state: 'intro'|'running'
    scene: BABYLON.Scene
    
    parent: BABYLON.TransformNode
    lightsParent: BABYLON.TransformNode
    buttonsParent: BABYLON.TransformNode
    infoBillboard?: BABYLON.Mesh
    buttons?: InteractiveMesh[]

    solved = false
    failed = false
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene
        this.parent = new TransformNode('ButtonChallenge', this.scene)
        this.lightsParent = new TransformNode('Lights', this.scene)
        this.lightsParent.setParent(this.parent)
        this.lightsParent.position = new Vector3(-1.5, 3, 0)
        this.buttonsParent = new TransformNode('Buttons', this.scene)
        this.buttonsParent.setParent(this.parent)
        this.buttonsParent.rotateAround(Vector3.Zero(), Vector3.Right(), Math.PI * -0.15 )
        this.buttonsParent.position = new Vector3(-0.5, 0.35, -2)
        this.state = 'intro'
        // this.reset()
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

    isSolved() {
        if (this.state !== 'running') return false
        if (this.solved) return true
        
        return this.solved
    }

    isFailed() {
        if (this.state !== 'running') return false
        if (this.failed) return true
        let failedClocks = 0
        this.buttons?.forEach((c) => {if (c.state === 'failed') failedClocks++})
        this.failed = failedClocks >= 3

        if (this.failed) {
            // TODO: Run the failure event
        }

        return this.failed
    }

    reset() {
        this.parent.dispose()
        this.state = 'intro'
        this.solved = false
        this.failed = false
        this.buttons = []
        const RESET_BUTTONS = 5
        const CORRECT_BUTTONS = 13
        const BOX_SIZE = 12
        const BOX_HEIGHT = 6
        
        // Make the walls
        const color = BABYLON.Color3.Random()
        const mat2 = new BABYLON.PBRMaterial("")
        mat2.albedoColor = color
        mat2.metallic = 0
        mat2.roughness = 1
        const box2 = MeshBuilder.CreateBox(`button_challenge_box`, { 
            height: BOX_HEIGHT,
            width: BOX_SIZE,
            depth: BOX_SIZE,
            sideOrientation: 1 })
        box2.checkCollisions = true
        box2.isPickable = false
        box2.setParent(this.parent)
        box2.position.y = 0.5 * BOX_HEIGHT + 0.01
        box2.material = mat2
        box2.receiveShadows = true

        // Make the light wall
        for(let y = 0; y < lightWall.length; y++) {
            for (let x = 0; x < lightWall[y].length; x++) {
                const light = MeshBuilder.CreateSphere(`light_${x}-${y}`, { diameter: 0.3 }, this.scene)
                light.material = ColorMaterial("#ffffff", {glow: lightWall[y][x] === 1}, this.scene)
                light.setParent(this.lightsParent)
                light.position = new Vector3(x * 0.3, y * -0.3, 1)
            }
        }

        // Make buttons
        for (let i = 0; i < RESET_BUTTONS + CORRECT_BUTTONS; i++) {
            const size = Math.floor(Math.random() * 3) * 0.075 + 0.2
            const color = BABYLON.Color3.Random()
            const mat2 = new BABYLON.PBRMaterial("")
            mat2.albedoColor = color
            mat2.metallic = 0
            mat2.roughness = 1
            // Shape
            const button = MeshBuilder.CreateBox(`button_${i}`, {width: size, depth: size, height: 0.1}, this.scene) as InteractiveMesh
            button.material = mat2
            button.setParent(this.buttonsParent)
            button.position = new Vector3(Math.floor(i / 4) * 0.35, 0.5, i % 4 * 0.25)
            button.onPointerPick = () => {
                if (i > CORRECT_BUTTONS) {
                    // Reset the light wall
                }
            }
        }


        // Make an instructional sign
        const infoBillboard = MeshBuilder.CreatePlane('billboard', {
            width: 2,
            height: 1,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene) as InteractiveMesh
        infoBillboard.material = TextMaterial(infoText, this.scene)
        infoBillboard.setParent(this.parent)
        infoBillboard.isPickable = true
        infoBillboard.position = new Vector3(0, 1.5, -0.126)
        infoBillboard.onPointerPick = () => {
            this.start()
        }   
        this.infoBillboard = infoBillboard
    }
    start() {
        console.log('starting', this.buttons)
        this.state = 'running'
        this.infoBillboard?.setEnabled(false)
        // this.buttons?.forEach((c) => c.start())
    }
    stop() {
        this.parent.setEnabled(false)
    }
}