import { ColorMaterial, TextMaterial } from '@/core/textures'
import { shuffle } from '@/core/Utils'
import { InteractiveMesh } from '@/Types'
const { TransformNode, Vector3, MeshBuilder } = BABYLON

const BOX_HEIGHT = 12
const BOX_SIZE = 6

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

    pressButton(index: number) {
        const button = this.buttons[index]
        if (button.on) return
        if (!button.connectedLights.length) {
            this.reset()
            return
        }
        button.connectedLights.forEach((l) => {
            this.board[l.y][l.x] = 0
        })
        button.on = true
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
        // Remove the lights, buttons, walls
        this.buttonsParent.dispose()
        this.lightsParent.dispose()
        this.state = 'intro'
        this.solved = false
        this.failed = false

        const { board, buttons } = this.puzzle

        // Make the walls
        const color = BABYLON.Color3.Random()
        const mat2 = new BABYLON.PBRMaterial('')
        mat2.albedoColor = color
        mat2.metallic = 0
        mat2.roughness = 1
        const box2 = MeshBuilder.CreateBox(`button_challenge_box`, {
            height: BOX_HEIGHT,
            width: BOX_SIZE,
            depth: BOX_SIZE,
            sideOrientation: 1,
        })
        box2.checkCollisions = true
        box2.isPickable = false
        box2.setParent(this.parent)
        box2.position.y = 0.5 * BOX_HEIGHT + 0.01
        box2.material = mat2
        box2.receiveShadows = true

        // Make the light meshes
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                // Prepare the mesh
                const light = MeshBuilder.CreateSphere(
                    `light_${x}-${y}`,
                    { diameter: 0.3 },
                    this.scene
                )
                light.material = ColorMaterial(
                    '#ffffff',
                    { glow: board[y][x] === 1 },
                    this.scene
                )
                light.setParent(this.lightsParent)
                light.position = new Vector3(x * 0.3, y * -0.3, 1)
            }
        }

        // Make button meshes
        for (let i = 0; i < buttons.length; i++) {
            const size = Math.floor(Math.random() * 3) * 0.075 + 0.2
            const color = BABYLON.Color3.Random()
            const mat2 = new BABYLON.PBRMaterial('')
            mat2.albedoColor = color
            mat2.metallic = 0
            mat2.roughness = 1
            // Shape
            const button = MeshBuilder.CreateBox(
                `button_${i}`,
                { width: size, depth: size, height: 0.1 },
                this.scene
            ) as InteractiveMesh
            button.material = mat2
            button.setParent(this.buttonsParent)
            button.position = new Vector3(
                Math.floor(i / 4) * 0.35,
                0.5,
                (i % 4) * 0.25
            )
            button.onPointerPick = () => {
                this.start()
                this.puzzle.pressButton(i)
                this.updateMeshes()
            }
        }

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
        infoBillboard.material = TextMaterial(infoText, this.scene)
        infoBillboard.setParent(this.parent)
        infoBillboard.isPickable = true
        infoBillboard.position = new Vector3(0, 1.5, -0.126)
        infoBillboard.onPointerPick = () => {
            this.start()
        }
        this.infoBillboard = infoBillboard
    }

    updateMeshes() {
        // Update lights
        const { board, buttons } = this.puzzle
        board.forEach((row, y) => {
            row.forEach((val, x) => {
                const lightMesh = this.scene.getMeshByName(`light_${x}-${y}`)
                if (!lightMesh) return
                lightMesh.material = ColorMaterial(
                    '#ffffff',
                    { glow: val === 1 },
                    this.scene
                )
            })
        })
        // Update buttons
        buttons.forEach((button, i) => {
            const buttonMesh = this.scene.getMeshByName(`button_${i}`)
            if (!buttonMesh) return
            const mat = ColorMaterial(
                '#ffffff',
                { glow: button.on },
                this.scene
            )
            buttonMesh.material = mat
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
