#!/usr/bin/env node

import * as HTTP from "node:http";
import * as HTTPS from "node:https";
import * as FS from "node:fs/promises";
import * as Path from "node:path";

import * as SelfSigned from "selfsigned";

import mimeTypes from "@benjaminaster/mime-types";

const cmdArgs = new Map<string, string | boolean>();
const standaloneCmdArgs: string[] = [];

{
	const cmdArgsSingleLetterAliases = {
		p: "port",
		s: "https",
	};

	for (let i = 2; i < process.argv.length; i++) {
		let arg = process.argv[i];
		if (process.argv[i + 1]?.startsWith(".")) {
			arg += process.argv[++i];
		}
		if (arg.startsWith("-")) {
			let [key, value = true] = arg.split("=");
			if (key.startsWith("--")) {
				key = key.slice(2);
			} else {
				key = key.slice(1);
				if (key in cmdArgsSingleLetterAliases) {
					key = cmdArgsSingleLetterAliases[key];
				}
			}
			cmdArgs.set(key, value);
		} else {
			standaloneCmdArgs.push(arg);
		}
	}
}

mimeTypes[".md"] = "text/html;charset=utf-8";

let useHTTPS = cmdArgs.has("https");
let port = +cmdArgs.get("port") || (useHTTPS ? 443 : 80);

let key: string, cert: string;
if (useHTTPS) {
	({ private: key, cert } = await new Promise<SelfSigned.GenerateResult>((resolve, reject) => {
		SelfSigned.generate([{ name: "commonName", value: "localhost" }], {}, (error, result) => error ? reject(error) : resolve(result))
	}));
}

let HTTPOrHTTPSModule = (useHTTPS ? HTTPS : HTTP) as typeof HTTPS;

const corsHeaders = {
	"access-control-allow-origin": "*",
	"access-control-allow-private-network": "true",
};

const server = HTTPOrHTTPSModule.createServer({ ...(useHTTPS ? { cert, key } : {}) }, async (request, response) => {
	const originalPathname = new URL(request.url, "http://a").pathname;
	let pathname = global.decodeURIComponent(originalPathname);
	if (pathname.endsWith("/")) pathname += "index.html";
	const path = Path.join(process.cwd(), pathname);

	console.log(request.method, originalPathname, `HTTP/${request.httpVersion}`);
	for (const [header, value] of Object.entries(request.headers)) {
		console.log(`${header}:`, value);
	}
	console.log("-".repeat(60));

	let fileExists = false;
	try {
		await FS.access(path, FS.constants.R_OK);
		fileExists = true;
	} catch { };

	if (fileExists) {
		const fileExtension = path.match(/\.[a-z]+$/)?.[0];
		const contentType = mimeTypes[fileExtension] ?? `text/${fileExtension?.slice(1) || "plain"};charset=utf-8`;
		response.writeHead(200, {
			...corsHeaders,
			"content-type": contentType,
		});
		response.write(await FS.readFile(path));
		response.end();
	} else {
		if (pathname === "/favicon.ico") {
			response.writeHead(200, {
				...corsHeaders,
				"content-type": "image/svg+xml;charset=utf-8",
			});
			response.write([
				`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" style="color-scheme: dark light;">`,
				`\t<polygon points="240 0, 480 240, 240 480, 0 240" fill="CanvasText" />`,
				`</svg>`,
			].join("\n"));
			response.end();
		} else {
			response.writeHead(404, {
				...corsHeaders,
				"content-type": "text/html;charset=utf-8",
			});
			response.write([
				`<!DOCTYPE html>`,
				`<meta charset="utf-8" />`,
				`<title>404 Not Found</title>`,
				`<style> :root { font-family: sans-serif; color-scheme: dark light } </style>`,
				`<h1>Error 404</h1>`,
				`<p>${pathname} was not found</p>`,
			].join("\n"));
			response.end();
		}
	}
});

console.log(`Listening at ${useHTTPS ? "https" : "http"}://localhost${cmdArgs.has("port") ? `:${port}` : ""}/ ...`);

console.log(cmdArgs.has("port"), port, useHTTPS);

server.listen({
	port,
	host: "localhost",
});

// if (useHTTPS) {
// 	const redirectionServer = HTTP.createServer({}, async (request, response) => {
// 		response.writeHead(303, {
// 			...corsHeaders,
// 			"location": new URL(new URL(request.url, "http://a").pathname, `https://localhost:${port}`).href,
// 		});
// 		response.end();
// 	});
// 	// redirectionServer.listen({
// 	// 	port: cmdArgs.has("port") ? port : 80,
// 	// 	host: "localhost",
// 	// });
// }
