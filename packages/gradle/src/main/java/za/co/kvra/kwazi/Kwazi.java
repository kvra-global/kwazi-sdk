package za.co.kvra.kwazi;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Client for the Kwazi developer API.
 *
 * <pre>{@code
 * Kwazi kwazi = Kwazi.builder().apiKey(System.getenv("KWAZI_API_KEY")).build();
 * Kwazi.Source source = kwazi.createSource(new Kwazi.SourceInput("https://example.org/fractions.pdf").subject("mathematics").grade(7));
 * Kwazi.Answer lesson = kwazi.createLesson(new Kwazi.LessonInput(7, "mathematics", "Adding fractions").sourceIds(List.of(source.id())));
 * }</pre>
 */
public final class Kwazi {
    public static final String DEFAULT_BASE_URL = "https://api.kwazi.kvra.co.za";

    /** Sends one HTTP request; replaceable in tests. */
    @FunctionalInterface
    public interface Transport {
        Response send(String method, URI uri, Map<String, String> headers, String body) throws IOException, InterruptedException;
    }

    public record Response(int status, String body) {}

    private final String apiKey;
    private final String baseUrl;
    private final Transport transport;

    private Kwazi(Builder builder) {
        String key = builder.apiKey != null ? builder.apiKey : System.getenv("KWAZI_API_KEY");
        if (key == null || key.isBlank()) throw new IllegalArgumentException("Pass apiKey or set KWAZI_API_KEY");
        if (!key.startsWith("kwz_sk_")) throw new IllegalArgumentException("Kwazi secret keys start with kwz_sk_");
        this.apiKey = key;
        this.baseUrl = builder.baseUrl.replaceAll("/+$", "");
        this.transport = builder.transport != null ? builder.transport : httpTransport(builder.timeout);
    }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String apiKey;
        private String baseUrl = DEFAULT_BASE_URL;
        private Duration timeout = Duration.ofSeconds(90);
        private Transport transport;

