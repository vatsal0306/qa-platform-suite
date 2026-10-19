<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([['QA Demo', 'qa@example.com'], ['Other User', 'other@example.com']] as [$name, $email]) {
            User::firstOrCreate(['email' => $email], [
                'name' => $name,
                'password' => Hash::make('Password123!'),
            ]);
        }
    }
}
