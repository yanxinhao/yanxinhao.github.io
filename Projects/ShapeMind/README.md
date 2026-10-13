# ShapeMind project page

Self-contained static project page for GitHub Pages. All scripts, mesh data, figures, and reference images are local; no build step or inference service is needed by visitors.

## Preview

From `yanxinhao.github.io`:

```sh
python -m http.server 8765
```

Open `http://localhost:8765/Projects/ShapeMind/`. Use HTTP rather than opening `index.html` with `file://`, since the 3D viewers fetch JSON.

## Contents

- Two motion groups: ten author-selected articulated PhysX-Bench examples (kitchen faucet, wasp drone, woven basket, pet carrier, Hummer H2, skateboard, sports sunglasses, toilet with seat, faucet assembly, MK2 grenade): RGB reference, actual ShapeVLM T2 voxels, and Semantic PartGen meshes. Meshes and voxels share predicted joints and synchronized cameras/playback. Six PartNet-Mobility cabinets (41086, 45135, 45162, 45219, 45235, 45575) form a separate dataset selector, preserving the requested revised-near/exp8 ck8000 settings. This is kinematic playback, not a physical simulation.
- Six original Blender gallery meshes (expressive robot, robotic hand, expedition camper, traditional pavilion, industrial arm, mechanical walker) with semantic colors, original triangle wireframes, clay shading, and exploded views. The existing 32-part robotic hand additionally has a 15-joint open/grasp animation, interactive controls, animated GLB and MP4 downloads. No hand geometry was regenerated.
- Three selected agent examples, in display order: service humanoid, folding-wing aircraft, and industrial robot arm. Generated reference image → agent-authored semantic labels/shape captions/normalized 3D boxes → actual Semantic PartGen output → agent-authored articulation fitted to the generated meshes. Each includes a base64-free request, original GLB, and animated GLB. These examples bypass ShapeVLM; the mesh generator does not predict their rigs.
- Supplied teaser and method overview, with Figure 2 displayed directly in the overview.

## Sources and editing

`index.html` holds copy, `style.css` layout, `viewer.js` shared-context rendering, and `app.js` controls. Manifests under `assets/motion`, `assets/geometry`, and `assets/agents` identify the examples and counts. Agent provenance contains generation facts without internal service addresses or filesystem paths.

Research text and metrics: `Formatting_Instructions_for_ICLR_2027_Conference_Submissions_v4/sections/{01_new_abstract,04_method,05_experiments_new}.tex`.

Motion source: `iclr2027/results/physx-bench/final58_render_package_20260921_211216/viewer_assets/`, exact per-object combinations in `assets/motion/manifest.json`: nine `ck16000_30w72` and one `ck8000_physx24`. The order and checkpoint pairings follow the author’s 2026-10-12 selection; reproduce the export with `blender_workspace/shapemind_homepage/scripts/curate_motion_20261012.py`. The predicted voxels come from `prediction_voxel_file`, not a voxelization of the generated mesh. Coordinate conversion is shared with the original `train_data_motion.js`; no extra half-voxel offset is added.

PartNet-Mobility sources: `StereoLM/reports/benchmark_assets/pm66_lazy_20260919/` and `pm66_smart24/`. The selected semantic IDs are mapped to the benchmark motion groups. PM mesh vertices are shifted by +0.5 voxel to align their cell-boundary convention with the T2/T1 coordinate frame; the source benchmark instead offsets mesh joint origins by -0.5. Mesh faces, voxel coordinates, joint axes/ranges and hierarchy are preserved. The reproducible adapter is `blender_workspace/shapemind_homepage/scripts/export_mobility_motion.py`.

Gallery source: `blender_workspace/all_ours_compact_realwire.blend`. Collection IDs and original triangle counts are in the gallery manifest. Only common centering/scaling and the Blender Z-up → browser Y-up transformation are applied. Display colors are for semantic readability, not textures. Source checkpoints differ across the supplied gallery and are recorded in collection names.

New source assets, input prompts, requests, output evidence, Blender scenes, reproducible export scripts, QA screenshots, and the teaser animation live in `blender_workspace/shapemind_homepage/` outside the website repository. GLBs are the actual model outputs; browser JSON applies one common normalization per object and preserves topology.

## Remaining publication metadata

The author list, affiliations, project-leader and corresponding-author notes match the author-confirmed manuscript. Xinhao Yan links to his personal homepage. Add the arXiv identifier, paper-download link, and code-release link when available.

## Articulation provenance

PhysX-Bench pairs retain the original predicted joints and ranges. The featured hand and three displayed agent examples use authored kinematic bindings, with pivots aligned to generated geometry. Motion is illustrative kinematic playback without collision/contact simulation. Original generated topology is preserved; models retain their generation imperfections. First-iteration lamp/cabinet/cart examples remain archived outside the active page.

Third-party library notices are in `assets/vendor/`. Reduced-motion preferences disable automatic motion playback. Geometry panels load on demand and share one WebGL context.
