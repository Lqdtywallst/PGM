import * as THREE from "../vendor/three/three.module.js";
import { GLTFLoader } from "../vendor/three/GLTFLoader.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const MODEL_FILES = {
    sports: "ignition-car.glb",
    convertible: "convertible-poly.glb",
    luxury: "rolls-royce.glb",
    suv: "range-rover.glb",
    electric: "cybertruck.glb"
};

const MODEL_CONFIGS = {
    sports: {
        rotationX: 0.05,
        rotationY: -0.38,
        rotationZ: 0,
        xOffset: -0.08,
        yOffset: 0.12,
        zOffset: 0,
        targetWidth: 5.15,
        targetHeight: 2.1,
        frameCenterY: 0.93,
        frustumHeight: 5.15,
        hoverYaw: 0.22,
        hoverPitch: 0.05,
        bobAmplitude: 0.028,
        shadowWidth: 5.05,
        shadowHeight: 1.46,
        accentColor: 0xefc24f,
        palette: {
            body: 0xc9a13d,
            roof: 0xb58a28,
            glass: 0x1f2833,
            trim: 0x11151c,
            tire: 0x0c0d10,
            rim: 0x8e949e,
            frontLight: 0xf7e8b4,
            rearLight: 0xcc4a36
        },
        geometry: {
            depth: 1.58,
            bodyTop: [
                [-2.38, 0.18],
                [-2.2, 0.4],
                [-1.58, 0.58],
                [-0.28, 0.69],
                [0.82, 0.74],
                [1.52, 0.68],
                [2.02, 0.52],
                [2.28, 0.34],
                [2.38, 0.18]
            ],
            frontArch: { x: -1.42, y: 0.18, radius: 0.5 },
            rearArch: { x: 1.32, y: 0.18, radius: 0.52 },
            cabin: [
                [-0.98, 0.72],
                [-0.42, 1.02],
                [0.38, 1.08],
                [1.12, 0.94],
                [1.42, 0.72]
            ],
            glass: [
                [-0.82, 0.76],
                [-0.34, 0.96],
                [0.28, 1],
                [0.94, 0.9],
                [1.18, 0.76]
            ],
            cabinDepthFactor: 0.86,
            glassDepthFactor: 0.72,
            roofPanel: { size: [1.12, 0.08, 1.06], position: [0.22, 1.08, 0] },
            cockpitCutout: { size: [1.44, 0.28, 0.86], position: [0.36, 0.86, 0] },
            frontLights: [
                { size: [0.18, 0.06, 0.24], position: [-2.24, 0.42, 0.44] },
                { size: [0.18, 0.06, 0.24], position: [-2.24, 0.42, -0.44] }
            ],
            rearLights: [
                { size: [0.12, 0.06, 0.26], position: [2.22, 0.42, 0.46] },
                { size: [0.12, 0.06, 0.26], position: [2.22, 0.42, -0.46] }
            ],
            mirrors: [
                { size: [0.08, 0.08, 0.2], position: [-0.22, 0.88, 0.74] },
                { size: [0.08, 0.08, 0.2], position: [-0.22, 0.88, -0.74] }
            ]
        }
    },
    convertible: {
        rotationX: 0.04,
        rotationY: -0.4,
        rotationZ: 0,
        xOffset: 0.12,
        yOffset: 0.1,
        zOffset: 0,
        targetWidth: 5.05,
        targetHeight: 2.05,
        frameCenterY: 0.92,
        frustumHeight: 5.2,
        hoverYaw: 0.2,
        hoverPitch: 0.05,
        bobAmplitude: 0.026,
        shadowWidth: 4.82,
        shadowHeight: 1.4,
        accentColor: 0xc85a52,
        palette: {
            body: 0x9f1f25,
            roof: 0x882127,
            glass: 0x1c2530,
            trim: 0x11161c,
            tire: 0x0c0d10,
            rim: 0x90959e,
            frontLight: 0xf7e8b4,
            rearLight: 0xd05345
        },
        geometry: {
            depth: 1.56,
            bodyTop: [
                [-2.32, 0.18],
                [-2.12, 0.38],
                [-1.54, 0.54],
                [-0.34, 0.66],
                [0.74, 0.7],
                [1.52, 0.64],
                [1.98, 0.48],
                [2.22, 0.3],
                [2.3, 0.18]
            ],
            frontArch: { x: -1.4, y: 0.18, radius: 0.49 },
            rearArch: { x: 1.24, y: 0.18, radius: 0.51 },
            windshield: [
                [-0.38, 0.7],
                [-0.06, 1.02],
                [0.14, 1.01],
                [0.22, 0.7]
            ],
            windshieldDepthFactor: 0.72,
            rearDeckPanel: { size: [1.08, 0.1, 1.02], position: [0.78, 0.82, 0] },
            cockpitCutout: { size: [1.34, 0.34, 0.82], position: [0.34, 0.82, 0] },
            headrests: [
                { size: [0.14, 0.2, 0.12], position: [0.54, 0.96, 0.18] },
                { size: [0.14, 0.2, 0.12], position: [0.54, 0.96, -0.18] }
            ],
            frontLights: [
                { size: [0.16, 0.06, 0.22], position: [-2.16, 0.4, 0.42] },
                { size: [0.16, 0.06, 0.22], position: [-2.16, 0.4, -0.42] }
            ],
            rearLights: [
                { size: [0.12, 0.06, 0.22], position: [2.14, 0.38, 0.44] },
                { size: [0.12, 0.06, 0.22], position: [2.14, 0.38, -0.44] }
            ],
            mirrors: [
                { size: [0.08, 0.08, 0.2], position: [-0.28, 0.8, 0.72] },
                { size: [0.08, 0.08, 0.2], position: [-0.28, 0.8, -0.72] }
            ]
        }
    },
    luxury: {
        rotationX: 0.02,
        rotationY: -0.36,
        rotationZ: 0,
        xOffset: 0.02,
        yOffset: 0.08,
        zOffset: 0,
        targetWidth: 5.08,
        targetHeight: 2.28,
        frameCenterY: 0.92,
        frustumHeight: 5.35,
        hoverYaw: 0.16,
        hoverPitch: 0.04,
        bobAmplitude: 0.022,
        shadowWidth: 5.12,
        shadowHeight: 1.54,
        accentColor: 0xd6bc86,
        palette: {
            body: 0x4b4741,
            roof: 0x60584e,
            glass: 0x232b35,
            trim: 0x12161d,
            tire: 0x0d0e11,
            rim: 0x9398a1,
            frontLight: 0xf6e6b9,
            rearLight: 0xc54e3d
        },
        geometry: {
            depth: 1.7,
            bodyTop: [
                [-2.56, 0.18],
                [-2.34, 0.44],
                [-1.78, 0.62],
                [-0.26, 0.74],
                [1.24, 0.78],
                [2.06, 0.72],
                [2.42, 0.58],
                [2.56, 0.38],
                [2.58, 0.18]
            ],
            frontArch: { x: -1.5, y: 0.18, radius: 0.5 },
            rearArch: { x: 1.34, y: 0.18, radius: 0.5 },
            cabin: [
                [-1.08, 0.78],
                [-0.64, 1.1],
                [0.14, 1.24],
                [1.14, 1.24],
                [1.86, 1.02],
                [2.06, 0.78]
            ],
            glass: [
                [-0.92, 0.82],
                [-0.58, 1.04],
                [0.12, 1.14],
                [1.02, 1.14],
                [1.66, 0.96],
                [1.8, 0.82]
            ],
            cabinDepthFactor: 0.9,
            glassDepthFactor: 0.74,
            roofPanel: { size: [2.32, 0.08, 1.18], position: [0.44, 1.24, 0] },
            frontLights: [
                { size: [0.2, 0.08, 0.24], position: [-2.42, 0.42, 0.44] },
                { size: [0.2, 0.08, 0.24], position: [-2.42, 0.42, -0.44] }
            ],
            rearLights: [
                { size: [0.12, 0.08, 0.26], position: [2.44, 0.42, 0.46] },
                { size: [0.12, 0.08, 0.26], position: [2.44, 0.42, -0.46] }
            ],
            hoodOrnament: { size: [0.04, 0.14, 0.04], position: [-2.12, 0.78, 0] },
            mirrors: [
                { size: [0.08, 0.08, 0.22], position: [-0.76, 0.96, 0.8] },
                { size: [0.08, 0.08, 0.22], position: [-0.76, 0.96, -0.8] }
            ]
        }
    },
    suv: {
        rotationX: 0.04,
        rotationY: -0.32,
        rotationZ: 0,
        xOffset: 0.08,
        yOffset: 0.08,
        zOffset: 0,
        targetWidth: 5.12,
        targetHeight: 2.42,
        frameCenterY: 0.95,
        frustumHeight: 5.45,
        hoverYaw: 0.18,
        hoverPitch: 0.05,
        bobAmplitude: 0.024,
        shadowWidth: 5.18,
        shadowHeight: 1.62,
        accentColor: 0xacc18f,
        palette: {
            body: 0xb7ad8a,
            roof: 0x9e9574,
            glass: 0x22303a,
            trim: 0x11161c,
            tire: 0x0c0d10,
            rim: 0x8f959f,
            frontLight: 0xf5e5b7,
            rearLight: 0xc84a37
        },
        geometry: {
            depth: 1.86,
            bodyTop: [
                [-2.5, 0.18],
                [-2.32, 0.54],
                [-1.82, 0.74],
                [-0.2, 0.84],
                [1.36, 0.84],
                [2.02, 0.74],
                [2.38, 0.56],
                [2.5, 0.36],
                [2.52, 0.18]
            ],
            frontArch: { x: -1.46, y: 0.18, radius: 0.56 },
            rearArch: { x: 1.2, y: 0.18, radius: 0.58 },
            cabin: [
                [-0.92, 0.86],
                [-0.56, 1.42],
                [0.58, 1.56],
                [1.48, 1.48],
                [1.98, 1.18],
                [1.9, 0.86]
            ],
            glass: [
                [-0.76, 0.9],
                [-0.44, 1.32],
                [0.56, 1.42],
                [1.36, 1.36],
                [1.68, 1.12],
                [1.58, 0.9]
            ],
            cabinDepthFactor: 0.92,
            glassDepthFactor: 0.76,
            roofPanel: { size: [1.98, 0.08, 1.34], position: [0.54, 1.6, 0] },
            frontLights: [
                { size: [0.16, 0.08, 0.28], position: [-2.34, 0.5, 0.5] },
                { size: [0.16, 0.08, 0.28], position: [-2.34, 0.5, -0.5] }
            ],
            rearLights: [
                { size: [0.12, 0.08, 0.28], position: [2.38, 0.5, 0.52] },
                { size: [0.12, 0.08, 0.28], position: [2.38, 0.5, -0.52] }
            ],
            grille: { size: [0.12, 0.28, 1.08], position: [-2.46, 0.46, 0] },
            mirrors: [
                { size: [0.08, 0.08, 0.22], position: [-0.46, 1.02, 0.86] },
                { size: [0.08, 0.08, 0.22], position: [-0.46, 1.02, -0.86] }
            ],
            roofRails: [
                { size: [1.56, 0.05, 0.05], position: [0.58, 1.68, 0.52] },
                { size: [1.56, 0.05, 0.05], position: [0.58, 1.68, -0.52] }
            ]
        }
    },
    electric: {
        rotationX: 0.05,
        rotationY: -0.32,
        rotationZ: 0,
        xOffset: 0.16,
        yOffset: 0.12,
        zOffset: 0,
        targetWidth: 5.18,
        targetHeight: 2.18,
        frameCenterY: 0.93,
        frustumHeight: 5.25,
        hoverYaw: 0.18,
        hoverPitch: 0.05,
        bobAmplitude: 0.02,
        shadowWidth: 5.14,
        shadowHeight: 1.48,
        accentColor: 0x86a8d1,
        palette: {
            body: 0xa7afbb,
            roof: 0x8c96a3,
            glass: 0x1f2b38,
            trim: 0x10151c,
            tire: 0x0c0d10,
            rim: 0x8e959f,
            frontLight: 0xf4e8c0,
            rearLight: 0xd05044
        },
        geometry: {
            depth: 1.78,
            bodyTop: [
                [-2.34, 0.18],
                [-2.14, 0.4],
                [-1.44, 0.58],
                [-0.08, 0.68],
                [1.06, 0.72],
                [1.88, 0.66],
                [2.26, 0.54],
                [2.4, 0.38],
                [2.44, 0.18]
            ],
            frontArch: { x: -1.36, y: 0.18, radius: 0.5 },
            rearArch: { x: 1.34, y: 0.18, radius: 0.5 },
            cabin: [
                [-0.68, 0.72],
                [-0.18, 1.18],
                [0.72, 1.24],
                [1.64, 0.96],
                [1.98, 0.72]
            ],
            glass: [
                [-0.52, 0.76],
                [-0.12, 1.08],
                [0.66, 1.14],
                [1.44, 0.92],
                [1.72, 0.76]
            ],
            cabinDepthFactor: 0.86,
            glassDepthFactor: 0.72,
            roofPanel: { size: [1.42, 0.08, 1.08], position: [0.56, 1.22, 0] },
            frontLights: [
                { size: [0.14, 0.06, 0.6], position: [-2.18, 0.42, 0] }
            ],
            rearLights: [
                { size: [0.12, 0.06, 0.66], position: [2.26, 0.42, 0] }
            ],
            mirrors: [
                { size: [0.08, 0.08, 0.18], position: [-0.2, 0.96, 0.8] },
                { size: [0.08, 0.08, 0.18], position: [-0.2, 0.96, -0.8] }
            ]
        }
    }
};

