import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  Mesh,
  LinesMesh,
  DynamicTexture,
} from '@babylonjs/core';
import { Coordinates2D } from '../core/types';

export class TerrainMapViewer {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private terrain: Mesh;
  private userPin: Mesh | null = null;
  private actualPin: Mesh | null = null;
  private distanceLine: LinesMesh | null = null;
  private currentPinCoords: Coordinates2D | null = null;
  private onPinPlacedCallback?: (coords: Coordinates2D) => void;
  private isRendering = false;
  private needsRender = true;

  public readonly mapSize = 100; // Normalized 100x100 3D world plane

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, false, {
      preserveDrawingBuffer: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.engine.setHardwareScalingLevel(1.0);

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.04, 0.06, 0.09, 1);

    // Camera looking down at an angle onto the map
    this.camera = new ArcRotateCamera(
      'mapCamera',
      -Math.PI / 2,
      Math.PI / 3.5,
      130,
      new Vector3(0, 0, 0),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 20;
    this.camera.upperRadiusLimit = 200;
    this.camera.upperBetaLimit = Math.PI / 2.1; // Don't go below ground

    // Create 3D terrain base (8 subdivisions for optimal performance)
    this.terrain = MeshBuilder.CreateGround(
      'terrain',
      { width: this.mapSize, height: this.mapSize, subdivisions: 8 },
      this.scene
    );
    this.terrain.isPickable = true;
    this.setupTerrainStyling();

    // Restrict pointer picking strictly to terrain ground mesh
    this.scene.pointerDownPredicate = (mesh) => mesh === this.terrain;

    // Raycast on click to place pin
    this.scene.onPointerDown = (evt, pickResult) => {
      if (evt.button === 0 && pickResult.hit && pickResult.pickedPoint && pickResult.pickedMesh === this.terrain) {
        this.placeUserPin(pickResult.pickedPoint);
      }
    };

    // Trigger rendering whenever camera moves or rotates
    this.camera.onViewMatrixChangedObservable.add(() => {
      this.needsRender = true;
    });

    // Render loop lifecycle with on-demand check
    this.startRendering();

    window.addEventListener('resize', () => {
      this.engine.resize();
      this.needsRender = true;
      if (!this.isRendering) {
        this.scene.render();
      }
    });
  }

  public startRendering(): void {
    if (this.isRendering) {
      return;
    }
    this.isRendering = true;
    this.needsRender = true;
    this.engine.runRenderLoop(() => {
      const hasInertia =
        this.camera.inertialAlphaOffset !== 0 ||
        this.camera.inertialBetaOffset !== 0 ||
        this.camera.inertialRadiusOffset !== 0;

      if (this.needsRender || hasInertia) {
        this.scene.render();
        this.needsRender = false;
      }
    });
  }

  public stopRendering(): void {
    if (!this.isRendering) {
      return;
    }
    this.isRendering = false;
    this.engine.stopRenderLoop();
  }

  public isCurrentlyRendering(): boolean {
    return this.isRendering;
  }

  public renderOnce(): void {
    this.needsRender = true;
    this.scene.render();
  }

  public getPerformanceMetrics(): {
    fps: number;
    isRendering: boolean;
    drawCalls: number;
  } {
    return {
      fps: Math.round(this.engine.getFps()),
      isRendering: this.isRendering,
      drawCalls: (this.engine as unknown as { _drawCalls?: { current?: number } })._drawCalls?.current ?? this.scene.getActiveMeshes().length,
    };
  }

