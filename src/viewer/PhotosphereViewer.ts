import {
  Engine,
  Scene,
  ArcRotateCamera,
  ArcRotateCameraPointersInput,
  Vector3,
  PhotoDome,
  DynamicTexture,
} from '@babylonjs/core';

export class PhotosphereViewer {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private currentDome: PhotoDome | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor.set(0.06, 0.08, 0.11, 1);

    // 360 viewer camera
    this.camera = new ArcRotateCamera(
      'panoCamera',
      -Math.PI / 2,
      Math.PI / 2,
      1,
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    const pointersInput = this.camera.inputs.attached.pointers as ArcRotateCameraPointersInput;
    if (pointersInput) {
      pointersInput.buttons = [0]; // Left click drag
    }
    this.camera.lowerRadiusLimit = 1;
    this.camera.upperRadiusLimit = 1; // Locked radius so we orbit in place
    this.camera.fov = 1.1; // Comfortable wide field-of-view

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  /**
   * Loads a new 360 equirectangular panorama image
   */
  public loadPanorama(url: string) {
    if (this.currentDome) {
      this.currentDome.dispose();
      this.currentDome = null;
    }

    try {
      this.currentDome = new PhotoDome(
        'streetviewDome',
        url,
        {
          resolution: 32,
          size: 1000,
        },
        this.scene
      );
    } catch {
      this.createFallbackPanorama();
    }
  }

  /**
   * Generates a procedural panoramic skybox if an external asset isn't loaded yet
   */
  public createFallbackPanorama(text = "Skyrim Province - Panoramic Preview") {
    if (this.currentDome) {
      this.currentDome.dispose();
    }

    const dynTexture = new DynamicTexture('fallbackPano', { width: 2048, height: 1024 }, this.scene);
    const ctx = dynTexture.getContext() as unknown as CanvasRenderingContext2D;

    // Sky & mountain gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
    gradient.addColorStop(0, '#102a45'); // Nordic cold sky
    gradient.addColorStop(0.5, '#406080'); // Horizon
    gradient.addColorStop(0.52, '#203020'); // Mountain silhouette base
    gradient.addColorStop(1, '#0c180c'); // Pine forest ground
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 1024);

    // Decorative grid & landmark text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 1024, 480);
    ctx.font = '24px sans-serif';
    ctx.fillText('Look around in 360° with left mouse button', 1024, 540);

    dynTexture.update();

    this.currentDome = new PhotoDome(
      'fallbackDome',
      dynTexture.name,
      {
        resolution: 32,
        size: 1000,
      },
      this.scene
    );
  }

  public resize() {
    this.engine.resize();
  }
}
