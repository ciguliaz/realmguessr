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
  private isRendering = false;

  constructor(canvas: HTMLCanvasElement) {
    // Disable preserveDrawingBuffer and MSAA for maximum performance on budget/integrated GPUs
    this.engine = new Engine(canvas, false, {
      preserveDrawingBuffer: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.engine.setHardwareScalingLevel(1.0); // Standard 1:1 pixel rendering

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
    this.camera.inertia = 0.65; // Responsive pointer tracking without sluggish float
    this.camera.angularSensibilityX = 1000;
    this.camera.angularSensibilityY = 1000;

    // Render loop lifecycle
    this.startRendering();

    window.addEventListener('resize', () => {
      this.engine.resize();
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
    this.engine.runRenderLoop(() => {
      this.scene.render();
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
    this.scene.render();
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
          resolution: 16,
          size: 1000,
        },
        this.scene
      );
    } catch {
      this.createFallbackPanorama();
    }

    if (!this.isRendering) {
      this.scene.render();
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

    // Decorative grid & landmark text (clean, no emojis)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 1024, 480);
    ctx.font = '24px sans-serif';
    ctx.fillText('Look around in 360 degrees with left mouse button', 1024, 540);

    dynTexture.update();

    this.currentDome = new PhotoDome(
      'fallbackDome',
      dynTexture.name,
      {
        resolution: 16,
        size: 1000,
      },
      this.scene
    );

    if (!this.isRendering) {
      this.scene.render();
    }
  }

  public resize() {
    this.engine.resize();
    if (!this.isRendering) {
      this.scene.render();
    }
  }
}
