"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Camera,
  Compass,
  Eye,
  Maximize2,
  Play,
  RotateCcw,
  Skull,
  Sparkles,
  Trophy,
  Video,
} from "lucide-react";
import { Direction, GameState, Player, Resource } from "@/types/game";

export type CameraMode3D = "follow" | "overview" | "close";

interface GameField3DProps {
  gameState: GameState;
  onStart: () => void;
  onReset: () => void;
  onMove?: (direction: Direction) => void;
}

interface ProjectedLabel {
  id: string;
  name: string;
  avatar: string;
  color: string;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  isAI: boolean;
  isAlive: boolean;
  lastAction?: string;
  x: number;
  y: number;
  visible: boolean;
}

interface ParticleBurst {
  points: THREE.Points;
  velocities: Float32Array;
  ring: THREE.Mesh;
  beam?: THREE.Mesh;
  createdAt: number;
  duration: number;
}

const DIRECTION_ANGLES: Record<Direction, number> = {
  up: Math.PI,
  down: 0,
  left: -Math.PI / 2,
  right: Math.PI / 2,
};

export const GameField3D: React.FC<GameField3DProps> = ({
  gameState,
  onStart,
  onReset,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const [cameraMode, setCameraMode] = useState<CameraMode3D>("follow");
  const cameraModeRef = useRef<CameraMode3D>(cameraMode);
  cameraModeRef.current = cameraMode;

  const [labels, setLabels] = useState<ProjectedLabel[]>([]);

  // Orbit / camera spherical offsets controlled by mouse drag + wheel
  const orbitRef = useRef({
    azimuth: 0,
    polar: 0.78, // radians from vertical
    distance: 22,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    targetFocus: new THREE.Vector3(0, 0, 0),
  });

  // Adjust default camera distance when switching modes
  const handleSelectCameraMode = (mode: CameraMode3D) => {
    setCameraMode(mode);
    if (mode === "follow") {
      orbitRef.current.distance = 20;
      orbitRef.current.polar = 0.78;
    } else if (mode === "overview") {
      orbitRef.current.distance = 46;
      orbitRef.current.polar = 0.68;
    } else if (mode === "close") {
      orbitRef.current.distance = 11;
      orbitRef.current.polar = 0.98;
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const gridSize = gameStateRef.current.config.gridSize;
    const halfGrid = gridSize / 2;

    const gridToWorld = (gx: number, gy: number) => ({
      wx: gx - halfGrid + 0.5,
      wz: gy - halfGrid + 0.5,
    });

    // 1. SCENE, CAMERA, RENDERER
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#040711");
    scene.fog = new THREE.FogExp2("#040711", 0.011);

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      200
    );
    camera.position.set(0, 26, 26);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. LIGHTING
    const ambientLight = new THREE.AmbientLight("#334155", 1.35);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight("#38bdf8", "#0f172a", 0.9);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight("#f8fafc", 1.8);
    dirLight.position.set(22, 42, 24);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 110;
    const d = 32;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Central Cornucopia Golden Point Light
    const cornucopiaLight = new THREE.PointLight("#f59e0b", 4.5, 24, 1.5);
    cornucopiaLight.position.set(0, 4.5, 0);
    scene.add(cornucopiaLight);

    // 3. PROCEDURAL 50x50 ARENA FLOOR TEXTURE
    const createGridTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 2048;
      canvas.height = 2048;
      const ctx = canvas.getContext("2d")!;

      // Deep futuristic arena slate base
      ctx.fillStyle = "#070b14";
      ctx.fillRect(0, 0, 2048, 2048);

      const step = 2048 / gridSize;

      // Subtle checker & biome shading
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const isCenter =
            Math.abs(x - halfGrid) <= 3.5 && Math.abs(y - halfGrid) <= 3.5;
          if (isCenter) {
            ctx.fillStyle =
              (x + y) % 2 === 0
                ? "rgba(245, 158, 11, 0.18)"
                : "rgba(217, 119, 6, 0.12)";
          } else {
            ctx.fillStyle =
              (x + y) % 2 === 0
                ? "rgba(15, 23, 42, 0.85)"
                : "rgba(10, 15, 29, 0.85)";
          }
          ctx.fillRect(x * step, y * step, step, step);
        }
      }

      // 50x50 Cell gridlines
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(51, 65, 85, 0.45)";
      for (let i = 0; i <= gridSize; i++) {
        const pos = i * step;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, 2048);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(2048, pos);
        ctx.stroke();
      }

      // 10x10 Sector neon lines
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
      for (let i = 0; i <= gridSize; i += 10) {
        const pos = i * step;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, 2048);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(2048, pos);
        ctx.stroke();
      }

      // Golden Cornucopia Ring
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(245, 158, 11, 0.75)";
      const cStart = (halfGrid - 3.5) * step;
      const cSize = 7 * step;
      ctx.strokeRect(cStart, cStart, cSize, cSize);

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = 8;
      return tex;
    };

    const floorGeo = new THREE.PlaneGeometry(gridSize, gridSize);
    const floorMat = new THREE.MeshStandardMaterial({
      map: createGridTexture(),
      roughness: 0.65,
      metalness: 0.25,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // 4. ARENA BORDER WALLS, FORCEFIELD DOME & OBELISK TOWERS
    const borderGroup = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({
      color: "#0f172a",
      metalness: 0.7,
      roughness: 0.3,
      emissive: "#0284c7",
      emissiveIntensity: 0.15,
    });

    const wallConfigs = [
      { x: 0, z: -halfGrid - 0.3, w: gridSize + 1.2, d: 0.6 },
      { x: 0, z: halfGrid + 0.3, w: gridSize + 1.2, d: 0.6 },
      { x: -halfGrid - 0.3, z: 0, w: 0.6, d: gridSize + 1.2 },
      { x: halfGrid + 0.3, z: 0, w: 0.6, d: gridSize + 1.2 },
    ];
    wallConfigs.forEach((wc) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(wc.w, 1.2, wc.d),
        wallMat
      );
      wall.position.set(wc.x, 0.6, wc.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      borderGroup.add(wall);
    });

    // Corner & Midpoint Capitol Towers
    const towerCoords = [
      [-halfGrid, -halfGrid],
      [halfGrid, -halfGrid],
      [-halfGrid, halfGrid],
      [halfGrid, halfGrid],
      [0, -halfGrid],
      [0, halfGrid],
      [-halfGrid, 0],
      [halfGrid, 0],
    ];
    towerCoords.forEach(([tx, tz]) => {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.7, 5.5, 6),
        new THREE.MeshStandardMaterial({
          color: "#1e293b",
          metalness: 0.8,
          roughness: 0.2,
        })
      );
      tower.position.set(tx, 2.75, tz);
      tower.castShadow = true;
      borderGroup.add(tower);

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 12, 12),
        new THREE.MeshBasicMaterial({ color: "#38bdf8" })
      );
      beacon.position.set(tx, 5.7, tz);
      borderGroup.add(beacon);
    });

    // Translucent Hexagonal Capitol Forcefield Dome
    const domeGeo = new THREE.IcosahedronGeometry(gridSize * 0.74, 2);
    const domeMat = new THREE.MeshBasicMaterial({
      color: "#38bdf8",
      wireframe: true,
      transparent: true,
      opacity: 0.06,
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    domeMesh.position.set(0, 0, 0);
    borderGroup.add(domeMesh);

    scene.add(borderGroup);

    // 5. SCATTERED 3D ARENA TREES / ROCKS ON NON-PLAYABLE PERIMETER & DECORATIVE PILLARS
    const envGroup = new THREE.Group();
    const treeTrunkMat = new THREE.MeshStandardMaterial({
      color: "#3f2e21",
      roughness: 0.9,
    });
    const treeLeavesMat = new THREE.MeshStandardMaterial({
      color: "#064e3b",
      roughness: 0.7,
      emissive: "#022c22",
      emissiveIntensity: 0.2,
    });

    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const radius = halfGrid + 2.5 + (i % 3) * 1.8;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;

      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.35, 1.6, 6),
        treeTrunkMat
      );
      trunk.position.y = 0.8;
      tree.add(trunk);

      const foliage1 = new THREE.Mesh(
        new THREE.ConeGeometry(1.3, 2.8, 7),
        treeLeavesMat
      );
      foliage1.position.y = 2.4;
      tree.add(foliage1);

      const foliage2 = new THREE.Mesh(
        new THREE.ConeGeometry(0.95, 2.2, 7),
        treeLeavesMat
      );
      foliage2.position.y = 3.6;
      tree.add(foliage2);

      tree.position.set(tx, 0, tz);
      envGroup.add(tree);
    }
    scene.add(envGroup);

    // 6. CENTRAL 3D GOLDEN CORNUCOPIA MONUMENT
    const cornucopiaGroup = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({
      color: "#f59e0b",
      metalness: 0.85,
      roughness: 0.2,
      emissive: "#b45309",
      emissiveIntensity: 0.25,
    });

    // Stepped octagonal pedestal
    const basePlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 3.1, 0.28, 8),
      new THREE.MeshStandardMaterial({
        color: "#1e293b",
        metalness: 0.6,
        roughness: 0.4,
      })
    );
    basePlatform.position.y = 0.14;
    basePlatform.receiveShadow = true;
    cornucopiaGroup.add(basePlatform);

    // Golden Horn Spire / Arch
    const hornMain = new THREE.Mesh(
      new THREE.ConeGeometry(1.25, 3.2, 8),
      goldMat
    );
    hornMain.position.set(0, 1.7, 0);
    hornMain.rotation.z = 0.28;
    hornMain.castShadow = true;
    cornucopiaGroup.add(hornMain);

    // Floating Holographic Capitol Rings
    const holoRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.05, 12, 48),
      new THREE.MeshBasicMaterial({ color: "#fbbf24" })
    );
    holoRing1.rotation.x = Math.PI / 2;
    holoRing1.position.y = 2.2;
    cornucopiaGroup.add(holoRing1);

    const holoRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.04, 12, 48),
      new THREE.MeshBasicMaterial({ color: "#38bdf8" })
    );
    holoRing2.rotation.x = Math.PI / 3;
    holoRing2.position.y = 2.9;
    cornucopiaGroup.add(holoRing2);

    scene.add(cornucopiaGroup);

    // 7. FLOATING ATMOSPHERIC ARENA EMBERS
    const emberCount = 320;
    const emberPositions = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      emberPositions[i * 3] = (Math.random() - 0.5) * gridSize;
      emberPositions[i * 3 + 1] = Math.random() * 18 + 0.5;
      emberPositions[i * 3 + 2] = (Math.random() - 0.5) * gridSize;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(emberPositions, 3)
    );
    const emberMat = new THREE.PointsMaterial({
      color: "#fbbf24",
      size: 0.18,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const emberParticles = new THREE.Points(emberGeo, emberMat);
    scene.add(emberParticles);

    // 8. DYNAMIC ENTITY CACHES (PLAYERS, RESOURCES, EFFECTS)
    const playerMeshes = new Map<
      string,
      {
        group: THREE.Group;
        bodyMesh: THREE.Mesh;
        shieldMesh: THREE.Mesh;
        ringMesh: THREE.Mesh;
        tombstoneGroup: THREE.Group;
        targetPos: THREE.Vector3;
        targetRotY: number;
        wasAlive: boolean;
      }
    >();

    const resourceMeshes = new Map<string, THREE.Group>();
    const processedEffectIds = new Set<string>();
    const activeBursts: ParticleBurst[] = [];

    const spawn3DBurst = (
      wx: number,
      wz: number,
      colorHex: string,
      isElimination = false
    ) => {
      const count = isElimination ? 90 : 32;
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        positions[i * 3] = wx;
        positions[i * 3 + 1] = 0.8;
        positions[i * 3 + 2] = wz;

        const theta = Math.random() * Math.PI * 2;
        const speed = (isElimination ? 0.16 : 0.09) * (0.4 + Math.random());
        velocities[i * 3] = Math.cos(theta) * speed;
        velocities[i * 3 + 1] =
          (isElimination ? 0.22 : 0.12) * (0.5 + Math.random());
        velocities[i * 3 + 2] = Math.sin(theta) * speed;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: colorHex,
        size: isElimination ? 0.35 : 0.22,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      // Expanding ground shockwave ring
      const ringGeo = new THREE.RingGeometry(0.2, 0.45, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(wx, 0.08, wz);
      scene.add(ring);

      // Vertical Capitol Cannon Sky Beam on Elimination
      let beam: THREE.Mesh | undefined;
      if (isElimination) {
        const beamGeo = new THREE.CylinderGeometry(0.35, 0.35, 40, 16);
        const beamMat = new THREE.MeshBasicMaterial({
          color: "#f59e0b",
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
        });
        beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(wx, 20, wz);
        scene.add(beam);
      }

      activeBursts.push({
        points,
        velocities,
        ring,
        beam,
        createdAt: performance.now(),
        duration: isElimination ? 1600 : 700,
      });
    };

    const createPlayerMeshGroup = (player: Player) => {
      const group = new THREE.Group();

      // Alive Character Subgroup
      const aliveSubgroup = new THREE.Group();
      aliveSubgroup.name = "aliveSubgroup";

      // Glowing Ground Selector Ring
      const ringGeo = new THREE.RingGeometry(
        player.isAI ? 0.42 : 0.48,
        player.isAI ? 0.56 : 0.66,
        28
      );
      const ringMat = new THREE.MeshBasicMaterial({
        color: player.color,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.04;
      aliveSubgroup.add(ringMesh);

      // Character Torso (Armored Capsule/Cylinder)
      const bodyGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.85, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: player.color,
        roughness: 0.3,
        metalness: 0.5,
        emissive: player.color,
        emissiveIntensity: 0.25,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = 0.55;
      bodyMesh.castShadow = true;
      aliveSubgroup.add(bodyMesh);

      // Character Head
      const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const headMat = new THREE.MeshStandardMaterial({
        color: "#f8fafc",
        roughness: 0.3,
        metalness: 0.2,
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.y = 1.18;
      headMesh.castShadow = true;
      aliveSubgroup.add(headMesh);

      // Forward Visor (shows facing direction clearly in 3D!)
      const visorGeo = new THREE.BoxGeometry(0.32, 0.1, 0.18);
      const visorMat = new THREE.MeshBasicMaterial({
        color: player.isAI ? "#0f172a" : "#10b981",
      });
      const visorMesh = new THREE.Mesh(visorGeo, visorMat);
      visorMesh.position.set(0, 1.2, 0.18);
      aliveSubgroup.add(visorMesh);

      // Weapon / Bow in hand
      const weaponGeo = new THREE.BoxGeometry(0.08, 0.45, 0.55);
      const weaponMat = new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        metalness: 0.85,
        roughness: 0.2,
      });
      const weaponMesh = new THREE.Mesh(weaponGeo, weaponMat);
      weaponMesh.position.set(0.34, 0.65, 0.2);
      aliveSubgroup.add(weaponMesh);

      // Translucent 3D Armor Energy Shield Sphere
      const shieldGeo = new THREE.SphereGeometry(0.72, 18, 18);
      const shieldMat = new THREE.MeshBasicMaterial({
        color: "#06b6d4",
        transparent: true,
        opacity: 0.2,
        wireframe: true,
      });
      const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      shieldMesh.position.y = 0.72;
      aliveSubgroup.add(shieldMesh);

      group.add(aliveSubgroup);

      // Fallen Tribute Hologram / Tombstone Subgroup
      const tombstoneGroup = new THREE.Group();
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 0.25, 8),
        new THREE.MeshStandardMaterial({ color: "#334155" })
      );
      pedestal.position.y = 0.125;
      tombstoneGroup.add(pedestal);

      const obelisk = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3, 0),
        new THREE.MeshBasicMaterial({
          color: "#ef4444",
          wireframe: true,
        })
      );
      obelisk.position.y = 0.65;
      tombstoneGroup.add(obelisk);
      tombstoneGroup.visible = false;
      group.add(tombstoneGroup);

      const { wx, wz } = gridToWorld(player.position.x, player.position.y);
      group.position.set(wx, 0, wz);

      scene.add(group);

      return {
        group,
        bodyMesh,
        shieldMesh,
        ringMesh,
        tombstoneGroup,
        targetPos: new THREE.Vector3(wx, 0, wz),
        targetRotY: DIRECTION_ANGLES[player.lastDirection] ?? 0,
        wasAlive: player.isAlive,
      };
    };

    const createResourceMeshGroup = (res: Resource) => {
      const group = new THREE.Group();

      if (res.type === "food") {
        // 3D Glowing Emerald Apple / Berry Sphere
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 16, 16),
          new THREE.MeshStandardMaterial({
            color: "#10b981",
            emissive: "#059669",
            emissiveIntensity: 0.5,
            roughness: 0.2,
          })
        );
        mesh.position.y = 0.42;
        group.add(mesh);
      } else if (res.type === "armor") {
        // 3D Rotating Cyan Shield Crystal
        const mesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.32, 0),
          new THREE.MeshStandardMaterial({
            color: "#06b6d4",
            emissive: "#0891b2",
            emissiveIntensity: 0.6,
            metalness: 0.8,
            roughness: 0.15,
          })
        );
        mesh.position.y = 0.48;
        group.add(mesh);
      } else if (res.type === "medkit") {
        // 3D Glowing Medkit Cross Cube
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.32, 0.42),
          new THREE.MeshStandardMaterial({
            color: "#22c55e",
            emissive: "#16a34a",
            emissiveIntensity: 0.5,
          })
        );
        box.position.y = 0.4;
        group.add(box);
      } else {
        // Golden Supply Crate + Vertical Beacon Ray
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.45, 0.5),
          new THREE.MeshStandardMaterial({
            color: "#f59e0b",
            emissive: "#d97706",
            emissiveIntensity: 0.55,
            metalness: 0.85,
            roughness: 0.2,
          })
        );
        crate.position.y = 0.45;
        group.add(crate);

        const ray = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 6, 8),
          new THREE.MeshBasicMaterial({
            color: "#fbbf24",
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
          })
        );
        ray.position.y = 3.2;
        group.add(ray);
      }

      // Subtle glowing base disc on the tile
      const pad = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.34, 16),
        new THREE.MeshBasicMaterial({
          color:
            res.type === "food"
              ? "#10b981"
              : res.type === "armor"
              ? "#06b6d4"
              : res.type === "medkit"
              ? "#22c55e"
              : "#f59e0b",
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.55,
        })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.03;
      group.add(pad);

      const { wx, wz } = gridToWorld(res.position.x, res.position.y);
      group.position.set(wx, 0, wz);
      scene.add(group);
      return group;
    };

    // 9. MOUSE ORBIT & ZOOM INTERACTION HANDLERS
    const domElem = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      orbitRef.current.isDragging = true;
      orbitRef.current.lastMouseX = e.clientX;
      orbitRef.current.lastMouseY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!orbitRef.current.isDragging) return;
      const dx = e.clientX - orbitRef.current.lastMouseX;
      const dy = e.clientY - orbitRef.current.lastMouseY;
      orbitRef.current.lastMouseX = e.clientX;
      orbitRef.current.lastMouseY = e.clientY;

      orbitRef.current.azimuth -= dx * 0.007;
      orbitRef.current.polar = Math.max(
        0.25,
        Math.min(1.38, orbitRef.current.polar - dy * 0.006)
      );
    };
    const onPointerUp = () => {
      orbitRef.current.isDragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRef.current.distance = Math.max(
        7,
        Math.min(62, orbitRef.current.distance + e.deltaY * 0.025)
      );
    };

    domElem.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    domElem.addEventListener("wheel", onWheel, { passive: false });

    // 10. RESIZE HANDLER
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 11. 60 FPS ANIMATION & INTERPOLATION LOOP
    let animationFrameId: number;
    let lastLabelSync = 0;

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const t = now * 0.001;
      const currentState = gameStateRef.current;

      // Rotate Cornucopia holographic rings & pulse light
      holoRing1.rotation.z = t * 0.8;
      holoRing2.rotation.y = -t * 1.1;
      cornucopiaLight.intensity = 4.0 + Math.sin(t * 3) * 0.8;

      // Rise atmospheric embers
      const emberArr = emberGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < emberCount; i++) {
        emberArr[i * 3 + 1] += 0.022;
        if (emberArr[i * 3 + 1] > 19) {
          emberArr[i * 3 + 1] = 0.5;
        }
      }
      emberGeo.attributes.position.needsUpdate = true;

      // Trigger 3D bursts for newly created gameState effects
      for (const fx of currentState.effects) {
        if (!processedEffectIds.has(fx.id)) {
          processedEffectIds.add(fx.id);
          const { wx, wz } = gridToWorld(fx.position.x, fx.position.y);
          const isElim = fx.text.includes("ELIMINATED");
          spawn3DBurst(wx, wz, fx.color, isElim);
        }
      }

      // Update active 3D particle bursts
      for (let i = activeBursts.length - 1; i >= 0; i--) {
        const b = activeBursts[i];
        const elapsed = now - b.createdAt;
        const progress = elapsed / b.duration;

        if (progress >= 1) {
          scene.remove(b.points);
          scene.remove(b.ring);
          if (b.beam) scene.remove(b.beam);
          b.points.geometry.dispose();
          (b.points.material as THREE.Material).dispose();
          b.ring.geometry.dispose();
          (b.ring.material as THREE.Material).dispose();
          activeBursts.splice(i, 1);
          continue;
        }

        const posAttr = b.points.geometry.attributes
          .position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let j = 0; j < arr.length / 3; j++) {
          arr[j * 3] += b.velocities[j * 3];
          arr[j * 3 + 1] += b.velocities[j * 3 + 1];
          b.velocities[j * 3 + 1] -= 0.004; // gravity
          arr[j * 3 + 2] += b.velocities[j * 3 + 2];
        }
        posAttr.needsUpdate = true;
        (b.points.material as THREE.PointsMaterial).opacity = 1 - progress;

        const scale = 1 + progress * 4.5;
        b.ring.scale.set(scale, scale, 1);
        (b.ring.material as THREE.MeshBasicMaterial).opacity =
          (1 - progress) * 0.85;

        if (b.beam) {
          (b.beam.material as THREE.MeshBasicMaterial).opacity =
            (1 - progress) * 0.85;
        }
      }

      // Sync Resources in 3D Scene
      const currentResourceIds = new Set(
        currentState.resources.map((r) => r.id)
      );
      resourceMeshes.forEach((meshGroup, id) => {
        if (!currentResourceIds.has(id)) {
          scene.remove(meshGroup);
          resourceMeshes.delete(id);
        }
      });

      currentState.resources.forEach((res, idx) => {
        let rGroup = resourceMeshes.get(res.id);
        if (!rGroup) {
          rGroup = createResourceMeshGroup(res);
          resourceMeshes.set(res.id, rGroup);
        }
        // Bobbing & spinning animation
        const floatChild = rGroup.children[0];
        if (floatChild) {
          floatChild.rotation.y = t * 2.0 + idx;
          floatChild.position.y = 0.42 + Math.sin(t * 3 + idx) * 0.1;
        }
      });

      // Sync Players in 3D Scene & Smoothly Interpolate Position/Rotation
      const currentPlayerIds = new Set(currentState.players.map((p) => p.id));
      playerMeshes.forEach((entry, id) => {
        if (!currentPlayerIds.has(id)) {
          scene.remove(entry.group);
          playerMeshes.delete(id);
        }
      });

      currentState.players.forEach((player) => {
        let pEntry = playerMeshes.get(player.id);
        if (!pEntry) {
          pEntry = createPlayerMeshGroup(player);
          playerMeshes.set(player.id, pEntry);
        }

        const { wx, wz } = gridToWorld(player.position.x, player.position.y);
        pEntry.targetPos.set(wx, 0, wz);
        pEntry.targetRotY = DIRECTION_ANGLES[player.lastDirection] ?? 0;

        // Smooth 60fps position interpolation
        const distToTarget = pEntry.group.position.distanceTo(pEntry.targetPos);
        pEntry.group.position.lerp(pEntry.targetPos, 0.24);

        // Walking bounce when moving
        const aliveSub = pEntry.group.getObjectByName("aliveSubgroup");
        if (aliveSub && player.isAlive) {
          aliveSub.position.y =
            distToTarget > 0.05 ? Math.abs(Math.sin(t * 18)) * 0.18 : 0;
          // Smooth rotation towards movement direction
          aliveSub.rotation.y = THREE.MathUtils.lerp(
            aliveSub.rotation.y,
            pEntry.targetRotY,
            0.25
          );
        }

        // Toggle alive vs fallen monument
        if (aliveSub) aliveSub.visible = player.isAlive;
        pEntry.tombstoneGroup.visible = !player.isAlive;
        if (!player.isAlive) {
          pEntry.tombstoneGroup.rotation.y = t * 1.5;
        }

        // Armor shield visibility & opacity
        pEntry.shieldMesh.visible = player.isAlive && player.armor > 0;
        (pEntry.shieldMesh.material as THREE.MeshBasicMaterial).opacity =
          0.12 + (player.armor / player.maxArmor) * 0.35;
        pEntry.shieldMesh.rotation.y = -t * 1.2;

        // Hit Flash Effect
        const isHit =
          player.lastHitTick !== undefined &&
          currentState.tickCount - player.lastHitTick <= 2;
        const bodyMat = pEntry.bodyMesh.material as THREE.MeshStandardMaterial;
        if (isHit) {
          bodyMat.emissive.set("#ffffff");
          bodyMat.emissiveIntensity = 1.2;
        } else {
          bodyMat.emissive.set(player.color);
          bodyMat.emissiveIntensity = 0.28;
        }
      });

      // Update Camera Position & Focus Target
      const human = currentState.players.find((p) => !p.isAI);
      const humanEntry = human ? playerMeshes.get(human.id) : undefined;

      if (
        (cameraModeRef.current === "follow" ||
          cameraModeRef.current === "close") &&
        humanEntry &&
        human?.isAlive
      ) {
        orbitRef.current.targetFocus.lerp(humanEntry.group.position, 0.12);
      } else {
        // Overview mode focuses on the Cornucopia center
        orbitRef.current.targetFocus.lerp(new THREE.Vector3(0, 0, 0), 0.08);
      }

      const { distance, polar, azimuth, targetFocus } = orbitRef.current;
      const camX =
        targetFocus.x + distance * Math.sin(polar) * Math.sin(azimuth);
      const camY = Math.max(2.5, distance * Math.cos(polar));
      const camZ =
        targetFocus.z + distance * Math.sin(polar) * Math.cos(azimuth);

      camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.18);
      camera.lookAt(targetFocus.x, 0.8, targetFocus.z);

      renderer.render(scene, camera);

      // Sync 3D-to-2D projected floating player HUD labels (~20fps for crisp UI without React overhead)
      if (now - lastLabelSync > 45) {
        lastLabelSync = now;
        const width = container.clientWidth;
        const height = container.clientHeight;
        const nextLabels: ProjectedLabel[] = [];

        currentState.players.forEach((p) => {
          const entry = playerMeshes.get(p.id);
          if (!entry) return;

          const worldPos = entry.group.position
            .clone()
            .add(new THREE.Vector3(0, p.isAlive ? 1.85 : 1.1, 0));
          worldPos.project(camera);

          const x = (worldPos.x * 0.5 + 0.5) * width;
          const y = (-(worldPos.y * 0.5) + 0.5) * height;
          const visible =
            worldPos.z < 1 && x >= -40 && x <= width + 40 && y >= -40 && y <= height + 40;

          nextLabels.push({
            id: p.id,
            name: p.isAI ? p.name : "KATNISS (TU)",
            avatar: p.avatar,
            color: p.color,
            hp: p.hp,
            maxHp: p.maxHp,
            armor: p.armor,
            maxArmor: p.maxArmor,
            isAI: p.isAI,
            isAlive: p.isAlive,
            lastAction: p.lastAction,
            x,
            y,
            visible,
          });
        });

        setLabels(nextLabels);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      domElem.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      domElem.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  const humanPlayer = gameState.players.find((p) => !p.isAI);
  const { gridSize } = gameState.config;

  return (
    <div className="relative w-full aspect-square max-w-[760px] mx-auto bg-[#040711] rounded-2xl border-2 border-slate-800 shadow-2xl overflow-hidden select-none">
      {/* Three.js WebGL Mount Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top-Left 3D Camera Controls Bar */}
      <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-1.5 bg-slate-950/85 border border-slate-700/80 backdrop-blur-md p-1.5 rounded-xl shadow-lg">
        <button
          onClick={() => handleSelectCameraMode("follow")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition ${
            cameraMode === "follow"
              ? "bg-emerald-500 text-slate-950 shadow"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          Follow Cam
        </button>
        <button
          onClick={() => handleSelectCameraMode("close")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition ${
            cameraMode === "close"
              ? "bg-amber-500 text-slate-950 shadow"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Hero Action
        </button>
        <button
          onClick={() => handleSelectCameraMode("overview")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition ${
            cameraMode === "overview"
              ? "bg-cyan-500 text-slate-950 shadow"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          3D Panorama
        </button>
      </div>

      {/* Bottom-Left 3D Camera Hint */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 bg-slate-950/75 border border-slate-800/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] text-slate-400 flex items-center gap-1.5">
        <Compass className="w-3.5 h-3.5 text-amber-400" />
        <span>Trage cu mouse-ul pentru rotire 360° • Scroll pentru Zoom</span>
      </div>

      {/* Top-Right Live 50x50 Tactical Mini-Radar */}
      <div className="pointer-events-none absolute top-3 right-3 z-30 w-28 h-28 sm:w-32 sm:h-32 bg-slate-950/90 border border-slate-700/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-md p-1">
        <div className="relative w-full h-full bg-slate-900/90 rounded-lg border border-slate-800 overflow-hidden">
          {/* Cornucopia Radar Zone */}
          <div className="absolute left-[43%] top-[43%] w-[14%] h-[14%] bg-amber-500/25 border border-amber-400/60 rounded-sm" />

          {/* Resources on Radar */}
          {gameState.resources.map((r) => (
            <div
              key={r.id}
              style={{
                left: `${(r.position.x / gridSize) * 100}%`,
                top: `${(r.position.y / gridSize) * 100}%`,
              }}
              className={`absolute w-1 h-1 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                r.type === "supply_crate"
                  ? "bg-amber-400 w-1.5 h-1.5"
                  : r.type === "armor"
                  ? "bg-cyan-400"
                  : "bg-emerald-400"
              }`}
            />
          ))}

          {/* Players on Radar */}
          {gameState.players.map((p) => {
            if (!p.isAlive) return null;
            return (
              <div
                key={p.id}
                style={{
                  left: `${(p.position.x / gridSize) * 100}%`,
                  top: `${(p.position.y / gridSize) * 100}%`,
                  backgroundColor: p.color,
                }}
                className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${
                  !p.isAI
                    ? "w-2.5 h-2.5 ring-2 ring-white animate-pulse"
                    : "w-2 h-2"
                }`}
              />
            );
          })}

          <div className="absolute bottom-0.5 right-1 text-[8px] font-mono text-slate-400 uppercase">
            RADAR 50×50
          </div>
        </div>
      </div>

      {/* 3D Projected Floating Tribute Name & Health Tags */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
        {labels.map((lbl) => {
          if (!lbl.visible) return null;

          if (!lbl.isAlive) {
            return (
              <div
                key={lbl.id}
                style={{
                  transform: `translate3d(${lbl.x}px, ${lbl.y}px, 0) translate(-50%, -100%)`,
                }}
                className="absolute top-0 left-0 px-1.5 py-0.5 rounded bg-slate-950/80 border border-rose-500/40 text-[9px] text-rose-300 font-bold opacity-70"
              >
                💀 {lbl.name}
              </div>
            );
          }

          const hpPct = Math.max(0, Math.min(100, (lbl.hp / lbl.maxHp) * 100));
          const armorPct = Math.max(
            0,
            Math.min(100, (lbl.armor / lbl.maxArmor) * 100)
          );

          return (
            <div
              key={lbl.id}
              style={{
                transform: `translate3d(${lbl.x}px, ${lbl.y}px, 0) translate(-50%, -100%)`,
              }}
              className="absolute top-0 left-0 flex flex-col items-center whitespace-nowrap"
            >
              <div
                style={{ borderColor: lbl.color }}
                className="px-2 py-0.5 rounded-md bg-slate-950/90 border shadow-lg flex items-center gap-1"
              >
                <span className="text-[11px]">{lbl.avatar}</span>
                <span
                  style={{ color: lbl.color }}
                  className="text-[10px] font-extrabold tracking-wide"
                >
                  {lbl.name}
                </span>
                <span className="text-[9px] font-mono text-slate-300 ml-0.5">
                  {lbl.hp}HP
                </span>
              </div>

              {/* Dual Mini Bar: HP + Armor */}
              <div className="w-16 bg-slate-950/90 p-0.5 rounded-full border border-slate-700/80 mt-0.5 space-y-0.5">
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      hpPct > 55
                        ? "bg-emerald-400"
                        : hpPct > 25
                        ? "bg-amber-400"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
                {lbl.armor > 0 && (
                  <div className="w-full h-0.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-150"
                      style={{ width: `${armorPct}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Spectator Notice if Human Player is Eliminated While Match Continues */}
      {gameState.status === "running" && humanPlayer && !humanPlayer.isAlive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-rose-950/90 border border-rose-500/60 text-rose-100 px-4 py-2 rounded-xl shadow-xl flex items-center gap-3 backdrop-blur-md">
          <Skull className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-rose-300">Ai fost eliminat!</span>{" "}
            Camera urmărește lupta AI-urilor în 3D...
          </div>
          <button
            onClick={onReset}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition"
          >
            Meci Nou
          </button>
        </div>
      )}

      {/* IDLE OVERLAY */}
      {gameState.status === "idle" && (
        <div className="absolute inset-0 z-40 bg-slate-950/65 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900/95 border border-amber-500/40 rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">
              WebGL 3D Capitol Arena
            </div>
            <h2 className="text-xl font-extrabold text-white mb-2">
              The Hunger Games — Ediția 3D
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
              Controlează-ți tributul în arena 3D (50×50) cu{" "}
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-xs font-mono">
                WASD
              </kbd>{" "}
              sau{" "}
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-xs font-mono">
                Săgeți
              </kbd>
              . Rotește camera 3D cu mouse-ul, adună provizii de la Cornucopia
              aurie și supraviețuiește!
            </p>
            <button
              onClick={onStart}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              Începe Jocurile Foamei 3D
            </button>
          </div>
        </div>
      )}

      {/* PAUSED OVERLAY */}
      {gameState.status === "paused" && (
        <div className="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900/95 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-extrabold text-cyan-400 uppercase tracking-wider mb-1">
              Arena 3D în Pauză
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Apasă Spacebar sau butonul de mai jos pentru a continua lupta.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onStart}
                className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                Continuă
              </button>
              <button
                onClick={onReset}
                className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase flex items-center justify-center gap-1.5 border border-slate-700 transition"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {gameState.status === "game_over" && (
        <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
              Câștigătorul Jocurilor Foamei
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-1 flex items-center justify-center gap-2">
              <span>{gameState.winner?.avatar}</span>
              <span>{gameState.winner?.name}</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Districtul {gameState.winner?.district} •{" "}
              {gameState.winner?.isAI
                ? `AI (${gameState.winner?.behavior?.toUpperCase()})`
                : "Tribut Uman"}
            </p>

            {gameState.eliminatedFirst && (
              <div className="bg-rose-950/50 border border-rose-800/50 rounded-lg px-3 py-2 mb-4 text-xs text-rose-200">
                <span className="font-bold text-rose-400">
                  Primul Eliminat (0 HP):
                </span>{" "}
                {gameState.eliminatedFirst.name} (District{" "}
                {gameState.eliminatedFirst.district})
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-5 text-center">
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400 uppercase">Scor</div>
                <div className="text-sm font-mono font-bold text-amber-400">
                  {gameState.winner?.score.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400 uppercase">
                  Eliminări
                </div>
                <div className="text-sm font-mono font-bold text-rose-400">
                  {gameState.winner?.kills}
                </div>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400 uppercase">
                  HP Rămas
                </div>
                <div className="text-sm font-mono font-bold text-emerald-400">
                  {gameState.winner?.hp} / {gameState.winner?.maxHp}
                </div>
              </div>
            </div>

            <button
              onClick={onStart}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg transition"
            >
              <RotateCcw className="w-4 h-4" />
              Joacă Din Nou
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
