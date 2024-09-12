import { BLUE, GREEN, ORANGE, RED } from '@/core/Colors'
import { TextMaterial } from '@/core/textures'
import { debug, shuffle } from '@/core/Utils'
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

    pickRack(i: number) {
        const val = this.rack[i]
        if (this.selected) {
            this.rack.push(this.selected)
        }
        this.selected = val
        this.rack = this.rack.filter((v) => v !== val)
    }

    pickBoard(x: number, y: number) {
        if (clues.includes(`${x},${y}`)) return
        const tileToPlace = this.selected
        this.selected = this.board[y][x]
        this.board[y][x] = tileToPlace
        if (debug) console.log(this.toString())
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
    toString() {
        let result = ''
        this.board.forEach((row) => {
            result += `${row.join(' ')}\n`
        })
        result += `*${this.rack.join('*')}*`
        return result
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
        this.rackParent.position = new Vector3(-2.5, 1, 2)
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
        const { board, rack, selected } = this.puzzle
        const inventoryParent = this.scene.getMeshByName('inventory-parent')
        board.forEach((row, y) => {
            row.forEach((val, x) => {
                const clueSlot = clues.includes(`${x},${y}`)
                // The slots
                const slotName = `magic_box_slot_${x}-${y}`
                let slotMesh = this.scene.getMeshByName(
                    slotName
                ) as InteractiveMesh
                if (!slotMesh) {
                    slotMesh = MeshBuilder.CreateBox(
                        slotName,
                        {
                            width: 0.5,
                            height: 0.5,
                            depth: 0.1,
                        },
                        this.scene
                    ) as InteractiveMesh
                    slotMesh.setParent(this.boardParent)
                    slotMesh.position = new Vector3(x, -1 * y, 0.1)
                    slotMesh.scaling = Vector3.One()
                    if (!clueSlot)
                        slotMesh.onPointerPick = () => {
                            this.puzzle.pickBoard(x, y)
                            this.updateMeshes()
                        }
                }

                if (!val) return
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
                    tileMesh.isPickable = false
                    tileMesh.material = TextMaterial(
                        [`${val ? val / 10 : ''}`],
                        clueSlot ? GREEN : ORANGE,
                        this.scene
                    )
                }
                tileMesh.setParent(this.boardParent)
                tileMesh.scaling = Vector3.One()
                tileMesh.position = new Vector3(x, -1 * y, 0)
            })
        })

        rack.forEach((val, i) => {
            const slotName = `magic_box_rack_${i}`
            let slotMesh = this.scene.getMeshByName(slotName) as InteractiveMesh
            if (!slotMesh) {
                slotMesh = MeshBuilder.CreateBox(
                    slotName,
                    {
                        width: 0.5,
                        height: 0.5,
                        depth: 0.1,
                    },
                    this.scene
                ) as InteractiveMesh
                slotMesh.setParent(this.rackParent)
                slotMesh.position = new Vector3(i, 0, 0.1)
                slotMesh.scaling = Vector3.One()
                slotMesh.onPointerPick = () => {
                    this.puzzle.pickRack(i)
                    this.updateMeshes()
                }
            }

            if (!val) return
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
                tileMesh.isPickable = false
                tileMesh.material = TextMaterial(
                    [`${val ? val / 10 : ''}`],
                    ORANGE,
                    this.scene
                )
            }
            tileMesh.setParent(this.rackParent)
            tileMesh.scaling = Vector3.One()
            tileMesh.position = new Vector3(1 * i, 0, 0)
        })

        if (selected) {
            const tileName = `magic_box_tile_${selected}`
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
                tileMesh.isPickable = false
                tileMesh.material = TextMaterial(
                    [`${selected ? selected / 10 : ''}`],
                    ORANGE,
                    this.scene
                )
            }
            tileMesh.setParent(inventoryParent)
            tileMesh.scaling = Vector3.One()
            tileMesh.position = new Vector3(0, 1, 0)
        }
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
