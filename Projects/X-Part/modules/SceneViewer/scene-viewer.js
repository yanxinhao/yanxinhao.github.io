export class ViewerModule {
  constructor(container, modelBaseNames, modelPath, imagePath) {
    this.container = container;
    this.modelBaseNames = modelBaseNames;
    this.modelPath = modelPath;
    this.imagePath = imagePath;
    this.imageExtension = ".png";
    this.modelExtension = ".glb";

    // Dual scene setup
    this.originalScene = null;
    this.explodedScene = null;
    this.originalCamera = null;
    this.explodedCamera = null;
    this.originalRenderer = null;
    this.explodedRenderer = null;
    this.originalModel = null;
    this.explodedModel = null;
    this.originalControls = null;
    this.explodedControls = null;
    this.explodeAmount = 0;
    this.autoRotate = true;
    this.rotationSpeed = 0.01;
    this.rotationAngle = 0;
  }

  init() {
    this.setupScene();
    this.createImageSlider();
    this.loadModel(this.modelBaseNames[0]);
  }

  setupScene() {
    const viewerContainer = document.querySelector(
      `${this.container} #viewer-container`
    );
    const width = viewerContainer.clientWidth;
    const height = viewerContainer.clientHeight;
    const halfWidth = width / 2;

    // Create original scene (left side)
    this.originalScene = new THREE.Scene();
    this.originalCamera = new THREE.PerspectiveCamera(35, halfWidth / height, 0.01, 100);
    this.originalCamera.position.set(0, 0, 2);

    this.originalRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.originalRenderer.setSize(halfWidth, height);
    this.originalRenderer.setClearColor(0xffffff);
    this.originalRenderer.outputEncoding = THREE.sRGBEncoding;
    this.originalRenderer.physicallyCorrectLights = true;
    this.originalRenderer.domElement.style.position = 'absolute';
    this.originalRenderer.domElement.style.left = '0';
    this.originalRenderer.domElement.style.top = '0';
    viewerContainer.appendChild(this.originalRenderer.domElement);

    this.originalControls = new THREE.OrbitControls(
      this.originalCamera,
      this.originalRenderer.domElement
    );
    this.originalControls.enableDamping = true;
    this.originalControls.dampingFactor = 0.25;
    this.originalControls.autoRotate = false;

    // Create exploded scene (right side)
    this.explodedScene = new THREE.Scene();
    this.explodedCamera = new THREE.PerspectiveCamera(35, halfWidth / height, 0.01, 100);
    this.explodedCamera.position.set(0, 0, 2);

    this.explodedRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.explodedRenderer.setSize(halfWidth, height);
    this.explodedRenderer.setClearColor(0xffffff);
    this.explodedRenderer.outputEncoding = THREE.sRGBEncoding;
    this.explodedRenderer.physicallyCorrectLights = true;
    this.explodedRenderer.domElement.style.position = 'absolute';
    this.explodedRenderer.domElement.style.right = '0';
    this.explodedRenderer.domElement.style.top = '0';
    viewerContainer.appendChild(this.explodedRenderer.domElement);

    this.explodedControls = new THREE.OrbitControls(
      this.explodedCamera,
      this.explodedRenderer.domElement
    );
    this.explodedControls.enableDamping = true;
    this.explodedControls.dampingFactor = 0.25;
    this.explodedControls.autoRotate = false;

    // Add lighting to both scenes
    this.setupLighting(this.originalScene);
    this.setupLighting(this.explodedScene);

    window.addEventListener("resize", () => {
      const newWidth = viewerContainer.clientWidth;
      const newHeight = viewerContainer.clientHeight;
      const newHalfWidth = newWidth / 2;

      this.originalRenderer.setSize(newHalfWidth, newHeight);
      this.originalCamera.aspect = newHalfWidth / newHeight;
      this.originalCamera.updateProjectionMatrix();

      this.explodedRenderer.setSize(newHalfWidth, newHeight);
      this.explodedCamera.aspect = newHalfWidth / newHeight;
      this.explodedCamera.updateProjectionMatrix();
    });

    this.animate();
  }

  setupLighting(scene) {
    // Ambient light for overall illumination - increased for lighter overall look
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Main directional light (key light) - increased intensity for better detail visibility
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(8, 12, 8);
    keyLight.target.position.set(0, 0, 0);
    scene.add(keyLight);
    scene.add(keyLight.target);

    // Fill light for softer shadows - increased for lighter overall appearance
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-6, 8, -6);
    fillLight.target.position.set(0, 0, 0);
    scene.add(fillLight);
    scene.add(fillLight.target);

    // Rim light for edge definition - increased for better edge detail
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
    rimLight.position.set(0, 0, -10);
    rimLight.target.position.set(0, 0, 0);
    scene.add(rimLight);
    scene.add(rimLight.target);

    // Hemisphere light for natural sky/ground lighting - increased intensity
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.5);
    scene.add(hemisphereLight);
  }

  loadModel(baseName, index) {
    // Remove existing models from both scenes
    if (this.originalModel) this.originalScene.remove(this.originalModel);
    if (this.explodedModel) this.explodedScene.remove(this.explodedModel);

    const overlay = document.querySelector(
      `${this.container} #loading-overlay`
    );
    overlay.style.display = "flex";

    const loader = new THREE.GLTFLoader();
    loader.load(
      `${this.modelPath}/${baseName}${this.modelExtension}`,
      (gltf) => {
        // Clone the model for both scenes
        this.originalModel = gltf.scene.clone();
        this.explodedModel = gltf.scene.clone();

        // Store the base name for tracking
        this.originalModel.userData.baseName = baseName;
        this.explodedModel.userData.baseName = baseName;

        // Add to respective scenes
        this.originalScene.add(this.originalModel);
        this.explodedScene.add(this.explodedModel);

        // Configure both models with natural materials
        [this.originalModel, this.explodedModel].forEach(model => {
          model.traverse((child) => {
            if (child.isMesh) {
              child.visible = true;

              // Create matte material properties without highlights
              if (child.material) {
                child.material.color.set(0xf8f8f8); // Lighter off-white for brighter appearance
                child.material.metalness = 0.0; // No metallic property to eliminate highlights
                child.material.roughness = 0.5; // Maximum roughness for completely matte surface
                child.material.normalScale = new THREE.Vector2(1., 1.); // Enhance normal mapping if available
                child.material.envMapIntensity = 0.2; // No environment reflection to eliminate highlights
                child.material.needsUpdate = true;
              }
            }
          });
        });

        // Store original positions for explode effect
        this.storeOriginalPositions(this.explodedModel);

        // Scale and position models appropriately
        this.fitModelToView(this.originalModel, 0.8); // Left scene at 0.8 scale
        this.fitModelToView(this.explodedModel, 0.6); // Right scene at 0.6 scale (smaller to account for explosion)

        // Set initial explode state for the right scene
        this.explodeAmount = 0.3; // Start with 30% exploded (less to fit in viewer)
        this.applyExplodeEffect(this.explodeAmount);

        // Position cameras to view the scaled models
        this.positionCameras();

        // Replace buttons with explode controls
        this.createExplodeControls();

        overlay.style.display = "none";
      }
    );
  }

  changeModelColor(color) {
    [this.originalModel, this.explodedModel].forEach(model => {
      if (model) {
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.color.set(color);
            child.material.needsUpdate = true;
          }
        });
      }
    });
  }

  storeOriginalPositions(model) {
    if (!model) return;

    const root = model.children[0];
    if (root) {
      root.children.forEach((part) => {
        part.userData.originalPosition = part.position.clone();
      });
    }
  }

  fitModelToView(model, scaleFactor = 1.0) {
    if (!model) return;

    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Calculate scale to fit the model in a reasonable size
    const maxDimension = Math.max(size.x, size.y, size.z);
    const targetSize = 1.5; // Target size for the largest dimension
    const baseScale = targetSize / maxDimension;
    const finalScale = baseScale * scaleFactor; // Apply additional scale factor

    // Apply scale
    model.scale.setScalar(finalScale);

    // Center the model
    model.position.sub(center.multiplyScalar(finalScale));
  }

  positionCameras() {
    // Position cameras to view the scaled models nicely
    const distance = 2.5;

    this.originalCamera.position.set(0, 0, distance);
    this.originalCamera.lookAt(0, 0, 0);

    this.explodedCamera.position.set(0, 0, distance);
    this.explodedCamera.lookAt(0, 0, 0);
  }

  createImageSlider() {
    const sliderContainer = document.querySelector(
      `${this.container} #image-slider`
    );
    this.modelBaseNames.forEach((baseName, index) => {
      const slide = document.createElement("div");
      slide.classList.add("swiper-slide");

      const img = document.createElement("img");
      img.src = `${this.imagePath}/${baseName}${this.imageExtension}`;
      img.alt = `Model ${index + 1}`;
      img.onclick = () => this.loadModel(baseName, index);

      slide.appendChild(img);
      sliderContainer.appendChild(slide);
    });

    this.swiper = new Swiper(`${this.container} .swiper`, {
      slidesPerView: "auto",
      slidesPerGroup: 2,
      spaceBetween: 10,
      rewind: true,
      navigation: {
        nextEl: `${this.container} .swiper-button-next`,
        prevEl: `${this.container} .swiper-button-prev`,
      },
    });
  }

  createExplodeControls() {
    const controlsDiv = document.querySelector(
      `${this.container} #button-block`
    );
    controlsDiv.innerHTML = ""; // Clear existing buttons

    const controlsContainer = document.createElement("div");
    controlsContainer.style.display = "flex";
    controlsContainer.style.alignItems = "center";
    controlsContainer.style.justifyContent = "center";
    controlsContainer.style.gap = "20px";
    controlsContainer.style.margin = "10px";

    // Auto-rotate button
    const autoRotateButton = document.createElement("button");
    autoRotateButton.textContent = this.autoRotate ? "Stop Rotate" : "Auto Rotate";
    autoRotateButton.style.padding = "10px 20px";
    autoRotateButton.style.fontSize = "16px";
    autoRotateButton.style.fontWeight = "bold";
    autoRotateButton.style.backgroundColor = this.autoRotate ? "#28a745" : "#6c757d";
    autoRotateButton.style.color = "white";
    autoRotateButton.style.border = "none";
    autoRotateButton.style.borderRadius = "5px";
    autoRotateButton.style.cursor = "pointer";
    autoRotateButton.style.transition = "background-color 0.3s";
    autoRotateButton.style.width = "140px";
    autoRotateButton.style.minWidth = "140px";
    autoRotateButton.style.height = "40px";
    autoRotateButton.style.textAlign = "center";

    autoRotateButton.onmouseover = () => {
      autoRotateButton.style.backgroundColor = this.autoRotate ? "#218838" : "#5a6268";
    };
    autoRotateButton.onmouseout = () => {
      autoRotateButton.style.backgroundColor = this.autoRotate ? "#28a745" : "#6c757d";
    };

    autoRotateButton.onclick = () => {
      this.autoRotate = !this.autoRotate;
      autoRotateButton.textContent = this.autoRotate ? "Stop Rotate" : "Auto Rotate";
      autoRotateButton.style.backgroundColor = this.autoRotate ? "#28a745" : "#6c757d";
    };

    // Explode button
    const explodeButton = document.createElement("button");
    explodeButton.textContent = this.explodeAmount === 0 ? "Explode" : "Reset"; // Set initial text
    explodeButton.style.padding = "10px 20px";
    explodeButton.style.fontSize = "16px";
    explodeButton.style.fontWeight = "bold";
    explodeButton.style.backgroundColor = "#007bff";
    explodeButton.style.color = "white";
    explodeButton.style.border = "none";
    explodeButton.style.borderRadius = "5px";
    explodeButton.style.cursor = "pointer";
    explodeButton.style.transition = "background-color 0.3s";
    explodeButton.style.width = "100px"; // Fixed width to prevent layout shift
    explodeButton.style.minWidth = "100px"; // Ensure minimum width
    explodeButton.style.height = "40px";
    explodeButton.style.textAlign = "center"; // Center text within fixed width

    explodeButton.onmouseover = () => {
      explodeButton.style.backgroundColor = "#0056b3";
    };
    explodeButton.onmouseout = () => {
      explodeButton.style.backgroundColor = "#007bff";
    };

    explodeButton.onclick = () => {
      if (this.explodeAmount === 0) {
        // If currently collapsed, explode to initial state
        this.explodeAmount = 0.3;
        explodeButton.textContent = "Reset";
        this.applyExplodeEffect(this.explodeAmount);
      } else {
        // If currently exploded, reload the model to initial state
        this.reloadModel();
      }
      slider.value = this.explodeAmount.toString(); // Update slider to match button action
    };

    // Explode slider
    const sliderContainer = document.createElement("div");
    sliderContainer.style.display = "flex";
    sliderContainer.style.alignItems = "center";
    sliderContainer.style.gap = "10px";

    const label = document.createElement("span");
    label.textContent = "Explode: ";
    label.style.fontWeight = "bold";
    label.style.fontSize = "16px";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "1";
    slider.step = "0.01";
    slider.value = this.explodeAmount.toString(); // Set initial value
    slider.style.width = "200px";

    slider.oninput = (event) => {
      this.explodeAmount = parseFloat(event.target.value);
      this.applyExplodeEffect(this.explodeAmount);
      explodeButton.textContent = this.explodeAmount === 0 ? "Explode" : "Reset";
    };

    sliderContainer.appendChild(label);
    sliderContainer.appendChild(slider);

    controlsContainer.appendChild(autoRotateButton);
    controlsContainer.appendChild(explodeButton);
    controlsContainer.appendChild(sliderContainer);
    controlsDiv.appendChild(controlsContainer);
  }

  applyExplodeEffect(explodeAmount) {
    if (!this.explodedModel) return;

    const root = this.explodedModel.children[0];
    if (!root) return;

    root.children.forEach((part, index) => {
      const bbox = new THREE.Box3().setFromObject(part);
      const center = bbox.getCenter(new THREE.Vector3());
      const direction = center.clone().sub(this.explodedScene.position).normalize();

      // Calculate the new position based on the explode amount
      const originalPosition = part.userData.originalPosition || part.position.clone();
      const offset = direction.multiplyScalar(explodeAmount * 1.0); // Further reduced to keep parts in viewer
      const newPosition = originalPosition.clone().add(offset);

      part.position.copy(newPosition);
    });
  }

  rotateParts() {
    // Only rotate parts in the exploded scene (right view)
    if (!this.explodedModel) return;

    const root = this.explodedModel.children[0];
    if (!root) return;

    root.children.forEach((part, index) => {
      // Store original rotation and position if not already stored
      if (!part.userData.originalRotation) {
        part.userData.originalRotation = part.rotation.clone();
      }
      if (!part.userData.originalPosition) {
        part.userData.originalPosition = part.position.clone();
      }

      // Apply rotation around Y-axis only (self-rotation)
      part.rotation.y = this.rotationAngle;
    });

    // Reapply explode effect to maintain exploded positions
    this.applyExplodeEffect(this.explodeAmount);
  }

  resetPartRotations() {
    // Reset all part rotations to their original state
    if (!this.explodedModel) return;

    const root = this.explodedModel.children[0];
    if (!root) return;

    root.children.forEach((part) => {
      if (part.userData.originalRotation) {
        part.rotation.copy(part.userData.originalRotation);
      } else {
        part.rotation.set(0, 0, 0);
      }
    });

    // Reset rotation angle to start fresh
    this.rotationAngle = 0;
  }

  reloadModel() {
    // Get the current model base name
    const currentModelIndex = this.modelBaseNames.findIndex(name =>
      this.originalModel && this.originalModel.userData && this.originalModel.userData.baseName === name
    );

    if (currentModelIndex === -1) {
      // Fallback to first model if we can't find current one
      this.loadModel(this.modelBaseNames[0]);
    } else {
      // Reload the current model
      this.loadModel(this.modelBaseNames[currentModelIndex]);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Auto-rotate individual parts if enabled
    if (this.autoRotate) {
      this.rotationAngle += this.rotationSpeed;
      this.rotateParts();
    }

    // Update controls for both scenes
    this.originalControls.update();
    this.explodedControls.update();

    // Render both scenes
    this.originalRenderer.render(this.originalScene, this.originalCamera);
    this.explodedRenderer.render(this.explodedScene, this.explodedCamera);
  }
}
