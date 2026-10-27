// node optimize.mjs in.glb out.glb: webp textures, sparse morph targets, meshopt.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { sparse, meshopt, prune, dedup, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
const [,, input, output] = process.argv;
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(input);
await doc.transform(
  dedup(),
  prune({ keepAttributes: true, keepLeaves: false }),
  sparse({ ratio: 0.2 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 88, slots: /baseColor/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 92, slots: /normal|metallicRoughness/ }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(output, doc);
for (const t of doc.getRoot().listTextures()) console.log(t.getName(), t.getMimeType(), t.getSize(), t.getImage().byteLength);
