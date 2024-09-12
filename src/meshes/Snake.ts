const { MeshBuilder, Vector3 } = BABYLON

const snakePos = [
    [0, 1, -1], // Head
    [0, 1, 0],
    [0, 0, 0], // Neck
    [0, -1, 0],
    [0, -2, 0], // Body
    [1, -2, 0],
    [1, -2, -1],
    [1, -2, -2],
    [0, -2, -2],
    [-1, -2, -2],
    [-2, -2, -2],
    [-2, -2, -1],
    [-2, -2, -1],
]
export const Snake = (scene: BABYLON.Scene) => {
    const size = 4
    const parent = BABYLON.MeshBuilder.CreateBox(
        `thirteen`,
        { size: size },
        scene
    )
    // normalize
    parent.scaling = new Vector3(1 / size, 1 / size, 1 / size)
    parent.visibility = 0.5

    snakePos.forEach(([x, y, z]) => {
        const s = MeshBuilder.CreateBox(
            `snake_box_${x}-${y}-${z}`,
            { size: 0.8 },
            scene
        )
        s.setParent(parent)
        s.scaling = Vector3.One()
        s.position = new Vector3(x + 0.5, y + 0.5, z + 0.5)
    })

    return parent
}
