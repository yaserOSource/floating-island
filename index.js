import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
// import {scene, renderer, camera, runtime, world, physics, ui, app, appManager} from 'app';
import Simplex from './simplex-noise.js';
import metaversefile from 'metaversefile';
const {useApp, usePhysics, useCleanup} = metaversefile;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
// const localVector2D = new THREE.Vector2();
// const localVector2D2 = new THREE.Vector2();

class MultiSimplex {
  constructor(seed, octaves) {
    const simplexes = Array(octaves);
    for (let i = 0; i < octaves; i++) {
      simplexes[i] = new Simplex(seed + i);
    }
    this.simplexes = simplexes;
  }
  noise2D(x, z) {
    let result = 0;
    for (let i = 0; i < this.simplexes.length; i++) {
      const simplex = this.simplexes[i];
      result += simplex.noise2D(x * (2**i), z * (2**i));
    }
    // result /= this.simplexes.length;
    return result;
  }
}
const simplex = new MultiSimplex('lol', 6);
const simplex2 = new MultiSimplex('lol2', 3);
const simplex3 = new MultiSimplex('lol3', 3);

const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1');

export default () => {
  const app = useApp();
  
  const geometry = (() => {
    const s = 32;
    // const maxManhattanDistance = localVector2D.set(0, 0).manhattanDistanceTo(localVector2D2.set(s/2, s/2));
    const maxDistance = localVector.set(s/2, s/2, 0).length();

    const topGeometry = new THREE.PlaneBufferGeometry(s, s, s, s)
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0))));

    /* for (let i = 0; i < topGeometry.attributes.uv.array.length; i += 2) {
      const x = topGeometry.attributes.position.array[i/2*3];
      const y = topGeometry.attributes.position.array[i/2*3+2];
      
      topGeometry.attributes.uv.array[i] += -1/s/7 + simplex2.noise2D(x/10, y/10) * 1/s/7*2;
      topGeometry.attributes.uv.array[i+1] += -1/s/7 + simplex3.noise2D(x/10, y/10) * 1/s/7*2;
    } */

    const bottomGeometry = new THREE.PlaneBufferGeometry(s, s, s, s);
    const lines = [
      new THREE.Line3(new THREE.Vector3(-s/2, -s/2, 0), new THREE.Vector3(-s/2, s/2, 0)),
      new THREE.Line3(new THREE.Vector3(-s/2, s/2, 0), new THREE.Vector3(s/2, s/2, 0)),
      new THREE.Line3(new THREE.Vector3(s/2, s/2, 0), new THREE.Vector3(s/2, -s/2, 0)),
      new THREE.Line3(new THREE.Vector3(s/2, -s/2, 0), new THREE.Vector3(-s/2, -s/2, 0)),
    ];
    const _closestDistanceToLine = (x, y) => {
      localVector.set(x, y, 0);
      let result = Infinity;
      for (const line of lines) {
        const point = line.closestPointToPoint(localVector, true, localVector2);
        const d = localVector.distanceTo(point);
        if (d < result) {
          result = d;
        }
      }
      return result;
    };
    for (let i = 0; i < bottomGeometry.attributes.position.array.length; i += 3) {
      const x = bottomGeometry.attributes.position.array[i];
      const y = bottomGeometry.attributes.position.array[i+1];
      // console.log('got simplex', simplex.noise2D(x, y));
      const d = _closestDistanceToLine(x, y); // localVector2D.set(x, y).manhattanDistanceTo(localVector2D2);
      const z = (10 + simplex.noise2D(x/100, y/100)) * (d/maxDistance)**0.5;
      // console.log('got distance', z, d/maxDistance);
      bottomGeometry.attributes.position.array[i+2] = z;
    }
    bottomGeometry.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0))));

    let geometry = BufferGeometryUtils.mergeBufferGeometries([
      topGeometry,
      bottomGeometry,
    ]);
    geometry = geometry.toNonIndexed();
    const barycentrics = new Float32Array(geometry.attributes.position.array.length);
    let barycentricIndex = 0;
    for (let i = 0; i < geometry.attributes.position.array.length; i += 9) {
      barycentrics[barycentricIndex++] = 1;
      barycentrics[barycentricIndex++] = 0;
      barycentrics[barycentricIndex++] = 0;
      barycentrics[barycentricIndex++] = 0;
      barycentrics[barycentricIndex++] = 1;
      barycentrics[barycentricIndex++] = 0;
      barycentrics[barycentricIndex++] = 0;
      barycentrics[barycentricIndex++] = 0;
      barycentrics[barycentricIndex++] = 1;
    }
    geometry.setAttribute('barycentric', new THREE.BufferAttribute(barycentrics, 3));

    return geometry;
  })();

  const texBase = 'vol_2_2';

  const map = new THREE.Texture();
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  {
    const img = new Image();
    img.onload = () => {
      map.image = img;
      map.needsUpdate = true;
    };
    img.onerror = err => {
      console.warn(err);
    };
    img.crossOrigin = 'Anonymous';
    img.src = baseUrl + texBase + '_Base_Color.png';
  }
  const normalMap = new THREE.Texture();
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  {
    const img = new Image();
    img.onload = () => {
      normalMap.image = img;
      normalMap.needsUpdate = true;
    };
    img.onerror = err => {
      console.warn(err);
    };
    img.crossOrigin = 'Anonymous';
    img.src = baseUrl + texBase + '_Normal.png';
  }
  const heightMap = new THREE.Texture();
  heightMap.wrapS = THREE.RepeatWrapping;
  heightMap.wrapT = THREE.RepeatWrapping;
  {
    const img = new Image();
    img.onload = () => {
      heightMap.image = img;
      heightMap.needsUpdate = true;
    };
    img.onerror = err => {
      console.warn(err);
    };
    img.crossOrigin = 'Anonymous';
    img.src = baseUrl + texBase + '_Height.png';
  }
  const material = new THREE.ShaderMaterial({
    uniforms: {
      map: {
        type: 't',
        value: map,
        needsUpdate: true,
      },
      normalMap: {
        type: 't',
        value: normalMap,
        needsUpdate: true,
      },
      bumpMap: {
        type: 't',
        value: heightMap,
        needsUpdate: true,
      },
      "parallaxScale": { value: 0.25, needsUpdate: true, },
      "parallaxMinLayers": { value: 20, needsUpdate: true, },
      "parallaxMaxLayers": { value: 25, needsUpdate: true, },
      
      /* ambientLightColor: {
        value: null,
        needsUpdate: false,
      },
      lightProbe: {
        value: null,
        needsUpdate: false,
      },
      directionalLights: {
        value: null,
        needsUpdate: false,
      },
      directionalLightShadows: {
        value: null,
        needsUpdate: false,
      },
      spotLights: {
        value: null,
        needsUpdate: false,
      },
      spotLightShadows: {
        value: null,
        needsUpdate: false,
      },
      rectAreaLights: {
        value: null,
        needsUpdate: false,
      },
      ltc_1: {
        value: null,
        needsUpdate: false,
      },
      ltc_2: {
        value: null,
        needsUpdate: false,
      },
      pointLights: {
        value: null,
        needsUpdate: false,
      },
      pointLightShadows: {
        value: null,
        needsUpdate: false,
      },
      hemisphereLights: {
        value: null,
        needsUpdate: false,
      },
      directionalShadowMap: {
        value: null,
        needsUpdate: false,
      },
      directionalShadowMatrix: {
        value: null,
        needsUpdate: false,
      },
      spotShadowMap: {
        value: null,
        needsUpdate: false,
      },
      spotShadowMatrix: {
        value: null,
        needsUpdate: false,
      },
      pointShadowMap: {
        value: null,
        needsUpdate: false,
      },
      pointShadowMatrix: {
        value: null,
        needsUpdate: false,
      }, */
    },
    vertexShader: `\
      precision highp float;
      precision highp int;

      uniform sampler2D normalMap;
      varying vec3 vPosition;
      varying vec2 vUv;
      varying vec3 vViewPosition;
      varying vec3 vNormal;
      varying vec3 eyeVec;
      void main() {
        vPosition = position;
        vUv = uv * 10.;
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        vViewPosition = -mvPosition.xyz;
        // vNormal = normalize( normalMatrix * normal );
        // vNormal = normalize( normalMatrix * texture2D( normalMap, vUv ).rgb );
        vNormal = normalize( texture2D( normalMap, vUv ).rgb );
        gl_Position = projectionMatrix * mvPosition;
        eyeVec = vViewPosition.xyz;
      }
    `,
    fragmentShader: `\
      precision highp float;
      precision highp int;

      uniform sampler2D bumpMap;
      uniform sampler2D map;
      uniform float parallaxScale;
      uniform float parallaxMinLayers;
      uniform float parallaxMaxLayers;
      varying vec3 vPosition;
      varying vec2 vUv;
      varying vec3 vViewPosition;
      varying vec3 vNormal;
      varying vec3 eyeVec;

        vec2 parallaxMap( in vec3 V ) {
          float numLayers = mix( parallaxMaxLayers, parallaxMinLayers, abs( dot( vec3( 0.0, 0.0, 1.0 ), V ) ) );
          float layerHeight = 1.0 / numLayers;
          float currentLayerHeight = 0.0;
          vec2 dtex = parallaxScale * V.xy / V.z / numLayers;
          vec2 currentTextureCoords = vUv;
          float heightFromTexture = texture2D( bumpMap, currentTextureCoords ).r;
          for ( int i = 0; i < 30; i += 1 ) {
            if ( heightFromTexture <= currentLayerHeight ) {
              break;
            }
            currentLayerHeight += layerHeight;
            currentTextureCoords -= dtex;
            heightFromTexture = texture2D( bumpMap, currentTextureCoords ).r;
          }
            vec2 prevTCoords = currentTextureCoords + dtex;
            float nextH = heightFromTexture - currentLayerHeight;
            float prevH = texture2D( bumpMap, prevTCoords ).r - currentLayerHeight + layerHeight;
            float weight = nextH / ( nextH - prevH );
            return prevTCoords * weight + currentTextureCoords * ( 1.0 - weight );
        }
      vec2 perturbUv( vec3 surfPosition, vec3 surfNormal, vec3 viewPosition ) {
        vec2 texDx = dFdx( vUv );
        vec2 texDy = dFdy( vUv );
        vec3 vSigmaX = dFdx( surfPosition );
        vec3 vSigmaY = dFdy( surfPosition );
        vec3 vR1 = cross( vSigmaY, surfNormal );
        vec3 vR2 = cross( surfNormal, vSigmaX );
        float fDet = dot( vSigmaX, vR1 );
        vec2 vProjVscr = ( 1.0 / fDet ) * vec2( dot( vR1, viewPosition ), dot( vR2, viewPosition ) );
        vec3 vProjVtex;
        vProjVtex.xy = texDx * vProjVscr.x + texDy * vProjVscr.y;
        vProjVtex.z = dot( surfNormal, viewPosition );
        return parallaxMap( vProjVtex );
      }
      const vec3 lineColor1 = vec3(${new THREE.Color(0xef5350).toArray().join(', ')});
      const vec3 lineColor2 = vec3(${new THREE.Color(0xff7043).toArray().join(', ')});
      const vec3 sunDirection = normalize(vec3(-1, -2, -3));
      void main() {
        vec3 normal = normalize(-cross(dFdx(eyeVec.xyz), dFdy(eyeVec.xyz)));
        vec2 mapUv = perturbUv( -vViewPosition, normal, normalize( vViewPosition ) );
        
        vec4 c1 = texture2D( map, mapUv );
        vec3 c2 = mix(lineColor1, lineColor2, 1. + vPosition.y);
        float fLight = -dot(vNormal, sunDirection);
        gl_FragColor = vec4((c1.rgb + c2 * 0.3 * min(gl_FragCoord.z/gl_FragCoord.w/50.0, 1.0)) * (0.5 + fLight), c1.a);
        gl_FragColor = sRGBToLinear(gl_FragColor);
      }
    `,
    
    
    
    /* uniforms: {
      uTex: {
        type: 't',
        value: uTex,
      },
    },
    vertexShader: `\
      #define PI 3.1415926535897932384626433832795

      attribute float y;
      attribute vec3 barycentric;
      varying vec2 vUv;
      varying vec3 vBarycentric;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vBarycentric = barycentric;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `\
      uniform sampler2D uTex;
    
      varying vec3 vBarycentric;
      varying vec2 vUv;
      varying vec3 vPosition;
    
      // const float lineWidth = 1.0;
      const vec3 lineColor1 = vec3(${new THREE.Color(0xef5350).toArray().join(', ')});
      const vec3 lineColor2 = vec3(${new THREE.Color(0xff7043).toArray().join(', ')});

      float gridFactor (vec3 bary, float width, float feather) {
        float w1 = width - feather * 0.5;
        // vec3 bary = vec3(vBC.x, vBC.y, 1.0 - vBC.x - vBC.y);
        vec3 d = fwidth(bary);
        vec3 a3 = smoothstep(d * w1, d * (w1 + feather), bary);
        return min(min(a3.x, a3.y), a3.z);
      }
      float gridFactor (vec3 bary, float width) {
        // vec3 bary = vec3(vBC.x, vBC.y, 1.0 - vBC.x - vBC.y);
        vec3 d = fwidth(bary);
        vec3 a3 = smoothstep(d * (width - 0.5), d * (width + 0.5), bary);
        return min(min(a3.x, a3.y), a3.z);
      }

      void main() {
        vec3 c1 = texture2D(uTex, vUv * 10.).rgb;
        vec3 c2 = mix(lineColor1, lineColor2, 2. + vPosition.y);
        gl_FragColor = vec4(c1 * (gridFactor(vBarycentric, 0.5) < 0.5 ? 0.9 : 1.0) + c2 * 0.2, 1.0);
      }
    `, */
    side: THREE.DoubleSide,
    // lights: true,
  });
  const gridMesh = new THREE.Mesh(geometry, material);
  app.add(gridMesh);

  const physics = usePhysics();
  const physicsId = physics.addGeometry(gridMesh);
  useCleanup(() => {
    physics.removeGeometry(physicsId);
  });

  /* renderer.setAnimationLoop(() => {
    planetUpdate();
  }); */

  return app;
};
