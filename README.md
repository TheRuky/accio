# 🪄 Accio 🔗

Accio is a [fluent interface](https://en.wikipedia.org/wiki/Fluent_interface#JavaScript) abstraction for the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

## ✨ Features

- 🧐 **Opinionated** - as it was initially written for personal use.
- 🔗 **Clean API** - intuitive, chainable, refactorable.
- 💪 **Strongly typed** - written in TypeScript.
- ✅ **Mutable or immutable** - it's your choice.
- 👌 **Small in size** - the raw `.ts` file is approx. 10kB.

## 🛠️ Installation

Just add (copy/paste) [`src/accio.ts`](https://github.com/TheRuky/accio/blob/main/src/accio.ts) file to your project. Modify it or use it as is - it's up to you. 

## 🚀 Usage

### ↔️ A basic `GET` request

```ts
import { accio } from './accio.ts';

const [data, error] = await accio('https://...').json();

console.log(data, error);
```

### ↔️ A typed JSON response

```ts
import { accio } from './accio.ts';

type Post = {
  id: number;
  title: string;
  content: string;
}

const [data, error] = await accio('https://...').json<Post[]>();

// data is not `any` anymore, but Post array

console.log(data, error);
```

## 🤨❓ FAQ

### 1. Is there an NPM package for Accio?

Currently, there is no NPM package or CDN link for Accio. The easiest way is to directly add the `accio.ts` file to your project. It's barbaric, I know, but that's how it is.

### 2. Your "library" sucks - I want better stuff!

Accio is (technically) not a library - it's literally a file. Nevertheless, take a look at the libraries that inspired Accio.

- [ky](https://github.com/sindresorhus/ky)
- [wretch](https://github.com/elbywan/wretch)
- [axios](https://github.com/axios/axios)