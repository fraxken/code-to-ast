#!/usr/bin/env node
"use strict";

require("make-promises-safe");

// Require Node.js Dependencies
const { join, extname } = require("path");
const { existsSync, readFileSync } = require("fs");

// Require Third-party Dependencies
const sade = require("sade");
const meriyah = require("meriyah");
const prettyJSON = require("prettyjson");
const { walk } = require("estree-walker");
const kleur = require("kleur");
const qoa = require("qoa");

let isModule = false;
{
    const packagePath = join(process.cwd(), "package.json");
    if (existsSync(packagePath)) {
        const buf = readFileSync(packagePath);
        const { type = "script" } = JSON.parse(buf.toString());

        isModule = type === "module";
    }
}

sade("astgen [file]", true)
    .version("1.0.0")
    .describe("transform JavaScript code to a valid ESTree AST")
    .option("-w, --walk", "walk AST", false)
    .option("-s, --source", "source type", isModule ? "module" : "script")
    .option("-b, --beautify", "stdout the JSON in a yaml style", false)
    .action(main)
    .parse(process.argv);

async function main(file, opts) {
    console.log("");
    const fileExt = extname(file);
    const jsFilePath = join(process.cwd(), fileExt === "" ? `${file}.js` : file);
    if (!existsSync(jsFilePath)) {
        console.log(kleur.red().bold(`Unable to found any file: ${kleur.yellow().bold(jsFilePath)}`));

        return;
    }

    const buf = readFileSync(jsFilePath);
    const { body: AST } = meriyah.parse(buf.toString(), {
        module: fileExt === ".mjs" || opts.source === "module"
    });

    if (opts.walk) {
        for (const node of getASTNode(AST)) {
            console.log(opts.beautify ? prettyJSON.render(node) : kleur.white().bold(JSON.stringify(node, null, 4)));
            console.log(kleur.gray().bold("- - - - - - - - - - - - - - - - - - - - - -"));

            if (opts.walk === "step") {
                const { confirm } = await qoa.confirm({
                    query: "do you want to continue ?",
                    handle: "confirm",
                    accept: "y"
                });

                if (!confirm) {
                    process.exit(0);
                }
            }
        }
    }
    else {
        console.log(opts.beautify ? prettyJSON.render(AST) : kleur.white().bold(JSON.stringify(AST, null, 4)));
    }
}

function getASTNode(AST) {
    const nodes = [];
    walk(AST, {
        enter(node) {
            nodes.push(node);
        }
    });

    return nodes;
}
