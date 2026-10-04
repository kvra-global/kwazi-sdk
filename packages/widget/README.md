# kwazi-widget

An animated, mobile-first Kwazi tutor as a `<kwazi-chat>` web component. Learners type or snap a question, see steps one at a time, break any step down, check themselves and follow up. No dependencies; styles are isolated in a shadow root and everything the model says is rendered as text.

The widget never holds your secret key. Your server mints a short-lived session with a `kwz_sk_` key and the widget uses that token.

```html
<script src="https://kvra-global.github.io/kwazi-sdk/widget/kwazi-widget.js" defer></script>
<kwazi-chat session-endpoint="/api/kwazi-session" heading="Ask Kwazi" accent="#0F766E"></kwazi-chat>
```

`session-endpoint` is a route on your site that answers `POST` with `{"token": "kwz_ws_…"}`, for example with the Node client:

```js
const session = await kwazi.widgetSessions.create({ sourceIds: [notes.id], grade: 7, subject: "mathematics" });
res.json({ token: session.token });
```

Or mount it from your bundle:

```js
import { mount } from "kwazi-widget";
mount({ target: document.getElementById("tutor"), inline: true, getToken: async () => (await (await fetch("/api/kwazi-session", { method: "POST" })).json()).token });
```

| Attribute | Meaning |
| --- | --- |
| `session-endpoint` | Your route that returns a widget token |
| `token` | A token, if you render one into the page instead |
| `inline` | Render as a panel in place instead of a floating launcher |
| `open` | Start open |
| `heading` | Title in the header (default "Ask Kwazi") |
| `accent` | Any CSS colour |
| `api-base` | Override the API URL |

When the session does not fix a grade and subject, the widget shows pickers for them. Animations respect `prefers-reduced-motion`.
