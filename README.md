# Kwazi SDKs

Bring [Kwazi](https://kwazi.kvra.co.za)'s step-by-step tutoring into your school portal or learning app, taught from **your own sources**: notes, past papers and web pages. Learners snap or type a question and get grade-appropriate answers and focused lessons that follow your material and South Africa's CAPS curriculum.

**Docs and live demo:** https://kvra-global.github.io/kwazi-sdk/

| Package | Install | Folder |
| --- | --- | --- |
| Chat widget | `<script src="https://kvra-global.github.io/kwazi-sdk/widget/kwazi-widget.js">` or npm `kwazi-widget` | [`packages/widget`](packages/widget) |
| Node.js | `npm install https://github.com/kvra-global/kwazi-sdk/releases/download/v0.1.0/kwazi-0.1.0.tgz` (npm `kwazi`) | [`packages/node`](packages/node) |
| Python | `pip install https://github.com/kvra-global/kwazi-sdk/releases/download/v0.1.0/kwazi-0.1.0-py3-none-any.whl` (PyPI `kwazi`) | [`packages/python`](packages/python) |
| Gradle | `implementation("com.github.kvra-global:kwazi-sdk:v0.1.0")` from JitPack | [`packages/gradle`](packages/gradle) |

The API is described in [`openapi.json`](openapi.json), generated from the same contracts the API validates with.

## How it works

1. Sign in at https://app.kwazi.kvra.co.za, open **Me → Developer API** and create a secret key (`kwz_sk_…`). Keep it on your server.
2. Register sources: `POST /v1/sources` with a public https URL. Kwazi fetches it once and keeps a copy.
3. Ask questions (`POST /v1/questions`), request focused lessons (`POST /v1/lessons`), or mint a short-lived widget session (`POST /v1/widget/sessions`) and embed the chat widget.

```js
import { Kwazi } from "kwazi";

const kwazi = new Kwazi(); // reads KWAZI_API_KEY
const notes = await kwazi.sources.create({ url: "https://your-school.example/fractions.pdf", subject: "mathematics", grade: 7 });
const lesson = await kwazi.lessons.create({ grade: 7, subject: "mathematics", topic: "Adding fractions", sourceIds: [notes.id] });
```

## Responsibilities

Questions use the credits of the account that owns the key. You are responsible for having consent to send your learners' questions to Kwazi, including a parent or guardian's consent for children, under POPIA. Do not put learners' personal details in questions or sources.

## Releasing

Tag `vX.Y.Z` to build every package, attach the npm tarballs, Python wheel and jars to a GitHub Release, publish the jar to GitHub Packages and serve it through JitPack. npm and PyPI publishing switch on when the `NPM_TOKEN` secret and the `PYPI_PUBLISH=true` variable (with a PyPI trusted publisher for `release.yml`) are set.

## Licence

MIT
