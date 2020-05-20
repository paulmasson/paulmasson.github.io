
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

  var zMinMax = 'zMinMax' in options ? options.zMinMax : 500;
  var zMin =  -zMinMax, zMax = zMinMax;

  var slices = xRange.length < 3 ? 50 : xRange[2];
  var xStep = ( xRange[1] - xRange[0] ) / slices;

  var stacks = yRange.length < 3 ? 50 : yRange[2];
  var yStep = ( yRange[1] - yRange[0] ) / stacks;

  var vertices = [];
  if ( 'colormap' in options ) options.colors = [];

  function whichPart( v ) {
    if ( 'complexFunction' in options )
      switch( options.complexFunction ) {
        case 're':
          return [ v[0], v[1], v[2].re ];
          break;
        case 'im':
          return [ v[0], v[1], v[2].im ];
          break;
        case 'abs':
          return [ v[0], v[1], Math.hypot( v[2].re, v[2].im ) ];
          break;
        default:
          throw 'Unsupported complex function case';
      }
    else return v;
  }

  for ( var i = 0 ; i <= stacks ; i++ ) {
    var y = yRange[0] + i * yStep;
    for ( var j = 0 ; j <= slices ; j++ ) {
      var x = xRange[0] + j * xStep;
      var v = vector(x,y);
      vertices.push( whichPart(v) );

      if ( 'colormap' in options )
        if ( options.colormap === 'complexArgument' ) {
          var p = Math.atan2( v[2].im, v[2].re ) / Math.PI / 2;
          if ( p < 0 ) p += 1;
          options.colors.push( p );
        }
      else options.colors.push( options.colormap(x,y) );
    }
  }

  vertices = roundTo( vertices, 3, false ); // reduce raw data size
  if ( 'colors' in options ) options.colors = roundTo( options.colors, 3 );

  var faces = [];
  var count = slices + 1;
  for ( var i = 0 ; i < stacks ; i++ )
    for ( var j = 0 ; j < slices ; j++ )
      faces.push( [j+count*i, j+count*i+1, j+count*(i+1)+1, j+count*(i+1)] );

  // remove faces completely outside vertical range
  for ( var i = faces.length - 1 ; i >= 0 ; i-- ) {
    var f = faces[i];
    var check = true;
    f.forEach( index => check = check && vertices[index][2] < zMin );
    if ( check ) faces.splice( i, 1 );
    var check = true;
    f.forEach( index => check = check && vertices[index][2] > zMax );
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

  var surfaceMesh = new THREE.Mesh( geometry, material );

  // gridlines

  var gridX = [], gridY = [], delta = .005;
  var geometry = new THREE.Geometry();

  for ( var x = Math.trunc(xRange[0]) ; x <= Math.trunc(xRange[1]) ; x++ ) {
    gridX[x] = [];
    for ( var y = yRange[0] ; y <= yRange[1] ; y += yStep ) {
      var v = whichPart( vector(x,y) );
      if ( v[2] < zMin ) v[2] = zMin;
      if ( v[2] > zMax ) v[2] = zMax;
      gridX[x].push(v);
    }
  }

  for ( var y = Math.trunc(yRange[0]) ; y <= Math.trunc(yRange[1]) ; y++ ) {
    gridY[y] = [];
    for ( var x = xRange[0] ; x <= xRange[1] ; x += xStep ) {
      var v = whichPart( vector(x,y) );
      if ( v[2] < zMin ) v[2] = zMin;
      if ( v[2] > zMax ) v[2] = zMax;
      gridY[y].push(v);
    }
  }

  for ( var i = Math.trunc(xRange[0]) ; i < gridX.length ; i++ )
    for ( var j = 0 ; j < gridX[i].length - 1 ; j++ ) {
      var v1 = gridX[i][j], v2 = gridX[i][j+1];
      geometry.vertices.push(
        new THREE.Vector3( v1[0], v1[1], v1[2]+delta ),
        new THREE.Vector3( v2[0], v2[1], v2[2]+delta ),
        new THREE.Vector3( v1[0], v1[1], v1[2]-delta ),
        new THREE.Vector3( v2[0], v2[1], v2[2]-delta ) );
    }

  for ( var i = Math.trunc(yRange[0]) ; i < gridY.length ; i++ )
    for ( var j = 0 ; j < gridY[i].length - 1 ; j++ ) {
      var v1 = gridY[i][j], v2 = gridY[i][j+1];
      geometry.vertices.push(
        new THREE.Vector3( v1[0], v1[1], v1[2]+delta ),
        new THREE.Vector3( v2[0], v2[1], v2[2]+delta ),
        new THREE.Vector3( v1[0], v1[1], v1[2]-delta ),
        new THREE.Vector3( v2[0], v2[1], v2[2]-delta ) );
    }

  var material = new THREE.LineBasicMaterial( { color: 'gray', linewidth: 1 } );

  var gridMesh = new THREE.LineSegments( geometry, material );


  return [ surfaceMesh, gridMesh ];

}