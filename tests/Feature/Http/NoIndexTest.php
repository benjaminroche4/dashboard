<?php

test('every web response carries a noindex header', function (): void {
    $this->get(route('login'))
        ->assertOk()
        ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
});

test('responses outside the web group carry the noindex header too', function (): void {
    $this->get('/up')
        ->assertOk()
        ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

    $this->get(route('login'))
        ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
});

test('the login page contains a noindex meta tag', function (): void {
    $this->get(route('login'))
        ->assertSee('<meta name="robots" content="noindex, nofollow, noarchive">', false);
});

test('robots.txt disallows everything', function (): void {
    expect(file_get_contents(public_path('robots.txt')))->toContain("Disallow: /\n");
});
