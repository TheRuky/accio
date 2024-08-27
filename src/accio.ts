/* eslint-disable  @typescript-eslint/no-explicit-any */

type FetchFunction = typeof fetch;
type AccioHeaderValue = string | number | boolean | null | undefined;
type AccioQueryValue = string | number | boolean | null | undefined;
type AccioHeaders = Headers | Record<string, AccioHeaderValue> | [string, AccioHeaderValue][];
type AccioQuery = URLSearchParams | Record<string, AccioQueryValue | AccioQueryValue[]> | [string, AccioQueryValue | AccioQueryValue[]][];
type AccioMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type AccioResponse<T> = [T | null, HttpError | null, Response];
type AccioRequestInit = Omit<RequestInit, 'headers' | 'method' | 'body'>;
type AccioBody = RequestInit['body'] | { [key: string]: any };

const NO_BODY_METHODS: AccioMethod[] = ['GET', 'DELETE'];

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
}

type AccioInstanceOptions = AccioOptions & {
  headers: Headers;
  query: URLSearchParams;
}

export interface HttpError extends Error {
  status: number;
  statusText: string;
  data: any;
}

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
      if(value == null) {
        return;
      }

      parsed.append(key, value.toString());
    });

    return parsed;
  }

  Object.entries(headers).forEach(([key, value]) => {
    if(value == null) {
      return;
    }

    parsed.append(key, value.toString());
  });

  return parsed;
}

const parseQuery = (query: AccioQuery) => {
  if (query instanceof URLSearchParams) {
    return query;
  }

  const parsed = new URLSearchParams();

  if (Array.isArray(query)) {
    query.forEach(([key, value]) => {
      if(value == null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(v => {
          if(v == null) {
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
    if(value == null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(v => {
        if(v == null) {
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

const isBodyTypeAllowed = (body: AccioBody): body is RequestInit['body'] => {
  if(typeof body === 'string') {
    return true;
  }

  return [
    'ArrayBuffer',
    'Blob',
    'DataView',
    'File', 
    'FormData', 
    'URLSearchParams'
  ].some((type) => body instanceof ((globalThis || window) as any)[type]);
}

const ff = (f?: FetchFunction) => f || fetch;

const request = (options: AccioInstanceOptions) => {
  const url = new URL(options.url, options.base || undefined) + (options.query.size ? `?${options.query}` : '');
  const body = options.body && NO_BODY_METHODS.includes(options.method) ? undefined : (isBodyTypeAllowed(options.body) ? options.body : JSON.stringify(options.body));

  const promise = ff(options.fetch)(url, {
    method: options.method,
    headers: options.headers,
    body,
    ...options.config,
  });

  if(options.delay) {
    return new Promise<Response>((resolve) => setTimeout(() => resolve(promise), options.delay));
  }

  return promise;
}

const to = async <T>(response: Response, body: Promise<T>): Promise<AccioResponse<T>> => {
  const clone = response.clone();
  
  if(!response.ok) {
    try {
      return [null, new HttpError(response.status, response.statusText, await body), clone];
    } catch (error) {
      return [null, new HttpError(0, 'Unknown Error', error), clone];
    }
  }

  try {
    return [await body, null, clone];
  } catch (error) {
    return [null, new HttpError(0, 'Unknown Error', error), clone];
  }
}

class Accio {
  #options!: AccioInstanceOptions;
  #immutable!: boolean;

  constructor(options: Partial<AccioOptions>, immutable = false) {
    this.#immutable = immutable;
    this.#options = {} as AccioInstanceOptions;
    
    this.#options.url = options.url || '';
    this.#options.base = options.base || '';
    this.#options.headers = parseHeaders(options.headers || {});
    this.#options.query = parseQuery(options.query || {});
    this.#options.fetch = ff(options.fetch);
    this.#options.method = options.method || 'GET';
    this.#options.body = options.body || undefined;
    this.#options.config = options.config || {};
    this.#options.delay = options.delay || 0;
  }

  config(config: Partial<AccioRequestInit>) {
    const mix = { ...this.#options.config, ...config };

    if(this.#immutable) {
      return new Accio({ ...this.#options, config: mix });
    }

    this.#options.config = mix;
    return this;
  }

  delay(ms: number) {
    if(this.#immutable) {
      return new Accio({ ...this.#options, delay: ms });
    }

    this.#options.delay = ms;
    return this;
  }

  base(base: string) {
    if(this.#immutable) {
      return new Accio({ ...this.#options, base });
    }
    
    this.#options.base = base;
    return this;
  }

  url(url: string) {
    if(this.#immutable) {
      return new Accio({ ...this.#options, url });
    }

    this.#options.url = url;
    return this;
  }

  fetch(fetch: FetchFunction) {
    if(this.#immutable) {
      return new Accio({ ...this.#options, fetch });
    }

    this.#options.fetch = fetch;
    return this;
  }

  headers(value: AccioHeaders) {
    if(this.#immutable) {
      return new Accio({ ...this.#options, headers: value });
    }

    this.#options.headers = parseHeaders(value);
    return this;
  }

  body(value: AccioBody) {
    if(this.#immutable) {
      return new Accio({ ...this.#options, body: value });
    }

    this.#options.body = value;
    return this;
  }

  query(value: AccioQuery) {
    if(this.#immutable) {
      return new Accio({ ...this.#options, query: value });
    }

    this.#options.query = parseQuery(value);
    return this;
  }

  get() {
    if(this.#immutable) {
      return new Accio({ ...this.#options, method: 'GET' });
    }

    this.#options.method = 'GET';
    return this;
  }

  post(body?: AccioBody) {
    if(body === undefined) {
      body = this.#options.body;
    }

    if(this.#immutable) {
      return new Accio({ ...this.#options, body, method: 'POST' });
    }

    this.#options.body = body;
    this.#options.method = 'POST';

    return this;
  }

  put(body?: AccioBody) {
    if(body === undefined) {
      body = this.#options.body;
    }

    if(this.#immutable) {
      return new Accio({ ...this.#options, body, method: 'PUT' });
    }

    this.#options.body = body;
    this.#options.method = 'PUT';
    
    return this;
  }

  patch(body?: AccioBody) {
    if(body === undefined) {
      body = this.#options.body;
    }

    if(this.#immutable) {
      return new Accio({ ...this.#options, body, method: 'PATCH' });
    }

    this.#options.body = body;
    this.#options.method = 'PATCH';
    
    return this;
  }

  delete() {
    if(this.#immutable) {
      return new Accio({ ...this.#options, method: 'DELETE' });
    }

    this.#options.method = 'DELETE';
    return this;
  }

  async response() {
    return request(this.#options);
  }

  async json<T = any>() {
    return request(this.#options).then(res => to(res, res.json() as Promise<T>));
  }

  async arrayBuffer() {
    return request(this.#options).then(res => to(res, res.arrayBuffer()));
  }

  async blob() {
    return request(this.#options).then(res => to(res, res.blob()));
  }

  async formData() {
    return request(this.#options).then(res => to(res, res.formData()));
  }

  async text() {
    return request(this.#options).then(res => to(res, res.text()));
  }

  debug() {
    return this.#options;
  }
}

function accio(url: string, options?: Partial<Omit<AccioOptions, 'url'>>, immutable = false) {
  return new Accio({ ...options, url }, immutable);
}

accio.create = (options: Partial<AccioOptions>, immutable = true) => {
  return (url?: string) => new Accio({ ...options, url }, immutable);
}

export { accio };