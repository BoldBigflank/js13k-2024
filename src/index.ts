import type { InteractiveMesh } from '@/Types'
import { GrassMaterial, CursorMaterial } from './core/textures'
import { AnimationFactory } from './core/Animation'
import { debug } from './core/Utils'
import { TexturedMeshNME } from './shaders/TexturedMeshNME'
import { SPANISH_BLUE, WHITE } from './core/Colors'
import { TimerChallenge } from './puzzles/TimerChallenge'


const { Engine, Scene, MeshBuilder, HemisphericLight, UniversalCamera, Vector3, PointerEventTypes } = BABYLON
const init = async () => {
    let inXRMode = false
    document.getElementById('intro')!.style.display = 'none'
    const canvasElement = document.getElementById('c')
    const canvas: HTMLCanvasElement|null = canvasElement as unknown as HTMLCanvasElement
    if (!canvas) return
    canvas.style.display = 'block'
    canvas.addEventListener("click", async () => {
        if (document.pointerLockElement === canvasElement) return
        // @ts-expect-error: arguments are partially supported
        await canvas.requestPointerLock({
            unadjustedMovement: true
        })
    })
    const engine = new Engine(canvas, true)
    const scene = new Scene(engine)
    let activePuzzle: TimerChallenge|null = null
    const puzzles = []
    const puzzleBoxes: InteractiveMesh[] = []
    AnimationFactory.Instance.initScene(scene)
    scene.gravity = new Vector3(0, -0.15, 0)
    scene.collisionsEnabled = true
    // DEBUG
    if (debug) {
        scene.debugLayer.show({
            embedMode: true
        })
    }
    engine.displayLoadingUI()

    // *** CAMERA ***
    const camera = new UniversalCamera('MainCamera', new Vector3(0, 1.615, -5), scene)
    camera.inertia = 0
    camera.speed = 3
    camera.keysUp.push(87)    		// W
    camera.keysDown.push(83)   		// D
    camera.keysLeft.push(65)  		// A
    camera.keysRight.push(68) 		// S
    camera.keysUpward.push(69)		// E
    camera.keysDownward.push(81)     // Q
    camera.attachControl(canvas, true)
    // camera.speed = 0.1
    camera.angularSensibility = 500
    camera.applyGravity = true
    camera.ellipsoid = new Vector3(0.4, 0.8, 0.4)
    camera.checkCollisions = true
    camera.minZ = 0.1

    const pointerPickCenterScreen = () => {
        return scene.pick(engine.getRenderWidth() / 2, engine.getRenderHeight() / 2)
    }
    // Custom pointerdown event for Mouse/keyboard
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) return
        if (!scene) return
        if (!inXRMode && pointerInfo.event.button !== 0) return // Only left mouse click
        const pickedInfo = (inXRMode) ? pointerInfo.pickInfo : pointerPickCenterScreen()
        let pickedMesh = pickedInfo?.pickedMesh as InteractiveMesh
        while (pickedMesh && !pickedMesh.onPointerPick) {
            pickedMesh = pickedMesh.parent as InteractiveMesh
        }
        if (pickedMesh && pickedMesh.onPointerPick) {
            pickedMesh.onPointerPick()
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
    inventoryParent.position = new Vector3(-.5, 0, 2)

    // *** CAMERA CURSOR ***
    const cursor = BABYLON.MeshBuilder.CreatePlane("cursor", {
        
    }, scene)
    cursor.isPickable = false
    cursor.material = CursorMaterial(scene)
    cursor.setParent(camera)
    cursor.position = new Vector3 (0, 0, 1.1)
    cursor.renderingGroupId = 1

    // *** SUN ***
    new HemisphericLight("light", new Vector3(-0.5, 1, 0), scene)
    const light2 = new HemisphericLight("light", new Vector3(0.5, -1, 0), scene)
    
    // *** SKYBOX
    const skybox = BABYLON.MeshBuilder.CreateSphere('skybox', {
        diameter: 200,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene)
    const skyboxMaterial = TexturedMeshNME({
        color1: SPANISH_BLUE,
        color2: WHITE,
        scale: 0.1
    })
    skybox.material = skyboxMaterial
    skybox.infiniteDistance = true
    light2.includedOnlyMeshes.push(skybox)
    // skybox.light

    // *** GROUND ***
    const ground = MeshBuilder.CreateTiledGround("ground", {
        xmin: -50,
        xmax: 100,
        zmin: -20,
        zmax: 80,
        subdivisions: {
            w: 20,
            h: 10
        }
    })
    ground.material = GrassMaterial(scene)
    ground.checkCollisions = true
    ground.position.y = -0.01
    
    // *** PLACE PUZZLES HERE ***
        
    // // Red Room
    // const glob = new GlobPortal(scene)
    // glob.position = Vector3.Zero()

    // Clock Challenge
    const timerChallenge = new TimerChallenge(scene)
    timerChallenge.model.setEnabled(false)
    puzzles.push(timerChallenge)
    // activePuzzle = puzzles[0]
    
    const timerBox = BABYLON.MeshBuilder.CreateBox('timerChallengeBox', {size: 0.3}, scene) as InteractiveMesh
    timerBox.position = new Vector3(0, 2, 0)
    timerBox.onPointerPick = () => {
        activePuzzle = timerChallenge
        timerChallenge.model.setEnabled(true)
        timerChallenge.reset()
        timerBox.setEnabled(false)
    }
    puzzleBoxes.push(timerBox)

    scene.registerBeforeRender(() => {
        if (!activePuzzle) return
        if (activePuzzle.isSolved()) {
            activePuzzle.stop()
            activePuzzle = null
            puzzleBoxes.forEach((p) => p.setEnabled(true))
        } else if (activePuzzle.isFailed()) {
            activePuzzle?.stop()
            activePuzzle = null
            puzzleBoxes.forEach((p) => p.setEnabled(true))
        }
    })

    // *** BOUNDING BOX ***
    const bounds = MeshBuilder.CreateBox('bounds', {
        width: 58,
        height: 5,
        depth: 32,
        sideOrientation: BABYLON.Mesh.BACKSIDE
    }, scene)
    bounds.position = new Vector3(4, 0, 28)
    bounds.checkCollisions = true
    bounds.visibility = 0

    // Done loading meshes
    engine.hideLoadingUI()

    // WebXR
    const xr = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [ground] // TODO: Add Floors from puzzles
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
        inventoryParent.position = new Vector3(-.5, 0, 2)
        inventoryParent.rotation = Vector3.Zero()
    })
    // xr.input.controllers.forEach((controller) => {
    // })
    xr.baseExperience.onStateChangedObservable.add((state) => {
        inXRMode = state === BABYLON.WebXRState.IN_XR
        cursor.isEnabled(!inXRMode)
        if (!inXRMode) {
            inventoryParent.setParent(scene.activeCamera)
            inventoryParent.position = new Vector3(-.5, 0, 2)
            inventoryParent.rotation = Vector3.Zero()  
        } 
        
    })
}

window.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('playButton') as HTMLButtonElement
    b.onclick = init
})
