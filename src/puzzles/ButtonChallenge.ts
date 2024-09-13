import { AnimationFactory } from '@/core/Animation'
import {
    BLACK,
    BLUE,
    BROWN,
    DARK_GREEN,
    WHITE,
    MID_GREY,
    ORANGE,
    YELLOW,
} from '@/core/Colors'
import { ButtonPressedSFX, BadThingSFX } from '@/core/Sounds'
import { TextMaterial } from '@/core/textures'
import { debug, sample, shuffle } from '@/core/Utils'
import { InteractiveMesh } from '@/Types'
const { TransformNode, Vector3, Color3, MeshBuilder } = BABYLON

const BOX_HEIGHT = 6
const BOX_SIZE = 12

const RESET_BUTTONS = 5
const CORRECT_BUTTONS = 13

const infoText = [
    'Hit the correct buttons',
    'to reveal the answer.',
    'Beware RESET buttons.',
]

const lightWallSolution = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]

type LightPos = {
    x: number
    y: number
}

class LightButton {
    connectedLights: LightPos[]
    on: boolean
    constructor() {
        this.connectedLights = []
        this.on = false
    }
    addLight(l: LightPos) {
        this.connectedLights.push(l)
    }
}

class LightButtonPuzzle {
    solution: number[][]
    board: number[][]
    solved: boolean
    buttons: LightButton[]

    constructor() {
        this.solution = [...lightWallSolution]
        this.board = []
        this.solved = false
        this.buttons = []
        const correctLocations: { x: number; y: number }[] = []
        for (let y = 0; y < this.solution.length; y++) {
            for (let x = 0; x < this.solution[y].length; x++) {
                if (this.solution[y][x] == 0) {
                    correctLocations.push({ x, y })
                }
            }
        }
        shuffle(correctLocations)

        for (let i = 0; i < CORRECT_BUTTONS; i++) {
            // Correct buttons
            this.buttons.push(new LightButton())
        }
        correctLocations.forEach((l, i) =>
            this.buttons[i % this.buttons.length].addLight(l)
        )
        for (let i = 0; i < RESET_BUTTONS; i++) {
            // Reset Buttons
            this.buttons.push(new LightButton())
        }
        this.buttons = shuffle(this.buttons)
        this.reset()
    }

    pressButton(index: number): boolean {
        const button = this.buttons[index]
        if (button.on) return false
        if (!button.connectedLights.length) {
            this.reset()
            return true
        }
        button.connectedLights.forEach((l) => {
            this.board[l.y][l.x] = 0
        })
        button.on = true
        return false
    }

    isSolved() {
        if (this.solved) return true
        let solved = true
        for (let y = 0; y < this.solution.length; y++) {
            for (let x = 0; x < this.solution[y].length; x++) {
                solved = solved && this.solution[y][x] == this.board[y][x]
            }
        }
        if (solved) {
            this.solved = true
        }
        return solved
    }

    reset() {
        this.solved = false
        this.buttons.forEach((b) => (b.on = false))
        this.board = this.solution.map((y) => y.map(() => 1))
    }
}

export class ButtonChallenge {
    state: 'intro' | 'running'
    scene: BABYLON.Scene

    parent: BABYLON.TransformNode
    lightsParent: BABYLON.TransformNode
    buttonsParent: BABYLON.TransformNode
    infoBillboard?: BABYLON.Mesh

    puzzle: LightButtonPuzzle
    solved = false
    failed = false

    constructor(scene: BABYLON.Scene) {
        this.scene = scene
        this.puzzle = new LightButtonPuzzle()
        this.parent = new TransformNode('ButtonChallenge', this.scene)
        this.lightsParent = new TransformNode('Lights', this.scene)
        this.lightsParent.setParent(this.parent)
        this.lightsParent.position = new Vector3(-1.5, 3, 0)
        this.buttonsParent = new TransformNode('Buttons', this.scene)
        this.buttonsParent.setParent(this.parent)
        this.buttonsParent.rotateAround(
            Vector3.Zero(),
            Vector3.Right(),
            Math.PI * -0.15
        )
        this.buttonsParent.position = new Vector3(-0.5, 0.35, -2)

        this.state = 'intro'
        if (debug) console.log('ButtonChallenge created')
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
        if (debug) return true
        if (this.state !== 'running') return false
        if (this.solved) return true
        if (this.puzzle.isSolved()) {
            // Celebration
            this.solved = true
        }
        return this.solved
    }

    isFailed() {
        if (this.state !== 'running') return false
        if (this.failed) return true

        return this.failed
    }

