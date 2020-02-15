
var canvas, context, texture, menuInVR, surface;

var parser = new DOMParser();
var serializer = new XMLSerializer();
var image = document.createElement( 'img' );

var origin, line, pointer;

var raycaster = new THREE.Raycaster( );
var scratch = new THREE.Vector3();


function menuHTML() {

  var inputs = '';

  for ( var i = 0 ; i < arguments.length ; i++ ) {

    var a = arguments[i];

    var label = 'label' in a ? a.label : `<i>${a.name}</i>`;
    var value = 'default' in a ? a.default : 0;

    inputs += `
<br/><br/>
Re(${label}): <input type=range id=${a.name}Re value=${value} min=-10 max=10 step=.01
                     onchange="${a.name}ReBox.innerHTML=${a.name}Re.value" style="width: 1.5in"/>
&nbsp;&nbsp; <span id=${a.name}ReBox><script> document.write(${a.name}Re.value) </script></span>
<br/><br/>
Im(${label}): <input type=range id=${a.name}Im value=0 min=-10 max=10 step=.01
                     onchange="${a.name}ImBox.innerHTML=${a.name}Im.value" style="width: 1.5in"/>
&nbsp;&nbsp; <span id=${a.name}ImBox><script> document.write(${a.name}Im.value) </script></span>`;

  }

  return `
<div style="position: absolute; margin: .25in" >
<div id="menu" onchange="updateMenu()"
     style=" padding: .25in; background-color: white; opacity: 1;
             font-family: Arial; font-weight: bold">
Function part:
<input name=part type=radio value=re checked>
  <label>re</label></input>
<input name=part type=radio value=im>
  <label>im</label></input>
<input name=part type=radio value=abs>
  <label>abs</label></input>
<span id="dot" style="background-color: white; border-radius: 50%; width: 10px; height: 10px;
                      position: absolute; top: 0px; left: 0px; opacity: .5;
                      pointer-events: none">&nbsp;</span>
${inputs}
</div></div>`;

}


function setUpMenuInVR() {

  var menuWidth = 2**Math.floor( Math.log2( menu.clientWidth ) );
  var menuHeight = 2**Math.floor( Math.log2( menu.clientHeight ) );
  var pixelRatio = Math.round( window.devicePixelRatio );

  canvas = document.createElement( 'canvas' );
  canvas.width = menuWidth * pixelRatio;
  canvas.height = menuHeight * pixelRatio;
  canvas.style.width = menuWidth;
  canvas.style.height = menuHeight;

  context = canvas.getContext( '2d' );
  context.fillStyle = 'white';
  context.fillRect( 0, 0, canvas.width, canvas.height );

  var plane = new THREE.PlaneGeometry( menu.clientWidth/300, menu.clientHeight/300 );
  texture = new THREE.Texture( canvas );

  menuInVR = new THREE.Mesh( plane, new THREE.MeshBasicMaterial( { map: texture, depthTest: false } ) );
  menuInVR.position.set( -1, 1.5, -2 );
  menuInVR.material.transparent = true;
  menuInVR.renderOrder = 1;
  controller.rig.add( menuInVR );

}


function updateMenu() {

  var inputs = menu.getElementsByTagName( 'input' );

  for ( var i = 0 ; i < inputs.length ; i++ ) {

    var e = inputs[i];

    switch( e.type ) {

      case 'number': e.defaultValue = e.value; break;

      case 'range': e.defaultValue = e.value; break;

      case 'radio': e.checked ? e.setAttribute( 'checked', true ) : e.removeAttribute( 'checked' );

    }

  }

  drawMenu();
  drawSurface();

}


