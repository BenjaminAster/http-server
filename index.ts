
/*

deno run --unstable --allow-net --allow-read index.ts
deno install --unstable --allow-net --allow-read --name=serve --force index.ts
deno install --unstable --allow-net --allow-read --name=serve --force --reload https://benjaminaster.com/server/index.ts

*/

import mediaTypes from "./mimeTypes.ts";

Deno.serve({
	port: 80,
	onListen({ hostname, port }) {
		console.log(`http://localhost/`);
	},
}, async (request: Request) => {
	const pathname = globalThis.decodeURIComponent(new URL(request.url).pathname);
	let path = "." + pathname;
	if (path.endsWith("/")) path += "index.html";
	console.log(pathname);

	try {
		const fileExtension = path.match(/\.[a-z]+$/)?.[0];
		return new Response(await Deno.readFile(path), {
			status: 200,
			headers: new Headers({
				"Content-Type": mediaTypes[fileExtension] ?? `text/${fileExtension?.match(/\.(?<end>\w+$)/)?.groups?.end || "plain"}; charset=utf-8`,
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Private-Network": "true",
			}),
		});
	} catch (err) {
		if (!path.endsWith("/") && await (async () => {
			try {
				return await Deno.readFile(new URL(`${path}/index.html`));
			} catch { }
		})()) {
			return new Response("", {
				status: 302,
				headers: new Headers({
					"Location": path + "/",
				}),
			});
		}

		if (pathname === "/favicon.ico") {
			const url = new URL(import.meta.resolve("./icon.svg"));
			// console.log(url, import.meta.url);
			return new Response((url.protocol === "file:") ? (await Deno.readTextFile(url)) : (await (await globalThis.fetch(url)).text()), {
				status: 200,
				headers: new Headers({
					"Content-Type": "image/svg+xml; charset=utf-8",
				}),
			});
		}

		return new Response(
			[
				`<!DOCTYPE html>`,
				`<meta charset="utf-8" />`,
				`<title>404 Not Found</title>`,
				`<style> :root { font-family: sans-serif; color-scheme: dark light } </style>`,
				`<h1>Error 404</h1>`,
				`<p>${pathname} was not found</p>`,
			].join("\n"),
			{
				status: 404,
				headers: new Headers({
					"Content-Type": "text/html; charset=utf-8",
				}),
			},
		);
	}
});

export { };
