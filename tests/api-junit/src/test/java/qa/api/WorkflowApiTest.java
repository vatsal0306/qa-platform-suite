package qa.api;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.hamcrest.Matchers.*;

@DisplayName("Order workflow: created -> paid -> shipped")
class WorkflowApiTest extends BaseApiTest {

    @Test @DisplayName("happy path")
    void happyPath() {
        String t = newUserToken();
        int id = createOrder(t, 1, 50);
        as(t).post("/orders/" + id + "/pay").then().statusCode(200).body("status", equalTo("paid")).body("payment_attempts", equalTo(1));
        as(t).post("/orders/" + id + "/ship").then().statusCode(200).body("status", equalTo("shipped")).body("shipped_at", notNullValue());
    }

    @Test @DisplayName("cannot ship an unpaid order (BUG-005)")
    void cannotShipUnpaid() {
        String t = newUserToken();
        as(t).post("/orders/" + createOrder(t, 1, 5) + "/ship").then().statusCode(409);
    }

    @Test @DisplayName("cannot pay twice - no double charge (BUG-004)")
    void cannotPayTwice() {
        String t = newUserToken();
        int id = createOrder(t, 1, 5);
        as(t).post("/orders/" + id + "/pay").then().statusCode(200);
        as(t).post("/orders/" + id + "/pay").then().statusCode(409);
        as(t).get("/orders/" + id).then().body("payment_attempts", equalTo(1));
    }

    @Test @DisplayName("shipped order cannot be cancelled (BUG-010)")
    void cannotCancelShipped() {
        String t = newUserToken();
        int id = createOrder(t, 1, 5);
        as(t).post("/orders/" + id + "/pay");
        as(t).post("/orders/" + id + "/ship");
        as(t).post("/orders/" + id + "/cancel").then().statusCode(409);
    }

    @Test @DisplayName("paid order is immutable: edit and delete rejected")
    void paidOrderIsImmutable() {
        String t = newUserToken();
        int id = createOrder(t, 1, 5);
        as(t).post("/orders/" + id + "/pay");
        as(t).body(Map.of("customer_name", "late")).put("/orders/" + id).then().statusCode(409);
        as(t).delete("/orders/" + id).then().statusCode(409);
    }

    @Test @DisplayName("created order can be deleted, then 404")
    void deleteCreated() {
        String t = newUserToken();
        int id = createOrder(t, 1, 5);
        as(t).delete("/orders/" + id).then().statusCode(204);
        as(t).get("/orders/" + id).then().statusCode(404);
    }

    @Test @DisplayName("cancelled order cannot be paid or shipped")
    void cancelledIsTerminal() {
        String t = newUserToken();
        int id = createOrder(t, 1, 5);
        as(t).post("/orders/" + id + "/cancel").then().statusCode(200).body("status", equalTo("cancelled"));
        as(t).post("/orders/" + id + "/pay").then().statusCode(409);
        as(t).post("/orders/" + id + "/ship").then().statusCode(409);
    }
}