const cards = Array.from(document.querySelectorAll(".fleet-category[data-vehicle-type]"));

if (cards.length > 0) {
    initFleetCategory3D(cards);
}

function initFleetCategory3D(categoryCards) {
    const shell = document.querySelector(".fleet-categories__shell");
    const masterCanvas = shell?.querySelector(".fleet-categories__master-canvas");
    const loader = new GLTFLoader();

    if (!shell || !masterCanvas) {
        return;
    }

    const shadowTexture = createSoftShadowTexture();
    const renderer = createRenderer(masterCanvas);
    const master = {
        shell,
        renderer,
        width: 0,
        height: 0
    };

    const states = categoryCards.map((card, index) => createSceneState(card, index, shadowTexture, loader)).filter(Boolean);

    if (states.length === 0) {
        shadowTexture.dispose();
        renderer.dispose();
        return;
    }

    const syncLayout = () => {
        updateMasterSize(master);
        states.forEach((state) => updateViewport(master, state));
    };

    const resizeObserver = new ResizeObserver(() => {
        syncLayout();
        renderFleet(master, states);
    });

    const intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const state = states.find((candidate) => candidate.card === entry.target);

            if (state) {
                state.isVisible = entry.isIntersecting;
            }
        });
    }, {
        threshold: 0.1
    });

    states.forEach((state) => {
        state.card.dataset.modelReady = "false";
        wireCardInteraction(state);
        buildModel(state);
        resizeObserver.observe(state.media);
        intersectionObserver.observe(state.card);
    });

    resizeObserver.observe(shell);
    syncLayout();
    renderFleet(master, states);

    let rafId = 0;

    const frame = (time) => {
        const seconds = time * 0.001;

        states.forEach((state) => animateState(state, seconds));
        renderFleet(master, states);
        rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    window.addEventListener("beforeunload", () => {
        window.cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        shadowTexture.dispose();
        renderer.dispose();
    }, { once: true });
}

