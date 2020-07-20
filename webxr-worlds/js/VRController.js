
THREE.VRController = function( renderer, camera, hand='right' ) {

  THREE.Object3D.call( this );

  this.rig = new THREE.Object3D();

  this.turnRate = .01;
  this.moveRate = .1;

  var direction = new THREE.Vector3();

  this.key = '';
  var that = this;

  window.addEventListener( 'keydown', function( event ) { that.key = event.key; } );

  window.addEventListener( 'keyup', function( event ) { that.key = ''; } );

  this.update = function() {

    // camera.getWorldDirection() defaults to rig...
    var e = camera.matrixWorld.elements;
    direction.set( -e[8], -e[9], -e[10] ).normalize();

    var session = 'xr' in renderer ? renderer.xr.getSession() : null;
    var is = session ? session.inputSources : null;
    var gp = null;

    if ( is && is.length === 1 ) {
      gp = is[0].gamepad;
      this.gamepad = gp;
      this.quaternion.copy( renderer.xr.getController(0).quaternion );
    }

    if ( is && is.length === 2 ) {
      var n = is[0].handedness === hand ? 0 : 1;
      gp = is[n].gamepad;
      this.gamepad = gp;
      this.quaternion.copy( renderer.xr.getController(n).quaternion );
    }

    // w3.org/TR/webxr-gamepads-module-1/#xr-standard-gamepad-mapping
    var trigger = 0, pad, xAxis, yAxis;

    if ( gp && gp.buttons.length <= 3 ) { pad = 2; xAxis = 0; yAxis = 1 }
    if ( gp && gp.buttons.length > 3 )  { pad = 3; xAxis = 2; yAxis = 3 }

    if ( gp && ( gp.buttons[ pad ].pressed || gp.buttons[ pad ].touched ) ) {

      var n = Math.round( 2 * Math.atan2( gp.axes[ yAxis ], gp.axes[ xAxis ] ) / Math.PI );

      if ( Math.hypot( gp.axes[ xAxis ], gp.axes[ yAxis ] ) < .3 ) n = 3;

      switch( n ) {

        case 0:
          this.rig.rotation.y -= this.turnRate;
          break;
        case 2:
        case -2:
          this.rig.rotation.y += this.turnRate;
          break;
        case 1:
          this.rig.position.add( direction.multiplyScalar( -this.moveRate ) );
          break;
        case -1:
          this.rig.position.add( direction.multiplyScalar( this.moveRate ) );
          break;
        default:

      }

    } else {

      // keyboard navigation

      switch( this.key ) {

        case 'd':
        case 'D':
          this.rig.rotation.y -= this.turnRate;
          break;
        case 'a':
        case 'A':
          this.rig.rotation.y += this.turnRate;
          break;
        case 's':
        case 'S':
          this.rig.position.add( direction.multiplyScalar( -this.moveRate ) );
          break;
        case 'w':
        case 'W':
          this.rig.position.add( direction.multiplyScalar( this.moveRate ) );
          break;
        case 'ArrowUp':
          this.rig.position.y += this.moveRate;
          break;
        case 'ArrowDown':
          this.rig.position.y -= this.moveRate;
          break;
        default:

      }

    }

    if ( gp && gp.buttons[ trigger ].pressed ) {

      window.dispatchEvent( new Event( 'trigger' ) );

    }

  }

}
