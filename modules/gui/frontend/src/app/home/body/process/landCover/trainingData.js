import {Constraint} from 'widget/form'
import {Field, Input, form} from 'widget/form'
import {Panel, PanelContent, PanelHeader} from 'widget/panel'
import {RecipeActions, RecipeState, recipePath} from './landCoverRecipe'
import {Subject} from 'rxjs'
import {loadFusionTableColumns$} from 'app/home/map/fusionTable'
import {map, takeUntil} from 'rxjs/operators'
import {msg} from 'translate'
import ComboBox from 'widget/comboBox'
import PanelButtons from 'widget/panelButtons'
import PropTypes from 'prop-types'
import React from 'react'
import styles from './trainingData.module.css'

const fields = {
    fusionTable: new Field()
        .notBlank('process.landCover.panel.trainingData.form.fusionTable.required'),
    yearColumn: new Field()
        .notBlank('process.landCover.panel.trainingData.form.yearColumn.required'),
    classColumn: new Field()
        .notBlank('process.landCover.panel.trainingData.form.classColumn.required')
}

const constraints = {
    yearAndClassColumnsSame: new Constraint(['yearColumn', 'classColumn'])
        .skip((value, {fusionTable}) => {
            return !fusionTable
        })
        .predicate(({yearColumn, classColumn}) => {
            return yearColumn !== classColumn
        }, 'process.landCover.panel.trainingData.form.yearAndClassColumnsSame')
}

const mapStateToProps = (state, ownProps) => {
    const recipeId = ownProps.recipeId
    const recipeState = RecipeState(recipeId)
    let values = recipeState('ui.trainingData')
    if (!values) {
        const model = recipeState('model.trainingData')
        values = modelToValues(model)
        RecipeActions(recipeId).setTrainingData({values, model}).dispatch()
    }
    return {
        values,
        primitiveTypes: recipeState('model.typology.primitiveTypes'),
        columns: recipeState('ui.fusionTable.columns')
    }
}

class TrainingData extends React.Component {
    constructor(props) {
        super(props)
        this.fusionTableChanged$ = new Subject()
        this.recipeActions = RecipeActions(props.recipeId)
    }

    loadFusionTableColumns(fusionTableId) {
        this.props.asyncActionBuilder('LOAD_FUSION_TABLE_COLUMNS',
            loadFusionTableColumns$(fusionTableId, {includedTypes: ['NUMBER']}).pipe(
                map(response => {
                    if (response.error)
                        this.props.inputs.fusionTable.setInvalid(
                            msg(response.error.key)
                        )
                    return (response.columns || [])
                        .filter(column => column.type !== 'LOCATION')
                }),
                map(columns => this.recipeActions.setFusionTableColumns(columns)),
                takeUntil(this.fusionTableChanged$))
        )
            .dispatch()
    }

    render() {
        const {recipeId, primitiveTypes, form} = this.props
        return (
            <Panel className={styles.panel}>
                <PanelHeader
                    icon='cog'
                    title={msg('process.landCover.panel.trainingData.title')}/>

                <PanelContent>
                    {this.renderContent()}
                </PanelContent>

                <PanelButtons
                    form={form}
                    statePath={recipePath(recipeId, 'ui')}
                    onApply={values => this.recipeActions.setTrainingData({
                        values,
                        model: valuesToModel(values, primitiveTypes)
                    }).dispatch()}/>
            </Panel>
        )
    }

    renderContent() {
        const {action, columns, inputs: {fusionTable, yearColumn, classColumn}} = this.props
        const columnState = action('LOAD_FUSION_TABLE_COLUMNS').dispatching
            ? 'loading'
            : columns && columns.length > 0
                ? 'loaded'
                : 'noFusionTable'

        const yearPlaceholder = msg(`process.landCover.panel.trainingData.form.yearColumn.placeholder.${columnState}`)
        const classPlaceholder = msg(`process.landCover.panel.trainingData.form.classColumn.placeholder.${columnState}`)
        return (
            <React.Fragment>
                <Input
                    label={msg('process.landCover.panel.trainingData.form.fusionTable.label')}
                    autoFocus
                    input={fusionTable}
                    placeholder={msg('process.landCover.panel.trainingData.form.fusionTable.placeholder')}
                    spellCheck={false}
                    onChange={e => {
                        yearColumn.set('')
                        classColumn.set('')
                        this.recipeActions.setFusionTableColumns(null).dispatch()
                        this.fusionTableChanged$.next()
                        const fusionTableMinLength = 30
                        if (e && e.target.value.length > fusionTableMinLength)
                            this.loadFusionTableColumns(e.target.value)
                    }}
                    errorMessage
                />
                <ComboBox
                    label={msg('process.landCover.panel.trainingData.form.yearColumn.label')}
                    input={yearColumn}
                    isLoading={action('LOAD_FUSION_TABLE_COLUMNS').dispatching}
                    disabled={!columns || columns.length === 0}
                    placeholder={yearPlaceholder}
                    options={(columns || []).map(({name}) => ({value: name, label: name}))}
                    errorMessage
                />
                <ComboBox
                    label={msg('process.landCover.panel.trainingData.form.classColumn.label')}
                    input={classColumn}
                    isLoading={action('LOAD_FUSION_TABLE_COLUMNS').dispatching}
                    disabled={!columns || columns.length === 0}
                    placeholder={classPlaceholder}
                    options={(columns || []).map(({name}) => ({value: name, label: name}))}
                    errorMessage={[classColumn, 'yearAndClassColumnsSame']}
                />
            </React.Fragment>
        )
    }
}

TrainingData.propTypes = {
    recipeId: PropTypes.string,
}

const valuesToModel = (values, primitiveTypes) => {
    const classByPrimitive = {}
    primitiveTypes && primitiveTypes.forEach(primitiveType => // TODO: Make this configurable
        classByPrimitive[primitiveType] = primitiveType
    )
    return {
        type: 'fusionTable',
        tableId: values.fusionTable,
        yearColumn: values.yearColumn,
        classColumn: values.classColumn,
        classByPrimitive
    }
}

const modelToValues = (model = {}) => ({
    fusionTable: model.tableId,
    yearColumn: model.yearColumn,
    classColumn: model.classColumn
})

export default form({fields, constraints, mapStateToProps})(TrainingData)