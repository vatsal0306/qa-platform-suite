<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    public $timestamps = false;

    protected $fillable = ['order_id', 'sku', 'name', 'quantity', 'unit_price'];
}