function drawMenu() {

  var css = `
input[type=radio] { width: 10px; height: 10px;
                    background-color: white;
                    border: 1px solid black; border-radius: 50%; }

input[type=radio][checked] { background-color: black; }

input[type=range] { background-color: red )
  `;

  var data =  `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${ menu.clientWidth }" height="${ menu.clientHeight }"
     preserveAspectRatio="none">
<defs><style type="text/css"> ${ css } </style></defs>
<foreignObject width="100%" height="100%" style="background-color: white">
<div xmlns="http://www.w3.org/1999/xhtml">
${ menu.outerHTML }
</div></foreignObject></svg>
  `;

  var doc = parser.parseFromString( data, 'text/html' );

  var result = serializer.serializeToString( doc.body.children[0] );

  image.onload = function () {
    context.drawImage( image, 0, 0, canvas.width, canvas.height );
    texture.needsUpdate = true;
  }

  // creating svg with Blob taints the canvas in Chrome
  image.src = 'data:image/svg+xml;utf8,' + encodeURIComponent( result );

}


function drawSurface() {

  menu.style.opacity = .5;
  menuInVR.material.opacity = .5;
  drawMenu();

  setTimeout( function() {

    scene.remove( surface );

    var part = document.querySelector( 'input[name=part]:checked' ).value;

    surface = functionSurface( (x,y) => [ x, y, special(x,y) ], [-10.1,10.1,201], [-10.1,10.1,201],
                               { complexFunction: part, colormap: 'complexArgument', zMinMax: 100 } )
    // setting camera up not work
    surface.rotation.z = pi;
    surface.rotation.x = -pi/2;

    scene.add( surface );

    menu.style.opacity = 1;
    menuInVR.material.opacity = 1;

  }, 50 );

}


function setUpPointer() {

  origin = new THREE.Vector3( .3, 1, -.2 ); // position of hardware in VR

  line = new THREE.Geometry();
  line.vertices.push( origin, new THREE.Vector3() );
  line.colors.push( new THREE.Color( 0xffffff ), new THREE.Color( 0x777777 ) );

  var material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );

  pointer = new THREE.LineSegments( line, material );
  pointer.frustumCulled = false;
  controller.rig.add( pointer );

}


function checkForInput() {

  menuInVR.visible = 'xr' in renderer ? renderer.xr.isPresenting : false;
  pointer.visible = menuInVR.visible;

  // controller quaterion is perpendicular to touchpad
  line.vertices[1].set(0,0,-1).applyQuaternion( controller.quaternion ).add( origin );
  line.verticesNeedUpdate = true;

  scratch.copy( origin ).applyQuaternion( controller.rig.quaternion );
  raycaster.ray.origin.copy( scratch );
  raycaster.ray.origin.add( controller.rig.getWorldPosition( scratch ) );

  scratch.copy( line.vertices[1] ).sub( line.vertices[0] )
    .applyQuaternion( controller.rig.quaternion ).normalize();
  raycaster.ray.direction.copy( scratch );

  var p = raycaster.intersectObject( menuInVR );

  if ( p.length > 0 ) {

    var x = menu.clientWidth * p[0].uv.x;
    var y = menu.clientHeight * ( 1 - p[0].uv.y );

    dot.style.left = x - 5 + 'px';
    dot.style.top = y - 5 + 'px';
    dot.style.backgroundColor = 'aqua';

    var gp = controller.gamepad;
    var trigger = 0;

    if ( gp && ( gp.buttons[ trigger ].pressed ) ) {

      var menuRect = menu.getBoundingClientRect();
      var elem = document.elementFromPoint( x + menuRect.x, y + menuRect.y );

      // sliders not respond to click events...
      if ( elem.type === 'range' ) {
        var rangeRect = elem.getBoundingClientRect();
        var value = ( +elem.max - +elem.min ) * ( x + menuRect.x - rangeRect.x ) / rangeRect.width + +elem.min;
        elem.value = value;
        elem.onchange();
        updateMenu();
      } else elem.click();

    }

  } else {

    dot.style.left = '0px';
    dot.style.top = '0px';
    dot.style.backgroundColor = 'white';

  }

  drawMenu();

}
