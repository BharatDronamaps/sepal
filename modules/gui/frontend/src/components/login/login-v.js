/**
 * @author Mino Togna
 */
require( './login.scss' )

var FormLogin     = require( './views/form-login' )
var FormForgotPwd = require( './views/form-forgot-pwd' )
var BgSlideshow   = require( './views/bg-slideshow' )
// var BgStars       = require( './views/bg-stars' )
//
var BtnForgotPwd  = null

var html = null

var show = function ( invitation ) {
    var template = require( './login.html' )
    html         = $( template( {} ) )
    $( "body" ).find( '.app' ).append( html )
    
    FormLogin.init( html.find( '#formLogin' ) )
    FormForgotPwd.init( html.find( '#form-forgot-pwd' ) )
    
    FormLogin.show( invitation )
    FormForgotPwd.hide( { delay: 0, duration: 0 } )
    
    setTimeout( function () {
        BgSlideshow.show()
        // BgStars.show()
    }, 100 )
    
    BtnForgotPwd = html.find( '.btn-forgot-pwd' )
    BtnForgotPwd.click( function ( e ) {
        e.preventDefault()
        
        FormLogin.hide()
        FormForgotPwd.show()
    } )
}

var hide = function () {
    if( html ){
        html.remove()
    }
}

module.exports = {
    show  : show
    , hide: hide
}
