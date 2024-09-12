import { TextMaterial } from '@/core/textures'
import { shuffle } from '@/core/Utils'
import { InteractiveMesh } from '@/Types'
const { TransformNode, Vector3, MeshBuilder } = BABYLON

const BOX_HEIGHT = 6
const BOX_SIZE = 12

const infoText = [
    'Place tiles to add up to 13',
    'in each row, column and',
    'diagonal',
]

const magicBox = [
    [13, 83, 33],
    [63, 43, 23],
    [53, 3, 73],
]

const startBox = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
]

// const clues = [
//     [0, 0],
//     [0, 1],
//     [1, 2],
// ]

const clues = ['0,0', '0,1', '1,2']

class MagicBoxPuzzle {
    solution: number[][]
    board: number[][]
    selected: number
    rack: number[]

    constructor() {
        this.solution = [...magicBox]
        this.board = [...startBox]
        this.selected = 0
        this.rack = []
        this.reset()
    }

    select(val: number) {
        if (this.selected) {
            this.rack.push(this.selected)
        }
        this.selected = val
    }

    placeTile(x: number, y: number) {
        if (!this.selected) return
        const tileToPlace = this.selected
        this.selected = this.board[y][x]
        this.board[y][x] = tileToPlace
    }

    rowSum(y: number) {
        let result = 0
        this.board[y].forEach((val) => (result += val))
        return result
    }

    colSum(x: number) {
        let result = 0
        this.board.forEach((row) => (result += row[x]))
        return result
    }

    isSolved() {
        return this.solution.every((row, y) =>
            row.every((val, x) => this.board[y][x] === val)
        )
    }

    reset() {
        this.solution = [...magicBox]
        this.selected = 0
        this.board = [...startBox]
        this.rack = []
        // TODO: Mirror on x or y or both
        // TODO: Rotate 0,1,2,3 * 90
        this.solution.forEach((row, y) => {
            row.forEach((val, x) => {
                if (clues.includes(`${x},${y}`)) this.board[y][x] = val
                else this.rack.push(val)
            })
        })
        this.rack = shuffle([...this.rack])
    }
}

export class MagicBoxChallenge {
    state: 'intro' | 'running'
    scene: BABYLON.Scene

    parent: BABYLON.TransformNode
    boardParent: BABYLON.TransformNode
    rackParent: BABYLON.TransformNode
    infoBillboard?: BABYLON.Mesh
    scoreboard?: BABYLON.Mesh

    puzzle: MagicBoxPuzzle
    solved = false
    failed = false

    constructor(scene: BABYLON.Scene) {
        this.scene = scene
        this.puzzle = new MagicBoxPuzzle()
        this.parent = new TransformNode('MagicBoxChallenge', this.scene)
        this.boardParent = new TransformNode('Board', this.scene)
        this.boardParent.setParent(this.parent)
        this.boardParent.position = new Vector3(-1, 5, 3)
        this.boardParent.scaling = new Vector3(1, 1, 1)
        this.rackParent = new TransformNode('Board', this.scene)
        this.rackParent.setParent(this.parent)
        this.rackParent.position = new Vector3(-1, 1, 2)
        this.rackParent.scaling = new Vector3(1, 1, 1)
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
        return false
    }

    reset() {
        this.puzzle = new MagicBoxPuzzle()

        // Remove the lights, buttons, walls
        // this.boardParent.dispose()
        this.state = 'intro'
        this.solved = false
        this.failed = false

        // Make the walls
        const color = BABYLON.Color3.Random()
        const mat2 = new BABYLON.PBRMaterial('')
        mat2.albedoColor = color
        mat2.metallic = 0
        mat2.roughness = 1
        const box2 = MeshBuilder.CreateBox(
            `magicbox_challenge_walls`,
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
        infoBillboard.material = TextMaterial(infoText, this.scene)
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
        const { board, rack, selected } = this.puzzle

        board.forEach((row, y) => {
            row.forEach((val, x) => {
                if (!val) return
                // The slots

                // The numbers
                const tileName = `magic_box_tile_${val}`
                let tileMesh = this.scene.getMeshByName(
                    tileName
                ) as BABYLON.Mesh
                if (!tileMesh) {
                    tileMesh = MeshBuilder.CreatePlane(
                        tileName,
                        {
                            width: 0.8,
                            height: 0.8,
                            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                        },
                        this.scene
                    )
                    tileMesh.setParent(this.boardParent)
                    tileMesh.scaling = Vector3.One()
                    tileMesh.material = TextMaterial(
                        [`${val ? val / 10 : ''}`],
                        this.scene
                    )
                }
                tileMesh.position = new Vector3(x, -1 * y, 0)
            })
        })

        rack.forEach((val, i) => {
            const tileName = `magic_box_tile_${val}`
            let tileMesh = this.scene.getMeshByName(tileName) as BABYLON.Mesh
            if (!tileMesh) {
                tileMesh = MeshBuilder.CreatePlane(
                    tileName,
                    {
                        width: 0.8,
                        height: 0.8,
                        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                    },
                    this.scene
                )
                tileMesh.setParent(this.rackParent)
                tileMesh.scaling = Vector3.One()
                tileMesh.material = TextMaterial(
                    [`${val ? val / 10 : ''}`],
                    this.scene
                )
            }
            tileMesh.position = new Vector3(1 * i, 0, 0)
        })

        // Update the selected item
        // Update the board
        // Update the totals
        // Update the rack
        // MagicBox Board
        // food.forEach((pos) => {
        //     let foodMesh = this.scene.getMeshByName(`food_${pos.x}-${pos.y}`)
        //     if (!foodMesh) {
        //         foodMesh = MeshBuilder.CreateSphere(
        //             `food_${pos.x}-${pos.y}`,
        //             { diameter: 1 },
        //             this.scene
        //         )
        //         foodMesh.isPickable = false
        //         foodMesh.setParent(this.boardParent)
        //         foodMesh.scaling = Vector3.One()
        //         foodMesh.position = new Vector3(pos.x, pos.y, 0)
        //     }
        //     foodMesh.metadata = { frame: this.currentFrame }
        // })
        // MagicBox Totals
        // // Scoreboard
        // if (!this.scoreboard) {
        //     // Scoreboard
        //     const scoreboard = MeshBuilder.CreatePlane(
        //         'scoreboard',
        //         {
        //             width: 1,
        //             height: 1,
        //             sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        //         },
        //         this.scene
        //     )
        //     scoreboard.setParent(this.parent)
        //     scoreboard.isPickable = false
        //     scoreboard.position = new Vector3(
        //         0,
        //         0.5,
        //         this.boardParent.position.z - 0.5
        //     )
        //     this.scoreboard = scoreboard
        // }
        // this.scoreboard.material = TextMaterial(
        //     [`${this.puzzle.score}`],
        //     this.scene
        // )
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
