import { BLUE, ORANGE } from '@/core/Colors'
import { BadThingSFX } from '@/core/Sounds'
import { TextMaterial } from '@/core/textures'
import { debug, shuffle } from '@/core/Utils'
import { Clock } from '@/meshes/Clock'
import { InteractiveMesh } from '@/Types'
const { TransformNode, Vector3, MeshBuilder } = BABYLON

export class TimerChallenge {
    state: 'intro' | 'running'
    scene: BABYLON.Scene

    parent: BABYLON.TransformNode
    infoBillboard?: BABYLON.Mesh
    scoreboardMesh?: BABYLON.Mesh
    clocks: Clock[]

    solved = false
    failed = false
    failedClocks = 0

    constructor(scene: BABYLON.Scene) {
        this.scene = scene
        this.parent = new TransformNode('TimerChallenge', this.scene)
        this.state = 'intro'
        this.clocks = []
        this.failedClocks = 0
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
        if (debug) return true
        if (this.state !== 'running') return false
        if (this.solved) return true
        let failedClocks = 0
        let runningClocks = 0
        this.clocks?.forEach((c) => {
            if (c.state === 'failed') failedClocks++
            if (c.state === 'running') runningClocks++
        })
        this.solved = runningClocks == 0 && failedClocks < 3

        if (failedClocks !== this.failedClocks) {
            // Update the scoreboard
            if (!this.scoreboardMesh) {
                const scoreboardMesh = MeshBuilder.CreatePlane(
                    'scoreboard',
                    {
                        width: 2,
                        height: 1,
                        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                    },
                    this.scene
                )
                scoreboardMesh.setParent(this.parent)
                scoreboardMesh.position = new Vector3(0, 0.25, 2)
                this.scoreboardMesh = scoreboardMesh
            }
            this.scoreboardMesh.material = TextMaterial(
                [`Lives: ${3 - failedClocks}`],
                BLUE,
                this.scene
            )
            if (failedClocks > this.failedClocks) {
                BadThingSFX()
            }
            this.failedClocks = failedClocks
        }

        if (this.solved) {
            // TODO: Run the Success event
            this.clocks?.forEach((c) => c.stop())
        }
        return this.solved
    }

    isFailed() {
        if (this.state !== 'running') return false
        if (this.failed) return true
        let failedClocks = 0
        this.clocks?.forEach((c) => {
            if (c.state === 'failed') failedClocks++
        })
        this.failed = failedClocks >= 3

        if (this.failed) {
            // TODO: Run the failure event
            this.clocks?.forEach((c) => c.stop())
        }

        return this.failed
    }

    reset() {
        this.clocks.forEach((c) => c.dispose())
        this.clocks = []
        // this.parent.getChildMeshes().forEach((c) => c.dispose(false, true))
        this.state = 'intro'
        this.solved = false
        this.failed = false
        const BOX_SIZE = 12
        const BOX_HEIGHT = 6
        const CLOCK_COUNT = debug ? 4 : 13

        // Make the walls
        const color = BABYLON.Color3.Random()
        const mat2 = new BABYLON.PBRMaterial('')
        mat2.albedoColor = color
        mat2.metallic = 0
        mat2.roughness = 1
        const box2 = MeshBuilder.CreateBox(
            `timer_challenge_walls`,
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
        // Make clocks and position them around the room
        const shuffledClockPositions = shuffle([
            ...Array(BOX_SIZE * BOX_HEIGHT * 4).keys(),
        ])
        for (let i = 0; i < CLOCK_COUNT; i++) {
            const startTime = 25
            const difference = 5
            const jitter = Math.random() * 0.5
            const c = new Clock(
                { count: startTime + difference * i + jitter },
                this.scene
            )
            c.model.setParent(this.parent)
            // Place each clock on the wall
            const faceIndex = Math.floor(
                shuffledClockPositions[i] / (BOX_SIZE * BOX_HEIGHT)
            )
            const clockPositionIndex =
                shuffledClockPositions[i] % (BOX_SIZE * BOX_HEIGHT)
            const x = (clockPositionIndex % BOX_SIZE) + -0.5 * BOX_SIZE + 0.5
            const y = Math.floor(clockPositionIndex / BOX_SIZE) + 0.5
            c.position = new Vector3(x, y, 0.5 * BOX_SIZE)
            c.model.rotateAround(
                this.parent.position,
                Vector3.UpReadOnly,
                0.5 * Math.PI * faceIndex
            )
            c.model.onPointerPick = () => {
                if (this.state !== 'running') return
                c.stop()
            }
            this.clocks?.push(c)
        }
        // Make an instructional sign
        if (!this.infoBillboard) {
            const infoBillboard = MeshBuilder.CreatePlane(
                'billboard',
                {
                    width: 2,
                    height: 1,
                    sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                },
                this.scene
            ) as InteractiveMesh
            infoBillboard.material = TextMaterial(
                [
                    'Stop the clocks at 13 seconds.',
                    'Stop too soon or ',
                    'miss too many and you will fail',
                ],
                ORANGE,
                this.scene
            )
            infoBillboard.setParent(this.parent)
            infoBillboard.isPickable = true
            infoBillboard.position = new Vector3(0, 1.5, -0.126)
            infoBillboard.onPointerPick = () => {
                this.start()
            }
            this.infoBillboard = infoBillboard
        }
        this.infoBillboard.setEnabled(true)
    }
    start() {
        this.state = 'running'
        this.infoBillboard?.setEnabled(false)
        this.scoreboardMesh?.setEnabled(true)
        this.clocks?.forEach((c) => c.start())
    }
    stop() {
        this.clocks.forEach((c) => {
            c.stop()
        })
        this.scoreboardMesh?.setEnabled(false)
        this.parent.setEnabled(false)
    }
}
