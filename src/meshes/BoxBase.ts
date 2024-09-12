const { MeshBuilder, Vector3 } = BABYLON

export const BoxBase = (scene: BABYLON.Scene) => {
    const size = 3
    const parent = BABYLON.MeshBuilder.CreateBox(
        `thirteen`,
        { size: size },
        scene
    )
    // normalize
    parent.scaling = new Vector3(1 / size, 1 / size, 1 / size)
    parent.visibility = 0.5

    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const m = MeshBuilder.CreateBox(
                `box_base_${x}-${y}`,
                { size: 0.9 },
                scene
            )
            m.setParent(parent)
            m.scaling = Vector3.One()
            m.position = new Vector3(x - 1, -1, y - 1)
        }
    }

    return parent
}
