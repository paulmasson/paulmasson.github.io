
THREE.VRController = function( camera ) {

  THREE.Object3D.call( this );

  this.rig = new THREE.Object3D();

  this.turnRate = .01;
  this.moveRate = .1;

  var direction = new THREE.Vector3();

  this.update = function() {

    var gamepads = navigator.getGamepads();

    var gp = gamepads[0] ? gamepads[0] : null;

    if ( gp !== null && gp.buttons[0].pressed ) {

      camera.getWorldDirection( direction );

      var n = Math.round( 2 * Math.atan2( gp.axes[1], gp.axes[0] ) / Math.PI );

      if ( Math.sqrt( gp.axes[0]**2 + gp.axes[1]**2 ) < .1 )
       if ( gp.id === 'Oculus Go Controller' ) n = 1;
       else n = 3;

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

    }

  }

}
