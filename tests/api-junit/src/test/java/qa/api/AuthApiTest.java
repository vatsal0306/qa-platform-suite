package qa.api;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@DisplayName("Auth API")
class AuthApiTest extends BaseApiTest {

    private static String unique() { return UUID.randomUUID().toString().substring(0, 8) + "@example.com"; }

    @Test @DisplayName("register returns 201, token, and never echoes the password")
    void registerOk() {
        json().body(Map.of("name", "A", "email", unique(), "password", "Password123!"))
                .post("/register").then().statusCode(201)
                .body("token", not(emptyOrNullString()))
                .body("user.password", nullValue());
    }

    // {u} is replaced by a random token. A fixed value would be registered once while BUG-001 is active and then be
    // rejected as "already taken" on every later run, i.e. a 422 for the wrong reason.
    @ParameterizedTest(name = "malformed e-mail \"{0}\" is rejected for its format (BUG-001)")
    @ValueSource(strings = {"plainaddress{u}", "@no-local-{u}.com", "two{u}@@example.com", "spaces in{u}@example.com"})
    void registerRejectsInvalidEmail(String template) {
        String email = template.replace("{u}", UUID.randomUUID().toString().substring(0, 8));
        var res = json().body(Map.of("name", "A", "email", email, "password", "Password123!")).post("/register");
        res.then().statusCode(422).body("errors.email", notNullValue());
        assertFalse(res.path("errors.email").toString().contains("taken"), "rejected as a duplicate, not for its format");
    }

    @Test @DisplayName("password boundary: 7 chars rejected, 8 accepted")
    void passwordBoundary() {
        json().body(Map.of("name", "A", "email", unique(), "password", "1234567")).post("/register").then().statusCode(422);
        json().body(Map.of("name", "A", "email", unique(), "password", "12345678")).post("/register").then().statusCode(201);
    }

    @Test @DisplayName("duplicate e-mail is rejected")
    void duplicateEmail() {
        var body = Map.of("name", "A", "email", unique(), "password", "Password123!");
        json().body(body).post("/register").then().statusCode(201);
        json().body(body).post("/register").then().statusCode(422);
    }

    @Test @DisplayName("login: wrong password and unknown e-mail are indistinguishable (BUG-008)")
    void loginDoesNotEnumerateUsers() {
        String email = unique();
        json().body(Map.of("name", "A", "email", email, "password", "Password123!")).post("/register");

        var wrongPw = json().body(Map.of("email", email, "password", "nope-nope-1")).post("/login");
        var unknown = json().body(Map.of("email", unique(), "password", "nope-nope-1")).post("/login");

        wrongPw.then().statusCode(401);
        unknown.then().statusCode(401);
        assertEquals((String) wrongPw.path("message"), (String) unknown.path("message"));
    }

    @Test @DisplayName("protected route requires a valid token")
    void protectedRoute() {
        json().get("/me").then().statusCode(401);
        as("garbage").get("/me").then().statusCode(401);
        as(newUserToken()).get("/me").then().statusCode(200).body("email", containsString("@"));
    }

    @Test @DisplayName("token is revoked on logout")
    void logoutRevokesToken() {
        String token = newUserToken();
        as(token).post("/logout").then().statusCode(200);
        as(token).get("/me").then().statusCode(401);
    }
}
