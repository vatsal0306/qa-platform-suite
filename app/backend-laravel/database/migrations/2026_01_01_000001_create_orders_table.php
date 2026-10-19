<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('customer_name', 100);
            $t->string('status', 20)->default('created');
            $t->decimal('total', 12, 2)->default(0);
            $t->unsignedInteger('payment_attempts')->default(0);
            $t->timestamp('paid_at')->nullable();
            $t->timestamp('shipped_at')->nullable();
            $t->timestamps();
        });

        Schema::create('order_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->string('sku', 32);
            $t->string('name', 100)->nullable();
            // Signed on purpose and no CHECK constraint: the DB does not defend against bad quantities,
            // so BUG-002 (validation gap) reaches the table and is caught by the PL/SQL validation (QTY_POSITIVE).
            $t->integer('quantity');
            $t->decimal('unit_price', 10, 2);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
