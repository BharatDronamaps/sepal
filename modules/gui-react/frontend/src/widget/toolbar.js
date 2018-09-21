import {connect, select} from 'store'
import Icon from 'widget/icon'
import Portal from 'widget/portal'
import PropTypes from 'prop-types'
import React from 'react'
import Tooltip from 'widget/tooltip'
import actionBuilder from 'action-builder'
import buttonColors from 'style/button-colors.module.css'
import styles from './toolbar.module.css'

const Context = React.createContext()

const mapStateToProps = (state, ownProps) => {
    return {
        modal: select([ownProps.statePath, 'modal']),
        selectedPanel: select([ownProps.statePath, 'selectedPanel'])
    }
}

class Toolbar extends React.Component {
    panelContainer = React.createRef()

    render() {
        const {statePath, horizontal, vertical, panel, top, bottom, left, right, className, modal, selectedPanel} = this.props
        const classNames = [
            styles.toolbar,
            buttonColors.buttons,
            horizontal && styles.horizontal,
            vertical && styles.vertical,
            panel && styles.panelButton,
            (top || !bottom) && styles.top,
            bottom && styles.bottom,
            left && styles.left,
            (right || !left) && styles.right,
            className
        ]
        return (
            <div className={styles.container} ref={this.panelContainer}>
                <div className={classNames.join(' ')}>
                    <Context.Provider value={{
                        horizontal: !!horizontal,
                        panel: !!panel,
                        panelContainer: this.panelContainer.current,
                        statePath,
                        top: (top || !bottom),
                        bottom: bottom,
                        right: (right || !left),
                        left: (left),
                        modal,
                        selectedPanel
                    }}>
                        {this.props.children}
                    </Context.Provider>
                </div>
            </div>
        )
    }
}

Toolbar.propTypes = {
    bottom: PropTypes.any,
    children: PropTypes.any,
    className: PropTypes.string,
    horizontal: PropTypes.any,
    left: PropTypes.any,
    panel: PropTypes.any,
    right: PropTypes.any,
    statePath: PropTypes.any,
    top: PropTypes.any,
    vertical: PropTypes.any
}

Toolbar = connect(mapStateToProps)(Toolbar)
export {Toolbar}

export class ToolbarButton extends React.Component {
    render() {
        const {disabled, selected, icon, label, tooltip, className, onClick} = this.props
        return (
            <Context.Consumer>
                {({horizontal, panel}) =>
                    <Tooltip msg={tooltip} top={horizontal} left={!horizontal}
                        disabled={!!(disabled || (panel && selected))}>
                        <button
                            className={[selected && !disabled ? styles.selected : null, className].join(' ')}
                            onClick={onClick}
                            disabled={disabled}>
                            {icon ? <Icon name={icon}/> : label}
                        </button>
                    </Tooltip>
                }
            </Context.Consumer>
        )
    }
}

ToolbarButton.propTypes = {
    className: PropTypes.string,
    disabled: PropTypes.any,
    icon: PropTypes.string,
    label: PropTypes.string,
    selected: PropTypes.any,
    tooltip: PropTypes.string,
    onClick: PropTypes.func
}

export class PanelButton extends React.Component {
    render() {
        const {name, icon, label, tooltip, disabled, onClick, children} = this.props
        return (
            <Context.Consumer>
                {(toolbarProps) => {
                    this.toolbarProps = toolbarProps
                    const {panelContainer, top, right, bottom, left, modal, selectedPanel} = this.toolbarProps
                    const selected = selectedPanel === name
                    return <React.Fragment>
                        <ToolbarButton
                            disabled={disabled || modal || selected}
                            selected={selected}
                            icon={icon}
                            label={label}
                            tooltip={tooltip}
                            className={[styles.panelButton, selected ? styles.selected : null].join(' ')}
                            onClick={(e) => {
                                this.select()
                                onClick && onClick(e)
                            }}/>
                        {
                            panelContainer && selected
                                ? (
                                    <Portal container={panelContainer}>
                                        <PanelButtonContext.Provider value={{top, bottom, right, left}}>
                                            {children}
                                        </PanelButtonContext.Provider>
                                    </Portal>
                                ) : null
                        }
                    </React.Fragment>
                }}
            </Context.Consumer>
        )
    }

    select() {
        const {name} = this.props
        const {statePath} = this.toolbarProps
        actionBuilder('SELECT_PANEL', {name})
            .set([statePath, 'selectedPanel'], name)
            .dispatch()
    }
}

PanelButton.propTypes = {
    children: PropTypes.any.isRequired,
    name: PropTypes.string.isRequired,
    disabled: PropTypes.any,
    icon: PropTypes.string,
    label: PropTypes.string,
    tooltip: PropTypes.string,
    onClick: PropTypes.func
}

export const PanelButtonContext = React.createContext()
