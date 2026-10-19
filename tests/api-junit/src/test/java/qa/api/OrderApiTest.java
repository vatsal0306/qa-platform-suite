package qa.api;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("Orders API - CRUD, validation and security")
class OrderApiTest extends BaseApiTest {

    @Test @DisplayName("create computes total = sum(qty * unit_price)")
    void totalIsComputed() {
        as(newUserToken()).body(Map.of("customer_name", "Multi", "items", List.of(
                Map.of("sku", "A", "quantity", 3, "unit_price", 9.99),
                Map.of("sku", "B", "quantity", 1, "unit_price", 0.01))))
            .post("/orders").then().statusCode(201)
            .body("status", equalTo("created")).body("total", money(29.98)).body("items", hasSize(2));
    }

    @Test @DisplayName("bulk quantity gets no hidden discount (BUG-007)")
    void noHiddenDiscount() {
        as(newUserToken()).body(orderBody(10, 100.0)).post("/orders").then().statusCode(201).body("total", money(1000.0));
    }

    @ParameterizedTest(name = "quantity {0} is rejected (BUG-002)")
    @ValueSource(ints = {0, -1, -100, 1001})
    void invalidQuantity(int qty) {
        as(newUserToken()).body(orderBody(qty, 5.0)).post("/orders").then().statusCode(422);
    }

    @ParameterizedTest(name = "quantity {0} is accepted (boundary)")
    @ValueSource(ints = {1, 2, 999, 1000})
    void validQuantity(int qty) {
        as(newUserToken()).body(orderBody(qty, 1.0)).post("/orders").then().statusCode(201);
    }

    @Test @DisplayName("customer_name boundary: 100 ok, 101 -> 422 not 500 (BUG-009)")
    void customerNameLength() {
        String t = newUserToken();
        as(t).body(Map.of("customer_name", "a".repeat(100), "items", List.of(Map.of("sku", "A", "quantity", 1, "unit_price", 1)))).post("/orders").then().statusCode(201);
        as(t).body(Map.of("customer_name", "a".repeat(101), "items", List.of(Map.of("sku", "A", "quantity", 1, "unit_price", 1)))).post("/orders").then().statusCode(422);
    }

    @Test @DisplayName("user cannot read, edit or pay another user's order (BUG-003)")
    void isolationBetweenUsers() {
        String owner = newUserToken(), intruder = newUserToken();
        int id = createOrder(owner, 1, 10);
        as(intruder).get("/orders/" + id).then().statusCode(403);
        as(intruder).body(Map.of("customer_name", "x")).put("/orders/" + id).then().statusCode(403);
        as(intruder).post("/orders/" + id + "/pay").then().statusCode(403);
        as(owner).get("/orders/" + id).then().statusCode(200);
    }

    @Test @DisplayName("unknown order -> 404")
    void notFound() {
        as(newUserToken()).get("/orders/99999999").then().statusCode(404);
    }

    @Test @DisplayName("pagination pages never overlap (BUG-006)")
    void paginationHasNoOverlap() {
        String t = newUserToken();
        for (int i = 0; i < 5; i++) createOrder(t, 1, 1 + i);
        List<Integer> all = new ArrayList<>();
        for (int page = 1; page <= 3; page++) {
            List<Integer> ids = as(t).get("/orders?page=" + page + "&per_page=2").then().statusCode(200).extract().path("data.id");
            all.addAll(ids);
        }
        assertEquals(5, all.size());
        assertEquals(5, new HashSet<>(all).size(), "duplicate ids across pages");
    }

    @Test @DisplayName("list meta is consistent")
    void listMeta() {
        String t = newUserToken();
        for (int i = 0; i < 3; i++) createOrder(t, 1, 1);
        as(t).get("/orders?per_page=2").then().statusCode(200)
            .body("meta.total", equalTo(3)).body("meta.last_page", equalTo(2)).body("data", hasSize(2));
    }
}
