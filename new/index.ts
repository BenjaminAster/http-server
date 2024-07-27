
/* 
node --experimental-strip-types --experimental-default-type=module index.ts
*/

import * as HTTP from "node:http";
import * as HTTP2 from "node:http2";
import * as HTTPS from "node:https";
import * as FS from "node:fs/promises";
import * as Path from "node:path";

import mimeTypes from "./mimeTypes.ts";

mimeTypes[".md"] = "text/html;charset=utf-8";

const server = HTTP.createServer({}, async (request, response) => {
	const originalPathname = new URL(request.url, "http://a").pathname;
	let pathname = global.decodeURIComponent(originalPathname);
	if (pathname.endsWith("/")) pathname += "index.html";
	const path = Path.join(process.cwd(), pathname);

	console.log(request.method, originalPathname, `HTTP/${request.httpVersion}`);
	for (const [header, value] of Object.entries(request.headers)) {
		console.log(`${header}:`, value);
	}
	console.log("%c" + "-".repeat(60), "color: lime;");

	let fileExists = false;
	try {
		await FS.access(path, FS.constants.R_OK);
		fileExists = true;
	} catch { };

	if (fileExists) {
		const fileExtension = path.match(/\.[a-z]+$/)?.[0];
		const contentType = mimeTypes[fileExtension] ?? `text/${fileExtension?.slice(1) || "plain"};charset=utf-8`;
		response.writeHead(200, {
			"content-type": contentType,
			"access-control-allow-origin": "*",
			"access-control-allow-private-network": "true",
		});
		response.write(await FS.readFile(path));
		response.end();
	} else {
		response.writeHead(404, {
			"content-type": "text/html;charset=utf-8",
			"access-control-allow-origin": "*",
			"access-control-allow-private-network": "true",
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
});

server.listen({
	port: 80,
	host: "localhost",
});
