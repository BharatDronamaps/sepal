import {Input} from 'widget/form'
import {msg} from 'translate'
import PropTypes from 'prop-types'
import React from 'react'

export default class AssetSection extends React.Component {
    render() {
        const {asset} = this.props
        // TODO: Make sure asset is readable
        return (
            <Input
                label={msg('process.classification.panel.source.form.asset.label')}
                autoFocus
                input={asset}
                placeholder={msg('process.classification.panel.source.form.asset.placeholder')}
                spellCheck={false}
                errorMessage
            />
        )
    }
}

AssetSection.propTypes = {
    asset: PropTypes.object.isRequired
}