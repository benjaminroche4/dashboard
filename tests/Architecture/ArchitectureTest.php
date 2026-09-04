<?php

use Illuminate\Console\Command;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

/*
 * Règles d'architecture vérifiées par la machine (voir CLAUDE.md).
 */

arch()->preset()->php();
arch()->preset()->security()->ignoring('md5');

arch('no debug helpers in app code')
    ->expect(['dd', 'dump', 'ray', 'var_dump', 'print_r', 'env'])
    ->not->toBeUsedIn('app');

arch('strict types everywhere in app')
    ->expect('App')
    ->toUseStrictTypes();

arch('actions are final, invokable through handle() and free of HTTP concerns')
    ->expect('App\Actions')
    ->toBeFinal()
    ->toBeClasses()
    ->toHaveMethod('handle')
    ->not->toUse([Request::class, Response::class, Inertia::class]);

arch('data transfer objects are final and readonly')
    ->expect('App\Data')
    ->toBeFinal()
    ->toBeReadonly();

arch('controllers do not query Eloquent directly nor contain business logic helpers')
    ->expect('App\Http\Controllers')
    ->not->toUse([DB::class, Validator::class]);

arch('form requests live in App\Http\Requests')
    ->expect('App\Http\Requests')
    ->toExtend(FormRequest::class)
    ->toHaveSuffix('Request');

arch('middlewares expose handle()')
    ->expect('App\Http\Middleware')
    ->toHaveMethod('handle');

arch('events are broadcastable when named as dashboard events')
    ->expect('App\Events')
    ->toImplement(ShouldBroadcast::class);

arch('models stay thin')
    ->expect('App\Models')
    ->toExtend(Model::class)
    ->not->toUse([Request::class, Auth::class]);

arch('console commands are final and delegate to actions')
    ->expect('App\Console\Commands')
    ->toBeFinal()
    ->toExtend(Command::class)
    ->not->toUse(DB::class);
