import { build } from 'esbuild';
await build({ entryPoints:['src/cilindro3d.js'], bundle:true, format:'esm', minify:true, target:'es2020',
  outfile:'js/cilindro3d.min.js', nodePaths:[process.env.NODE_PATH||"node_modules"], legalComments:'eof', metafile:false });
console.log('built');
