import {
  Engine,
  Scene,
  ArcRotateCamera,
  ArcRotateCameraPointersInput,
  Vector3,
  PhotoDome,
  DynamicTexture,
} from '@babylonjs/core';

import { UserSettings, DEFAULT_SETTINGS } from '../core/settings';

export class PhotosphereViewer {
  private userSettings: UserSettings = { ...DEFAULT_SETTINGS };
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private currentDome: PhotoDome | null = null;
  private isRendering = false;
  private needsRender = true;

  // Dynamic resolution scaling state
  private isMotionActive = false;
  private isDragging = false;
  private normalScalingLevel = 1.0;
  private motionScalingLevel = 1.5;

  constructor(canvas: HTMLCanvasElement) {
    // Disable preserveDrawingBuffer and MSAA for maximum performance on budget/integrated GPUs
    this.engine = new Engine(canvas, false, {
      preserveDrawingBuffer: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.engine.setHardwareScalingLevel(this.normalScalingLevel);

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

    // Track pointer dragging for dynamic resolution scaling
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
      }
    });
    // FOV Zoom with mouse wheel
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.userSettings.enableZoom) {
          return;
        }
        e.preventDefault();
        const zoomStep = e.deltaY * 0.001;
        const newFov = Math.min(Math.max(this.camera.fov + zoomStep, 0.4), 1.35);
        if (Math.abs(newFov - this.camera.fov) > 0.001) {
          this.camera.fov = newFov;
          this.needsRender = true;
          if (!this.isRendering) {
            this.scene.render();
          }
        }
      },
      { passive: false }
    );

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    // Trigger rendering whenever camera moves or rotates
    this.camera.onViewMatrixChangedObservable.add(() => {
      this.needsRender = true;
    });

    // Render loop lifecycle with dynamic resolution scaling
    this.startRendering();

    window.addEventListener('resize', () => {
      this.engine.resize();
      this.needsRender = true;
      if (!this.isRendering) {
        this.scene.render();
      }
    });
  }

  public applySettings(settings: UserSettings): void {
    this.userSettings = { ...settings };

    // Base sensibility is 1000. Higher sensitivity divides base to increase rotation speed.
    const baseSensibility = 1000 / Math.max(0.1, settings.sensitivity);
    this.camera.angularSensibilityX = settings.invertX ? -baseSensibility : baseSensibility;
    this.camera.angularSensibilityY = settings.invertY ? -baseSensibility : baseSensibility;

    // Toggle dynamic resolution scaling level
    this.motionScalingLevel = settings.dynamicResolution ? 1.5 : 1.0;
    if (!this.isMotionActive) {
      this.engine.setHardwareScalingLevel(this.normalScalingLevel);
    } else {
      this.engine.setHardwareScalingLevel(this.motionScalingLevel);
    }

    // Reset FOV if zoom is disabled
    if (!settings.enableZoom && this.camera.fov !== 1.1) {
      this.camera.fov = 1.1;
      this.needsRender = true;
      if (!this.isRendering) {
        this.scene.render();
      }
    }
  }

  public getUserSettings(): UserSettings {
    return { ...this.userSettings };
  }

  public setMotionScaling(motionLevel: number, normalLevel = 1.0): void {
    this.motionScalingLevel = Math.max(1.0, motionLevel);
    this.normalScalingLevel = Math.max(0.5, normalLevel);
    if (!this.isMotionActive) {
      this.engine.setHardwareScalingLevel(this.normalScalingLevel);
    }
  }

  public startRendering(): void {
    if (this.isRendering) {
      return;
    }
    this.isRendering = true;
    this.needsRender = true;
    this.engine.runRenderLoop(() => {
      const hasInertia =
        Math.abs(this.camera.inertialAlphaOffset) > 0.0001 ||
        Math.abs(this.camera.inertialBetaOffset) > 0.0001 ||
        Math.abs(this.camera.inertialRadiusOffset) > 0.0001;

      const isMoving = this.isDragging || hasInertia;

      if (isMoving) {
        // Switch to lightweight resolution during motion (e.g. 1.5x scaling = ~720p)
        if (!this.isMotionActive) {
          this.isMotionActive = true;
          this.engine.setHardwareScalingLevel(this.motionScalingLevel);
        }
        this.scene.render();
        this.needsRender = false;
      } else {
        // Motion has ceased: restore crystal clear 1080p (1.0) and render one sharp final frame
        if (this.isMotionActive) {
          this.isMotionActive = false;
          this.engine.setHardwareScalingLevel(this.normalScalingLevel);
          this.scene.render();
          this.needsRender = false;
        } else if (this.needsRender) {
          this.scene.render();
          this.needsRender = false;
        }
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
    scalingLevel: number;
    isRendering: boolean;
    isMotionActive: boolean;
    drawCalls: number;
  } {
    return {
      fps: Math.round(this.engine.getFps()),
      scalingLevel: this.isMotionActive ? this.motionScalingLevel : this.normalScalingLevel,
      isRendering: this.isRendering,
      isMotionActive: this.isMotionActive,
      drawCalls: (this.engine as unknown as { _drawCalls?: { current?: number } })._drawCalls?.current ?? this.scene.getActiveMeshes().length,
    };
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
      this.currentDome.mesh.freezeWorldMatrix();
      this.currentDome.mesh.doNotSyncBoundingInfo = true;
    } catch {
      this.createFallbackPanorama();
    }

    this.needsRender = true;
    this.scene.render();
  }

  /**
   * Generates a procedural panoramic skybox if an external asset isn't loaded yet
   */
  public createFallbackPanorama(text = "Skyrim Province - Panoramic Preview") {
    if (this.currentDome) {
      this.currentDome.dispose();
    }

    // generateMipMaps = false avoids heavy mipmap generation passes
    const dynTexture = new DynamicTexture('fallbackPano', { width: 2048, height: 1024 }, this.scene, false);
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

    dynTexture.update(false);

    this.currentDome = new PhotoDome(
      'fallbackDome',
      '',
      {
        resolution: 16,
        size: 1000,
      },
      this.scene
    );
    this.currentDome.photoTexture = dynTexture;
    this.currentDome.mesh.freezeWorldMatrix();
    this.currentDome.mesh.doNotSyncBoundingInfo = true;

    this.needsRender = true;
    this.scene.render();
  }

  public resize() {
    this.engine.resize();
    this.needsRender = true;
    if (!this.isRendering) {
      this.scene.render();
    }
  }
}
