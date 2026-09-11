<?php

declare(strict_types=1);

namespace App\Http\Requests\RealEstate;

/** Liste des agences : recherche par nom ou ville, tri et pagination. */
class IndexAgenciesRequest extends IndexDirectoryRequest
{
    /**
     * @return list<string>
     */
    public function sorts(): array
    {
        return ['name', 'city', 'agents', 'created_at', 'favorite'];
    }

    public function defaultSort(): string
    {
        return 'name';
    }
}
