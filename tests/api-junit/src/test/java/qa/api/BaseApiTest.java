package qa.api;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.BeforeAll;

import org.hamcrest.BaseMatcher;
import org.hamcrest.Description;
import org.hamcrest.Matcher;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;

/** Shared setup: base URL, throw-away users and order factories. */
public abstract class BaseApiTest {

    @BeforeAll
    static void configure() {
        RestAssured.baseURI = System.getProperty("api.base",
                System.getenv().getOrDefault("API_BASE_URL", "http://localhost:8000"));
        RestAssured.basePath = "/api";
    }

    protected static RequestSpecification json() {
        return given().contentType(ContentType.JSON).accept(ContentType.JSON);
    }

    protected static RequestSpecification as(String token) {
        return json().header("Authorization", "Bearer " + token);
    }

    /** Registers a unique user and returns its bearer token. */
    protected static String newUserToken() {
        String email = "junit_" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        return json().body(Map.of("name", "JUnit", "email", email, "password", "Password123!"))
                .post("/register").then().statusCode(201).extract().path("token");
    }

    protected static Map<String, Object> orderBody(int qty, double price) {
        return Map.of("customer_name", "JUnit Corp",
                "items", List.of(Map.of("sku", "SKU-1", "name", "Widget", "quantity", qty, "unit_price", price)));
    }

    protected static int createOrder(String token, int qty, double price) {
        return as(token).body(orderBody(qty, price)).post("/orders").then().statusCode(201).extract().path("id");
    }

    /** Numeric equality that ignores JSON int-vs-float typing (140 and 140.0 are the same amount). */
    protected static Matcher<Object> money(double expected) {
        return new BaseMatcher<Object>() {
            @Override public boolean matches(Object o) {
                return o instanceof Number && Math.abs(((Number) o).doubleValue() - expected) < 0.005;
            }
            @Override public void describeTo(Description d) { d.appendText("a number equal to " + expected); }
        };
    }
}
