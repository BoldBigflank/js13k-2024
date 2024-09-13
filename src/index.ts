import type { InteractiveMesh } from '@/Types'
import { CursorMaterial, ColorTextureMaterial } from './core/textures'
import { AnimationFactory } from './core/Animation'
import { debug } from './core/Utils'
import { TexturedMeshNME } from './shaders/TexturedMeshNME'
import { LIGHT_GREEN, SPANISH_BLUE, WHITE } from './core/Colors'
import { TimerChallenge } from './puzzles/TimerChallenge'
import { ButtonChallenge } from './puzzles/ButtonChallenge'
import { SnakeChallenge } from './puzzles/SnakeChallenge'
import { MagicBoxChallenge } from './puzzles/MagicBoxChallenge'
import { ClockCloud } from './meshes/ClockCloud'
import { BoxBase } from './meshes/BoxBase'
import { Snake } from './meshes/Snake'
import { Thirteen } from './meshes/Thirteen'

const {
    Engine,
    Scene,
    MeshBuilder,
    HemisphericLight,
    UniversalCamera,
    Vector3,
    PointerEventTypes,
} = BABYLON
const init = async () => {
    let inXRMode = false
    document.getElementById('intro')!.style.display = 'none'
    const canvasElement = document.getElementById('c')
    const canvas: HTMLCanvasElement | null =
        canvasElement as unknown as HTMLCanvasElement
    if (!canvas) return
    canvas.style.display = 'block'
    canvas.addEventListener('click', async () => {
        if (document.pointerLockElement === canvasElement) return
        // @ts-expect-error: arguments are partially supported
        await canvas.requestPointerLock({
            unadjustedMovement: true,
        })
    })
    const engine = new Engine(canvas, true)
    const scene = new Scene(engine)
    const gl = new BABYLON.GlowLayer('glow', scene)
    // gl.intensity = 0.5
    gl.customEmissiveColorSelector = (mesh, subMesh, material, result) => {
        if (mesh.name.includes('glow_')) {
            result.set(1, 1, 1, 1)
        } else if (material.name.includes('glow')) {
            result.set(0.5, 0.5, 0.5, 1)
        } else if (mesh.name.includes('laser')) {
            result.set(1, 0, 0, 1)
        } else {
            result.set(0, 0, 0, 0)
        }
    }
    let activePuzzle:
        | TimerChallenge
        | ButtonChallenge
        | SnakeChallenge
        | MagicBoxChallenge
        | null = null
    let activePuzzleBox: BABYLON.Nullable<InteractiveMesh> = null
    const puzzles = []
    const puzzleBoxes: BABYLON.TransformNode = new BABYLON.TransformNode(
        'puzzleBoxes',
        scene
    )
    AnimationFactory.Instance.initScene(scene)
    scene.gravity = new Vector3(0, -0.15, 0)
    scene.collisionsEnabled = true
    // DEBUG
    if (debug) {
        scene.debugLayer.show({
            embedMode: true,
        })
    }
    engine.displayLoadingUI()

    // *** CAMERA ***
    const camera = new UniversalCamera(
        'MainCamera',
        new Vector3(0, 1.615, -4),
        scene
    )
    camera.inertia = 0
    camera.speed = 3
    camera.keysUp.push(87) // W
    camera.keysDown.push(83) // D
    camera.keysLeft.push(65) // A
    camera.keysRight.push(68) // S
    camera.keysUpward.push(69) // E
    camera.keysDownward.push(81) // Q
    camera.attachControl(canvas, true)
    // camera.speed = 0.1
    camera.angularSensibility = 500
    camera.applyGravity = true
    camera.ellipsoid = new Vector3(0.4, 0.8, 0.4)
    camera.checkCollisions = true
    camera.minZ = 0.1

    const pointerPickCenterScreen = () => {
        return scene.pick(
            engine.getRenderWidth() / 2,
            engine.getRenderHeight() / 2
        )
    }
    // Custom pointerdown event for Mouse/keyboard
    scene.onPointerObservable.add((pointerInfo) => {
        if (!scene) return
        if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
            const pickedInfo = inXRMode
                ? pointerInfo.pickInfo
                : pointerPickCenterScreen()
            let pickedMesh = pickedInfo?.pickedMesh as InteractiveMesh
            while (pickedMesh && !pickedMesh.onPointerMove) {
                pickedMesh = pickedMesh.parent as InteractiveMesh
            }
            if (pickedMesh && pickedMesh.onPointerMove) {
                pickedMesh.onPointerMove(pickedInfo)
            }
        } else if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
            if (!inXRMode && pointerInfo.event.button !== 0) return // Only left mouse click
            const pickedInfo = inXRMode
                ? pointerInfo.pickInfo
                : pointerPickCenterScreen()
            let pickedMesh = pickedInfo?.pickedMesh as InteractiveMesh
            while (pickedMesh && !pickedMesh.onPointerPick) {
                pickedMesh = pickedMesh.parent as InteractiveMesh
            }
            if (pickedMesh && pickedMesh.onPointerPick) {
                pickedMesh.onPointerPick(pickedInfo)
            }
        }
    })
    // run the render loop
    engine.runRenderLoop(() => {
        scene.render()
    })

    // the canvas/window resize event handler
    window.addEventListener('resize', () => {
        engine.resize()
    })

    // *** Inventory Parent
    const inventoryParent = new BABYLON.TransformNode('inventory-parent', scene)
    inventoryParent.setParent(scene.activeCamera)
    inventoryParent.position = new Vector3(-0.5, 0, 2)

    // *** CAMERA CURSOR ***
    const cursor = BABYLON.MeshBuilder.CreatePlane('cursor', {}, scene)
    gl.addExcludedMesh(cursor)
    cursor.isPickable = false
    cursor.material = CursorMaterial(scene)
    cursor.setParent(camera)
    cursor.position = new Vector3(0, 0, 1.1)
    cursor.renderingGroupId = 1

    // *** SUN ***
    new HemisphericLight('light', new Vector3(-0.5, 1, 0), scene)
    const light2 = new HemisphericLight('light', new Vector3(0.5, -1, 0), scene)

    // *** SKYBOX
    const skybox = BABYLON.MeshBuilder.CreateSphere(
        'skybox',
        {
            diameter: 200,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        },
        scene
    )
    const skyboxMaterial = TexturedMeshNME({
        color1: SPANISH_BLUE,
        color2: WHITE,
        scale: 0.1,
    })
    skybox.material = skyboxMaterial
    skybox.infiniteDistance = true
    light2.includedOnlyMeshes.push(skybox)
    // skybox.light

    // *** GROUND ***
    const ground = MeshBuilder.CreateTiledGround('ground', {
        xmin: -50,
        xmax: 100,
        zmin: -20,
        zmax: 80,
        subdivisions: {
            w: 20,
            h: 10,
        },
    })
    ground.material = ColorTextureMaterial(LIGHT_GREEN, scene)
    ground.checkCollisions = true
    ground.position.y = -0.01

    // VR Ground
    const vrFloor = MeshBuilder.CreateTiledGround('ground', {
        xmin: -3,
        xmax: 3,
        zmin: -3,
        zmax: 3,
        subdivisions: {
            w: 2,
            h: 1,
        },
    })
    vrFloor.position.z = camera.position.z
    vrFloor.checkCollisions = true
    vrFloor.visibility = 0.2
    vrFloor.position.y = -0.02

    // *** PLACE PUZZLES HERE ***

    // Puzzle 1 - Timer
    const timerChallenge = new TimerChallenge(scene)
    timerChallenge.model.setEnabled(false)
    puzzles.push(timerChallenge)

    // Puzzle 2 - Buttons
    const buttonChallenge = new ButtonChallenge(scene)
    buttonChallenge.model.setEnabled(false)
    puzzles.push(buttonChallenge)

    // Puzzle 3 - Snake
    const snakeChallenge = new SnakeChallenge(scene)
    snakeChallenge.model.setEnabled(false)
    puzzles.push(snakeChallenge)

    // Puzzle 4 - Magic Box
    const magicBoxChallenge = new MagicBoxChallenge(scene)
    magicBoxChallenge.model.setEnabled(false)
    puzzles.push(magicBoxChallenge)

    // Puzzle 1 - Timer
    const timerBox = ClockCloud(scene) as InteractiveMesh
    timerBox.position = new Vector3(0, 0.5, 2)
    timerBox.onPointerPick = () => {
        activePuzzle = timerChallenge
        activePuzzleBox = timerBox
        timerChallenge.model.setEnabled(true)
        timerChallenge.reset()
        puzzleBoxes.setEnabled(false)
    }
    timerBox.setParent(puzzleBoxes)

    // Puzzle 2 - Buttons
    const buttonBox = Thirteen(scene) as InteractiveMesh
    buttonBox.position = new Vector3(2, 0.5, 0)
    buttonBox.onPointerPick = () => {
        activePuzzle = buttonChallenge
        activePuzzleBox = buttonBox
        buttonChallenge.model.setEnabled(true)
        buttonChallenge.reset()
        puzzleBoxes.setEnabled(false)
    }
    buttonBox.setParent(puzzleBoxes)

    // Puzzle 3 - Snake
    const snakeBox = Snake(scene) as InteractiveMesh
    snakeBox.position = new Vector3(0, 0.5, -2)
    snakeBox.onPointerPick = () => {
        activePuzzle = snakeChallenge
        activePuzzleBox = snakeBox
        snakeChallenge.model.setEnabled(true)
        snakeChallenge.reset()
        puzzleBoxes.setEnabled(false)
    }
    snakeBox.setParent(puzzleBoxes)

    // Puzzle 4 - Magic Box
    const magicBoxBox = BoxBase(scene) as InteractiveMesh
    magicBoxBox.position = new Vector3(-2, 0.5, 0)
    magicBoxBox.onPointerPick = () => {
        activePuzzle = magicBoxChallenge
        activePuzzleBox = magicBoxBox
        magicBoxChallenge.model.setEnabled(true)
        magicBoxChallenge.reset()
        puzzleBoxes.setEnabled(false)
    }
    magicBoxBox.setParent(puzzleBoxes)

    scene.registerBeforeRender(() => {
        if (!activePuzzle) return
        if (activePuzzle.isSolved()) {
            activePuzzle.stop()
            activePuzzle = null
            if (activePuzzleBox) {
                activePuzzleBox.isPickable = false
                activePuzzleBox.onPointerPick = undefined
                activePuzzleBox.position = new Vector3(
                    0,
                    1 + activePuzzleBox.metadata.offsetY,
                    0
                )
                activePuzzleBox.scaling = new Vector3(2, 2, 2)
                activePuzzleBox.getChildMeshes(true).forEach((c) => {
                    c.visibility = 0
                    c.isPickable = false
                })
                activePuzzleBox = null
            }
            puzzleBoxes.setEnabled(true)
        } else if (activePuzzle.isFailed()) {
            activePuzzle?.stop()
            activePuzzle = null
            activePuzzleBox = null
            puzzleBoxes.setEnabled(true)
        }
    })

    // *** BOUNDING BOX ***
    const bounds = MeshBuilder.CreateBox(
        'bounds',
        {
            width: 12,
            height: 5,
            depth: 12,
            sideOrientation: BABYLON.Mesh.BACKSIDE,
        },
        scene
    )
    bounds.isPickable = false
    bounds.position = new Vector3(0, 2.5, 0)
    bounds.checkCollisions = true
    bounds.visibility = 0

    // Done loading meshes
    engine.hideLoadingUI()

    // WebXR
    const xr = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [vrFloor], // TODO: Add Floors from puzzles
    })
    xr.input.onControllerAddedObservable.add((controller) => {
        controller.onMotionControllerInitObservable.add((motionController) => {
            motionController.onModelLoadedObservable.add((model) => {
                inventoryParent.setParent(model.rootMesh)
                inventoryParent.position = new Vector3(0, 0.1, 0.1)
                inventoryParent.rotation = Vector3.Zero()
            })
        })
    })
    xr.input.onControllerRemovedObservable.add((xrInput, state) => {
        inventoryParent.setParent(scene.activeCamera)
        inventoryParent.position = new Vector3(-0.5, 0, 2)
        inventoryParent.rotation = Vector3.Zero()
    })
    xr.baseExperience.onStateChangedObservable.add((state) => {
        console.log('state', state, BABYLON.WebXRState.IN_XR)
        inXRMode = state === BABYLON.WebXRState.IN_XR
        cursor.isEnabled(!inXRMode)
        if (!inXRMode) {
            inventoryParent.setParent(scene.activeCamera)
            inventoryParent.position = new Vector3(-0.5, 0, 2)
            inventoryParent.rotation = Vector3.Zero()
        }
    })
}

window.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('playButton') as HTMLButtonElement
    b.onclick = init
})
