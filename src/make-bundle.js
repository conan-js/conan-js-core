const { promisify } = require("util")
const fs = require("fs")
const path = require("path")
const rollup = require("rollup")
const uglifyEs = require("uglify-es")
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const packageName = "main"
const srcPath = __dirname
const compiledPath = path.join(__dirname, "./dist/lib")
const distNpmPath = path.join(__dirname, "./dist/lib")
async function build() {
    let bundle = await rollup.rollup({
        input: path.join(compiledPath, "index.js"),
    })
    console.log(bundle.watchFiles);
    let outputOptions = {
        file: path.join(compiledPath, "bundle.js"),
        format: "cjs",
        sourcemap: false,
    };
    let { code: bundleFileName } = await bundle.write(outputOptions)
    console.log(bundleFileName)

    const codeText = (await readFile(path.join(compiledPath, "bundle.js"), "utf-8"))
    let minified = uglifyEs.minify(codeText)
    if (minified.error)
        throw minified.error
    await writeFile(path.join(distNpmPath, `${packageName}.min.js`), minified.code)
    await writeFile(path.join(distNpmPath, `${packageName}.d.ts`), await makeDefinitionsCode())
}
async function makeDefinitionsCode() {
    let defs = [
        "// -- Usage definitions --",
        removeLocalImportsExports((await readFile(path.join(srcPath, "exported-definitions.d.ts"), "utf-8")).trim()),
        "// -- Driver definitions --",
        //removeLocalImportsExports((await readFile(path.join(srcPath, "driver-definitions.d.ts"), "utf-8")).trim()),
        "// -- Entry point definition --",
        removeSemicolons(
            removeLocalImportsExports((await readFile(path.join(compiledPath, "index.d.ts"), "utf-8")).trim()),
        )
    ]
    return defs.join("\n\n")
}
function removeLocalImportsExports(code) {
    let localImportExport = /^\s*(import|export) .* from "\.\/.*"\s*;?\s*$/
    return code.split("\n").filter(line => {
        return !localImportExport.test(line)
    }).join("\n").trim()
}
function removeSemicolons(code) {
    return code.replace(/;/g, "")
}
build().then(() => {
    console.log("done")
}, err => console.log(err.message, err.stack))
