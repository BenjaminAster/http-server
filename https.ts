
/* 
deno run --unstable --allow-net --allow-read https.ts
*/

// https://regery.com/en/security/ssl-tools/self-signed-certificate-generator

// const server = Deno.serve({
// 	port: 443,
// 	hostname: "localhost",
// 	onListen({ hostname, port }) {
// 		console.log(``);
// 	},
// 	cert: await Deno.readTextFile("./cert.txt"),
// 	key: await Deno.readTextFile("./key.txt"),
// }, (request, info) => {
// 	return new Response([
// 		`<!DOCTYPE html>`,
// 		`<meta charset="UTF-8" />`,
// 		`<meta name="color-scheme" content="dark" />`,
// 		`<style> :root { font-family: sans-serif } </style>`,
// 		`Hello World!`,
// 	].join("\n"), {
// 		headers: {
// 			"Content-Type": "text/html; charset=utf-8",
// 			"Access-Control-Allow-Origin": "*",
// 			"Access-Control-Allow-Private-Network": "true",
// 		},
// 		status: 200,
// 	});
// });


import mediaTypes from "./mimeTypes.ts";

Deno.serve({
	port: 443,
	hostname: "localhost",
	onListen({ hostname, port }) {
		console.log(``);
	},
	cert: await Deno.readTextFile(new URL(import.meta.resolve("./cert.txt"))),
	key: await Deno.readTextFile(new URL(import.meta.resolve("./key.txt"))),
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