function createSceneState(card, index, shadowTexture, loader) {
    const type = card.dataset.vehicleType;
    const config = MODEL_CONFIGS[type];
    const media = card.querySelector(".fleet-category__media");

    if (!config || !media) {
        return null;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);

    camera.position.set(0, 2.25, 8.8);
    camera.lookAt(0, 1.02, 0);

    const rig = new THREE.Group();
    const modelGroup = new THREE.Group();

    rig.add(modelGroup);
    scene.add(rig);
    rig.add(createShadowPlane(shadowTexture, config));
    addSceneLights(scene, config);

    return {
        card,
        media,
        loader,
        type,
        config,
        scene,
        camera,
        rig,
        modelGroup,
        model: null,
        hover: false,
        isVisible: true,
        pointerX: 0,
        pointerY: 0,
        currentX: 0,
        currentY: 0,
        seed: index * 0.92,
        viewportLeft: 0,
        viewportTop: 0,
        viewportWidth: 0,
        viewportHeight: 0
    };
}

function buildModel(state) {
    const file = MODEL_FILES[state.type];

    if (!file) {
        state.card.dataset.modelReady = "error";
        return;
    }

    const modelUrl = new URL(`../media/models/${file}`, import.meta.url).href;

    state.loader.load(modelUrl, (gltf) => {
        const model = gltf.scene || gltf.scenes[0];

        if (!model) {
            state.card.dataset.modelReady = "error";
            return;
        }

        prepareLoadedModel(model, state.config);
        normalizeModel(model, state.config);
        state.modelGroup.add(model);
        state.model = model;
        state.card.dataset.modelReady = "true";
    }, undefined, (error) => {
        console.error(`Failed to load category model for ${state.type}.`, error);
        state.card.dataset.modelReady = "error";
    });
}

