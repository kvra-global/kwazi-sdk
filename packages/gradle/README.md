# Kwazi for Java and Kotlin

Kwazi developer API client for Java 17+ with no dependencies.

```kotlin
repositories { maven("https://jitpack.io") }
dependencies { implementation("com.github.kvra-global:kwazi-sdk:v0.1.0") }
```

```java
Kwazi kwazi = Kwazi.builder().build(); // reads KWAZI_API_KEY, or .apiKey("kwz_sk_…")

Kwazi.Source notes = kwazi.createSource(new Kwazi.SourceInput("https://your-school.example/fractions.pdf").subject("mathematics").grade(7));
Kwazi.Answer lesson = kwazi.createLesson(new Kwazi.LessonInput(7, "mathematics", "Adding fractions").sourceIds(List.of(notes.id())));
Kwazi.Answer answer = kwazi.ask(new Kwazi.QuestionInput(9, "mathematics", "Help me with 4.1")
    .attachments(List.of(Kwazi.Attachment.of(Files.readAllBytes(Path.of("question.jpg")), "image/jpeg"))));
Kwazi.WidgetSession session = kwazi.createWidgetSession(new Kwazi.WidgetSessionInput().sourceIds(List.of(notes.id())));
```

Errors throw `KwaziException` with `status()` and the API's message. The jar is also published to GitHub Packages as `za.co.kvra:kwazi`.
