<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Support\Bugs;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    private function conflict(string $msg): JsonResponse
    {
        return response()->json(['message' => $msg], 409);
    }

    /** Loads an order; returns [order|null, errorResponse|null]. */
    private function load(Request $request, int $id): array
    {
        $order = Order::with('items')->find($id);
        if (!$order) {
            return [null, response()->json(['message' => 'Order not found'], 404)];
        }
        // BUG-003: broken object-level authorization (IDOR) when active
        if ($order->user_id !== $request->user()->id && !Bugs::on('BUG-003')) {
            return [null, response()->json(['message' => 'Forbidden'], 403)];
        }
        return [$order, null];
    }

    public function index(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(100, max(1, (int) $request->query('per_page', 10)));

        $query = Order::where('user_id', $request->user()->id);
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        $total = (clone $query)->count();

        // BUG-006: off-by-one offset repeats the last row of the previous page
        $offset = ($page - 1) * $perPage;
        if ($page > 1 && Bugs::on('BUG-006')) {
            $offset -= 1;
        }

        $rows = $query->with('items')->orderByDesc('id')->offset($offset)->limit($perPage)->get();

        return response()->json([
            'data' => $rows->map->toApi()->values(),
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => max(1, (int) ceil($total / $perPage)),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        // BUG-009: missing max-length rule -> DB truncation error (HTTP 500)
        $nameRule = Bugs::on('BUG-009') ? 'required|string' : 'required|string|max:100';
        // BUG-002: zero / negative quantity accepted
        $qtyRule = Bugs::on('BUG-002') ? 'required|integer' : 'required|integer|min:1|max:1000';

        $data = $request->validate([
            'customer_name' => $nameRule,
            'items' => 'required|array|min:1|max:20',
            'items.*.sku' => 'required|string|max:32',
            'items.*.name' => 'nullable|string|max:100',
            'items.*.quantity' => $qtyRule,
            'items.*.unit_price' => 'required|numeric|min:0.01|max:100000',
        ]);

        $order = DB::transaction(function () use ($request, $data) {
            $total = 0;
            foreach ($data['items'] as $i) {
                $line = $i['quantity'] * $i['unit_price'];
                // BUG-007: silent 10% discount on bulk lines (not in the spec)
                if ($i['quantity'] >= 10 && Bugs::on('BUG-007')) {
                    $line *= 0.9;
                }
                $total += $line;
            }

            $order = Order::create([
                'user_id' => $request->user()->id,
                'customer_name' => $data['customer_name'],
                'status' => Order::CREATED,
                'total' => round($total, 2),
            ]);
            foreach ($data['items'] as $i) {
                $order->items()->create([
                    'sku' => $i['sku'],
                    'name' => $i['name'] ?? null,
                    'quantity' => $i['quantity'],
                    'unit_price' => $i['unit_price'],
                ]);
            }
            return $order;
        });

        return response()->json($order->fresh('items')->toApi(), 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        [$order, $err] = $this->load($request, $id);
        return $err ?? response()->json($order->toApi());
    }

    public function update(Request $request, int $id): JsonResponse
    {
        [$order, $err] = $this->load($request, $id);
        if ($err) {
            return $err;
        }
        if ($order->status !== Order::CREATED) {
            return $this->conflict('Only orders in "created" status can be edited');
        }
        $order->update($request->validate(['customer_name' => 'required|string|max:100']));
        return response()->json($order->fresh('items')->toApi());
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        [$order, $err] = $this->load($request, $id);
        if ($err) {
            return $err;
        }
        if ($order->status !== Order::CREATED) {
            return $this->conflict('Only orders in "created" status can be deleted');
        }
        $order->delete();
        return response()->json(null, 204);
    }

    /* workflow: created -> paid -> shipped (or cancelled) */

    public function pay(Request $request, int $id): JsonResponse
    {
        [$order, $err] = $this->load($request, $id);
        if ($err) {
            return $err;
        }
        // BUG-004: an already-paid order can be paid (charged) again
        $allowed = Bugs::on('BUG-004')
            ? in_array($order->status, [Order::CREATED, Order::PAID], true)
            : $order->status === Order::CREATED;
        if (!$allowed) {
            return $this->conflict('Order cannot be paid from status "' . $order->status . '"');
        }
        $order->status = Order::PAID;
        $order->paid_at = now();
        $order->payment_attempts = $order->payment_attempts + 1;
        $order->save();
        return response()->json($order->fresh('items')->toApi());
    }

    public function ship(Request $request, int $id): JsonResponse
    {
        [$order, $err] = $this->load($request, $id);
        if ($err) {
            return $err;
        }
        // BUG-005: unpaid orders can be shipped
        $allowed = Bugs::on('BUG-005')
            ? in_array($order->status, [Order::CREATED, Order::PAID], true)
            : $order->status === Order::PAID;
        if (!$allowed) {
            return $this->conflict('Order cannot be shipped from status "' . $order->status . '"');
        }
        $order->status = Order::SHIPPED;
        $order->shipped_at = now();
        $order->save();
        return response()->json($order->fresh('items')->toApi());
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        [$order, $err] = $this->load($request, $id);
        if ($err) {
            return $err;
        }
        // BUG-010: shipped orders can be cancelled
        $allowed = [Order::CREATED, Order::PAID];
        if (Bugs::on('BUG-010')) {
            $allowed[] = Order::SHIPPED;
        }
        if (!in_array($order->status, $allowed, true)) {
            return $this->conflict('Order cannot be cancelled from status "' . $order->status . '"');
        }
        $order->status = Order::CANCELLED;
        $order->save();
        return response()->json($order->fresh('items')->toApi());
    }

    /* stats: built test-first, see tests/api-junit StatsApiTest and docs/tdd-log.md */

    public function stats(Request $request): JsonResponse
    {
        $orders = Order::where('user_id', $request->user()->id)->get();
        $by = [];
        foreach ([Order::CREATED, Order::PAID, Order::SHIPPED, Order::CANCELLED] as $s) {
            $by[$s] = $orders->where('status', $s)->count();
        }
        $revenue = $orders->whereIn('status', [Order::PAID, Order::SHIPPED])->sum('total');

        return response()->json([
            'total_orders' => $orders->count(),
            'by_status' => $by,
            'revenue' => round((float) $revenue, 2),
        ]);
    }
}
