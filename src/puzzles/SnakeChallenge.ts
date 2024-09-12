import { ColorMaterial, TextMaterial } from '@/core/textures'
import { InteractiveMesh } from '@/Types'
const { TransformNode, Vector2, Vector3, MeshBuilder } = BABYLON

const BOX_HEIGHT = 6
const BOX_SIZE = 12
const TICK_RATE = 30

const infoText = ['Eat apples to grow', 'to size 13.', "Don't get stuck."]

type Direction = 'up' | 'down' | 'left' | 'right'

class Snake {
    body: BABYLON.Vector2[]
    direction: Direction
    alive: boolean
    color: string
    constructor(start: BABYLON.Vector2) {
        this.body = [start, start]
        this.direction = 'up'
        this.alive = true
        this.color = BABYLON.Color3.Random().toHexString()
    }
}
const Up = new Vector2(0, 1)
const Down = new Vector2(0, -1)
const Left = new Vector2(-1, 0)
const Right = new Vector2(1, 0)

const moveDirection = (
    head: BABYLON.Vector2,
    direction: Direction
): BABYLON.Vector2 => {
    if (direction === 'up') return head.clone().addInPlace(Up)
    if (direction === 'down') return head.clone().addInPlace(Down)
    if (direction === 'left') return head.clone().addInPlace(Left)
    if (direction === 'right') return head.clone().addInPlace(Right)
    return head
}

class SnakePuzzle {
    width: number
    height: number
    tickRate: number
    food: BABYLON.Vector2[]
    snakes: Snake[]
    running: boolean
    solved: boolean
    failed: boolean
    target?: BABYLON.Nullable<BABYLON.Vector2>
    constructor() {
        this.width = 10
        this.height = 10
        this.tickRate = 500
        this.food = []
        this.snakes = [
            new Snake(
                new Vector2(
                    Math.floor(this.width / 2),
                    Math.floor(this.height / 2)
                )
            ),
        ]
        this.target = null
        this.running = true
        this.solved = false
        this.failed = false
    }

    get score() {
        return this.snakes[0].body.length
    }
    setSnakeDirection(index: number, direction: Direction) {
        this.snakes[index].direction = direction
    }
    spaceHasFood(pos: BABYLON.Vector2) {
        return this.food.some((f) => f.equals(pos))
    }
    spaceHasSnakes(pos: BABYLON.Vector2) {
        return this.snakes.some(
            (s) => s.alive && s.body.some((b) => b.equals(pos))
        )
    }
    spaceIsEmpty(pos: BABYLON.Vector2) {
        return !this.spaceHasFood(pos) && !this.spaceHasSnakes(pos)
    }
    spaceIsOnBoard(pos: BABYLON.Vector2) {
        return (
            pos.x >= 0 &&
            pos.x < this.width &&
            pos.y >= 0 &&
            pos.y < this.height
        )
    }
    isSolved() {
        if (this.solved) return this.solved
        if (this.snakes.some((snake) => snake.body.length >= 13)) {
            // Do sfx and stuff
            this.solved = true
        }
        return this.solved
    }
    tick() {
        this.snakes.forEach((snake) => {
            if (!snake.alive) return
            // Update the move direction
            if (this.target) {
                const head = snake.body[0]
                // head.position
                const distX = this.target.x - head.x
                const distY = this.target.y - head.y
                let desiredDirection = snake.direction
                if (Math.abs(distY) > Math.abs(distX)) {
                    desiredDirection = distY < 0 ? 'down' : 'up'
                } else {
                    desiredDirection = distX < 0 ? 'left' : 'right'
                }
                if (!this.spaceHasSnakes(moveDirection(head, desiredDirection)))
                    snake.direction = desiredDirection
            }

            const desiredSpot = moveDirection(snake.body[0], snake.direction)
            // Check for walls
            if (
                !this.spaceIsOnBoard(desiredSpot) ||
                this.spaceHasSnakes(desiredSpot)
            ) {
                // Fail state
                snake.alive = false
                this.failed = true
            }

            // Remove the tail
            snake.body.pop()

            // Food
            if (this.spaceHasFood(desiredSpot)) {
                // Snake Grows
                snake.body.push(snake.body[snake.body.length - 1])
                // Food is removed
                this.food = this.food.filter((f) => !f.equals(desiredSpot))
            }

            // Add a segment to the body at the front
            snake.body.unshift(desiredSpot)
        })

        if (this.food.length == 0) {
            // Find an empty spot
            const potentialFood = new Vector2(
                Math.floor(Math.random() * this.width),
                Math.floor(Math.random() * this.height)
            )
            while (!this.spaceIsEmpty(potentialFood)) {
                potentialFood.x = Math.floor(Math.random() * this.width)
                potentialFood.y = Math.floor(Math.random() * this.height)
            }
            this.food.push(potentialFood)
        }
        if (this.snakes.every((s) => !s.alive)) this.running = false
    }
}

export class SnakeChallenge {
    state: 'intro' | 'running'
    scene: BABYLON.Scene

    parent: BABYLON.TransformNode
    boardParent: BABYLON.TransformNode
    infoBillboard?: BABYLON.Mesh
    scoreboard?: BABYLON.Mesh

    puzzle: SnakePuzzle
    elapsedMs: number
    currentFrame: number
    solved = false
    failed = false

