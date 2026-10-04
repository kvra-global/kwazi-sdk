package za.co.kvra.kwazi;

/** An error response from the Kwazi API, or a failure to reach it (status 0). */
public final class KwaziException extends RuntimeException {
    private final int status;
    private final String body;

    public KwaziException(int status, String message, String body) {
        super(message);
        this.status = status;
        this.body = body;
    }

    public int status() {
        return status;
    }

    public String body() {
        return body;
    }
}
