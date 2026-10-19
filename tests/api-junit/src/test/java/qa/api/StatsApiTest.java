package qa.api;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;

/**
 * TDD example. These tests were written BEFORE GET /api/orders/stats existed (red),
 * then OrderController::stats() was implemented until they passed (green).
 * See docs/tdd-log.md for the red/green/refactor history.
 */
@DisplayName("GET /orders/stats (TDD)")
class StatsApiTest extends BaseApiTest {

    @Test @DisplayName("new user has all-zero stats")
    void emptyStats() {
        as(newUserToken()).get("/orders/stats").then().statusCode(200)
            .body("total_orders", equalTo(0)).body("revenue", money(0))
            .body("by_status.created", equalTo(0)).body("by_status.paid", equalTo(0))
            .body("by_status.shipped", equalTo(0)).body("by_status.cancelled", equalTo(0));
    }

    @Test @DisplayName("counts per status; revenue only from paid + shipped orders")
    void mixedStats() {
        String t = newUserToken();
        createOrder(t, 1, 10);                       // stays created
        int paid = createOrder(t, 2, 20);            // 40
        int shipped = createOrder(t, 1, 100);        // 100
        int cancelled = createOrder(t, 1, 999);
        as(t).post("/orders/" + paid + "/pay");
        as(t).post("/orders/" + shipped + "/pay");
        as(t).post("/orders/" + shipped + "/ship");
        as(t).post("/orders/" + cancelled + "/cancel");

        as(t).get("/orders/stats").then().statusCode(200)
            .body("total_orders", equalTo(4))
            .body("by_status.created", equalTo(1)).body("by_status.paid", equalTo(1))
            .body("by_status.shipped", equalTo(1)).body("by_status.cancelled", equalTo(1))
            .body("revenue", money(140));
    }

    @Test @DisplayName("stats require authentication and are per-user")
    void authAndIsolation() {
        json().get("/orders/stats").then().statusCode(401);
        String a = newUserToken(), b = newUserToken();
        createOrder(a, 1, 1);
        as(b).get("/orders/stats").then().body("total_orders", equalTo(0));
    }
}
