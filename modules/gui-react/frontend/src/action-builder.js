import immutable from 'object-path-immutable'
import {dispatch} from 'store'

export default function actionBuilder(type, props = {}) {
    const operations = []
    return {
        set(path, value) {
            operations.push((immutableState) => immutableState.set(path, value))
            return this
        },

        push(path, value) {
            operations.push((immutableState) => {
                return immutableState.push(path, value)
            })
            return this
        },

        pushIfMissing(path, value, uniqueKeyProp) {
            operations.push((immutableState) => {
                const currentState = immutableState.value()
                immutableState = immutable(currentState)
                const collection = select(path, currentState)
                const equals = (item) => uniqueKeyProp
                    ? item[uniqueKeyProp] === value[uniqueKeyProp]
                    : item === value

                if (collection && collection.find(equals))
                    return immutableState
                else
                    return immutableState.push(path, value)
            })
            return this
        },

        del(path) {
            operations.push((immutableState) => immutableState.del(path))
            return this
        },

        delValue(path, value) {
            if (typeof path === 'string')
                path = path.split('.')

            operations.push((immutableState) => {
                const currentState = immutableState.value()
                immutableState = immutable(currentState)
                const index = select(path, currentState).indexOf(value)
                return (index !== -1)
                    ? immutableState.del([...path, index])
                    : immutableState
            })
            return this
        },

        assign(path, source) {
            operations.push((immutableState) => immutableState.assign(path, source))
            return this
        },

        build() {
            return {
                type,
                ...props,
                reduce(state) {
                    return operations.reduce(
                        (immutableState, operation) => operation(immutableState),
                        immutable(state)
                    ).value()
                },
                dispatch() {
                    dispatch(this)
                }
            }
        },

        dispatch() {
            dispatch(this.build())
        }
    }
}

function select(path, state) {
    if (typeof path === 'string')
        path = path.split('.')
    return path.reduce((state, part) => {
        return state != null && state[part] != null ? state[part] : undefined
    }, state)
}