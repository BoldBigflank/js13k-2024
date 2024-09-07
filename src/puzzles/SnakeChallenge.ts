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
        this.running = true
        this.solved = false
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
            const desiredSpot = moveDirection(snake.body[0], snake.direction)
            // Check for walls
            if (
                !this.spaceIsOnBoard(desiredSpot) ||
                this.spaceHasSnakes(desiredSpot)
            ) {
                // Fail state
                snake.alive = false
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
        this.boardParent.position = new Vector3(-1.5, 3, 3)
        this.boardParent.scaling = new Vector3(0.1, 0.1, 0.1)
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

        return this.failed
    }

    clock = () => {
        if (this.state !== 'running') return
        this.elapsedMs += 1
        if (this.elapsedMs >= TICK_RATE) {
            console.log('tick', this.state)
            if (this.puzzle) this.puzzle.tick()
            this.updateMeshes()
            this.elapsedMs = 0
            this.currentFrame += 1
        }
    }
    reset() {
        console.log('reset')
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
        const box2 = MeshBuilder.CreateBox(`snake_challenge_walls`, {
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
                foodMesh.setParent(this.boardParent)
                foodMesh.scaling = Vector3.One()
                foodMesh.position = new Vector3(pos.x, pos.y, 0)
            }
            foodMesh.metadata = { frame: this.currentFrame }
        })
        // Empty spaces
        this.boardParent.getChildMeshes(true).forEach((c) => {
            if (c.metadata.frame !== this.currentFrame) c.dispose()
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
