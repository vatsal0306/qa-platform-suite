<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public const CREATED = 'created';
    public const PAID = 'paid';
    public const SHIPPED = 'shipped';
    public const CANCELLED = 'cancelled';

    protected $fillable = ['user_id', 'customer_name', 'status', 'total'];

    protected $casts = ['paid_at' => 'datetime', 'shipped_at' => 'datetime'];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function toApi(): array
    {
        $this->loadMissing('items');
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'customer_name' => $this->customer_name,
            'status' => $this->status,
            'total' => round((float) $this->total, 2),
            'payment_attempts' => (int) $this->payment_attempts,
            'items' => $this->items->map(fn ($i) => [
                'id' => $i->id,
                'sku' => $i->sku,
                'name' => $i->name,
                'quantity' => (int) $i->quantity,
                'unit_price' => round((float) $i->unit_price, 2),
            ])->values(),
            'paid_at' => optional($this->paid_at)->toIso8601String(),
            'shipped_at' => optional($this->shipped_at)->toIso8601String(),
            'created_at' => optional($this->created_at)->toIso8601String(),
            'updated_at' => optional($this->updated_at)->toIso8601String(),
        ];
    }
}
