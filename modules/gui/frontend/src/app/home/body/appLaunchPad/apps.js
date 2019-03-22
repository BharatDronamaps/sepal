import {Button} from 'widget/button'
import {ContentPadding} from 'widget/sectionLayout'
import {appList, loadApps$, quitApp, requestedApps, runApp$} from 'apps'
import {connect} from 'store'
import {msg} from 'translate'
import IFrame from '../iframe'
import Icon from 'widget/icon'
import PropTypes from 'prop-types'
import React from 'react'
import Tabs from 'widget/tabs'
import styles from './apps.module.css'

export default class Apps extends React.Component {
    render() {
        return (
            <Tabs
                label={msg('home.sections.app-launch-pad')}
                statePath='apps'
                onClose={app => quitApp(app.path)}>
                {() => <App/>}
            </Tabs>
        )
    }
}

const mapStateToProps = () => ({
    apps: appList(),
    requestedApps: requestedApps()
})

class _App extends React.Component {
    state = {}

    constructor(props) {
        super(props)
        this.props.stream('LOAD_APPS', loadApps$())
    }

    runApp(app) {
        if (!this.props.requestedApps.includes(app))
            this.props.stream('RUN_APP',
                runApp$(app.path),
                () => this.setState({app})
            )
    }

    renderApps() {
        const {apps} = this.props
        return apps.map(app =>
            <AppLauncher
                key={app.path}
                app={app}
                onClick={() => this.runApp(app)}/>
        )
    }

    renderAppLauncher() {
        return (
            <ContentPadding
                menuPadding
                edgePadding
                className={styles.apps}>
                {this.renderApps()}
            </ContentPadding>
        )
    }

    renderApp(app) {
        return <IFrame app={app}/>
    }

    render() {
        const {app} = this.state
        return app
            ? this.renderApp(app)
            : this.renderAppLauncher()
    }
}

const App = connect(mapStateToProps)(_App)

const AppLauncher = ({app, onClick}) =>
    <Button
        look='transparent'
        additionalClassName={styles.app}
        onClick={() => onClick(app)}>
        <Image style={app.style} src={app.image}/>
        {app.icon && <Icon name={app.icon} alt={app.alt}/>}
        <div>
            <div className={styles.title}>{app.label}</div>
            <div className={styles.description}>{app.description}</div>
        </div>
    </Button>

AppLauncher.propTypes = {
    app: PropTypes.object,
    onClick: PropTypes.func
}

const Image = ({style, src, alt}) => {
    return src
        ? <img src={src} alt={alt} style={style}/>
        : null
}

Image.propTypes = {
    alt: PropTypes.string,
    src: PropTypes.string
}
