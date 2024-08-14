import { State } from './state'

export class StateMachine {
    private currentState: State

    constructor(initialState: State) {
        this.currentState = initialState
    }

    setState(newState: State, ...enterArgs: any) {
        if (this.currentState.onLeave) this.currentState.onLeave()
        this.currentState = newState
        if (this.currentState.onEnter) this.currentState.onEnter(...enterArgs)
    }

    getState() {
        return this.currentState
    }
}
