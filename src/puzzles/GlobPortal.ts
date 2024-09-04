import { ColorMaterial } from '@/core/textures'

const { TransformNode, Vector3 } = BABYLON
export class GlobPortal {
    // 3 Columns of 3 segments of pipe
    // Each pipe segment is a different shape
    // Periodically, a drop of water falls from the top
    // The drop animates along the pipe, then falls into a couldron
    // Try to get each to drop at the same time
    parent: BABYLON.TransformNode

    scene: BABYLON.Scene
    constructor(scene: BABYLON.Scene) {
        this.scene = scene
        this.parent = new TransformNode('GlobPortal', this.scene)
        this.reset()
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

    reset() {
        const boxSize = 6
        // Create the container
        const ref = 1 // TODO: Increment
        const sphere = BABYLON.MeshBuilder.CreateSphere(`${ref}`, {
            sideOrientation: 1,
            diameter: 0.5,
        })
        sphere.isPickable = false
        sphere.position.y = 1.65
        const mat = new BABYLON.StandardMaterial(`${ref}`)
        sphere.material = mat
        sphere.setParent(this.parent)
        mat.stencil.enabled = true
        mat.stencil.funcRef = ref
        mat.disableDepthWrite = true // These two make this object the portal shape
        mat.disableColorWrite = true

        // Create the inner portal
        // Create the walls
        const color = BABYLON.Color3.Random()
        const box2 = BABYLON.MeshBuilder.CreateBox(`box_2${ref}`, {
            size: boxSize,
            sideOrientation: 1,
        })
        box2.isPickable = false
        box2.setParent(this.parent)
        box2.position.y = 0.5 * boxSize + 0.01
        const mat2 = new BABYLON.PBRMaterial('')
        mat2.stencil.enabled = true
        mat2.stencil.funcRef = ref
        mat2.stencil.func = BABYLON.Engine.EQUAL
        mat2.albedoColor = color
        mat2.metallic = 0
        mat2.roughness = 1
        box2.material = mat2
        box2.receiveShadows = true
        // Create some stuff inside
        const boxMat = ColorMaterial(
            BABYLON.Color3.Random().toHexString(),
            {},
            this.scene
        )
        boxMat.stencil.enabled = true
        boxMat.stencil.funcRef = ref
        boxMat.stencil.func = BABYLON.Engine.EQUAL
        for (let i = 0; i < 5; i++) {
            const box = BABYLON.MeshBuilder.CreateBox(`box-${ref}-${i}`, {
                size: 0.25,
            })
            box.isPickable = false
            box.material = boxMat
            box.setParent(this.parent)
            box.position = new Vector3(
                Math.random() * boxSize - 0.5 * boxSize,
                Math.random() * boxSize,
                Math.random() * boxSize - 0.5 * boxSize
            )
        }
    }
}
