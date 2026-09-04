<?php

test('every web response carries a noindex header', function () {
    $this->get(route('login'))
        ->assertOk()
        ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
});

test('the login page contains a noindex meta tag', function () {
    $this->get(route('login'))
        ->assertSee('<meta name="robots" content="noindex, nofollow, noarchive">', false);
});

test('robots.txt disallows everything', function () {
    expect(file_get_contents(public_path('robots.txt')))->toContain("Disallow: /\n");
});
