
function roundTo( x, n, significant=true ) {

  if ( x === 0 ) return x;

  if ( Array.isArray(x) ) {
    var v = [];
    for ( var i = 0 ; i < x.length ; i++ ) v[i] = roundTo( x[i], n, significant );
    return v;
  }

  if ( significant ) {
    var exponent = Math.floor( Math.log10( Math.abs(x) ) );
    n = n - exponent - 1;
  }

  return Math.round( 10**n * x ) / 10**n;

}


function functionSurface( vector, xRange, yRange, options ) {

  if ( !( 'color' in options ) ) options.color = 'rgb(0,127,255)';
  if ( !( 'opacity' in options ) ) options.opacity = 1;

  var zMin = -500, zMax = 500;

  var slices = xRange.length < 3 ? 50 : xRange[2];
  var xStep = ( xRange[1] - xRange[0] ) / slices;

  var stacks = yRange.length < 3 ? 50 : yRange[2];
  var yStep = ( yRange[1] - yRange[0] ) / stacks;

  var vertices = [];
  if ( 'colormap' in options ) options.colors = [];

  for ( var i = 0 ; i <= stacks ; i++ ) {
    var y = yRange[0] + i * yStep;
    for ( var j = 0 ; j <= slices ; j++ ) {
      var x = xRange[0] + j * xStep;
      var v = vector(x,y);

      if ( 'complexFunction' in options )
        switch( options.complexFunction ) {
          case 're':
            vertices.push( [ v[0], v[1], v[2].re ] );
            break;
          case 'im':
            vertices.push( [ v[0], v[1], v[2].im ] );
            break;
          case 'abs':
            vertices.push( [ v[0], v[1], Math.sqrt( v[2].re**2 + v[2].im**2 ) ] );
            break;
          default:
            throw 'Unsupported complex function case';
        }
      else vertices.push( v );

      if ( 'colormap' in options )
        if ( options.colormap === 'complexArgument' ) {
          var p = Math.atan2( v[2].im, v[2].re ) / Math.PI / 2;
          p = ( p % 1 + 1 ) % 1;
          options.colors.push( p );
        }
      else options.colors.push( options.colormap(x,y) );
    }
  }

  vertices = roundTo( vertices, 3, false ); // reduce raw data size
  if ( 'colors' in options ) options.colors = roundTo( options.colors, 3 );

  var faces = [];
  var count = slices + 1;
  for ( var i = 0 ; i < stacks ; i++ ) {
    for ( var j = 0 ; j < slices ; j++ ) {
      faces.push( [j+count*i, j+count*i+1, j+count*(i+1)+1, j+count*(i+1)] );
    }
  }

  // remove faces completely outside vertical range
  for ( var i = faces.length - 1 ; i >= 0 ; i-- ) {
    var f = faces[i];
    var check = true;
    f.forEach( index => check &= vertices[index][2] < zMin );
    if ( check ) faces.splice( i, 1 );
    var check = true;
    f.forEach( index => check &= vertices[index][2] > zMax );
    if ( check ) faces.splice( i, 1 );
  }

  // constrain vertices to vertical range
  for ( var i = 0 ; i < vertices.length ; i++ ) {
    if ( vertices[i][2] < zMin ) vertices[i][2] = zMin;
    if ( vertices[i][2] > zMax ) vertices[i][2] = zMax;
  }

  // no appreciable speedup with BufferGeometry
  var geometry = new THREE.Geometry();
  for ( var i = 0 ; i < vertices.length ; i++ ) {
    var v = vertices[i];
    geometry.vertices.push( new THREE.Vector3( v[0], v[1], v[2] ) );
  }
  for ( var i = 0 ; i < faces.length ; i++ ) {
    var f = faces[i];
    for ( var j = 0 ; j < f.length - 2 ; j++ )
      geometry.faces.push( new THREE.Face3( f[0], f[j+1], f[j+2] ) );
  }

  geometry.computeVertexNormals();

  var side = options.singleSide ? THREE.FrontSide : THREE.DoubleSide;
  var transparent = options.opacity < 1 ? true : false;
  var material = new THREE.MeshPhongMaterial( {
                               color: options.color, side: side,
                               transparent: transparent, opacity: options.opacity,
                               shininess: 20 } );

  if ( 'colors' in options ) {
    for ( var i = 0 ; i < geometry.vertices.length ; i++ )
      geometry.colors.push( new THREE.Color().setHSL( options.colors[i], 1, .5 ) );
    for ( var i = 0 ; i < geometry.faces.length ; i++ ) {
      var f = geometry.faces[i];
      f.vertexColors = [ geometry.colors[f.a], geometry.colors[f.b], geometry.colors[f.c] ];
    }
    material.vertexColors = THREE.VertexColors;
    material.color.set( 'white' ); // crucial!
  }

  return new THREE.Mesh( geometry, material );

}