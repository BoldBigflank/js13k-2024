// TODO: Take an env variable/inject debug here
export const debug = window.location.search.includes('debug')

export const sample = (group: any[]): any => {
    return group[Math.floor(Math.random() * group.length)]
}

export const shuffle = (group: any[]): any[] => {
    // Fisher yates shuffle
    for (let i = group.length - 1; i > 1; i--) {
        const j = Math.floor(Math.random() * i)
        const temp = group[i]
        group[i] = group[j]
        group[j] = temp
    }
    return group
}

export const Clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max)
}

export const initCanvas = (
    size = 512
): [HTMLCanvasElement, CanvasRenderingContext2D] => {
    const canvas = document.createElement('canvas') as HTMLCanvasElement
    canvas.width = size
    canvas.height = size
    // document.getElementById("extra")?.appendChild(canvas)
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    return [canvas, ctx]
}