function prepareLoadedModel(model, config) {
    model.traverse((child) => {
        if (!child.isMesh) {
            return;
        }

        child.frustumCulled = false;

        if (child.geometry) {
            child.geometry.computeVertexNormals();
        }

        const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
        const displayMaterials = sourceMaterials.map((material) => createDisplayMaterial(material, config));

        child.material = Array.isArray(child.material) ? displayMaterials : displayMaterials[0];
    });
}

function createDisplayMaterial(material, config) {
    if (!material) {
        return material;
    }

    const materialName = String(material.name || "").toLowerCase();
    const isGlass = materialName.includes("glass") || materialName.includes("window");
    const phong = new THREE.MeshPhongMaterial({
        color: material.color ? material.color.clone() : new THREE.Color(config.palette.body),
        map: material.map || null,
        transparent: isGlass || material.transparent,
        opacity: isGlass ? 0.3 : (material.opacity ?? 1),
        side: THREE.DoubleSide,
        shininess: isGlass ? 90 : 44,
        specular: new THREE.Color(isGlass ? 0xdfe8f3 : 0x3a3a3a)
    });

    if (phong.map) {
        phong.map.colorSpace = THREE.SRGBColorSpace;
    }

    if (!isGlass && material.color) {
        const tunedColor = material.color.clone().lerp(new THREE.Color(config.palette.body), 0.12);
        phong.color.copy(tunedColor);
    }

    if (isGlass) {
        phong.depthWrite = false;
    }

    return phong;
}

function createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);

    return renderer;
}

function createProceduralVehicle(config) {
    const vehicle = new THREE.Group();
    const materials = createVehicleMaterials(config);
    const geometryConfig = config.geometry;

    vehicle.add(createExtrudedMesh(createBodyShape(geometryConfig), geometryConfig.depth, materials.body));

    if (geometryConfig.cabin) {
        vehicle.add(
            createExtrudedMesh(
                createPolygonShape(geometryConfig.cabin),
                geometryConfig.depth * geometryConfig.cabinDepthFactor,
                materials.roof
            )
        );
    }

    if (geometryConfig.glass) {
        vehicle.add(
            createExtrudedMesh(
                createPolygonShape(geometryConfig.glass),
                geometryConfig.depth * geometryConfig.glassDepthFactor,
                materials.glass
            )
        );
    }

    if (geometryConfig.windshield) {
        vehicle.add(
            createExtrudedMesh(
                createPolygonShape(geometryConfig.windshield),
                geometryConfig.depth * geometryConfig.windshieldDepthFactor,
                materials.glass
            )
        );
    }

    if (geometryConfig.roofPanel) {
        vehicle.add(createPanelBox(geometryConfig.roofPanel, materials.roof));
    }

    if (geometryConfig.rearDeckPanel) {
        vehicle.add(createPanelBox(geometryConfig.rearDeckPanel, materials.roof));
    }

    if (geometryConfig.cockpitCutout) {
        vehicle.add(createPanelBox(geometryConfig.cockpitCutout, materials.trim));
    }

    if (geometryConfig.grille) {
        vehicle.add(createPanelBox(geometryConfig.grille, materials.trim));
    }

    if (geometryConfig.hoodOrnament) {
        vehicle.add(createPanelBox(geometryConfig.hoodOrnament, materials.frontLight));
    }

    geometryConfig.headrests?.forEach((panel) => {
        vehicle.add(createPanelBox(panel, materials.roof));
    });

    geometryConfig.mirrors?.forEach((panel) => {
        vehicle.add(createPanelBox(panel, materials.trim));
    });

    geometryConfig.roofRails?.forEach((panel) => {
        vehicle.add(createPanelBox(panel, materials.trim));
    });

    geometryConfig.frontLights?.forEach((panel) => {
        vehicle.add(createPanelBox(panel, materials.frontLight));
    });

    geometryConfig.rearLights?.forEach((panel) => {
        vehicle.add(createPanelBox(panel, materials.rearLight));
    });

    vehicle.add(createBeltLine(geometryConfig, materials.trim));
    vehicle.add(createWheelSet(geometryConfig, materials.tire, materials.rim));
    vehicle.add(createWheelArchSet(geometryConfig, materials.trim));

    return vehicle;
}

