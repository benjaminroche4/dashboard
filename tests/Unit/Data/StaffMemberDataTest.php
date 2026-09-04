<?php

use App\Data\StaffMemberData;

test('it can be built from an array and back', function (): void {
    $input = ['name' => 'Alice', 'email' => 'alice@example.com', 'password' => 'secret'];

    $data = StaffMemberData::from($input);

    expect($data->name)->toBe('Alice')
        ->and($data->email)->toBe('alice@example.com')
        ->and($data->toArray())->toBe($input);
});
