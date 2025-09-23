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
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Main directional light (key light) - positioned far away to avoid internal lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(8, 12, 8);
    keyLight.target.position.set(0, 0, 0);
    scene.add(keyLight);
    scene.add(keyLight.target);

    // Fill light for softer shadows - positioned opposite to key light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-6, 8, -6);
    fillLight.target.position.set(0, 0, 0);
    scene.add(fillLight);
    scene.add(fillLight.target);

    // Rim light for edge definition - positioned behind the object
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 0, -10);
    rimLight.target.position.set(0, 0, 0);
    scene.add(rimLight);
    scene.add(rimLight.target);

    // Hemisphere light for natural sky/ground lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.3);
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

        // Add to respective scenes
        this.originalScene.add(this.originalModel);
        this.explodedScene.add(this.explodedModel);

        // Configure both models with natural materials
        [this.originalModel, this.explodedModel].forEach(model => {
          model.traverse((child) => {
            if (child.isMesh) {
              child.visible = true;

              // Create more natural material properties
              if (child.material) {
                child.material.color.set(0xf5f5f5); // Soft off-white
                child.material.metalness = 0.1; // Slight metallic property
                child.material.roughness = 0.7; // Slightly rough surface
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
    explodeButton.style.textAlign = "center"; // Center text within fixed width

    explodeButton.onmouseover = () => {
      explodeButton.style.backgroundColor = "#0056b3";
    };
    explodeButton.onmouseout = () => {
      explodeButton.style.backgroundColor = "#007bff";
    };

    explodeButton.onclick = () => {
      this.explodeAmount = this.explodeAmount === 0 ? 0.3 : 0; // Toggle between 0 and 0.3 (initial exploded state)
      this.applyExplodeEffect(this.explodeAmount);
      explodeButton.textContent = this.explodeAmount === 0 ? "Explode" : "Reset";
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

  animate() {
    requestAnimationFrame(() => this.animate());

    // Update controls for both scenes
    this.originalControls.update();
    this.explodedControls.update();

    // Render both scenes
    this.originalRenderer.render(this.originalScene, this.originalCamera);
    this.explodedRenderer.render(this.explodedScene, this.explodedCamera);
  }
}
