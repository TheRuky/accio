/**
 * @name accio
 * @license MIT
 * @version 1.0.0-alpha
 */

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Helper type for the `fetch` function definition.
 */
type FetchFunction = typeof fetch;

/**
 * Header values. All get converted to strings.
 */
type AccioHeaderValue = string | number | boolean | null | undefined;

/**
 * Query values. All get converted to strings.
 */
type AccioQueryValue = string | number | boolean | null | undefined;

/**
 * Header prop types.
 */
type AccioHeaders = Headers | Record<string, AccioHeaderValue> | [string, AccioHeaderValue][];

/**
 * Query prop types.
 */
type AccioQuery =
	| URLSearchParams
	| Record<string, AccioQueryValue | AccioQueryValue[]>
	| [string, AccioQueryValue | AccioQueryValue[]][];

/**
 * HTTP methods.
 */
type AccioMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Response format types.
 */
type AccioResponse<T> = [T | null, HttpError | null, Response];

/**
 * Additional options for the `fetch` function that are not part of the Accio API.
 */
type AccioRequestInit = Omit<RequestInit, 'headers' | 'method' | 'body'>;

/**
 * Extend `fetch` body type with an object.
 */
type AccioBody = RequestInit['body'] | { [key: string]: any };

/**
 * Native fetch response types.
 */
type AccioResponseType = 'json' | 'arrayBuffer' | 'blob' | 'formData' | 'text';

/**
 * Progress event type.
 */
type AccioProgressEvent = {
	size: number;
	loaded: number;
	total: number;
	percent: number;
	done: boolean;
	timestamp: number;
};

/**
 * Progress event handlers.
 */
type AccioProgress = Partial<{
	next: (event: AccioProgressEvent) => void;
	done: (event: AccioProgressEvent) => void;
	error: (error: Error) => void;
}>;

/**
 * Accio options.
 */
type AccioOptions = {
	url: string;
	base: string;
	headers: AccioHeaders;
	query: AccioQuery;
	fetch: FetchFunction;
	method: AccioMethod;
	body: AccioBody;
	config: AccioRequestInit;
	delay: number;
	progress: AccioProgress | null;
};

/**
 * Accio instance options, i.e. parsed Accio options.
 */
type AccioInstanceOptions = AccioOptions & {
	headers: Headers;
	query: URLSearchParams;
};

/**
 * HTTP methods that do not allow a body.
 */
const NO_BODY_METHODS: AccioMethod[] = ['GET', 'DELETE'];

/**
 * Custom error class for HTTP errors.
 */
export class HttpError extends Error {
	status = 0;
	statusText = 'Unknown Error';
	data: any;

	constructor(status: number, statusText: string, data: any = null) {
		super(`${status} ${statusText}`.trim());

		this.status = status;
		this.statusText = statusText;
		this.data = data;
	}
}

const parseHeaders = (headers: AccioHeaders) => {
	if (headers instanceof Headers) {
		return headers;
	}

	const parsed = new Headers();

	if (Array.isArray(headers)) {
		headers.forEach(([key, value]) => {
			if (value == null) {
				return;
			}

			parsed.append(key, value.toString());
		});

		return parsed;
	}

	Object.entries(headers).forEach(([key, value]) => {
		if (value == null) {
			return;
		}

		parsed.append(key, value.toString());
	});

	return parsed;
};

const parseQuery = (query: AccioQuery) => {
	if (query instanceof URLSearchParams) {
		return query;
	}

	const parsed = new URLSearchParams();

	if (Array.isArray(query)) {
		query.forEach(([key, value]) => {
			if (value == null) {
				return;
			}

			if (Array.isArray(value)) {
				value.forEach((v) => {
					if (v == null) {
						return;
					}

					parsed.append(key, v.toString());
				});

				return;
			}

			parsed.append(key, value.toString());
		});

		return parsed;
	}

	Object.entries(query).forEach(([key, value]) => {
		if (value == null) {
			return;
		}

		if (Array.isArray(value)) {
			value.forEach((v) => {
				if (v == null) {
					return;
				}

				parsed.append(key, v.toString());
			});

			return;
		}

		parsed.append(key, value.toString());
	});

	return parsed;
};

const isFetchBodyTypeAllowed = (body: AccioBody): body is RequestInit['body'] => {
	if (typeof body === 'string') {
		return true;
	}

	return ['ArrayBuffer', 'Blob', 'DataView', 'File', 'FormData', 'URLSearchParams'].some(
		(type) => body instanceof ((globalThis || window) as any)[type]
	);
};

