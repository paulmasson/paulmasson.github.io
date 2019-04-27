
THREE.VRController = function( camera ) {

  THREE.Object3D.call( this );

  this.rig = new THREE.Object3D();

  this.turnRate = .01;
  this.moveRate = .1;

  var direction = new THREE.Vector3();

  this.key = '';
  var that = this;

  window.addEventListener( 'keydown', function( event ) { that.key = event.key; } );

  this.update = function() {

    camera.getWorldDirection( direction );

    var gamepads = navigator.getGamepads();

    var gp = gamepads[0] ? gamepads[0] : null;

    if ( gp !== null && gp.buttons[0].pressed ) {

      var n = Math.round( 2 * Math.atan2( gp.axes[1], gp.axes[0] ) / Math.PI );

      if ( Math.sqrt( gp.axes[0]**2 + gp.axes[1]**2 ) < .3 ) n = 3;

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
          this.rig.rotation.y -= this.turnRate;
          this.key = '';
          break;
        case 'a':
          this.rig.rotation.y += this.turnRate;
          this.key = '';
          break;
        case 's':
          this.rig.position.add( direction.multiplyScalar( -this.moveRate ) );
          this.key = '';
          break;
        case 'w':
          this.rig.position.add( direction.multiplyScalar( this.moveRate ) );
          this.key = '';
          break;
        case 'ArrowUp':
          this.rig.position.y += this.moveRate;
          this.key = '';
          break;
        case 'ArrowDown':
          this.rig.position.y -= this.moveRate;
          this.key = '';
          break;
        default:

      }

    }

  }

}