    constructor(scene: BABYLON.Scene) {
        this.scene = scene
        this.puzzle = new SnakePuzzle()
        this.parent = new TransformNode('SnakeChallenge', this.scene)
        this.boardParent = new TransformNode('Board', this.scene)
        this.boardParent.setParent(this.parent)
        this.boardParent.position = new Vector3(-3.5, 1, 3)
        this.boardParent.scaling = new Vector3(0.5, 0.5, 0.5)
        this.state = 'intro'
        this.elapsedMs = 0
        this.currentFrame = 0
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
        if (this.puzzle.failed) {
            // Animations, sfx
            this.failed = true
        }

        return this.failed
    }

    clock = () => {
        if (this.state !== 'running') return
        this.elapsedMs += 1
        if (this.elapsedMs >= TICK_RATE) {
            if (this.puzzle) this.puzzle.tick()
            this.updateMeshes()
            this.elapsedMs = 0
            this.currentFrame += 1
        }
    }
    reset() {
        this.puzzle = new SnakePuzzle()
        this.scene.unregisterBeforeRender(this.clock)
        this.scene.registerBeforeRender(this.clock)

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
            `snake_challenge_walls`,
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

        // Control plane
        const plane = MeshBuilder.CreatePlane(
            'control',
            {
                width: BOX_SIZE,
                height: BOX_HEIGHT,
            },
            this.scene
        ) as InteractiveMesh
        plane.setParent(this.parent)
        plane.position = new Vector3(
            0,
            BOX_HEIGHT * 0.5,
            this.boardParent.position.z
        )
        plane.isPickable = true
        plane.visibility = 0
        const buddy = MeshBuilder.CreateSphere(
            'buddy',
            {
                diameter: 0.5,
            },
            this.scene
        )
        buddy.setParent(this.parent)
        buddy.isPickable = false
        plane.onPointerMove = (pickingInfo) => {
            if (!pickingInfo?.pickedPoint) return

            buddy.position = pickingInfo?.pickedPoint
            // Convert to board space
            const boardPosition = new Vector2(
                buddy.position.x - this.boardParent.position.x,
                buddy.position.y - this.boardParent.position.y
            ).scaleInPlace(1 / this.boardParent.scaling.x)
            this.puzzle.target = boardPosition
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

        // Board dots
        for (let y = 0; y < this.puzzle.height; y++) {
            for (let x = 0; x < this.puzzle.width; x++) {
                const dot = MeshBuilder.CreateCylinder(
                    `board_dot_${x}-${y}`,
                    { height: 0.2, diameter: 0.2 },
                    this.scene
                )
                dot.isPickable = false
                dot.setParent(this.boardParent)
                dot.scaling = Vector3.One()
                dot.position = new Vector3(x, y, 0)
                dot.rotation = new Vector3(Math.PI / 2, 0, 0)
            }
        }
        this.updateMeshes()
    }

    updateMeshes() {
        // Update snakes
        const { snakes, food } = this.puzzle
        snakes.forEach((snake, snakeIndex) => {
            snake.body.forEach((pos, snakeBodyIndex) => {
                let snakeBodyMesh = this.scene.getMeshByName(
                    `snake_${snakeIndex}_${pos.x}-${pos.y}`
                )
                if (!snakeBodyMesh) {
                    snakeBodyMesh = MeshBuilder.CreateBox(
                        `snake_${snakeIndex}_${pos.x}-${pos.y}`,
                        { size: 0.95 },
                        this.scene
                    )
                    snakeBodyMesh.isPickable = false
                    snakeBodyMesh.setParent(this.boardParent)
                    snakeBodyMesh.scaling = Vector3.One()
                    snakeBodyMesh.position = new Vector3(pos.x, pos.y, 0)
                }
                snakeBodyMesh.metadata = { frame: this.currentFrame }
                snakeBodyMesh.material = ColorMaterial(
                    snake.color,
                    { glow: false },
                    this.scene
                )
            })
        })
        food.forEach((pos) => {
            let foodMesh = this.scene.getMeshByName(`food_${pos.x}-${pos.y}`)
            if (!foodMesh) {
                foodMesh = MeshBuilder.CreateSphere(
                    `food_${pos.x}-${pos.y}`,
                    { diameter: 1 },
                    this.scene
                )
                foodMesh.isPickable = false
                foodMesh.setParent(this.boardParent)
                foodMesh.scaling = Vector3.One()
                foodMesh.position = new Vector3(pos.x, pos.y, 0)
            }
            foodMesh.metadata = { frame: this.currentFrame }
        })
        // Unused spaces
        this.boardParent.getChildMeshes(true).forEach((c) => {
            if (!c.metadata) return
            if (c.metadata.frame !== this.currentFrame) c.dispose()
        })
        // Scoreboard
        if (!this.scoreboard) {
            // Scoreboard
            const scoreboard = MeshBuilder.CreatePlane(
                'scoreboard',
                {
                    width: 1,
                    height: 1,
                    sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                },
                this.scene
            )
            scoreboard.setParent(this.parent)
            scoreboard.isPickable = false
            scoreboard.position = new Vector3(
                0,
                0.5,
                this.boardParent.position.z - 0.5
            )
            this.scoreboard = scoreboard
        }
        this.scoreboard.material = TextMaterial(
            [`${this.puzzle.score}`],
            this.scene
        )
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