const isXhrBodyTypeAllowed = (
	body: AccioBody
): body is Document | XMLHttpRequestBodyInit | null => {
	if (body == null) {
		return true;
	}

	if (typeof body === 'string') {
		return true;
	}

	return ['ArrayBuffer', 'Blob', 'Document', 'FormData', 'URLSearchParams'].some(
		(type) => body instanceof ((globalThis || window) as any)[type]
	);
};

const parseXhrResponseHeaders = (xhr: XMLHttpRequest): Headers => {
	const headers = new Headers();

	xhr
		.getAllResponseHeaders()
		.split('\r\n')
		.forEach((header) => {
			const [key, value] = header.split(': ');

			if (key && value) {
				headers.append(key, value);
			}
		});

	return headers;
};

const ff = (f?: FetchFunction) => f || fetch;

const parseUrl = (options: AccioInstanceOptions) =>
	new URL(options.url, options.base || undefined) + (options.query.size ? `?${options.query}` : '');

const parseFetchBody = (options: AccioInstanceOptions) => {
	if (NO_BODY_METHODS.includes(options.method)) {
		return undefined;
	}

	if (isFetchBodyTypeAllowed(options.body)) {
		return options.body;
	}

	return JSON.stringify(options.body);
};

const parseXhrBody = (options: AccioInstanceOptions) => {
	if (NO_BODY_METHODS.includes(options.method)) {
		return null;
	}

	if (isXhrBodyTypeAllowed(options.body)) {
		return options.body;
	}

	return JSON.stringify(options.body);
};

const fetchRequest = (options: AccioInstanceOptions) => {
	const url = parseUrl(options);
	const body = parseFetchBody(options);

	const promise = ff(options.fetch)(url, {
		method: options.method,
		headers: options.headers,
		body,
		...options.config
	}).then((response) => {
		if (!options.progress || !response.body) {
			return response;
		}

		const reader = response.body.getReader();

		if (!reader) {
			return response;
		}

		let loaded = 0;

		const stream = new ReadableStream({
			start(controller) {
				const read = () => {
					reader
						.read()
						.then(({ done, value }) => {
							if (done) {
								controller.close();

								options.progress?.done?.({
									size: 0,
									loaded,
									total: loaded,
									percent: 100,
									done: true,
									timestamp: Date.now()
								});

								return;
							}

							loaded += value.byteLength;

							controller.enqueue(value);
							options.progress?.next?.({
								size: value.byteLength,
								loaded,
								total: 0,
								percent: 0,
								done: false,
								timestamp: Date.now()
							});

							read();
						})
						.catch((error) => {
							controller.error(error);
							options.progress?.error?.(error);
						});
				};

				read();
			}
		});

		return new Response(stream);
	});

	if (options.delay) {
		return new Promise<Response>((resolve) => setTimeout(() => resolve(promise), options.delay));
	}

	return promise;
};

// Used only when `progress` is defined.
const xhrRequest = (options: AccioInstanceOptions, type: AccioResponseType): Promise<Response> => {
	return new Promise<Response>((resolve) => {
		const xhr = new XMLHttpRequest();
		const body = parseXhrBody(options);

		xhr.responseType =
			type === 'json' ? 'text' : (type.toLowerCase() as XMLHttpRequestResponseType);

		let size = 0;

		xhr.onreadystatechange = () => {
			if (xhr.readyState !== XMLHttpRequest.DONE) {
				return;
			}

			const response =
				!xhr.responseType || xhr.responseType === 'text' ? xhr.responseText : xhr.response;

			resolve(
				new Response(response, {
					status: xhr.status,
					statusText: xhr.statusText,
					headers: parseXhrResponseHeaders(xhr)
				})
			);
		};

		xhr.upload.onprogress = (event) => {
			const loaded = event.loaded;
			const total = event.total;
			const percent = Math.round((loaded / total) * 100);

			options.progress?.next?.({
				size: loaded - size,
				loaded,
				total,
				percent,
				done: false,
				timestamp: Date.now()
			});

			size = loaded;
		};

		xhr.upload.onloadend = (event) => {
			options.progress?.done?.({
				size: 0,
				loaded: event.loaded,
				total: event.total,
				percent: 100,
				done: true,
				timestamp: Date.now()
			});
		};

		xhr.open(options.method, parseUrl(options), true);
		xhr.send(body);
	});
};

const request = async <T = any>(
	options: AccioInstanceOptions,
	type: AccioResponseType
): Promise<AccioResponse<T>> => {
	if (options.progress && !NO_BODY_METHODS.includes(options.method)) {
		return xhrRequest(options, type).then((response) => to(response.clone(), response[type]()));
	}

	return fetchRequest(options).then((response) => to(response.clone(), response[type]()));
};

