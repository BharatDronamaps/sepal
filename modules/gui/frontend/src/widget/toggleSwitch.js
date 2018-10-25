import Icon from 'widget/icon'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './toggleSwitch.module.css'

class ToggleSwitch extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            on: props.on
        }
    }

    toggle() {
        this.checkbox.checked = !this.checkbox.checked
        this.props.onChange(this.checkbox.checked)
        this.setState({on: this.checkbox.checked})
    }

    render() {
        const {on, offIcon, onIcon} = this.props
        return (
            <div
                className={styles.switchContainer}
                onClick={this.toggle.bind(this)}>
                <Icon
                    name={offIcon}
                    className={[styles.offIcon, this.state.on ? styles.inactive : styles.active].join(' ')}/>
                <label className={styles.switch}>
                    <input
                        type='checkbox'
                        defaultChecked={on}
                        ref={checkbox => this.checkbox = checkbox}/>
                    <div className={styles.slider}>

                    </div>
                </label>
                <Icon
                    name={onIcon}
                    className={[styles.onIcon, this.state.on ? styles.active : styles.inactive].join(' ')}/>
            </div>
        )
    }
}

ToggleSwitch.propTypes = {
    offIcon: PropTypes.string,
    on: PropTypes.boolm,
    onChange: PropTypes.func,
    onIcon: PropTypes.string
}

export default ToggleSwitch