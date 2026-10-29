// node optimize.mjs in.glb out.glb [size]: webp textures (optionally resized), sparse morph targets, meshopt.
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { sparse, meshopt, prune, dedup, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
const [,, input, output, size] = process.argv;
const resize = size ? [Number(size), Number(size)] : undefined;
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(input);
await doc.transform(
  // materials stay apart: founder_body and founder_hands share their textures, and the site tells them apart by name
  dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE] }),
  prune({ keepAttributes: true, keepLeaves: false }),
  sparse({ ratio: 0.2 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 88, slots: /baseColor/, resize }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 92, slots: /normal|metallicRoughness|occlusion/, resize }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(output, doc);
for (const t of doc.getRoot().listTextures()) console.log(t.getName(), t.getMimeType(), t.getSize(), t.getImage().byteLength);
