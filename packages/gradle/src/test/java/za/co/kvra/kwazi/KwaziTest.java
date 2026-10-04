package za.co.kvra.kwazi;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class KwaziTest {
    record Call(String method, URI uri, Map<String, String> headers, String body) {}

    static Kwazi client(int status, String body, List<Call> calls) {
        return Kwazi.builder().apiKey("kwz_sk_test").baseUrl("https://example.test/").transport((method, uri, headers, payload) -> {
            calls.add(new Call(method, uri, headers, payload));
            return new Kwazi.Response(status, body);
        }).build();
    }

    static final String ANSWER = """
        {"answerId":"a1","understoodQuestion":"1/2 + 1/4","topic":"Fractions",
         "steps":[{"title":"Same bottoms","explanation":"Make them \\"equal\\".","math":"1/2 = 2/4"}],
         "finalAnswer":"3/4","checkYourself":{"prompt":"1/3+1/3?","choices":["2/3","2/6"],"correctIndex":0},
         "followUps":["Why?"],"citations":[{"title":"Notes","url":"https://school.example/notes","kind":"web"}],
         "confidence":"high","model":"m","safety":{"allowed":true,"categories":[]}}
        """;

    @Test
    void sendsTheKeyAndMapsALesson() {
        List<Call> calls = new ArrayList<>();
        Kwazi.Answer answer = client(200, ANSWER, calls).createLesson(new Kwazi.LessonInput(7, "mathematics", "Adding fractions").sourceIds(List.of("s1")));
        assertEquals("3/4", answer.finalAnswer());
        assertEquals("Make them \"equal\".", answer.steps().get(0).explanation());
        assertEquals(0, answer.checkYourself().correctIndex());
        assertTrue(answer.safe());
        Call call = calls.get(0);
        assertEquals("https://example.test/v1/lessons", call.uri().toString());
        assertEquals("Bearer kwz_sk_test", call.headers().get("Authorization"));
        assertEquals("{\"grade\":7,\"subject\":\"mathematics\",\"topic\":\"Adding fractions\",\"sourceIds\":[\"s1\"]}", call.body());
    }

    @Test
    void listsAndDeletesSources() {
        List<Call> calls = new ArrayList<>();
        List<Kwazi.Source> sources = client(200, "{\"sources\":[{\"id\":\"s1\",\"status\":\"ready\",\"bytes\":12,\"subject\":null}]}", calls).listSources();
        assertTrue(sources.get(0).ready());
        assertNull(sources.get(0).subject());
        client(204, "", calls).deleteSource("a/b");
        assertEquals("https://example.test/v1/sources/a%2Fb", calls.get(1).uri().toString());
        assertEquals("DELETE", calls.get(1).method());
    }

    @Test
    void raisesTheServerMessage() {
        KwaziException error = assertThrows(KwaziException.class,
                () -> client(402, "{\"message\":\"You've used your 20 free credits.\"}", new ArrayList<>()).ask(new Kwazi.QuestionInput(9, "mathematics", "x?")));
        assertEquals(402, error.status());
        assertEquals("You've used your 20 free credits.", error.getMessage());
    }

    @Test
    void readsUsage() {
        List<Call> calls = new ArrayList<>();
        Kwazi.Usage usage = client(200, "{\"limits\":{\"tier\":\"free\",\"keys\":1,\"sources\":5,\"perMinute\":10,\"perKeyDaily\":20},"
                + "\"keyRequestsToday\":3,\"sourcesUsed\":2,\"credits\":{\"kind\":\"unlimited\",\"limit\":null,\"used\":0},\"day\":\"2026-10-04\"}", calls).usage();
        assertEquals(20, usage.perKeyDaily());
        assertNull(usage.creditsLimit());
        assertEquals("GET", calls.get(0).method());
    }

    @Test
    void refusesBrowserTokens() {
        assertThrows(IllegalArgumentException.class, () -> Kwazi.builder().apiKey("kwz_ws_browser").build());
    }

    @Test
    void roundTripsJson() {
        Object parsed = Json.parse("{\"a\":[1,2.5,true,null,\"\\u00e9\\n\"]}");
        assertEquals("{\"a\":[1,2.5,true,null,\"é\\n\"]}", Json.write(parsed));
    }
}