function createVehicleMaterials(config) {
    const { palette } = config;
    const smoothSurface = {
        flatShading: false,
        side: THREE.DoubleSide
    };

    return {
        body: new THREE.MeshPhongMaterial({
            color: palette.body,
            specular: new THREE.Color(0x444444),
            shininess: 54,
            ...smoothSurface
        }),
        roof: new THREE.MeshPhongMaterial({
            color: palette.roof,
            specular: new THREE.Color(0x323232),
            shininess: 36,
            ...smoothSurface
        }),
        glass: new THREE.MeshPhongMaterial({
            color: palette.glass,
            transparent: true,
            opacity: 0.82,
            depthWrite: false,
            specular: new THREE.Color(0xb8c7dc),
            shininess: 90,
            ...smoothSurface
        }),
        trim: new THREE.MeshPhongMaterial({
            color: palette.trim,
            specular: new THREE.Color(0x232323),
            shininess: 18,
            ...smoothSurface
        }),
        tire: new THREE.MeshPhongMaterial({
            color: palette.tire,
            specular: new THREE.Color(0x111111),
            shininess: 8,
            ...smoothSurface
        }),
        rim: new THREE.MeshPhongMaterial({
            color: palette.rim,
            specular: new THREE.Color(0x8a8a8a),
            shininess: 54,
            ...smoothSurface
        }),
        frontLight: new THREE.MeshBasicMaterial({
            color: palette.frontLight
        }),
        rearLight: new THREE.MeshBasicMaterial({
            color: palette.rearLight
        })
    };
}

function createBodyShape(geometryConfig) {
    const shape = new THREE.Shape();
    const topProfile = geometryConfig.bodyTop;

    shape.moveTo(topProfile[0][0], topProfile[0][1]);

    for (let index = 1; index < topProfile.length; index += 1) {
        shape.lineTo(topProfile[index][0], topProfile[index][1]);
    }

    const rearLip = geometryConfig.rearArch.x + geometryConfig.rearArch.radius;

    if (topProfile[topProfile.length - 1][0] < rearLip) {
        shape.lineTo(rearLip, geometryConfig.rearArch.y);
    }

    appendArc(shape, geometryConfig.rearArch, 0, Math.PI, 10);

    const frontLip = geometryConfig.frontArch.x + geometryConfig.frontArch.radius;

    shape.lineTo(frontLip, geometryConfig.frontArch.y);
    appendArc(shape, geometryConfig.frontArch, 0, Math.PI, 10);
    shape.lineTo(topProfile[0][0], topProfile[0][1]);

    return shape;
}

function appendArc(shape, arch, startAngle, endAngle, segments) {
    for (let step = 1; step <= segments; step += 1) {
        const angle = startAngle + ((endAngle - startAngle) * step) / segments;

        shape.lineTo(
            arch.x + Math.cos(angle) * arch.radius,
            arch.y + Math.sin(angle) * arch.radius
        );
    }
}

function createPolygonShape(points) {
    const shape = new THREE.Shape();

    shape.moveTo(points[0][0], points[0][1]);

    for (let index = 1; index < points.length; index += 1) {
        shape.lineTo(points[index][0], points[index][1]);
    }

    shape.closePath();

    return shape;
}

function createExtrudedMesh(shape, depth, material) {
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        steps: 1,
        bevelEnabled: false
    });

    geometry.translate(0, 0, -depth / 2);
    geometry.computeVertexNormals();

    return new THREE.Mesh(geometry, material);
}

function createPanelBox(panel, material) {
    const [width, height, depth] = panel.size;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);

    mesh.position.set(panel.position[0], panel.position[1], panel.position[2]);

    return mesh;
}

function createBeltLine(geometryConfig, material) {
    const bodyFront = geometryConfig.bodyTop[0][0];
    const bodyRear = geometryConfig.bodyTop[geometryConfig.bodyTop.length - 1][0];
    const length = bodyRear - bodyFront - 0.62;
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(length, 0.045, geometryConfig.depth * 0.94),
        material
    );

    mesh.position.set((bodyFront + bodyRear) / 2, 0.8, 0);

    return mesh;
}

