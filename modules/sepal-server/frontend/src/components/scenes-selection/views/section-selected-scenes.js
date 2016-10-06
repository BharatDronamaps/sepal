/**
 * @author Mino Togna
 */
var moment  = require( 'moment' )
var Sensors = require( '../../sensors/sensors' )

var EventBus  = require( '../../event/event-bus' )
var Events    = require( '../../event/events' )
var Animation = require( '../../animation/animation' )

var section             = null
var sectionHeader       = null
var sectionTableHeader  = null
var sectionTableContent = null
var sectionTableRow     = null

var currentSceneAreaId = null

var init = function ( container ) {
    section = container
    
    sectionHeader       = section.find( '.section-header' )
    sectionTableHeader  = section.find( '.table-header' )
    sectionTableContent = section.find( '.table-content' )
    sectionTableRow     = section.find( '.table-row' )
}

var reset = function ( sceneAreaId ) {
    if( section ){
        sectionTableContent.empty()
        sectionTableHeader.hide()
    }
    
    currentSceneAreaId = sceneAreaId
}


var add = function ( sceneImage ) {
    // if not already added
    if ( sectionTableContent.find( '.' + sceneImage.sceneId ).length <= 0 ) {
        
        var imgSection = getImageSection( sceneImage )
        
        sectionTableContent.append( imgSection )
        
        Animation.animateIn( imgSection )
        
        imgSection.velocity( 'scroll', {
            container : sectionTableContent
            , duration: 600
            , delay   : 100
        } )
        
        updateHeader()
    }
}

var getImageSection = function ( sceneImage ) {
    var imgSection = sectionTableRow.clone()
    imgSection.addClass( sceneImage.sceneId )
    
    var img = imgSection.find( 'img' )
    img.attr( 'src', sceneImage.browseUrl )
    
    imgSection.find( '.cloud-cover' ).append( sceneImage.cloudCover )
    imgSection.find( '.sensor' ).append( Sensors[ sceneImage.sensor ].shortName )
    imgSection.find( '.acquisition-date' ).append( moment( sceneImage.acquisitionDate, "YYYY-MM-DD" ).format( "YYYY" ) )
    imgSection.find( '.target-day' ).append( sceneImage.daysFromTargetDay )
    
    imgSection.find( '.btn-remove' ).click( function ( e ) {
        e.preventDefault()
        EventBus.dispatch( Events.SECTION.SCENES_SELECTION.DESELECT, null, currentSceneAreaId, sceneImage )
    } )
    return imgSection
}

var updateHeader = function () {
    if ( sectionTableContent.children().length > 0 ) {
        sectionTableHeader.show()
    } else {
        sectionTableHeader.hide()
    }
}

var remove = function ( sceneImage ) {
    var imgSection = sectionTableContent.find( '.' + sceneImage.sceneId )
    
    setTimeout( function () {
        imgSection.hide()
    }, 600 )
    
    Animation.animateOut( imgSection, function () {
        imgSection.remove()
        updateHeader()
    } )
    
}

module.exports = {
    init    : init
    , reset : reset
    , add   : add
    , remove: remove
}