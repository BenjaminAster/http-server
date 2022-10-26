
/// <reference no-default-lib="true" />
/// <reference lib="ESNext" />
/// <reference types="deno-types" />

// import {
// 	serve,
// 	ConnInfo,
// } from "https://deno.land/std@0.114.0/http/server.ts";

// @ts-ignore
import { serveFile } from "https://deno.land/std@0.114.0/http/file_server.ts";

// @ts-ignore
import mimeTypes from "https://deno.land/std@0.156.0/media_types/vendor/mime-db.v1.52.0.ts";

/*

deno run --unstable --allow-net --allow-read index.deno.ts

*/

// console.log(document);

const firebaseConfig: { [key: string]: any } = JSON.parse(await Deno.readTextFile(new URL("../../firebase.json", import.meta.url)));
const hostingConfig: { [key: string]: any } = firebaseConfig.hosting;

// const publicDir = new URL("../", import.meta.url).href;
// const publicDir = new URL("../", import.meta.url).pathname;
console.log(import.meta.url)
const publicDir = globalThis.decodeURIComponent(new URL("../", import.meta.url).href);
// const publicDir = globalThis.decodeURIComponent(new URL("../", import.meta.url).href).replace("file:///", "");
// const publicDir = "./";
console.log(publicDir);

enum ResTypes {
	basic,
	redirect,
	rewrite,
};

console.log("Starting server...");

Deno.serve({ port: 80 }, async (request: Request) => {
	try {
		const pathname: string = globalThis.decodeURIComponent(new URL(request.url).pathname);

		console.log(pathname);

		const [path, type] = ((): [string, ResTypes] => {

			const { redirects, rewrites }: { [key: string]: { [key: string]: string }[] } = hostingConfig;
			const redirectsAndRewrites = [
				...redirects.map((redirect): { [key: string]: any } => (
					{ ...redirect, resType: ResTypes.redirect }
				)),
				...rewrites.map((rewrite): { [key: string]: any } => (
					{ ...rewrite, resType: ResTypes.rewrite }
				)),
			];

			const [destination, type] = ((): [string, ResTypes] => {
				let { destination, resType } = redirectsAndRewrites.find(({ source, regex }) => (
					source === pathname
					||
					(regex && new RegExp(regex).exec(pathname))
				)) || {};

				if (destination?.startsWith("/__/")) {
					destination = `https://www.gstatic.com/firebasejs/${(
						destination.replace(new RegExp("^/__/firebase/"), "")
					)}`;
				}

				return [destination, resType];
			})();

			if (type === ResTypes.redirect) {
				return [destination, type];
			} else {
				let filePath: string = globalThis.decodeURIComponent(new URL("." + (destination || pathname), publicDir).href).replace("file:///", "");
				// let filePath: string = publicDir + (destination || pathname);
				if (filePath.endsWith("/")) {
					filePath += "index.html";
				}
				console.log({ filePath })
				return [filePath, ResTypes.basic];
			}
		})();

		// console.log({ request, path, type });

		switch (type) {
			case (ResTypes.basic): case (ResTypes.rewrite): {
				const response = await (async () => {
					try {
						console.log(path)
						return await serveFile(request, path);
						// return new Response(`<h2>Hello World</h2>`, {
						// 	status: 200,
						// 	headers: new Headers({
						// 		"Content-Type": "text/html;charset=utf-8",
						// 		"Color-Scheme": "dark",
						// 		"X-Color-Scheme": "dark",
						// 		"Theme-Color": "#000000",
						// 		"X-Theme-Color": "#000000",
						// 	}),
						// });
					} catch (err) {
						console.error({ error: err })
						if (!path.endsWith("/") && await (async () => {
							try {
								return await serveFile(request, path + "/index.html");
							} catch { }
						})()) {
							return new Response("", {
								status: 302,
								headers: new Headers({
									"Location": path + "/",
								}),
							});
						}

						return new Response(
							[
								`<title>404 Not Found</title>`,
								`<style> body { font-family: sans-serif } </style>`,
								`<h1>Error 404</h1>`,
								`<p>${pathname} was not found</p>`,
							].join("\n"),
							{
								status: 404,
								headers: new Headers({
									"Content-Type": "text/html;charset=utf-8",
								}),
							},
						);
					}
				})();
				return response;
				break;
			} case (ResTypes.redirect): {
				return new Response("", {
					status: 302,
					headers: new Headers({
						Location: path,
					}),
				});
				break;
			} default: {
				throw new Error("Unknown response type");
			}
		}
	} catch (err) {
		console.error(err);
		throw new Error(err);
	}
});

export { }