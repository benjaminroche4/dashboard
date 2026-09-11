<?php

declare(strict_types=1);

namespace App\Http\Requests\RealEstate;

/** Liste des agents : recherche par nom, agence ou ville, tri et pagination. */
class IndexAgentsRequest extends IndexDirectoryRequest
{
    /**
     * @return list<string>
     */
    public function sorts(): array
    {
        return ['name', 'city', 'created_at', 'favorite'];
    }

    public function defaultSort(): string
    {
        return 'name';
    }
}
