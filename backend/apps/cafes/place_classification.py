from dataclasses import dataclass
from typing import Any, Iterable


PLACE_CATEGORY_CAFE = 'cafe'
PLACE_CATEGORY_COWORKING_SPACE = 'coworking_space'
PLACE_CATEGORY_LIBRARY = 'library'

PLACE_CONFIDENCE_HIGH = 'high'
PLACE_CONFIDENCE_MEDIUM = 'medium'
PLACE_CONFIDENCE_LOW = 'low'

CAFE_PROVIDER_TYPES = {'cafe', 'coffee_shop'}
WORK_FRIENDLY_PROVIDER_TYPES = {
    'coworking_space': PLACE_CATEGORY_COWORKING_SPACE,
    'library': PLACE_CATEGORY_LIBRARY,
}
DEFAULT_CAFE_FALLBACK_TYPES = {
    'bakery',
    'establishment',
    'food',
    'point_of_interest',
    'restaurant',
    'store',
}

PLACE_CATEGORY_LABELS = {
    PLACE_CATEGORY_CAFE: 'Cafe',
    PLACE_CATEGORY_COWORKING_SPACE: 'Coworking space',
    PLACE_CATEGORY_LIBRARY: 'Library',
}
SUPPORTED_PLACE_CATEGORIES = frozenset(PLACE_CATEGORY_LABELS)


@dataclass(frozen=True)
class PlaceClassification:
    category: str | None
    label: str
    confidence: str
    reasons: tuple[str, ...]


def classify_place(
    provider_types: Iterable[str],
    place_name: str = '',
    cafe_keywords: Iterable[str] = (),
    cafe_fallback_types: Iterable[str] | None = None,
) -> PlaceClassification:
    """Classify a place by provider types and optional name keywords.

    Provider types are the primary signal because they are stable API values,
    unlike place names that may be written in any local language or script.
    Keywords are only fallback evidence for generic food/place types.

    This is the preferred API for new code. It accepts typed arguments
    instead of a provider-specific dict.
    """
    place_types = _normalise_values(provider_types)

    cafe_type_matches = place_types & CAFE_PROVIDER_TYPES
    if cafe_type_matches:
        return _classification(
            PLACE_CATEGORY_CAFE,
            PLACE_CONFIDENCE_HIGH,
            tuple(
                f'provider_type:{type_name}'
                for type_name in sorted(cafe_type_matches)
            ),
        )

    for provider_type, category in WORK_FRIENDLY_PROVIDER_TYPES.items():
        if provider_type in place_types:
            return _classification(
                category,
                PLACE_CONFIDENCE_HIGH,
                (f'provider_type:{provider_type}',),
            )

    matched_keyword = _matching_keyword(place_name, cafe_keywords)
    if not matched_keyword:
        return _unknown(('no_cafe_evidence',))

    if not place_types:
        return _classification(
            PLACE_CATEGORY_CAFE,
            PLACE_CONFIDENCE_MEDIUM,
            (f'keyword:{matched_keyword}', 'no_provider_types'),
        )

    fallback_types = _normalise_values(
        cafe_fallback_types
        if cafe_fallback_types is not None
        else DEFAULT_CAFE_FALLBACK_TYPES
    )
    fallback_matches = place_types & fallback_types
    if fallback_matches:
        return _classification(
            PLACE_CATEGORY_CAFE,
            PLACE_CONFIDENCE_MEDIUM,
            (
                f'keyword:{matched_keyword}',
                *(f'fallback_type:{type_name}' for type_name in sorted(fallback_matches)),
            ),
        )

    return _unknown((f'keyword:{matched_keyword}', 'unsupported_provider_type'))


def classify_google_place(
    place: dict[str, Any],
    cafe_keywords: Iterable[str] = (),
    cafe_fallback_types: Iterable[str] | None = None,
) -> PlaceClassification:
    """Backward-compatible wrapper that extracts types/name from a Google dict.

    Prefer ``classify_place()`` for new code — it accepts typed
    ``provider_types`` and ``place_name`` directly so classification
    stays provider-agnostic.
    """
    return classify_place(
        provider_types=place.get('types') or [],
        place_name=place.get('name', ''),
        cafe_keywords=cafe_keywords,
        cafe_fallback_types=cafe_fallback_types,
    )


def _classification(
    category: str,
    confidence: str,
    reasons: tuple[str, ...],
) -> PlaceClassification:
    return PlaceClassification(
        category=category,
        label=PLACE_CATEGORY_LABELS[category],
        confidence=confidence,
        reasons=reasons,
    )


def _unknown(reasons: tuple[str, ...]) -> PlaceClassification:
    return PlaceClassification(
        category=None,
        label='Unknown',
        confidence=PLACE_CONFIDENCE_LOW,
        reasons=reasons,
    )


def _normalise_values(values: Iterable[Any] | None) -> set[str]:
    if not values:
        return set()
    if isinstance(values, str):
        values = [values]

    return {
        str(value).casefold().strip()
        for value in values
        if value is not None and str(value).strip()
    }


def _matching_keyword(name: Any, keywords: Iterable[str] | None) -> str | None:
    if not keywords:
        return None
    if isinstance(keywords, str):
        keywords = [keywords]

    name_normalised = str(name or '').casefold()
    for keyword in keywords:
        if keyword is None:
            continue
        keyword_normalised = str(keyword).casefold().strip()
        if keyword_normalised and keyword_normalised in name_normalised:
            return keyword_normalised
    return None
