# kwazi

Kwazi developer API client for Python 3.9+. Standard library only.

```python
from kwazi import Kwazi, KwaziError, attachment

kwazi = Kwazi()  # reads KWAZI_API_KEY, or Kwazi(api_key="kwz_sk_…")

notes = kwazi.sources.create("https://your-school.example/fractions.pdf", subject="mathematics", grade=7)
lesson = kwazi.lessons.create(7, "mathematics", "Adding fractions", source_ids=[notes["id"]])

with open("question.jpg", "rb") as photo:
    answer = kwazi.questions.ask(9, "mathematics", "Help me with 4.1", attachments=[attachment(photo.read(), "image/jpeg")])

session = kwazi.widget_sessions.create(source_ids=[notes["id"]], grade=7, subject="mathematics")
```

Errors raise `KwaziError` with `status` and the API's `message`. See https://kvra-global.github.io/kwazi-sdk/.