function createWheelSet(geometryConfig, tireMaterial, rimMaterial) {
    const group = new THREE.Group();
    const wheelRadius = Math.min(geometryConfig.frontArch.radius, geometryConfig.rearArch.radius) * 0.72;
    const wheelThickness = geometryConfig.depth * 0.14;
    const rimRadius = wheelRadius * 0.6;
    const rimThickness = wheelThickness * 0.72;
    const wheelZ = (geometryConfig.depth * 0.5) - (wheelThickness * 0.9);
    const wheelXs = [geometryConfig.frontArch.x, geometryConfig.rearArch.x];

    wheelXs.forEach((x) => {
        [-wheelZ, wheelZ].forEach((z) => {
            group.add(createWheel(x, wheelRadius, wheelThickness, rimRadius, rimThickness, z, tireMaterial, rimMaterial));
        });
    });

    return group;
}

function createWheel(x, wheelRadius, wheelThickness, rimRadius, rimThickness, z, tireMaterial, rimMaterial) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 16), tireMaterial);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(rimRadius, rimRadius, rimThickness, 12), rimMaterial);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(rimRadius * 0.42, rimRadius * 0.42, rimThickness * 1.04, 10), rimMaterial);

    [tire, rim, cap].forEach((mesh) => {
        mesh.rotation.x = Math.PI * 0.5;
    });

    rim.position.z = Math.sign(z) * 0.02;
    cap.position.z = Math.sign(z) * 0.03;

    wheel.position.set(x, wheelRadius + 0.02, z);
    wheel.add(tire, rim, cap);

    return wheel;
}

function createWheelArchSet(geometryConfig, material) {
    const group = new THREE.Group();
    const archDepth = (geometryConfig.depth / 2) - 0.04;
    const arches = [geometryConfig.frontArch, geometryConfig.rearArch];

    arches.forEach((arch) => {
        [-archDepth, archDepth].forEach((z) => {
            group.add(createArchTrim(arch, z, material));
        });
    });

    return group;
}

function createArchTrim(arch, z, material) {
    const geometry = new THREE.TorusGeometry(arch.radius, 0.024, 4, 14, Math.PI);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(arch.x, arch.y, z);

    return mesh;
}

function normalizeModel(model, config) {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    model.position.x -= center.x;
    model.position.y -= bounds.min.y;
    model.position.z -= center.z;

    const width = Math.max(size.x, size.z, 0.001);
    const height = Math.max(size.y, 0.001);
    const scale = Math.min(config.targetWidth / width, config.targetHeight / height);

    model.scale.setScalar(scale);

    const framedBounds = new THREE.Box3().setFromObject(model);
    const framedCenter = framedBounds.getCenter(new THREE.Vector3());

    model.position.x -= framedCenter.x;
    model.position.z -= framedCenter.z;
    model.position.y += (config.frameCenterY - framedCenter.y);
}

function addSceneLights(scene, config) {
    const hemisphere = new THREE.HemisphereLight(0xf5efe5, 0x0d1014, 2.35);
    const keyLight = new THREE.DirectionalLight(0xfffbf5, 3.15);
    const rimLight = new THREE.DirectionalLight(0xe2ebff, 1.8);
    const fillLight = new THREE.PointLight(0xf6e5c3, 0.96, 18, 2);
    const accentLight = new THREE.PointLight(config.accentColor, 1.05, 12, 2);

    keyLight.position.set(4.8, 7.4, 6.6);
    rimLight.position.set(-6.4, 4.8, -5.4);
    fillLight.position.set(0, 2.4, 6.2);
    accentLight.position.set(-2.2, 1.8, -3.2);

    scene.add(hemisphere, keyLight, rimLight, fillLight, accentLight);
}

function createSoftShadowTexture() {
    const size = 256;
    const canvas = document.createElement("canvas");

    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size * 0.48);

    gradient.addColorStop(0, "rgba(0, 0, 0, 0.44)");
    gradient.addColorStop(0.42, "rgba(0, 0, 0, 0.2)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);

    texture.needsUpdate = true;

    return texture;
}

function createShadowPlane(texture, config) {
    const geometry = new THREE.PlaneGeometry(config.shadowWidth, config.shadowHeight, 1, 1);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        opacity: 0.82
    });
    const shadow = new THREE.Mesh(geometry, material);

    shadow.rotation.x = -Math.PI * 0.5;
    shadow.position.set(config.xOffset * 0.45, 0.04, config.zOffset);

    return shadow;
}

