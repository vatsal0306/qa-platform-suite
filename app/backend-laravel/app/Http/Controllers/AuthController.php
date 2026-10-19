<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Bugs;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        // BUG-001: e-mail format is not validated when the bug is active
        $emailRules = Bugs::on('BUG-001')
            ? 'required|string|max:255|unique:users,email'
            : 'required|string|email|max:255|unique:users,email';

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => $emailRules,
            'password' => 'required|string|min:8|max:72',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        return response()->json([
            'user' => $this->userPayload($user),
            'token' => $user->createToken('api')->plainTextToken,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        // BUG-008: user enumeration - distinct response for an unknown e-mail
        if (!$user && Bugs::on('BUG-008')) {
            return response()->json(['message' => 'No account found for this email'], 404);
        }

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        return response()->json([
            'user' => $this->userPayload($user),
            'token' => $user->createToken('api')->plainTextToken,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->userPayload($request->user()));
    }

    private function userPayload(User $u): array
    {
        return ['id' => $u->id, 'name' => $u->name, 'email' => $u->email];
    }
}
