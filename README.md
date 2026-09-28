# AR / VR Comparison

An educational 3D comparison of **VR Glasses**, **XREAL AURA** and **Quest 3**: display field of view, frame occlusion and prescription inserts in a shared scene.

[Open the comparison](https://human-agent65535.github.io/AR-VR-comparison/?mode=split) · [Try WebXR on Quest](https://human-agent65535.github.io/AR-VR-comparison/headset.html)

## What you can explore

- Compare devices in a Manhattan-style apartment, with daytime, dusk and night lighting.
- Switch between cinema, Earth Explorer, a workspace and visual targets.
- Explore FOV overlays, lens tint, frame occlusion, myopia and astigmatism demonstrations.
- Use drag controls or supported mobile motion sensors.
- Enter WebXR on a compatible headset, with controller and hand input. The Quest baseline retains its native per-eye projection; simulated windows share an angular scale.
- Switch between English and Chinese. English is the default.

This simulator is **educational only**. Device boundaries, optical effects and some FOV conversions include explicitly labeled assumptions. AURA's derived horizontal/vertical field is not a confirmed optical measurement, and binocular overlap is not reconstructed. Physical fit, eyebox and real lens distortion cannot be validated from this simulation.

A window can feel smaller in a browser overview and larger inside a Quest because the canvas framing and the host headset's visible field differ. The target angles do not grow with that change in feel.

The web preview uses one full **fixed-gaze monocular field**, including peripheral vision, not a sweep obtained by turning the eye. A thin blue-grey outline in the Quest preview marks this reference separately from the device display FOV. Estimated sunglasses and fabric surrounds stay independent of the display FOV and are not shrunk to fit the Quest host view.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run build
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:8080/`. A remote phone or headset needs an HTTPS URL for supported motion/WebXR features. GitHub Pages provides the public HTTPS build.

```sh
npm run check
npm test
```

## GitHub Pages

Pushes to `main` run the workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml). It checks the source, runs core tests, builds `dist-pages/` and publishes only the static runtime assets. Pages must use **GitHub Actions** as its publishing source.

To verify the same build locally:

```sh
npm run build:pages
npm run check:pages
```

This public project has **no diagnostic log panel, log upload code or backend service**. Adding `?log=1` does not enable logging. It requires no Docker container, tunnel or application credentials.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/` | Three.js scenes, optics, input, language and device assumptions |
| `public/` | HTML, styles and runtime image assets |
| `tests/` | Core geometry, display, input and UI logic tests |
| `scripts/` | Source and static-release checks |
| `build.mjs` | Browser bundles and static release output |
| `.github/workflows/pages.yml` | Build and Pages deployment |

Historical versions, screenshots, debug pages, private runtime records, deployment secrets and generated build output are excluded from this repository.

Device values and sources are recorded in [`src/device-data.js`](src/device-data.js). Downloadable `parameters.json` is generated with each build.

## Third-party material

- Rendering: [Three.js](https://threejs.org/), MIT license. Its license is included in each static build as `THREE-LICENSE.txt`.
- Earth imagery: NASA Earth Observatory / Blue Marble. Fallback coastlines: Natural Earth. See [`public/EARTH-DATA-LICENSE.txt`](public/EARTH-DATA-LICENSE.txt).
- Hardware reference links retain attribution to their original publishers. Hardware models are illustrative reconstructions, not official CAD assets.
- Earth Explorer is a local demonstration, not Google Earth and does not use Google's imagery or SDK.
