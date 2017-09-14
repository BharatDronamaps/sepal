var EventBus         = require('./../../event/event-bus')
var Events           = require('./../../event/events')
var FormValidator    = require('../../form/form-validator')
var Model            = require('./../model/search-model')
var GoogleMapsLoader = require('google-maps')

var state   = {}
var mosaics = []

var form                               = null
var formNotify                         = null
var name                               = null
var inputRecipe                        = null
var inputRecipeAutocomplete            = null
var fusionTableId                      = null
var fusionTableClassColumn             = null
var fusionTableClassColumnAutocomplete = null
var rowAlgorithms                      = null

var init = function (container) {
  form       = container.find('form')
  formNotify = form.find('.form-notify')
  
  name                   = form.find('input[name=name]')
  inputRecipe            = form.find('input[name=input-recipe]')
  fusionTableId          = form.find('input[name=fusion-table-id]')
  fusionTableClassColumn = form.find('input[name=fusion-table-class-column]')
  rowAlgorithms          = form.find('.row-algorithm-btns')
  
  initEvents()
}

var initEvents = function () {
  name.change(function (e) {
    state.name = name.val()
    EventBus.dispatch(Events.SECTION.SEARCH.STATE.ACTIVE_CHANGE, null, state)
  })
  fusionTableId.change(function (e) {
    state.fusionTableId = fusionTableId.val()
    updateFusionTableClass(state.fusionTableId)
  })
  
  var btns = rowAlgorithms.find('button')
  btns.click(function (e) {
    var btn = $(e.target)
    if (!btn.hasClass('active')) {
      e.preventDefault()
      btns.removeClass('active')
      btn.addClass('active')
      state.algorithm = btn.val()
    }
  })
  
  updateInputRecipe()
  
  form.submit(submit)
}

var submit = function (e) {
  e.preventDefault()
  
  FormValidator.resetFormErrors(form, formNotify)
  
  var valid    = true
  var errorMsg = ''
  
  if (!state.name || $.isEmptyString(state.name) || state.name.indexOf(' ') >= 0) {
    valid    = false
    errorMsg = 'Please enter a valid name, no whitespace are allowed'
    FormValidator.addError(name)
  } else if ($.isEmptyString(state.inputRecipe)) {
    valid    = false
    errorMsg = 'Please select a valid input recipe'
    FormValidator.addError(inputRecipe)
  } else if ($.isEmptyString(state.fusionTableId)) {
    valid    = false
    errorMsg = 'Please select a valid fusion table id'
    FormValidator.addError(fusionTableId)
  } else if ($.isEmptyString(state.fusionTableClassColumn)) {
    valid    = false
    errorMsg = 'Please select a valid fusion table class column'
    FormValidator.addError(fusionTableClassColumn)
  } else if (!state.algorithm) {
    valid    = false
    errorMsg = 'Please select a valid algorithm'
  }
  
  if (valid) {
    EventBus.dispatch(Events.SECTION.SEARCH.REQUEST_CLASSIFICATION, null, state)
  } else {
    FormValidator.showError(formNotify, errorMsg)
  }
  
}

// model change methods
var setState = function (e, newState, params) {
  FormValidator.resetFormErrors(form, formNotify)
  
  if (newState && newState.type == Model.TYPES.CLASSIFY && (!state || newState.id !== state.id)) {
    
    name.val(newState.name)
    
    var mosaic = mosaics.find(function (o) {
      return o.id == newState.inputRecipe
    })
    mosaic
      ? inputRecipe.val(mosaic.name).data('reset-btn').enable()
      : inputRecipeAutocomplete.sepalAutocomplete('reset')
    restoreAoi(newState, params)
    
    fusionTableId.val(newState.fusionTableId)
    updateFusionTableClass(newState.fusionTableId)
    if (newState.fusionTableClassColumn)
      fusionTableClassColumn.val(newState.fusionTableClassColumn).data('reset-btn').enable()
    
    rowAlgorithms.find('button').removeClass('active')
    if (newState.algorithm)
      rowAlgorithms.find('button[value=' + newState.algorithm + ']').addClass('active')
  }
  
  state = newState
  
}

var listMosaicsChanged = function (e, list) {
  mosaics = list
  updateInputRecipe()
}

var updateInputRecipe = function () {
  if (inputRecipeAutocomplete)
    inputRecipeAutocomplete.sepalAutocomplete('dispose')
  
  inputRecipeAutocomplete = inputRecipe.sepalAutocomplete({
    lookup  : mosaics.map(function (mosaic) {
      return {data: mosaic.id, value: mosaic.name}
    }),
    onChange: function (selection) {
      state.inputRecipe = selection ? selection.data : null
      
      state.aoiCode = null
      state.aoiName = null
      state.polygon = null
      
      EventBus.dispatch(Events.MAP.POLYGON_CLEAR)
      EventBus.dispatch(Events.MAP.REMOVE_AOI_LAYER)
      
      // load aoi
      if (state.inputRecipe) {
        var params = {
          url         : '/processing-recipes/' + state.inputRecipe
          , beforeSend: function () {
            // Loader.show()
          }
          , success   : function (response) {
            // Loader.hide({delay: 1000})
            
            var inputRecipeState = typeof response === 'string' ? JSON.parse(response) : response
            if (inputRecipeState.aoiCode) {
              state.aoiCode = inputRecipeState.aoiCode
              state.aoiName = inputRecipeState.aoiName
            } else {
              state.polygon = inputRecipeState.polygon
            }
            restoreAoi(state, {isNew: true})
          }
        }
        EventBus.dispatch(Events.AJAX.GET, null, params)
      }
      
    }
  })
}

var restoreAoi = function (s, params) {
  if (params && params.isNew) {
    
    if (s.aoiCode && s.aoiName) {
      EventBus.dispatch(Events.MAP.POLYGON_CLEAR)
      EventBus.dispatch(Events.MAP.ZOOM_TO, null, s.aoiCode, true)
    } else if (s.polygon) {
      EventBus.dispatch(Events.MAP.REMOVE_AOI_LAYER)
      EventBus.dispatch(Events.SECTION.SEARCH.STATE.RESTORE_DRAWN_AOI, null, s.polygon)
    }
  }
  
}

var updateFusionTableClass = function (ftId) {
  if (fusionTableClassColumnAutocomplete)
    fusionTableClassColumnAutocomplete.sepalAutocomplete('dispose')
  
  fusionTableClassColumn.disable()
  if (ftId) {
    var params = {
      url     : 'https://www.googleapis.com/fusiontables/v2/tables/' + ftId + '/columns?key=' + GoogleMapsLoader.KEY,
      success : function (resp) {
        FormValidator.resetFormErrors(form)
        
        fusionTableClassColumnAutocomplete = fusionTableClassColumn.sepalAutocomplete({
          lookup  : resp.items.map(function (item) {
            return {data: item.name, value: item.name}
          }),
          onChange: function (selection) {
            state.fusionTableClassColumn = selection ? selection.data : null
          }
        })
        
        fusionTableClassColumn.enable()
      }, error: function (xhr, ajaxOptions, thrownError) {
        FormValidator.addError(fusionTableId)
        FormValidator.showError(formNotify, xhr.responseJSON.error.message)
      }
      
    }
    EventBus.dispatch(Events.AJAX.GET, null, params)
  }
}

EventBus.addEventListener(Events.SECTION.SEARCH.STATE.ACTIVE_CHANGED, setState)
EventBus.addEventListener(Events.SECTION.SEARCH.STATE.LIST_CHANGED, listMosaicsChanged)

module.exports.init = init