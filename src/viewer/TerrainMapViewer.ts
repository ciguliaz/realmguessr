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
  private onPinPlacedCallback?: (coords: Coordinates2D) => void;

  private mapSize = 100; // Normalized 100x100 3D world plane

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true);
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

    // Create 3D terrain base
    this.terrain = MeshBuilder.CreateGround(
      'terrain',
      { width: this.mapSize, height: this.mapSize, subdivisions: 32 },
      this.scene
    );
    this.setupTerrainStyling();

    // Raycast on click to place pin
    this.scene.onPointerDown = (evt, pickResult) => {
      if (evt.button === 0 && pickResult.hit && pickResult.pickedPoint && pickResult.pickedMesh === this.terrain) {
        this.placeUserPin(pickResult.pickedPoint);
      }
    };

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private setupTerrainStyling() {
    const mat = new StandardMaterial('terrainMat', this.scene);
    
    // Procedural terrain texture representing Skyrim holds
    const dynTexture = new DynamicTexture('terrainTex', { width: 1024, height: 1024 }, this.scene);
    const ctx = dynTexture.getContext() as unknown as CanvasRenderingContext2D;

    // Map base parchment/terrain color
    ctx.fillStyle = '#1c2430';
    ctx.fillRect(0, 0, 1024, 1024);

    // Decorative grid & border
    ctx.strokeStyle = '#2d3d52';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 1024; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 1024);
      ctx.moveTo(0, i); ctx.lineTo(1024, i);
      ctx.stroke();
    }

    // Landmark text labels on map
    ctx.fillStyle = '#e6c86e';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Solitude', 300, 200);
    ctx.fillText('Windhelm', 750, 320);
    ctx.fillText('Whiterun', 520, 520);
    ctx.fillText('Markarth', 180, 580);
    ctx.fillText('Riften', 820, 800);
    ctx.fillText('Throat of the World', 600, 620);

    dynTexture.update();
    mat.diffuseTexture = dynTexture;
    mat.specularColor = new Color3(0, 0, 0);
    this.terrain.material = mat;
  }

  /**
   * Places a 3D pin marker at the picked 3D world position
   */
  public placeUserPin(point: Vector3) {
    if (!this.userPin) {
      this.userPin = MeshBuilder.CreateCylinder('userPin', {
        height: 8,
        diameterTop: 0,
        diameterBottom: 2.5,
      }, this.scene);

      const pinMat = new StandardMaterial('userPinMat', this.scene);
      pinMat.diffuseColor = new Color3(0.9, 0.7, 0.2); // Gold marker
      pinMat.emissiveColor = new Color3(0.3, 0.2, 0.05);
      this.userPin.material = pinMat;
    }

    this.userPin.position = new Vector3(point.x, point.y + 4, point.z);

    // Normalize coordinates to [0, 1] range for game engine calculations
    const normalizedX = (point.x + this.mapSize / 2) / this.mapSize;
    const normalizedY = (point.z + this.mapSize / 2) / this.mapSize;

    if (this.onPinPlacedCallback) {
      this.onPinPlacedCallback({ x: normalizedX, y: normalizedY });
    }
  }

  /**
   * Reveals actual location and draws the distance line between guess and actual
   */
  public revealRoundResult(actualCoords: Coordinates2D, guessCoords: Coordinates2D) {
    const actualWorldX = actualCoords.x * this.mapSize - this.mapSize / 2;
    const actualWorldZ = actualCoords.y * this.mapSize - this.mapSize / 2;

    const guessWorldX = guessCoords.x * this.mapSize - this.mapSize / 2;
    const guessWorldZ = guessCoords.y * this.mapSize - this.mapSize / 2;

    // Create actual location marker (Green flag)
    if (!this.actualPin) {
      this.actualPin = MeshBuilder.CreateSphere('actualPin', { diameter: 4 }, this.scene);
      const actualMat = new StandardMaterial('actualPinMat', this.scene);
      actualMat.diffuseColor = new Color3(0.2, 0.8, 0.4);
      actualMat.emissiveColor = new Color3(0.1, 0.4, 0.2);
      this.actualPin.material = actualMat;
    }
    this.actualPin.position = new Vector3(actualWorldX, 2, actualWorldZ);

    // Draw connecting line
    if (this.distanceLine) {
      this.distanceLine.dispose();
    }
    this.distanceLine = MeshBuilder.CreateLines('distanceLine', {
      points: [
        new Vector3(guessWorldX, 2, guessWorldZ),
        new Vector3(actualWorldX, 2, actualWorldZ)
      ]
    }, this.scene);
    this.distanceLine.color = new Color3(0.5, 0.8, 1);
  }

  public clearPins() {
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
  }

  public onPinPlaced(callback: (coords: Coordinates2D) => void) {
    this.onPinPlacedCallback = callback;
  }

  public resize() {
    this.engine.resize();
  }
}
