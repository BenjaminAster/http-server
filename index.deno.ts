
/*

deno run --unstable --allow-net --allow-read index.deno.ts

*/

import mediaTypes from "./mimeTypes.ts";

const firebaseConfig: { [key: string]: any } = JSON.parse(await Deno.readTextFile(new URL(import.meta.resolve("../../firebase.json"))));
const hostingConfig: { [key: string]: any } = firebaseConfig.hosting;

const publicDir = globalThis.decodeURIComponent(new URL("../", import.meta.url).href);

enum ResTypes {
	basic,
	redirect,
	rewrite,
};

Deno.serve({ port: 80 }, async (request: Request) => {
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
			let filePath: string = globalThis.decodeURIComponent(new URL("." + (destination || pathname), publicDir).href);
			if (filePath.endsWith("/")) {
				filePath += "index.html";
			}
			return [filePath, ResTypes.basic];
		}
	})();

	switch (type) {
		case (ResTypes.basic): case (ResTypes.rewrite): {
			const response = await (async () => {
				try {
					const fileExtension = path.match(/\.[a-z]+$/)?.[0];
					return new Response(await Deno.readFile(new URL(path)), {
						status: 200,
						headers: new Headers({
							"Content-Type": mediaTypes[fileExtension] ?? `text/${fileExtension?.match(/\.(?<end>\w+$)/)?.groups?.end || "plain"}; charset=utf-8`,
							// "Access-Control-Allow-Origin": "*",
							// "Access-Control-Allow-Private-Network": "true",
							// "Cross-Origin-Opener-Policy": "same-origin",
							// "Cross-Origin-Embedder-Policy": "require-corp",
						}),
					});
				} catch (err) {
					if (!pathname.endsWith("/") && await (async () => {
						try {
							console.log(path, pathname)
							return await Deno.readFile(new URL(`${path}/index.html`));
						} catch { }
					})()) {
						return new Response("", {
							status: 302,
							headers: new Headers({
								"Location": pathname + "/",
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
								"Content-Type": "text/html; charset=utf-8",
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
});

globalThis.setTimeout(() => console.log("http://localhost/"), 100)

export { };