  private setupTerrainStyling() {
    const mat = new StandardMaterial('terrainMat', this.scene);
    
    // Procedural terrain texture representing topographic grid
    const dynTexture = new DynamicTexture('terrainTex', { width: 1024, height: 1024 }, this.scene);
    const ctx = dynTexture.getContext() as unknown as CanvasRenderingContext2D;

    // Map base background
    ctx.fillStyle = '#141b24';
    ctx.fillRect(0, 0, 1024, 1024);

    // Grid lines
    ctx.strokeStyle = '#223042';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 1024; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 1024);
      ctx.moveTo(0, i); ctx.lineTo(1024, i);
      ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = '#384d66';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 1016, 1016);

    // Cardinal compass points (plain text, no emojis)
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 512, 40);
    ctx.fillText('S', 512, 1000);
    ctx.fillText('W', 40, 520);
    ctx.fillText('E', 984, 520);

    dynTexture.update();
    mat.diffuseTexture = dynTexture;
    mat.specularColor = new Color3(0, 0, 0);
    this.terrain.material = mat;
  }

  /**
   * Converts 3D world position (x, z) to normalized [0, 1] map coordinates
   */
  public worldToNormalized(worldX: number, worldZ: number): Coordinates2D {
    const normX = Math.max(0, Math.min(1, (worldX + this.mapSize / 2) / this.mapSize));
    const normY = Math.max(0, Math.min(1, (worldZ + this.mapSize / 2) / this.mapSize));
    return { x: Number(normX.toFixed(4)), y: Number(normY.toFixed(4)) };
  }

  /**
   * Converts normalized [0, 1] map coordinates to 3D world position (x, z)
   */
  public normalizedToWorld(coords: Coordinates2D): { x: number; z: number } {
    const clampedX = Math.max(0, Math.min(1, coords.x));
    const clampedY = Math.max(0, Math.min(1, coords.y));
    const worldX = clampedX * this.mapSize - this.mapSize / 2;
    const worldZ = clampedY * this.mapSize - this.mapSize / 2;
    return { x: Number(worldX.toFixed(2)), z: Number(worldZ.toFixed(2)) };
  }

  /**
   * Places a 3D pin marker at the picked 3D world position
   */
  public placeUserPin(point: Vector3): Coordinates2D {
    if (!this.userPin) {
      this.userPin = MeshBuilder.CreateCylinder('userPin', {
        height: 8,
        diameterTop: 0,
        diameterBottom: 2.5,
      }, this.scene);
      this.userPin.isPickable = false;

      const pinMat = new StandardMaterial('userPinMat', this.scene);
      pinMat.diffuseColor = new Color3(0.9, 0.7, 0.2); // Gold marker
      pinMat.emissiveColor = new Color3(0.3, 0.2, 0.05);
      this.userPin.material = pinMat;
    }

    this.userPin.position = new Vector3(point.x, point.y + 4, point.z);

    const normalized = this.worldToNormalized(point.x, point.z);
    this.currentPinCoords = normalized;

    if (this.onPinPlacedCallback) {
      this.onPinPlacedCallback(normalized);
    }

    this.needsRender = true;
    this.scene.render();

    return normalized;
  }

  /**
   * Reveals actual location and draws the distance line between guess and actual
   */
  public revealRoundResult(actualCoords: Coordinates2D, guessCoords: Coordinates2D): void {
    const actualWorld = this.normalizedToWorld(actualCoords);
    const guessWorld = this.normalizedToWorld(guessCoords);

    // Create actual location marker (Green sphere)
    if (!this.actualPin) {
      this.actualPin = MeshBuilder.CreateSphere('actualPin', { diameter: 4 }, this.scene);
      this.actualPin.isPickable = false;
      const actualMat = new StandardMaterial('actualPinMat', this.scene);
      actualMat.diffuseColor = new Color3(0.2, 0.8, 0.4);
      actualMat.emissiveColor = new Color3(0.1, 0.4, 0.2);
      this.actualPin.material = actualMat;
    }
    this.actualPin.position = new Vector3(actualWorld.x, 2, actualWorld.z);

    // Draw connecting line
    if (this.distanceLine) {
      this.distanceLine.dispose();
    }
    this.distanceLine = MeshBuilder.CreateLines('distanceLine', {
      points: [
        new Vector3(guessWorld.x, 2, guessWorld.z),
        new Vector3(actualWorld.x, 2, actualWorld.z)
      ]
    }, this.scene);
    this.distanceLine.isPickable = false;
    this.distanceLine.color = new Color3(0.5, 0.8, 1);

    this.needsRender = true;
    this.scene.render();
  }

  public clearPins(): void {
    if (this.userPin) {
      this.userPin.dispose();
      this.userPin = null;
    }
    if (this.actualPin) {
      this.actualPin.dispose();
      this.actualPin = null;
    }
    if (this.distanceLine) {
      this.distanceLine.dispose();
      this.distanceLine = null;
    }
    this.currentPinCoords = null;

    this.needsRender = true;
    this.scene.render();
  }

  public getPinCoords(): Coordinates2D | null {
    return this.currentPinCoords;
  }

  public hasPin(): boolean {
    return this.currentPinCoords !== null;
  }

  public onPinPlaced(callback: (coords: Coordinates2D) => void): void {
    this.onPinPlacedCallback = callback;
  }

  public resize(): void {
    this.engine.resize();
    this.needsRender = true;
    if (!this.isRendering) {
      this.scene.render();
    }
  }
}
