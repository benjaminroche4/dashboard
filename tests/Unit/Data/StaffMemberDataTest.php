<?php

use App\Data\StaffMemberData;
use App\Enums\StaffRole;

test('it can be built from an array and back', function (): void {
    $input = ['name' => 'Alice', 'email' => 'alice@example.com', 'password' => 'secret'];

    $data = StaffMemberData::from($input);

    expect($data->name)->toBe('Alice')
        ->and($data->email)->toBe('alice@example.com')
        ->and($data->role)->toBe(StaffRole::Member)
        ->and($data->toArray())->toBe([...$input, 'role' => 'member']);
});

test('it accepts a role as enum or string', function (): void {
    $base = ['name' => 'Alice', 'email' => 'alice@example.com', 'password' => 'secret'];

    expect(StaffMemberData::from([...$base, 'role' => StaffRole::Admin])->role)->toBe(StaffRole::Admin)
        ->and(StaffMemberData::from([...$base, 'role' => 'manager'])->role)->toBe(StaffRole::Manager);
});

test('the name is capitalised word by word', function (): void {
    $data = StaffMemberData::from(['name' => 'jean-pierre DUPONT', 'email' => 'jp@exemple.com', 'password' => 'secret']);

    expect($data->name)->toBe('Jean-Pierre Dupont');
});
