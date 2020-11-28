import * as THREE from 'three';
import {BufferGeometryUtils} from 'BufferGeometryUtils';
import {scene, renderer, camera, runtime, world, physics, ui, app, appManager} from 'app';
import Simplex from './simplex-noise.js';

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
    return result;
  }
}

const simplex = new MultiSimplex('lol', 6);

const geometry = (() => {
  const topGeometry = new THREE.PlaneBufferGeometry(32, 32, 32, 32);

  const bottomGeometry = new THREE.PlaneBufferGeometry(32, 32, 32, 32);
	bottomGeometry.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0))));
	for (let i = 0; i < bottomGeometry.attributes.position.array.length; i += 3) {
	  let x = bottomGeometry.attributes.position.array[i];
	  let z = bottomGeometry.attributes.position.array[i+2];
	  x /= 100;
	  z /= 100;
	  const y = simplex.noise2D(x, z) * 0.5;
	  bottomGeometry.attributes.position.array[i+1] = y;
	}

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

	console.log('got real geo', geometry);
	// return bottomGeometry;
	return geometry;
})();

const material = new THREE.ShaderMaterial({
  uniforms: {},
  vertexShader: `\
    #define PI 3.1415926535897932384626433832795

    attribute float y;
    attribute vec3 barycentric;
    varying float vUv;
    varying vec3 vBarycentric;
    varying vec3 vPosition;
    void main() {
      vUv = uv.x;
      vBarycentric = barycentric;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `\
    varying vec3 vBarycentric;
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
      vec3 c = mix(lineColor1, lineColor2, 2. + vPosition.y);
      gl_FragColor = vec4(c * (gridFactor(vBarycentric, 0.5) < 0.5 ? 0.9 : 1.0), 1.0);
    }
  `,
});
const gridMesh = new THREE.Mesh(geometry, material);
scene.add(gridMesh);

physics.addGeometry(gridMesh);

/* renderer.setAnimationLoop(() => {
  planetUpdate();
}); */