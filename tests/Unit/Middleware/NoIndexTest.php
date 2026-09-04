<?php

use App\Http\Middleware\NoIndex;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

test('it adds the X-Robots-Tag header to the response', function (): void {
    $middleware = new NoIndex;

    $response = $middleware->handle(Request::create('/'), fn (): Response => new Response('ok'));

    expect($response->headers->get('X-Robots-Tag'))->toBe('noindex, nofollow, noarchive');
});