function wireCardInteraction(state) {
    state.card.addEventListener("pointerenter", () => {
        state.hover = true;
    });

    state.card.addEventListener("pointermove", (event) => {
        const rect = state.card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

        state.pointerX = clamp(x, -1, 1);
        state.pointerY = clamp(y, -1, 1);
    });

    state.card.addEventListener("pointerleave", () => {
        state.hover = false;
        state.pointerX = 0;
        state.pointerY = 0;
    });
}

function updateMasterSize(master) {
    const bounds = master.shell.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));

    if (width === master.width && height === master.height) {
        return;
    }

    master.width = width;
    master.height = height;

    master.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    master.renderer.setSize(width, height, false);
}

function updateViewport(master, state) {
    const shellRect = master.shell.getBoundingClientRect();
    const rect = state.media.getBoundingClientRect();

    state.viewportLeft = Math.max(0, rect.left - shellRect.left);
    state.viewportTop = Math.max(0, rect.top - shellRect.top);
    state.viewportWidth = Math.max(0, rect.width);
    state.viewportHeight = Math.max(0, rect.height);

    if (state.viewportWidth === 0 || state.viewportHeight === 0) {
        return;
    }

    const aspect = state.viewportWidth / state.viewportHeight;
    const frustumHeight = state.config.frustumHeight;

    state.camera.left = -(frustumHeight * aspect) / 2;
    state.camera.right = (frustumHeight * aspect) / 2;
    state.camera.top = frustumHeight / 2;
    state.camera.bottom = -frustumHeight / 2;
    state.camera.updateProjectionMatrix();
}

function animateState(state, seconds) {
    const targetX = state.hover ? state.pointerX : 0;
    const targetY = state.hover ? state.pointerY : 0;
    const smoothing = prefersReducedMotion.matches ? 0.18 : 0.09;

    state.currentX = lerp(state.currentX, targetX, smoothing);
    state.currentY = lerp(state.currentY, targetY, smoothing);

    const idleDrift = prefersReducedMotion.matches ? 0 : Math.cos(seconds * 0.54 + state.seed) * 0.05;
    const idleLift = prefersReducedMotion.matches ? 0 : Math.sin(seconds * 0.82 + state.seed) * state.config.bobAmplitude;
    const cardTiltX = state.currentY * -3.6;
    const cardTiltY = state.currentX * 4.4;
    const sheenOffset = state.currentX * 18;
    const glowOpacity = 0.16 + (Math.abs(state.currentX) * 0.05) + (state.hover ? 0.04 : 0);
    const stageShift = (state.currentY * -2.5) + (idleLift * 48);

    state.card.style.setProperty("--fleet-card-tilt-x", `${cardTiltX.toFixed(2)}deg`);
    state.card.style.setProperty("--fleet-card-tilt-y", `${cardTiltY.toFixed(2)}deg`);
    state.card.style.setProperty("--fleet-sheen-offset", `${sheenOffset.toFixed(2)}px`);
    state.card.style.setProperty("--fleet-glow-opacity", glowOpacity.toFixed(2));
    state.card.style.setProperty("--fleet-stage-shift", `${stageShift.toFixed(2)}px`);

    state.rig.position.y = state.config.yOffset + idleLift;
    state.rig.position.x = state.config.xOffset + (state.currentX * 0.14);
    state.rig.position.z = state.config.zOffset + (state.currentY * 0.04);
    state.rig.rotation.x = state.config.rotationX + idleLift * 0.35 + (state.currentY * state.config.hoverPitch);
    state.rig.rotation.y = state.config.rotationY + idleDrift + (state.currentX * state.config.hoverYaw);
    state.rig.rotation.z = state.config.rotationZ + (state.currentX * -0.035);
}

function renderFleet(master, states) {
    if (master.width === 0 || master.height === 0) {
        return;
    }

    master.renderer.clear();
    master.renderer.setScissorTest(true);

    states.forEach((state) => {
        if (!state.isVisible || state.viewportWidth === 0 || state.viewportHeight === 0) {
            return;
        }

        const left = Math.round(state.viewportLeft);
        const bottom = Math.round(master.height - state.viewportTop - state.viewportHeight);
        const width = Math.round(state.viewportWidth);
        const height = Math.round(state.viewportHeight);

        master.renderer.setViewport(left, bottom, width, height);
        master.renderer.setScissor(left, bottom, width, height);
        master.renderer.clearDepth();
        master.renderer.render(state.scene, state.camera);
    });

    master.renderer.setScissorTest(false);
}

function lerp(start, end, alpha) {
    return start + ((end - start) * alpha);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
