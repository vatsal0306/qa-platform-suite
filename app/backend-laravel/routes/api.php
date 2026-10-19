<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\OrderController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Key-protected read-only export used by the PL/SQL validation loader
Route::get('/export/orders', [ExportController::class, 'orders']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/orders/stats', [OrderController::class, 'stats']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{id}', [OrderController::class, 'show'])->whereNumber('id');
    Route::put('/orders/{id}', [OrderController::class, 'update'])->whereNumber('id');
    Route::delete('/orders/{id}', [OrderController::class, 'destroy'])->whereNumber('id');

    Route::post('/orders/{id}/pay', [OrderController::class, 'pay'])->whereNumber('id');
    Route::post('/orders/{id}/ship', [OrderController::class, 'ship'])->whereNumber('id');
    Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel'])->whereNumber('id');
});
