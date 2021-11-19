
import {
	serve,
	ConnInfo,
} from "https://deno.land/std@0.114.0/http/server.ts";

import {
	serveFile,
} from "https://deno.land/std@0.114.0/http/file_server.ts";

/*

deno run --unstable --allow-net --allow-read index.deno.ts

*/

(async () => {
	const firebaseConfig: { [key: string]: any } = JSON.parse(await Deno.readTextFile("../../firebase.json"));
	const hostingConfig: { [key: string]: any } = firebaseConfig.hosting;

	const publicDir = "..";

	enum ResTypes {
		basic,
		redirect,
		rewrite,
	};

	console.log("Starting server...");

	serve(async (request: Request, connInfo: ConnInfo) => {
		try {
			const pathname: string = new URL(request.url).pathname;

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
					let filePath: string = `${publicDir}${destination || pathname}`;
					if (filePath.endsWith("/")) {
						filePath += "index.html";
					}
					return [filePath, ResTypes.basic];
				}
			})();

			// console.log({ request, path, type });

			switch (type) {
				case (ResTypes.basic): case (ResTypes.rewrite): {
					const response = await (async () => {
						try {
							return await serveFile(request, path);
						} catch (err) {
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
							"Location": path,
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
	}, { addr: ":80" });
})();
