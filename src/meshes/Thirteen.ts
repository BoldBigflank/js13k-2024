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

const { MeshBuilder, Vector3 } = BABYLON

export const Thirteen = (scene: BABYLON.Scene) => {
    const size = lightWallSolution[0].length
    const parent = new BABYLON.TransformNode(`thirteen_parent`, scene)
    parent.metadata = {
        offsetY: 2,
    }
    const box = BABYLON.MeshBuilder.CreateBox(`thirteen`, { size: size }, scene)
    box.setParent(parent)
    // normalize
    box.scaling = new Vector3(1 / size, 1 / size, 1 / size)
    box.visibility = 0.5

    lightWallSolution.forEach((row, y) => {
        row.forEach((val, x) => {
            if (!val) return
            const s = MeshBuilder.CreateSphere(
                `glow_light_${x}-${y}`,
                { diameter: 1 },
                scene
            )
            s.setParent(box)
            s.isPickable = false
            s.scaling = Vector3.One()
            s.position = new Vector3(
                x - 0.5 * row.length,
                0.5 * lightWallSolution.length - y,
                0
            )
        })
    })
    return parent
}
