import esbuild from "esbuild";

esbuild.build({
    entryPoints: ['./src/genIndex.ts', './src/votes.ts'],
    bundle: true,
    outdir: './dist',
    platform: 'node',
    format: 'esm',
    sourcemap: true,
    target: 'es2020',
    external: ['node:fs', 'node:path', 'node:process'],
  }).catch((x) => {
    if (x.errors) {
        console.error(x.errors);
    } else {
        console.error(x);
    }
    process.exit(1)
});