const to = async <T>(response: Response, body: Promise<T>): Promise<AccioResponse<T>> => {
	if (!response.ok) {
		try {
			return [null, new HttpError(response.status, response.statusText, await body), response];
		} catch (error) {
			return [null, new HttpError(0, 'Unknown Error', error), response];
		}
	}

	// 204 No Content
	if (response.status === 204) {
		return [null, null, response];
	}

	try {
		return [await body, null, response];
	} catch (error) {
		return [null, new HttpError(0, 'Unknown Error', error), response];
	}
};

class Accio {
	private options!: AccioInstanceOptions;
	private immutablle!: boolean;

	constructor(options: Partial<AccioOptions>, immutable = false) {
		this.immutablle = immutable;
		this.options = {} as AccioInstanceOptions;

		this.options.url = options.url || '';
		this.options.base = options.base || '';
		this.options.headers = parseHeaders(options.headers || {});
		this.options.query = parseQuery(options.query || {});
		this.options.fetch = ff(options.fetch);
		this.options.method = options.method || 'GET';
		this.options.body = options.body || undefined;
		this.options.config = options.config || {};
		this.options.delay = options.delay || 0;
		this.options.progress = options.progress || null;
	}

	config(config: Partial<AccioRequestInit>) {
		const mix = { ...this.options.config, ...config };

		if (this.immutablle) {
			return new Accio({ ...this.options, config: mix });
		}

		this.options.config = mix;
		return this;
	}

	delay(ms: number) {
		if (this.immutablle) {
			return new Accio({ ...this.options, delay: ms });
		}

		this.options.delay = ms;
		return this;
	}

	base(base: string) {
		if (this.immutablle) {
			return new Accio({ ...this.options, base });
		}

		this.options.base = base;
		return this;
	}

	url(url: string) {
		if (this.immutablle) {
			return new Accio({ ...this.options, url });
		}

		this.options.url = url;
		return this;
	}

	fetch(fetch: FetchFunction) {
		if (this.immutablle) {
			return new Accio({ ...this.options, fetch });
		}

		this.options.fetch = fetch;
		return this;
	}

	headers(value: AccioHeaders) {
		if (this.immutablle) {
			return new Accio({ ...this.options, headers: value });
		}

		this.options.headers = parseHeaders(value);
		return this;
	}

	body(value: AccioBody) {
		if (this.immutablle) {
			return new Accio({ ...this.options, body: value });
		}

		this.options.body = value;
		return this;
	}

	progress(handler: AccioProgress) {
		if (this.immutablle) {
			return new Accio({ ...this.options, progress: handler });
		}

		this.options.progress = handler;
		return this;
	}

	query(value: AccioQuery) {
		if (this.immutablle) {
			return new Accio({ ...this.options, query: value });
		}

		this.options.query = parseQuery(value);
		return this;
	}

	get() {
		if (this.immutablle) {
			return new Accio({ ...this.options, method: 'GET' });
		}

		this.options.method = 'GET';
		return this;
	}

	post(body?: AccioBody) {
		if (body === undefined) {
			body = this.options.body;
		}

		if (this.immutablle) {
			return new Accio({ ...this.options, body, method: 'POST' });
		}

		this.options.body = body;
		this.options.method = 'POST';

		return this;
	}

	put(body?: AccioBody) {
		if (body === undefined) {
			body = this.options.body;
		}

		if (this.immutablle) {
			return new Accio({ ...this.options, body, method: 'PUT' });
		}

		this.options.body = body;
		this.options.method = 'PUT';

		return this;
	}

	patch(body?: AccioBody) {
		if (body === undefined) {
			body = this.options.body;
		}

		if (this.immutablle) {
			return new Accio({ ...this.options, body, method: 'PATCH' });
		}

		this.options.body = body;
		this.options.method = 'PATCH';

		return this;
	}

	delete() {
		if (this.immutablle) {
			return new Accio({ ...this.options, method: 'DELETE' });
		}

		this.options.method = 'DELETE';
		return this;
	}

	async json<T = any>() {
		return request<T>(this.options, 'json');
	}

	async arrayBuffer() {
		return request<ArrayBuffer>(this.options, 'arrayBuffer');
	}

	async blob() {
		return request<Blob>(this.options, 'blob');
	}

	async formData() {
		return request<FormData>(this.options, 'formData');
	}

	async text() {
		return request<string>(this.options, 'text');
	}
}

function accio(url: string, options?: Partial<Omit<AccioOptions, 'url'>>, immutable = false) {
	return new Accio({ ...options, url }, immutable);
}

accio.create = (options: Partial<AccioOptions>, immutable = true) => {
	return (url?: string) => new Accio({ ...options, url }, immutable);
};

export { accio };
