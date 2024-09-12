const { MeshBuilder, Vector3 } = BABYLON

const zClocks = [
    [-1, 1, 2],
    [0, 2, 2],
    [1, 3, 2],
    [2, 4, 2],
    [0, 2, -2],
]

const xClocks = [
    [-2, 1, -2],
    [-2, 2, 1],
    [-2, 3, -1],
    [-2, 4, 0],
    [2, 1, -1],
    [2, 2, 1],
    [2, 3, -2],
    [2, 4, 0],
]
export const ClockCloud = (scene: BABYLON.Scene) => {
    const size = 4
    const parent = BABYLON.MeshBuilder.CreateBox(
        `thirteen`,
        { size: size },
        scene
    )
    // normalize
    parent.scaling = new Vector3(1 / size, 1 / size, 1 / size)
    parent.visibility = 0.5

    xClocks.forEach(([x, y, z]) => {
        const s = MeshBuilder.CreateBox(
            `clock_box_${x}-${y}-${z}`,
            { width: 0.2, height: 0.8, depth: 0.8 },
            scene
        )
        s.setParent(parent)
        s.scaling = Vector3.One()
        s.position = new Vector3(x > 0 ? x - 0.1 : x + 0.1, y - 2.5, z + 0.5)
    })
    zClocks.forEach(([x, y, z]) => {
        const s = MeshBuilder.CreateBox(
            `clock_box_${x}-${y}-${z}`,
            { width: 0.8, height: 0.8, depth: 0.2 },
            scene
        )
        s.setParent(parent)
        s.scaling = Vector3.One()
        s.position = new Vector3(x - 0.5, y - 2.5, z > 0 ? z - 0.1 : z + 0.1)
    })

    return parent
}
