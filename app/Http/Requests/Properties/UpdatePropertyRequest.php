<?php

declare(strict_types=1);

namespace App\Http\Requests\Properties;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Modification d'un bien : exactement les mêmes règles que la création, tenues
 * en un seul endroit. Un jeu de règles recopié ici laissait tomber l'étage, le
 * type de bail et les charges, que `PropertyData` remettait alors à null.
 */
class UpdatePropertyRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return StorePropertyRequest::propertyRules();
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return StorePropertyRequest::propertyAttributes();
    }
}
