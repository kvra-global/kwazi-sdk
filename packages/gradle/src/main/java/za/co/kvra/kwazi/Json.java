package za.co.kvra.kwazi;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** A small JSON reader and writer so the client has no dependencies to conflict with yours. */
final class Json {
    private final String text;
    private int index;

    private Json(String text) {
        this.text = text;
    }

    static Object parse(String text) {
        Json parser = new Json(text);
        parser.skipWhitespace();
        Object value = parser.readValue();
        parser.skipWhitespace();
        if (parser.index != text.length()) throw parser.error("Unexpected trailing content");
        return value;
    }

    static String write(Object value) {
        StringBuilder out = new StringBuilder();
        write(value, out);
        return out.toString();
    }

    private static void write(Object value, StringBuilder out) {
        if (value == null) {
            out.append("null");
        } else if (value instanceof String string) {
            out.append('"');
            for (int i = 0; i < string.length(); i++) {
                char c = string.charAt(i);
                switch (c) {
                    case '"' -> out.append("\\\"");
                    case '\\' -> out.append("\\\\");
                    case '\n' -> out.append("\\n");
                    case '\r' -> out.append("\\r");
                    case '\t' -> out.append("\\t");
                    default -> {
                        if (c < 0x20) out.append(String.format("\\u%04x", (int) c));
                        else out.append(c);
                    }
                }
            }
            out.append('"');
        } else if (value instanceof Number || value instanceof Boolean) {
            out.append(value);
        } else if (value instanceof Map<?, ?> map) {
            out.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getValue() == null) continue;
                if (!first) out.append(',');
                first = false;
                write(String.valueOf(entry.getKey()), out);
                out.append(':');
                write(entry.getValue(), out);
            }
            out.append('}');
        } else if (value instanceof Iterable<?> list) {
            out.append('[');
            boolean first = true;
            for (Object item : list) {
                if (!first) out.append(',');
                first = false;
                write(item, out);
            }
            out.append(']');
        } else {
            throw new IllegalArgumentException("Cannot write " + value.getClass().getName() + " as JSON");
        }
    }

    private Object readValue() {
        if (index >= text.length()) throw error("Unexpected end of JSON");
        char c = text.charAt(index);
        return switch (c) {
            case '{' -> readObject();
            case '[' -> readArray();
            case '"' -> readString();
            case 't' -> literal("true", Boolean.TRUE);
            case 'f' -> literal("false", Boolean.FALSE);
            case 'n' -> literal("null", null);
            default -> readNumber();
        };
    }

    private Map<String, Object> readObject() {
        Map<String, Object> map = new LinkedHashMap<>();
        index++;
        skipWhitespace();
        if (peek('}')) {
            index++;
            return map;
        }
        while (true) {
            skipWhitespace();
            String key = readString();
            skipWhitespace();
            expect(':');
            skipWhitespace();
            map.put(key, readValue());
            skipWhitespace();
            if (peek(',')) {
                index++;
                continue;
            }
            expect('}');
            return map;
        }
    }

    private List<Object> readArray() {
        List<Object> list = new ArrayList<>();
        index++;
        skipWhitespace();
        if (peek(']')) {
            index++;
            return list;
        }
        while (true) {
            skipWhitespace();
            list.add(readValue());
            skipWhitespace();
            if (peek(',')) {
                index++;
                continue;
            }
            expect(']');
            return list;
        }
    }

    private String readString() {
        expect('"');
        StringBuilder out = new StringBuilder();
        while (index < text.length()) {
            char c = text.charAt(index++);
            if (c == '"') return out.toString();
            if (c != '\\') {
                out.append(c);
                continue;
            }
            if (index >= text.length()) break;
            char escaped = text.charAt(index++);
            switch (escaped) {
                case '"', '\\', '/' -> out.append(escaped);
                case 'b' -> out.append('\b');
                case 'f' -> out.append('\f');
                case 'n' -> out.append('\n');
                case 'r' -> out.append('\r');
                case 't' -> out.append('\t');
                case 'u' -> {
                    if (index + 4 > text.length()) throw error("Bad unicode escape");
                    out.append((char) Integer.parseInt(text.substring(index, index + 4), 16));
                    index += 4;
                }
                default -> throw error("Bad escape");
            }
        }
        throw error("Unterminated string");
    }

    private Number readNumber() {
        int start = index;
        while (index < text.length() && "+-0123456789.eE".indexOf(text.charAt(index)) >= 0) index++;
        String number = text.substring(start, index);
        if (number.isEmpty()) throw error("Unexpected character");
        if (number.contains(".") || number.contains("e") || number.contains("E")) return Double.parseDouble(number);
        long value = Long.parseLong(number);
        return value >= Integer.MIN_VALUE && value <= Integer.MAX_VALUE ? (Number) (int) value : (Number) value;
    }

    private Object literal(String word, Object value) {
        if (!text.startsWith(word, index)) throw error("Unexpected literal");
        index += word.length();
        return value;
    }

    private boolean peek(char c) {
        return index < text.length() && text.charAt(index) == c;
    }

    private void expect(char c) {
        if (!peek(c)) throw error("Expected '" + c + "'");
        index++;
    }

    private void skipWhitespace() {
        while (index < text.length() && Character.isWhitespace(text.charAt(index))) index++;
    }

    private IllegalArgumentException error(String message) {
        return new IllegalArgumentException(message + " at position " + index);
    }
}