    reset() {
        this.parent.setEnabled(true)
        // this.buttonsParent.dispose()
        // this.lightsParent.dispose()

        this.state = 'intro'
        this.solved = false
        this.failed = false

        // Make the walls
        const color = Color3.Random()
        const mat2 = new BABYLON.PBRMaterial('')
        mat2.albedoColor = color
        mat2.metallic = 0
        mat2.roughness = 1
        const box2 = MeshBuilder.CreateBox(
            `button_challenge_walls`,
            {
                height: BOX_HEIGHT,
                width: BOX_SIZE,
                depth: BOX_SIZE,
                sideOrientation: 1,
            },
            this.scene
        )
        box2.checkCollisions = true
        box2.isPickable = false
        box2.setParent(this.parent)
        box2.position.y = 0.5 * BOX_HEIGHT + 0.01
        box2.material = mat2
        box2.receiveShadows = true

        // Make an instructional sign
        const infoBillboard = MeshBuilder.CreatePlane(
            'billboard',
            {
                width: 2,
                height: 1,
                sideOrientation: BABYLON.Mesh.DOUBLESIDE,
            },
            this.scene
        ) as InteractiveMesh
        infoBillboard.material = TextMaterial(infoText, ORANGE, this.scene)
        infoBillboard.setParent(this.parent)
        infoBillboard.isPickable = true
        infoBillboard.position = new Vector3(0, 1.5, -0.126)
        infoBillboard.onPointerPick = () => {
            this.start()
        }
        this.infoBillboard = infoBillboard
        this.updateMeshes()
    }

    updateMeshes() {
        // Update lights
        const { board, buttons } = this.puzzle
        board.forEach((row, y) => {
            row.forEach((val, x) => {
                const lightMeshName = `light_${x}-${y}`
                let lightMesh = this.scene.getMeshByName(lightMeshName)
                if (!lightMesh) {
                    const mat2 = new BABYLON.PBRMaterial(
                        `light_${x}_${y}`,
                        this.scene
                    )
                    mat2.metallic = 0
                    mat2.roughness = 1

                    // Prepare the mesh
                    lightMesh = MeshBuilder.CreateSphere(
                        lightMeshName,
                        { diameter: 0.3 },
                        this.scene
                    )
                    lightMesh.metadata = { color: '#ffffff' }
                    lightMesh.material = mat2
                    lightMesh.setParent(this.lightsParent)
                    lightMesh.position = new Vector3(x * 0.3, y * -0.3, 1)
                }
                if (lightMesh.material) {
                    const mat = lightMesh.material as BABYLON.PBRMaterial
                    mat.name = `light${val ? '_glow' : ''}`
                    mat.albedoColor = val
                        ? lightMesh.metadata.color
                        : Color3.Black()
                    mat.emissiveColor = val
                        ? lightMesh.metadata.color
                        : Color3.Black()
                }
            })
        })
        // Update buttons
        buttons.forEach((button, i) => {
            const buttonName = `button_${i}`
            let buttonMesh = this.scene.getMeshByName(
                buttonName
            ) as InteractiveMesh
            if (!buttonMesh) {
                const size = Math.floor(Math.random() * 3) * 0.075 + 0.2
                const color = Color3.FromHexString(
                    sample([DARK_GREEN, BLUE, YELLOW, MID_GREY, BROWN, BLACK])
                )
                const mat2 = new BABYLON.PBRMaterial(`button_${i}`)
                mat2.metallic = 0
                mat2.roughness = 1
                // Shape
                buttonMesh = MeshBuilder.CreateCylinder(
                    buttonName,
                    {
                        diameter: size,
                        height: 0.1,
                        tessellation: Math.floor(Math.random() * 3) + 3,
                    },
                    this.scene
                ) as InteractiveMesh
                buttonMesh.metadata = { color: color }
                buttonMesh.material = mat2
                buttonMesh.setParent(this.buttonsParent)
                buttonMesh.position = new Vector3(
                    Math.floor(i / 4) * 0.35,
                    0.5,
                    (i % 4) * 0.25
                )
                buttonMesh.onPointerPick = () => {
                    buttonMesh.scaling = new Vector3(1, 0.5, 1)
                    AnimationFactory.Instance.animateTransform({
                        mesh: buttonMesh,
                        end: {
                            scaling: new Vector3(1, 1, 1),
                        },
                        duration: 60,
                    })
                    this.start()
                    const wasReset = this.puzzle.pressButton(i)
                    wasReset ? BadThingSFX() : ButtonPressedSFX()
                    this.updateMeshes()
                }
            }
            if (buttonMesh.material) {
                console.log('updating mat', i, button)
                const mat = buttonMesh.material as BABYLON.PBRMaterial
                // mat.name = `button_${i}${button.on ? '_glow' : ''}`
                mat.albedoColor = button.on
                    ? Color3.FromHexString(WHITE)
                    : buttonMesh.metadata.color
                mat.emissiveColor = Color3.Black()
            }
        })
    }

    start() {
        if (this.state !== 'intro') return
        this.state = 'running'
        this.infoBillboard?.setEnabled(false)
    }
    stop() {
        this.parent.setEnabled(false)
    }
}