        public Builder apiKey(String apiKey) { this.apiKey = apiKey; return this; }
        public Builder baseUrl(String baseUrl) { this.baseUrl = Objects.requireNonNull(baseUrl); return this; }
        public Builder timeout(Duration timeout) { this.timeout = Objects.requireNonNull(timeout); return this; }
        public Builder transport(Transport transport) { this.transport = transport; return this; }
        public Kwazi build() { return new Kwazi(this); }
    }

    // --- Models -------------------------------------------------------------------------------

    public record Source(String id, String url, String title, String subject, String grade, String mediaType, int bytes, String status, String error, String createdAt) {
        public boolean ready() { return "ready".equals(status); }
    }

    public record Step(String title, String explanation, String math) {}

    public record CheckYourself(String prompt, List<String> choices, int correctIndex) {}

    public record Citation(String title, String url, String kind) {}

    public record Answer(
            String answerId,
            String understoodQuestion,
            String topic,
            List<Step> steps,
            String finalAnswer,
            CheckYourself checkYourself,
            List<String> followUps,
            List<Citation> citations,
            String confidence,
            String model,
            boolean safe) {}

    public record WidgetSession(String token, String expiresAt, String grade, String subject) {}

    public record Attachment(String mediaType, String data, String name) {
        /** A photo or PDF of a question, at most 6 MB. */
        public static Attachment of(byte[] bytes, String mediaType) {
            return new Attachment(mediaType, Base64.getEncoder().encodeToString(bytes), null);
        }
    }

    /** A public https PDF, web page or text file for Kwazi to fetch once and teach from. */
    public static final class SourceInput {
        private final Map<String, Object> body = new LinkedHashMap<>();
        public SourceInput(String url) { body.put("url", url); }
        public SourceInput title(String title) { body.put("title", title); return this; }
        public SourceInput subject(String subject) { body.put("subject", subject); return this; }
        public SourceInput grade(Object grade) { body.put("grade", grade); return this; }
    }

    public static final class QuestionInput {
        private final Map<String, Object> body = new LinkedHashMap<>();
        /** @param grade "R" or 1 to 12 */
        public QuestionInput(Object grade, String subject, String question) {
            body.put("grade", grade);
            body.put("subject", subject);
            body.put("question", question);
        }
        public QuestionInput attachments(List<Attachment> attachments) {
            body.put("attachments", attachments.stream().map(attachment -> {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("mediaType", attachment.mediaType());
                map.put("data", attachment.data());
                map.put("name", attachment.name());
                return map;
            }).toList());
            return this;
        }
        public QuestionInput sourceIds(List<String> sourceIds) { body.put("sourceIds", sourceIds); return this; }
        /** "question", "breakdown" or "practice". */
        public QuestionInput purpose(String purpose) { body.put("purpose", purpose); return this; }
        /** "quick" or "thorough". */
        public QuestionInput depth(String depth) { body.put("depth", depth); return this; }
    }

    public static final class LessonInput {
        private final Map<String, Object> body = new LinkedHashMap<>();
        public LessonInput(Object grade, String subject, String topic) {
            body.put("grade", grade);
            body.put("subject", subject);
            body.put("topic", topic);
        }
        public LessonInput sourceIds(List<String> sourceIds) { body.put("sourceIds", sourceIds); return this; }
        public LessonInput depth(String depth) { body.put("depth", depth); return this; }
    }

    public static final class WidgetSessionInput {
        private final Map<String, Object> body = new LinkedHashMap<>();
        public WidgetSessionInput sourceIds(List<String> sourceIds) { body.put("sourceIds", sourceIds); return this; }
        public WidgetSessionInput grade(Object grade) { body.put("grade", grade); return this; }
        public WidgetSessionInput subject(String subject) { body.put("subject", subject); return this; }
        public WidgetSessionInput ttlSeconds(int ttlSeconds) { body.put("ttlSeconds", ttlSeconds); return this; }
    }

    // --- Calls --------------------------------------------------------------------------------

    public Source createSource(SourceInput input) {
        return source(asMap(request("POST", "/v1/sources", input.body)));
    }

    public List<Source> listSources() {
        return asList(asMap(request("GET", "/v1/sources", null)).get("sources")).stream().map(item -> source(asMap(item))).toList();
    }

    public void deleteSource(String sourceId) {
        request("DELETE", "/v1/sources/" + URLEncoder.encode(sourceId, StandardCharsets.UTF_8), null);
    }

    public Answer ask(QuestionInput input) {
        return answer(asMap(request("POST", "/v1/questions", input.body)));
    }

    public Answer createLesson(LessonInput input) {
        return answer(asMap(request("POST", "/v1/lessons", input.body)));
    }

    /** A short-lived token for the chat widget, so the browser never sees your secret key. */
    public WidgetSession createWidgetSession(WidgetSessionInput input) {
        Map<String, Object> map = asMap(request("POST", "/v1/widget/sessions", input.body));
        return new WidgetSession(str(map.get("token")), str(map.get("expiresAt")), str(map.get("grade")), str(map.get("subject")));
    }

    private Object request(String method, String path, Map<String, Object> body) {
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Authorization", "Bearer " + apiKey);
        headers.put("Accept", "application/json");
        headers.put("User-Agent", "kwazi-java/0.1.0");
        String payload = null;
        if (body != null) {
            headers.put("Content-Type", "application/json");
            payload = Json.write(body);
        }
        Response response;
        try {
            response = transport.send(method, URI.create(baseUrl + path), headers, payload);
        } catch (IOException error) {
            throw new KwaziException(0, "Could not reach Kwazi: " + error.getMessage(), null);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new KwaziException(0, "Interrupted while calling Kwazi", null);
        }
        if (response.status() == 204) return null;
        Object parsed = null;
        try {
            if (response.body() != null && !response.body().isBlank()) parsed = Json.parse(response.body());
        } catch (IllegalArgumentException ignored) {
            // Non-JSON bodies only accompany errors from proxies; the status code says enough.
        }
        if (response.status() >= 400) {
            String message = null;
            if (parsed instanceof Map<?, ?> map) {
                Object candidate = map.get("message") != null ? map.get("message") : map.get("error");
                if (candidate instanceof String string) message = string;
            }
            throw new KwaziException(response.status(), message != null ? message : "Kwazi returned HTTP " + response.status(), response.body());
        }
        return parsed;
    }

    private static Transport httpTransport(Duration timeout) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
        return (method, uri, headers, body) -> {
            HttpRequest.Builder builder = HttpRequest.newBuilder(uri).timeout(timeout)
                    .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
            headers.forEach(builder::header);
            HttpResponse<String> response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return new Response(response.statusCode(), response.body());
        };
    }

    // --- Mapping ------------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object value) {
        return value instanceof Map<?, ?> ? (Map<String, Object>) value : Map.of();
    }

    @SuppressWarnings("unchecked")
    private static List<Object> asList(Object value) {
        return value instanceof List<?> ? (List<Object>) value : List.of();
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static int integer(Object value) {
        return value instanceof Number number ? number.intValue() : 0;
    }

    private static Source source(Map<String, Object> map) {
        return new Source(str(map.get("id")), str(map.get("url")), str(map.get("title")), str(map.get("subject")), str(map.get("grade")),
                str(map.get("mediaType")), integer(map.get("bytes")), str(map.get("status")), str(map.get("error")), str(map.get("createdAt")));
    }

    private static Answer answer(Map<String, Object> map) {
        List<Step> steps = asList(map.get("steps")).stream().map(item -> {
            Map<String, Object> step = asMap(item);
            return new Step(str(step.get("title")), str(step.get("explanation")), str(step.get("math")));
        }).toList();
        Map<String, Object> check = asMap(map.get("checkYourself"));
        CheckYourself checkYourself = check.isEmpty() ? null
                : new CheckYourself(str(check.get("prompt")), asList(check.get("choices")).stream().map(Kwazi::str).toList(), integer(check.get("correctIndex")));
        List<Citation> citations = asList(map.get("citations")).stream().map(item -> {
            Map<String, Object> citation = asMap(item);
            return new Citation(str(citation.get("title")), str(citation.get("url")), str(citation.get("kind")));
        }).toList();
        return new Answer(str(map.get("answerId")), str(map.get("understoodQuestion")), str(map.get("topic")), steps, str(map.get("finalAnswer")),
                checkYourself, asList(map.get("followUps")).stream().map(Kwazi::str).toList(), citations, str(map.get("confidence")),
                str(map.get("model")), Boolean.TRUE.equals(asMap(map.get("safety")).get("allowed")));
    }
}
