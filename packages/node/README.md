# kwazi

Kwazi developer API client for Node.js 18+. No dependencies.

```js
import { Kwazi, KwaziError } from "kwazi";
import { readFile } from "node:fs/promises";

const kwazi = new Kwazi(); // or new Kwazi({ apiKey: "kwz_sk_…" })

const notes = await kwazi.sources.create({ url: "https://your-school.example/fractions.pdf", subject: "mathematics", grade: 7 });
if (notes.status === "failed") console.warn(notes.error);

const lesson = await kwazi.lessons.create({ grade: 7, subject: "mathematics", topic: "Adding fractions", sourceIds: [notes.id] });

const answer = await kwazi.questions.ask({
  grade: 9,
  subject: "mathematics",
  question: "Help me with 4.1",
  attachments: [Kwazi.attachment(await readFile("question.jpg"), "image/jpeg")],
  sourceIds: [notes.id]
});

const session = await kwazi.widgetSessions.create({ sourceIds: [notes.id], grade: 7, subject: "mathematics" });
```

Errors throw `KwaziError` with `status` and the API's `message`, for example 402 when the account's credits are used up.

Calls: `sources.create | list | delete`, `questions.ask`, `lessons.create`, `widgetSessions.create`. See https://kvra-global.github.io/kwazi-sdk/.
