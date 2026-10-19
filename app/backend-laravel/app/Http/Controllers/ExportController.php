<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExportController extends Controller
{
    public function orders(Request $request): JsonResponse
    {
        if (!hash_equals((string) config('bugs.export_key'), (string) $request->header('X-QA-Export-Key'))) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return response()->json(['data' => Order::with('items')->orderBy('id')->get()->map->toApi()]);
    }
}
