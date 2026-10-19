<?php

namespace App\Support;

class Bugs
{
    /** True when the given seeded bug is currently active. */
    public static function on(string $id): bool
    {
        return config('bugs.enabled') && !in_array($id, config('bugs.fixed'), true);
    }
}
