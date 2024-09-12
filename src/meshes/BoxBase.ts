import { ORANGE } from '@/core/Colors'
import { ColorMaterial } from '@/core/textures'

const { MeshBuilder, Vector3 } = BABYLON

export const BoxBase = (scene: BABYLON.Scene) => {
    const size = 3
    const parent = new BABYLON.TransformNode(`box_base_parent`, scene)
    parent.metadata = {
        offsetY: 0,
    }
    const box = BABYLON.MeshBuilder.CreateBox(`box_base`, { size: size }, scene)
    box.setParent(parent)
    // normalize
    box.scaling = new Vector3(1 / size, 1 / size, 1 / size)
    box.visibility = 0.5

    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const m = MeshBuilder.CreateBox(
                `box_base_${x}-${y}`,
                { size: 0.9 },
                scene
            )
            m.setParent(box)
            m.isPickable = false
            m.scaling = Vector3.One()
            m.material = ColorMaterial(ORANGE, {}, scene)
            m.position = new Vector3(x - 1, -1, y - 1)
        }
    }

    return parent
}
