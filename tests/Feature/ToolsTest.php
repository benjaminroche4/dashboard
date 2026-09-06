<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class ToolsTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $this->get(route('tools.index'))->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_tools_page(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('tools.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->component('tools/index'));
    }
}
