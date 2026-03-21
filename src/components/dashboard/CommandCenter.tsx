'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useRouter } from 'next/navigation';

interface CommandCenterProps {
  userName: string;
}

interface ModuleConfig {
  name: string;
  route: string;
  labelText: string;
  orbitSpeed: number;
  orbitRadius: number;
  orbitOffset: number;
  selfAnimation?: (mesh: THREE.Mesh, time: number) => void;
}

interface ModuleRuntime extends ModuleConfig {
  mesh: THREE.Mesh;
}

export default function CommandCenter({ userName }: CommandCenterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modulesRef = useRef<ModuleRuntime[]>([]);
  const pyramidRef = useRef<THREE.Mesh | null>(null);
  const apexLightRef = useRef<THREE.PointLight | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const frameRef = useRef<number>(0);
  const hoveredRef = useRef<ModuleRuntime | null>(null);
  const reducedMotionRef = useRef(false);
  const router = useRouter();

  const [labelState, setLabelState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    name: string;
    desc: string;
  }>({ visible: false, x: 0, y: 0, name: '', desc: '' });

  const projectToScreen = useCallback(
    (position: THREE.Vector3, camera: THREE.PerspectiveCamera, container: HTMLDivElement) => {
      const vector = position.clone().project(camera);
      const halfWidth = container.clientWidth / 2;
      const halfHeight = container.clientHeight / 2;
      return {
        x: vector.x * halfWidth + halfWidth,
        y: -(vector.y * halfHeight) + halfHeight,
      };
    },
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = motionQuery.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      if (controlsRef.current) {
        controlsRef.current.autoRotate = !e.matches;
      }
    };
    motionQuery.addEventListener('change', onMotionChange);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0f');
    sceneRef.current = scene;

    // Camera — isometric-ish perspective
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(4, 3.5, 4);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = !reducedMotionRef.current;
    controls.autoRotateSpeed = 0.4;
    controls.minPolarAngle = Math.PI / 4;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    // Disable on touch for mobile
    if ('ontouchstart' in window && container.clientWidth < 768) {
      controls.enabled = false;
    }
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 0.6);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    // ========== CENTRAL PYRAMID ==========
    const pyramidGeo = new THREE.ConeGeometry(1, 1.8, 4);
    const pyramidMat = new THREE.MeshStandardMaterial({
      color: '#c9704a',
      emissive: '#c9704a',
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.1,
    });
    const pyramid = new THREE.Mesh(pyramidGeo, pyramidMat);
    pyramid.position.y = 0.9;
    scene.add(pyramid);
    pyramidRef.current = pyramid;

    // Pyramid edges
    const edgesGeo = new THREE.EdgesGeometry(pyramidGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: '#c9704a',
      transparent: true,
      opacity: 0.4,
    });
    const edgeLines = new THREE.LineSegments(edgesGeo, edgesMat);
    pyramid.add(edgeLines);

    // Apex pulsing light
    const apexLight = new THREE.PointLight('#c9704a', 2, 8);
    apexLight.position.set(0, 1.0, 0);
    pyramid.add(apexLight);
    apexLightRef.current = apexLight;

    // ========== PARTICLES ==========
    const particleCount = 200;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 2.5;
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: '#f5f0e8',
      size: 0.02,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particlesRef.current = particles;

    // ========== STAR FIELD ==========
    const starCount = 400;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 50;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 0.03,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ========== ORBIT RINGS ==========
    const ringSegments = 128;
    for (let i = 0; i < 4; i++) {
      const radius = 2.2 + i * 0.3;
      const ringPoints: THREE.Vector3[] = [];
      for (let j = 0; j <= ringSegments; j++) {
        const angle = (j / ringSegments) * Math.PI * 2;
        ringPoints.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const ringMat = new THREE.LineBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.03,
      });
      const ring = new THREE.Line(ringGeo, ringMat);
      scene.add(ring);
    }

    // ========== MODULE CONFIGS ==========
    const moduleConfigs: ModuleConfig[] = [
      {
        name: 'Proyectos',
        route: '/proyectos',
        labelText: 'Dev workspace',
        orbitSpeed: 0.3,
        orbitRadius: 2.5,
        orbitOffset: 0,
      },
      {
        name: 'Gastos',
        route: '/gastos',
        labelText: 'Finanzas personales',
        orbitSpeed: 0.25,
        orbitRadius: 2.8,
        orbitOffset: Math.PI / 2,
        selfAnimation: (mesh: THREE.Mesh, time: number) => {
          mesh.rotation.y = time * 3;
        },
      },
      {
        name: 'Notas',
        route: '/notas',
        labelText: 'Ideas y conexiones',
        orbitSpeed: 0.35,
        orbitRadius: 2.2,
        orbitOffset: Math.PI,
        selfAnimation: (mesh: THREE.Mesh, time: number) => {
          mesh.position.y += Math.sin(time * 2) * 0.003;
        },
      },
      {
        name: 'Mercados',
        route: '/mercados',
        labelText: 'Dashboard financiero',
        orbitSpeed: 0.2,
        orbitRadius: 3.1,
        orbitOffset: (3 * Math.PI) / 2,
        selfAnimation: (mesh: THREE.Mesh, time: number) => {
          mesh.rotation.x = time * 2;
          mesh.rotation.z = time * 1.5;
        },
      },
    ];

    // ========== BUILD MODULE MESHES ==========
    const modules: ModuleRuntime[] = [];

    // Proyectos — box
    const proyectosGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const proyectosMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.5,
      metalness: 0.2,
    });
    const proyectosMesh = new THREE.Mesh(proyectosGeo, proyectosMat);
    const proyectosEdgesGeo = new THREE.EdgesGeometry(proyectosGeo);
    const proyectosEdgesMat = new THREE.LineBasicMaterial({ color: '#7a9b76' });
    const proyectosEdges = new THREE.LineSegments(proyectosEdgesGeo, proyectosEdgesMat);
    proyectosMesh.add(proyectosEdges);
    scene.add(proyectosMesh);
    modules.push({ ...moduleConfigs[0], mesh: proyectosMesh });

    // Gastos — coin
    const gastosGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 32);
    const gastosMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      metalness: 0.8,
      roughness: 0.2,
    });
    const gastosMesh = new THREE.Mesh(gastosGeo, gastosMat);
    scene.add(gastosMesh);
    modules.push({ ...moduleConfigs[1], mesh: gastosMesh });

    // Notas — icosahedron
    const notasGeo = new THREE.IcosahedronGeometry(0.35, 1);
    const notasMat = new THREE.MeshStandardMaterial({
      color: '#f5f0e8',
      emissive: '#f5f0e8',
      emissiveIntensity: 0.1,
      roughness: 0.6,
    });
    const notasMesh = new THREE.Mesh(notasGeo, notasMat);
    scene.add(notasMesh);
    modules.push({ ...moduleConfigs[2], mesh: notasMesh });

    // Mercados — torus
    const mercadosGeo = new THREE.TorusGeometry(0.3, 0.1, 16, 32);
    const mercadosMat = new THREE.MeshStandardMaterial({
      color: '#3b82f6',
      emissive: '#3b82f6',
      emissiveIntensity: 0.2,
      roughness: 0.3,
      metalness: 0.4,
    });
    const mercadosMesh = new THREE.Mesh(mercadosGeo, mercadosMat);
    scene.add(mercadosMesh);
    modules.push({ ...moduleConfigs[3], mesh: mercadosMesh });

    modulesRef.current = modules;

    // ========== RAYCASTER ==========
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const meshes = modules.map((m) => m.mesh);

    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onClick = () => {
      if (hoveredRef.current) {
        router.push(hoveredRef.current.route);
      }
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('click', onClick);

    // ========== RESIZE ==========
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // Mobile scaling
    const isMobile = container.clientWidth < 768;
    if (isMobile) {
      scene.scale.setScalar(0.75);
    }

    // ========== ANIMATION LOOP ==========
    const clock = new THREE.Clock();

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const reduced = reducedMotionRef.current;

      // Pyramid rotation
      if (!reduced && pyramidRef.current) {
        pyramidRef.current.rotation.y = time * 0.15;
      }

      // Apex light pulsing
      if (apexLightRef.current) {
        apexLightRef.current.intensity = 2 + Math.sin(time * 2) * 0.8;
      }

      // Particle cloud slow rotation
      if (!reduced && particlesRef.current) {
        particlesRef.current.rotation.y = time * 0.05;
      }

      // Module orbital motion
      for (const mod of modules) {
        if (!reduced) {
          const angle = time * mod.orbitSpeed + mod.orbitOffset;
          mod.mesh.position.x = Math.cos(angle) * mod.orbitRadius;
          mod.mesh.position.z = Math.sin(angle) * mod.orbitRadius;
          mod.mesh.position.y = 0.5;
        }

        // Self animations
        if (!reduced && mod.selfAnimation) {
          mod.selfAnimation(mod.mesh, time);
        }
      }

      // Raycaster hover
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(meshes, false);

      let newHovered: ModuleRuntime | null = null;
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const found = modules.find((m) => m.mesh === hitMesh);
        if (found) newHovered = found;
      }

      // Update hover states
      if (newHovered !== hoveredRef.current) {
        // Reset previous
        if (hoveredRef.current) {
          const prevMat = hoveredRef.current.mesh.material as THREE.MeshStandardMaterial;
          prevMat.emissiveIntensity = prevMat.emissiveIntensity > 0 ? 0.2 : 0;
          hoveredRef.current.mesh.scale.setScalar(1);
        }
        // Set new
        if (newHovered) {
          const mat = newHovered.mesh.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.6;
          mat.emissive = mat.emissive.clone().set(mat.color);
          newHovered.mesh.scale.setScalar(1.15);
          container.style.cursor = 'pointer';

          // Update label
          const pos = new THREE.Vector3();
          newHovered.mesh.getWorldPosition(pos);
          pos.y += 0.6;
          const screenPos = projectToScreen(pos, camera, container);
          setLabelState({
            visible: true,
            x: screenPos.x,
            y: screenPos.y,
            name: newHovered.name,
            desc: newHovered.labelText,
          });
        } else {
          container.style.cursor = 'default';
          setLabelState((prev) => ({ ...prev, visible: false }));
        }
        hoveredRef.current = newHovered;
      } else if (newHovered) {
        // Update label position even if same hover target
        const pos = new THREE.Vector3();
        newHovered.mesh.getWorldPosition(pos);
        pos.y += 0.6;
        const screenPos = projectToScreen(pos, camera, container);
        setLabelState((prev) => ({
          ...prev,
          x: screenPos.x,
          y: screenPos.y,
        }));
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // ========== CLEANUP ==========
    return () => {
      cancelAnimationFrame(frameRef.current);
      motionQuery.removeEventListener('change', onMotionChange);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('click', onClick);
      resizeObserver.disconnect();
      controls.dispose();

      // Dispose all scene objects
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material.dispose();
          }
        }
        if (object instanceof THREE.LineSegments || object instanceof THREE.Line) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material.dispose();
          }
        }
        if (object instanceof THREE.Points) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      modulesRef.current = [];
      pyramidRef.current = null;
      apexLightRef.current = null;
      particlesRef.current = null;
    };
  }, [projectToScreen, router]);

  return (
    <div className="relative h-[280px] overflow-hidden rounded-xl md:h-[420px]">
      {/* Three.js canvas mount point */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Overlay text */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-6 pt-6 text-center md:px-10 md:pt-8">
        <h1
          className="text-2xl tracking-tight md:text-4xl"
          style={{ fontFamily: 'var(--font-heading)', color: '#f5f0e8' }}
        >
          Centro de Mandos
        </h1>
        <p
          className="mt-1 text-sm md:text-base"
          style={{ fontFamily: 'var(--font-sans)', color: '#888780' }}
        >
          Bienvenido, {userName}
        </p>
      </div>

      {/* Hover label */}
      {labelState.visible && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full"
          style={{
            left: `${labelState.x}px`,
            top: `${labelState.y}px`,
            fontFamily: 'var(--font-sans)',
          }}
        >
          <div className="rounded-md bg-black/70 px-3 py-1.5 text-center backdrop-blur-sm">
            <p className="text-xs font-semibold text-white">{labelState.name}</p>
            <p className="text-[10px] text-gray-400">{labelState.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
