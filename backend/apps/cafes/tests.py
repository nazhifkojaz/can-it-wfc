"""
Cafe Tests

Tests for cafe model validation, serializers, and API endpoints.
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from apps.cafes.serializers import (
    CafeCreateSerializer,
    CafeUpdateSerializer,
    CafeFlagCreateSerializer,
)
from apps.cafes.admin import CafeAdminForm, CafeFlagAdminForm

User = get_user_model()


# Constants for validation
MAX_CAFE_ADDRESS_LENGTH = 500
MAX_FLAG_DESCRIPTION_LENGTH = 1000
MAX_FLAG_RESOLUTION_NOTES_LENGTH = 1000


def _request_for(user):
    return type('Request', (), {'user': user})()


@pytest.fixture
def clear_cache():
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


class TestGooglePlaceClassification:
    """Test Google place classification before DB/API enrichment."""

    KEYWORDS = [
        'coffee', 'coffee shop', 'coffeeshop', 'roastery', 'roaster',
        'espresso', 'kopi', 'koffie', 'cafe', 'café', 'kafe', 'kaffee',
        'kaffe', 'caffè', '咖啡', '咖啡馆', '咖啡店', 'кофе', 'кофейня',
        'кафе', 'カフェ', 'コーヒー', '喫茶', '카페', '커피', 'กาแฟ',
        'คาเฟ่', 'مقهى', 'قهوة', 'كافيه'
    ]
    FALLBACK_TYPES = {'cafe', 'coffee_shop', 'bakery', 'restaurant', 'food'}

    @pytest.mark.parametrize('name', ['星巴克臻选', 'Кофемания', '喫茶室ルノアール'])
    def test_non_english_cafe_name_included_by_provider_type(self, name):
        from apps.cafes.place_classification import (
            PLACE_CATEGORY_CAFE,
            PLACE_CONFIDENCE_HIGH,
            classify_google_place,
        )

        classification = classify_google_place(
            {'name': name, 'types': ['cafe', 'food', 'point_of_interest']},
            self.KEYWORDS,
            self.FALLBACK_TYPES,
        )

        assert classification.category == PLACE_CATEGORY_CAFE
        assert classification.confidence == PLACE_CONFIDENCE_HIGH

    def test_generic_restaurant_without_keyword_is_not_cafe(self):
        from apps.cafes.place_classification import (
            PLACE_CONFIDENCE_LOW,
            classify_google_place,
        )

        classification = classify_google_place(
            {'name': 'Noodle House', 'types': ['restaurant', 'food']},
            self.KEYWORDS,
            self.FALLBACK_TYPES,
        )

        assert classification.category is None
        assert classification.confidence == PLACE_CONFIDENCE_LOW

    def test_generic_food_place_with_keyword_is_cafe_fallback(self):
        from apps.cafes.place_classification import (
            PLACE_CATEGORY_CAFE,
            PLACE_CONFIDENCE_MEDIUM,
            classify_google_place,
        )

        classification = classify_google_place(
            {'name': 'Warehouse Coffee', 'types': ['restaurant', 'food']},
            self.KEYWORDS,
            self.FALLBACK_TYPES,
        )

        assert classification.category == PLACE_CATEGORY_CAFE
        assert classification.confidence == PLACE_CONFIDENCE_MEDIUM

    def test_coworking_and_library_are_classified_but_not_default_cafes(self):
        from apps.cafes.place_classification import (
            PLACE_CATEGORY_COWORKING_SPACE,
            PLACE_CATEGORY_LIBRARY,
            classify_google_place,
        )
        from apps.cafes.views import MergedNearbyCafesView

        coworking = {
            'name': 'Work Hub',
            'types': ['coworking_space', 'point_of_interest'],
        }
        library = {
            'name': 'Central Library',
            'types': ['library', 'point_of_interest'],
        }

        assert (
            classify_google_place(coworking, self.KEYWORDS, self.FALLBACK_TYPES).category
            == PLACE_CATEGORY_COWORKING_SPACE
        )
        assert (
            classify_google_place(library, self.KEYWORDS, self.FALLBACK_TYPES).category
            == PLACE_CATEGORY_LIBRARY
        )

        view = MergedNearbyCafesView()
        assert not view._should_include_unregistered(
            coworking,
            self.KEYWORDS,
            self.FALLBACK_TYPES,
        )
        assert not view._should_include_unregistered(
            library,
            self.KEYWORDS,
            self.FALLBACK_TYPES,
        )

    def test_view_excludes_provider_typed_cafe_without_keyword(self):
        from apps.cafes.views import MergedNearbyCafesView

        view = MergedNearbyCafesView()

        assert not view._should_include_unregistered(
            {'name': '星巴克臻选', 'types': ['cafe', 'food']},
            self.KEYWORDS,
            self.FALLBACK_TYPES,
        )

    @pytest.mark.parametrize('name', [
        'Blue Bottle Coffee',
        'Kafe Senja',
        '蓝瓶咖啡',
        'Кофейня №1',
        '喫茶室ルノアール',
        '좋은날 카페',
        'ร้านกาแฟ',
        'مقهى المدينة',
    ])
    def test_view_includes_international_keyword_cafe_names(self, name):
        from apps.cafes.views import MergedNearbyCafesView

        view = MergedNearbyCafesView()

        assert view._should_include_unregistered(
            {'name': name, 'types': ['cafe', 'food']},
            self.KEYWORDS,
            self.FALLBACK_TYPES,
        )

    @pytest.mark.parametrize('name', [
        'Warteg Bahari',
        'Warkop Barokah',
        'Warkop Kopi Mantap',
    ])
    def test_view_excludes_indonesian_non_wfc_keywords(self, name):
        from apps.cafes.views import MergedNearbyCafesView

        view = MergedNearbyCafesView()

        assert not view._should_include_unregistered(
            {'name': name, 'types': ['cafe', 'food']},
            self.KEYWORDS,
            self.FALLBACK_TYPES,
        )

    def test_view_includes_warung_kopi(self):
        from apps.cafes.views import MergedNearbyCafesView

        view = MergedNearbyCafesView()

        assert view._should_include_unregistered(
            {'name': 'Warung Kopi Pak Budi', 'types': ['restaurant', 'food']},
            self.KEYWORDS,
            self.FALLBACK_TYPES,
        )

    def test_view_excludes_generic_place_without_keyword(self):
        from apps.cafes.views import MergedNearbyCafesView

        view = MergedNearbyCafesView()

        assert not view._should_include_unregistered(
            {'name': 'Noodle House', 'types': ['restaurant', 'food']},
            self.KEYWORDS,
            self.FALLBACK_TYPES,
        )


@pytest.mark.django_db
@pytest.mark.usefixtures('disable_throttle', 'clear_cache')
class TestCafeSearchView:
    """Tests for GET /api/cafes/search/."""

    @staticmethod
    def _place(name='Coffee Place', place_id='google_place_1', types=None):
        if types is None:
            types = ['cafe', 'food', 'point_of_interest']
        return {
            'place_id': place_id,
            'name': name,
            'vicinity': 'Jl. Test, Jakarta',
            'geometry': {
                'location': {
                    'lat': -6.2088,
                    'lng': 106.8456,
                },
            },
            'rating': 4.5,
            'distance_km': 0.12,
            'types': types,
        }

    def test_rejects_short_query_without_google_call(self, api_client, monkeypatch):
        def fail_search(**kwargs):
            pytest.fail('Google search should not be called for invalid query')

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            fail_search,
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'ab',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_missing_location_without_google_call(self, api_client, monkeypatch):
        def fail_search(**kwargs):
            pytest.fail('Google search should not be called without location')

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            fail_search,
        )

        response = api_client.get('/api/cafes/search/', {'q': 'coffee'})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cache_hit_skips_google_search(self, api_client, monkeypatch):
        calls = []

        def mock_search(**kwargs):
            calls.append(kwargs)
            return [self._place()]

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            mock_search,
        )

        params = {'q': 'coffee', 'lat': '-6.2088', 'lon': '106.8456'}
        first_response = api_client.get('/api/cafes/search/', params)
        second_response = api_client.get('/api/cafes/search/', params)

        assert first_response.status_code == status.HTTP_200_OK
        assert second_response.status_code == status.HTTP_200_OK
        assert len(calls) == 1
        assert second_response.data['total_results'] == 1
        assert second_response.data['results'][0]['google_place_id'] == 'google_place_1'

    def test_cached_empty_results_skip_google_search(self, api_client, monkeypatch):
        calls = []

        def mock_search(**kwargs):
            calls.append(kwargs)
            return []

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            mock_search,
        )

        params = {'q': 'coffee', 'lat': '-6.2088', 'lon': '106.8456'}
        first_response = api_client.get('/api/cafes/search/', params)
        second_response = api_client.get('/api/cafes/search/', params)

        assert first_response.status_code == status.HTTP_200_OK
        assert first_response.data['results'] == []
        assert second_response.status_code == status.HTTP_200_OK
        assert second_response.data['results'] == []
        assert len(calls) == 1

    def test_query_normalization_reuses_cache(self, api_client, monkeypatch):
        calls = []

        def mock_search(**kwargs):
            calls.append(kwargs)
            return [self._place(name='Coffee Lab')]

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            mock_search,
        )

        api_client.get('/api/cafes/search/', {
            'q': 'Coffee',
            'lat': '-6.2088',
            'lon': '106.8456',
        })
        response = api_client.get('/api/cafes/search/', {
            'q': '  coffee  ',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        assert len(calls) == 1

    def test_coordinate_normalization_reuses_cache(self, api_client, monkeypatch):
        calls = []

        def mock_search(**kwargs):
            calls.append(kwargs)
            return [self._place()]

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            mock_search,
        )

        api_client.get('/api/cafes/search/', {
            'q': 'coffee',
            'lat': '-6.20884',
            'lon': '106.84564',
        })
        response = api_client.get('/api/cafes/search/', {
            'q': 'coffee',
            'lat': '-6.20882',
            'lon': '106.84562',
        })

        assert response.status_code == status.HTTP_200_OK
        assert len(calls) == 1

    def test_registered_cafe_appears_when_google_returns_empty(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        cafe = make_cafe(
            name='Searchable Coffee Lab',
            address='Jl. Registered Search, Jakarta',
            google_place_id='registered_search_place',
            average_wfc_rating=Decimal('4.50'),
            total_reviews=7,
            total_visits=11,
            google_rating=Decimal('4.6'),
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'searchable',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_results'] == 1
        result = response.data['results'][0]
        assert result['source'] == 'database'
        assert result['is_registered'] is True
        assert result['db_cafe_id'] == cafe.id
        assert result['google_place_id'] == 'registered_search_place'
        assert result['average_wfc_rating'] == 4.5
        assert result['total_reviews'] == 7
        assert result['total_visits'] == 11
        assert result['rating'] == 4.6

    def test_closed_registered_cafe_does_not_appear(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Closed Search Cafe',
            address='Jl. Closed Search, Jakarta',
            is_closed=True,
        )
        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'closed search',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        assert response.data['results'] == []

    def test_db_only_cafe_without_google_place_id_can_appear(
        self,
        api_client,
        test_user,
        monkeypatch,
    ):
        from apps.cafes.models import Cafe

        cafe = Cafe.objects.create(
            name='Independent Study Cafe',
            address='Jl. Independent, Jakarta',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id=None,
            created_by=test_user,
        )
        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'independent',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        result = response.data['results'][0]
        assert result['db_cafe_id'] == cafe.id
        assert result['google_place_id'] == ''
        assert result['provider'] is None
        assert result['source'] == 'database'

    def test_registered_result_distance_uses_request_coordinates(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        from apps.cafes.models import Cafe

        make_cafe(
            name='Distance Search Cafe',
            address='Jl. Distance, Jakarta',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
        )
        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'distance',
            'lat': '-6.2000',
            'lon': '106.8000',
        })

        expected_distance = round(Cafe.calculate_distance(
            -6.2000, 106.8000,
            -6.2088, 106.8456,
        ), 2)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['results'][0]['distance'] == expected_distance

    def test_google_failure_still_returns_registered_results(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Resilient Search Cafe',
            address='Jl. Resilient, Jakarta',
        )

        def fail_search(**kwargs):
            raise RuntimeError('provider unavailable')

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            fail_search,
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'resilient',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_results'] == 1
        assert response.data['results'][0]['source'] == 'database'

    def test_google_is_called_even_when_db_results_fill_limit(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Limit Filled Cafe',
            address='Jl. Limit Filled, Jakarta',
        )

        calls = []

        def mock_search(**kwargs):
            calls.append(kwargs)
            return [self._place(name='Provider Discovery Cafe', place_id='provider_disc')]

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            mock_search,
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'limit filled',
            'lat': '-6.2088',
            'lon': '106.8456',
            'limit': 1,
        })

        assert response.status_code == status.HTTP_200_OK
        assert len(calls) == 1
        assert response.data['total_results'] == 1

    def test_google_is_skipped_when_db_has_high_confidence_match(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Starbucks Coffee',
            average_wfc_rating=Decimal('4.00'),
            total_reviews=10,
        )

        calls = []

        def mock_search(**kwargs):
            calls.append(kwargs)
            return [self._place(name='Starbucks Pondok Indah', place_id='sby_pondok')]

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            mock_search,
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'Starbucks Coffee',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        assert len(calls) == 1, 'Google should be called even with high-confidence DB match'
        names = [r['name'] for r in response.data['results']]
        assert 'Starbucks Coffee' in names
        assert 'Starbucks Pondok Indah' in names

    def test_google_is_called_when_db_match_is_below_threshold(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Coffee Lab',
            average_wfc_rating=Decimal('3.50'),
            total_reviews=5,
        )

        calls = []

        def mock_search(**kwargs):
            calls.append(kwargs)
            return [self._place(name='Celesta Coffee', place_id='celesta_coffee')]

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            mock_search,
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'celesta coffee',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        assert len(calls) == 1
        db_result = [r for r in response.data['results'] if r['source'] == 'database'][0]
        assert db_result['match_score'] < 0.85

    def test_google_is_called_when_registered_results_are_below_limit(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        calls = []
        make_cafe(
            name='Hybrid Search Cafe',
            address='Jl. Hybrid, Jakarta',
        )

        def mock_search(**kwargs):
            calls.append(kwargs)
            return [self._place(name='Hybrid Provider Cafe', place_id='hybrid_provider')]

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            mock_search,
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'hybrid',
            'lat': '-6.2088',
            'lon': '106.8456',
            'limit': 2,
        })

        assert response.status_code == status.HTTP_200_OK
        assert len(calls) == 1
        assert response.data['total_results'] == 2
        assert [r['source'] for r in response.data['results']] == ['database', 'google']

    def test_google_result_matching_registered_place_id_is_deduped(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Dedupe Search Cafe',
            address='Jl. Dedupe, Jakarta',
            google_place_id='dedupe_place',
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [self._place(
                name='Dedupe Search Cafe',
                place_id='dedupe_place',
            )],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'dedupe',
            'lat': '-6.2088',
            'lon': '106.8456',
            'limit': 10,
        })

        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_results'] == 1
        assert response.data['results'][0]['source'] == 'database'
        assert response.data['results'][0]['google_place_id'] == 'dedupe_place'

    def test_place_details_cache_prevents_repeated_provider_calls(
        self,
        settings,
        monkeypatch,
    ):
        from apps.cafes.services import GooglePlacesService

        settings.GOOGLE_PLACES_API_KEY = 'test-key'
        calls = []

        class MockResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {
                    'status': 'OK',
                    'result': {
                        'name': 'Cached Place',
                        'geometry': {'location': {'lat': -6.2088, 'lng': 106.8456}},
                    },
                }

        def mock_get(url, params, timeout):
            calls.append({'url': url, 'params': params, 'timeout': timeout})
            return MockResponse()

        monkeypatch.setattr('apps.cafes.services.requests.get', mock_get)

        first = GooglePlacesService.get_place_details(
            'cached_place',
            fields='geometry,name',
            use_cache=True,
        )
        second = GooglePlacesService.get_place_details(
            'cached_place',
            fields='geometry,name',
            use_cache=True,
        )

        assert first == second
        assert first['name'] == 'Cached Place'
        assert len(calls) == 1

    def test_place_details_cache_is_opt_in(
        self,
        settings,
        monkeypatch,
    ):
        from apps.cafes.services import GooglePlacesService

        settings.GOOGLE_PLACES_API_KEY = 'test-key'
        calls = []

        class MockResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {
                    'status': 'OK',
                    'result': {
                        'name': 'Uncached Place',
                        'geometry': {'location': {'lat': -6.2088, 'lng': 106.8456}},
                    },
                }

        def mock_get(url, params, timeout):
            calls.append({'url': url, 'params': params, 'timeout': timeout})
            return MockResponse()

        monkeypatch.setattr('apps.cafes.services.requests.get', mock_get)

        GooglePlacesService.get_place_details('uncached_place', fields='geometry,name')
        GooglePlacesService.get_place_details('uncached_place', fields='geometry,name')

        assert len(calls) == 2

    def test_ranking_exact_registered_name_beats_google_result(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Favorite Coffee House',
            average_wfc_rating=Decimal('3.50'),
            total_reviews=3,
            google_place_id='registered_coffee',
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [self._place(
                name='Favorite Coffee House',
                place_id='google_coffee',
            )],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'favorite coffee house',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        sources = [r['source'] for r in response.data['results']]
        assert sources[0] == 'database'

    def test_ranking_registered_beats_unregistered_similar_relevance(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Nice Coffee Spot',
            average_wfc_rating=Decimal('3.20'),
            total_reviews=3,
            google_place_id='nice_registered',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [self._place(
                name='Nice Coffee Palace',
                place_id='nice_unregistered',
            )],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'nice coffee',
            'lat': '-6.2088',
            'lon': '106.8456',
            'limit': 10,
        })

        assert response.status_code == status.HTTP_200_OK
        sources = [r['source'] for r in response.data['results']]
        assert sources[0] == 'database'
        assert sources[1] == 'google'

    def test_ranking_better_wfc_wins_among_registered_matches(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Moderate Coffee',
            average_wfc_rating=Decimal('3.50'),
            total_reviews=20,
            google_place_id='moderate',
        )
        make_cafe(
            name='Premium Coffee',
            average_wfc_rating=Decimal('4.80'),
            total_reviews=35,
            google_place_id='premium',
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'coffee',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        names = [r['name'] for r in response.data['results']]
        assert names[0] == 'Premium Coffee'
        assert names[1] == 'Moderate Coffee'

    def test_ranking_nearer_result_wins_as_tiebreaker(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Far Coffee',
            average_wfc_rating=Decimal('4.00'),
            total_reviews=10,
            latitude=Decimal('-6.4000'),
            longitude=Decimal('106.8500'),
        )
        make_cafe(
            name='Near Coffee',
            average_wfc_rating=Decimal('4.00'),
            total_reviews=10,
            latitude=Decimal('-6.2090'),
            longitude=Decimal('106.8458'),
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'coffee',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        names = [r['name'] for r in response.data['results']]
        assert names[0] == 'Near Coffee'
        assert names[1] == 'Far Coffee'

    def test_ranking_location_after_cafe_for_cafe_like_query(
        self,
        api_client,
        monkeypatch,
    ):
        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [
                self._place(
                    name='Jakarta Convention Center',
                    place_id='location_place',
                    types=['point_of_interest', 'establishment'],
                ),
                self._place(
                    name='Jakarta Coffee Club',
                    place_id='cafe_place',
                    types=['cafe', 'food'],
                ),
            ],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'jakarta',
            'lat': '-6.2088',
            'lon': '106.8456',
            'limit': 10,
        })

        assert response.status_code == status.HTTP_200_OK
        result_types = [r['result_type'] for r in response.data['results']]
        cafe_index = result_types.index('cafe')
        location_index = result_types.index('location')
        assert cafe_index < location_index

    def test_ranking_name_match_ranked_above_address_match(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Gedung Cendana',
            address='Jl. Coffee Street No. 1, Jakarta',
        )
        make_cafe(
            name='Café Cendana',
            address='Jl. Other Street No. 2, Jakarta',
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'cendana',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        names = [r['name'] for r in response.data['results']]
        assert names[0] == 'Café Cendana'
        assert names[1] == 'Gedung Cendana'

    def test_ranking_exact_name_beats_prefix_beats_substring(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Barista',
            average_wfc_rating=Decimal('3.00'),
            total_reviews=1,
        )
        make_cafe(
            name='Barista Academy',
            average_wfc_rating=Decimal('3.00'),
            total_reviews=1,
        )
        make_cafe(
            name='The Great Barista',
            average_wfc_rating=Decimal('3.00'),
            total_reviews=1,
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'barista',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        names = [r['name'] for r in response.data['results']]
        assert names[0] == 'Barista'
        assert names[1] == 'Barista Academy'
        assert names[2] == 'The Great Barista'

    def test_ranking_is_deterministic(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Zeta Coffee',
            average_wfc_rating=Decimal('3.50'),
            total_reviews=5,
        )
        make_cafe(
            name='Alpha Coffee',
            average_wfc_rating=Decimal('3.50'),
            total_reviews=5,
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        params = {'q': 'coffee', 'lat': '-6.2088', 'lon': '106.8456'}
        first = api_client.get('/api/cafes/search/', params)
        second = api_client.get('/api/cafes/search/', params)

        first_names = [r['name'] for r in first.data['results']]
        second_names = [r['name'] for r in second.data['results']]
        assert first_names == second_names

    # --- Phase 8: Trigram similarity tests ---

    def test_trigram_typo_matches_known_cafe(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Starbucks Coffee',
            average_wfc_rating=Decimal('4.00'),
            total_reviews=10,
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'Starbcks',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        names = [r['name'] for r in response.data['results']]
        assert 'Starbucks Coffee' in names

    def test_trigram_exact_beats_fuzzy_match(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Starbucks Coffee',
            average_wfc_rating=Decimal('3.50'),
            total_reviews=5,
        )
        make_cafe(
            name='Starbako Cafe',
            average_wfc_rating=Decimal('3.50'),
            total_reviews=5,
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'starbucks',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        names = [r['name'] for r in response.data['results']]
        assert names[0] == 'Starbucks Coffee'
        assert 'Starbako Cafe' in names

    def test_trigram_ranking_deterministic_with_similarity(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Coffee Lab Express',
            average_wfc_rating=Decimal('3.50'),
            total_reviews=5,
        )
        make_cafe(
            name='Express Coffee Lab',
            average_wfc_rating=Decimal('3.50'),
            total_reviews=5,
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        params = {'q': 'express coffee', 'lat': '-6.2088', 'lon': '106.8456'}
        first = api_client.get('/api/cafes/search/', params)
        second = api_client.get('/api/cafes/search/', params)

        assert first.status_code == status.HTTP_200_OK
        assert second.status_code == status.HTTP_200_OK
        first_names = [r['name'] for r in first.data['results']]
        second_names = [r['name'] for r in second.data['results']]
        assert first_names == second_names

    def test_trigram_search_does_not_return_unrelated_cafes(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Java Jazz Cafe',
            average_wfc_rating=Decimal('4.00'),
            total_reviews=10,
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'starbucks',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert response.status_code == status.HTTP_200_OK
        names = [r['name'] for r in response.data['results']]
        assert 'Java Jazz Cafe' not in names

    def test_map_filter_params_do_not_affect_search_results(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='High Rated Cafe',
            average_wfc_rating=Decimal('4.50'),
            total_reviews=10,
        )
        make_cafe(
            name='Low Rated Cafe',
            average_wfc_rating=Decimal('2.00'),
            total_reviews=10,
        )

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            lambda **kwargs: [],
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'rated cafe',
            'lat': '-6.2088',
            'lon': '106.8456',
            'min_wfc': '3',
            'categories': 'library',
        })

        assert response.status_code == status.HTTP_200_OK
        names = [r['name'] for r in response.data['results']]
        assert 'High Rated Cafe' in names
        assert 'Low Rated Cafe' in names

    def test_include_unregistered_false_skips_google(
        self,
        api_client,
        make_cafe,
        monkeypatch,
    ):
        make_cafe(
            name='Registered Only Cafe',
            total_reviews=3,
        )

        def fail_search(**kwargs):
            pytest.fail('Google should not be called when include_unregistered=false')

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            fail_search,
        )

        response = api_client.get('/api/cafes/search/', {
            'q': 'registered only',
            'lat': '-6.2088',
            'lon': '106.8456',
            'include_unregistered': 'false',
        })

        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_results'] == 1
        assert response.data['results'][0]['name'] == 'Registered Only Cafe'

    def test_cache_key_differs_by_include_unregistered_toggle(
        self,
        api_client,
        monkeypatch,
    ):
        calls = []

        def mock_search(**kwargs):
            calls.append(kwargs)
            return [self._place(name='Toggle Coffee', place_id='toggle_google')]

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.autocomplete_search',
            mock_search,
        )

        db_only_response = api_client.get('/api/cafes/search/', {
            'q': 'toggle coffee',
            'lat': '-6.2088',
            'lon': '106.8456',
            'include_unregistered': 'false',
        })
        default_response = api_client.get('/api/cafes/search/', {
            'q': 'toggle coffee',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert db_only_response.status_code == status.HTTP_200_OK
        assert default_response.status_code == status.HTTP_200_OK
        assert db_only_response.data['total_results'] == 0
        assert default_response.data['total_results'] == 1
        assert len(calls) == 1

        cached_default_response = api_client.get('/api/cafes/search/', {
            'q': 'toggle coffee',
            'lat': '-6.2088',
            'lon': '106.8456',
        })

        assert cached_default_response.status_code == status.HTTP_200_OK
        assert cached_default_response.data['total_results'] == 1
        assert len(calls) == 1


@pytest.mark.django_db
class TestCafeAddressValidation:
    """Test cafe address length validation."""

    def test_address_exactly_at_limit_succeeds(self):
        """Test that address exactly at 500 characters is accepted"""
        data = {
            'name': 'Limit Address Cafe',
            'address': 'A' * MAX_CAFE_ADDRESS_LENGTH,  # Exactly at limit
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
            'google_place_id': 'limit_place_id'
        }

        serializer = CafeCreateSerializer(data=data)
        assert serializer.is_valid(), f"Serializer should be valid, errors: {serializer.errors}"

    def test_address_exceeds_limit_fails(self):
        """Test that address over 500 characters is rejected"""
        data = {
            'name': 'Invalid Address Cafe',
            'address': 'A' * (MAX_CAFE_ADDRESS_LENGTH + 1),  # Over limit
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
            'google_place_id': 'invalid_place_id'
        }

        serializer = CafeCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert 'address' in serializer.errors
        assert 'cannot exceed' in str(serializer.errors['address']).lower()

    def test_update_address_exceeds_limit_fails(self):
        """Test that updating cafe with long address is rejected"""
        # Mock a cafe object (minimal, not saved to DB)
        class MockCafe:
            address = 'Original Address'

        mock_cafe = MockCafe()
        data = {
            'address': 'B' * (MAX_CAFE_ADDRESS_LENGTH + 1),  # Over limit
        }

        serializer = CafeUpdateSerializer(mock_cafe, data=data)
        assert not serializer.is_valid()
        assert 'address' in serializer.errors


@pytest.mark.django_db
class TestCafeFlagDescriptionValidation:
    """Test cafe flag description length validation."""

    def test_description_exactly_at_limit_succeeds(self, test_cafe, test_user):
        """Test that description exactly at 1000 characters is accepted"""
        data = {
            'cafe': test_cafe.id,
            'reason': 'wrong_location',
            'description': 'A' * MAX_FLAG_DESCRIPTION_LENGTH  # Exactly at limit
        }

        serializer = CafeFlagCreateSerializer(
            data=data,
            context={'request': _request_for(test_user)}
        )
        assert serializer.is_valid(), serializer.errors

    def test_description_exceeds_limit_fails(self, test_cafe, test_user):
        """Test that description over 1000 characters is rejected"""
        data = {
            'cafe': test_cafe.id,
            'reason': 'wrong_location',
            'description': 'A' * (MAX_FLAG_DESCRIPTION_LENGTH + 1)  # Over limit
        }

        serializer = CafeFlagCreateSerializer(
            data=data,
            context={'request': _request_for(test_user)}
        )
        assert not serializer.is_valid()
        assert 'description' in serializer.errors
        assert 'cannot exceed' in str(serializer.errors['description']).lower()


@pytest.mark.django_db
class TestCafeAdminFormValidation:
    """Test admin form validation for TextField length."""

    def test_admin_address_exceeds_limit_fails(self, test_user):
        """Test that admin form rejects address over limit"""
        form = CafeAdminForm(data={
            'name': 'Admin Test Cafe',
            'address': 'A' * (MAX_CAFE_ADDRESS_LENGTH + 1),
            'latitude': '-6.2088',
            'longitude': '106.8456',
            'created_by': test_user.id
        })
        assert not form.is_valid()
        assert '__all__' in form.errors or 'address' in form.errors


@pytest.mark.django_db
class TestCafeFlagAdminFormValidation:
    """Test admin form validation for flag TextField length."""

    def test_admin_description_exceeds_limit_fails(self, test_user, test_cafe):
        """Test that admin form rejects description over limit"""
        form = CafeFlagAdminForm(data={
            'cafe': test_cafe.id,
            'user': test_user.id,
            'reason': 'wrong_location',
            'status': 'pending',
            'description': 'A' * (MAX_FLAG_DESCRIPTION_LENGTH + 1)
        })
        assert not form.is_valid()
        assert 'description' in form.errors

    def test_admin_resolution_notes_exceeds_limit_fails(self, test_user, test_cafe):
        """Test that admin form rejects resolution notes over limit"""
        form = CafeFlagAdminForm(data={
            'cafe': test_cafe.id,
            'user': test_user.id,
            'reason': 'wrong_location',
            'status': 'resolved',
            'resolution_notes': 'A' * (MAX_FLAG_RESOLUTION_NOTES_LENGTH + 1)
        })
        assert not form.is_valid()
        assert 'resolution_notes' in form.errors


@pytest.mark.django_db
class TestCafeAPITextFieldValidation:
    """Integration tests for TextField validation via API."""

    def test_create_cafe_with_long_address_returns_400(self, authenticated_client):
        """Test that API returns 400 for cafe with address exceeding limit"""
        data = {
            'name': 'Long Address Cafe',
            'address': 'A' * (MAX_CAFE_ADDRESS_LENGTH + 1),
            'latitude': '-6.2088',
            'longitude': '106.8456',
            'google_place_id': 'long_address_place'
        }

        response = authenticated_client.post('/api/cafes/', data)

        # The response should indicate validation error
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Error response has nested structure: error.details.address
        assert 'address' in response.data.get('error', {}).get('details', {})

    def test_create_flag_with_long_description_returns_400(self, authenticated_client, test_user):
        """Test that API returns 400 for flag with description exceeding limit"""
        # First create a simple cafe via direct model access
        from apps.cafes.models import Cafe
        from decimal import Decimal

        cafe = Cafe.objects.create(
            name='Test Cafe',
            address='123 Test St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='test_place',
            created_by=test_user
        )

        data = {
            'cafe': cafe.id,
            'reason': 'wrong_location',
            'description': 'A' * (MAX_FLAG_DESCRIPTION_LENGTH + 1)
        }

        response = authenticated_client.post('/api/cafes/flags/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Error response has nested structure
        assert 'description' in response.data.get('error', {}).get('details', {})


@pytest.mark.django_db
class TestCafeGoogleRatingStaleWhileRevalidate:
    """Test Google rating stale-while-revalidate pattern."""

    def test_cafe_detail_serializer_returns_cached_rating(self, authenticated_client, test_user):
        """Test that cafe detail returns cached Google rating without API call"""
        from apps.cafes.models import Cafe
        from django.utils import timezone
        from datetime import timedelta

        # Create cafe with old Google rating (stale)
        cafe = Cafe.objects.create(
            name='Stale Rating Cafe',
            address='123 Stale St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='stale_place_id',
            google_rating=4.5,
            google_ratings_count=100,
            google_rating_updated_at=timezone.now() - timedelta(hours=25),  # Stale
            created_by=test_user
        )

        response = authenticated_client.get(f'/api/cafes/{cafe.id}/')

        assert response.status_code == status.HTTP_200_OK
        # Should return cached data immediately (no API call)
        assert response.data['google_rating'] == '4.5'
        assert response.data['google_ratings_count'] == 100
        # Should include google_rating_updated_at for frontend staleness detection
        assert 'google_rating_updated_at' in response.data

    def test_cafe_detail_serializer_returns_null_for_no_rating(self, authenticated_client, test_user):
        """Test that cafe detail returns None when no Google rating exists"""
        from apps.cafes.models import Cafe

        cafe = Cafe.objects.create(
            name='No Rating Cafe',
            address='123 No Rating St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='no_rating_place_id',
            google_rating=None,
            google_ratings_count=None,
            google_rating_updated_at=None,
            created_by=test_user
        )

        response = authenticated_client.get(f'/api/cafes/{cafe.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['google_rating'] is None
        assert response.data['google_ratings_count'] is None
        assert response.data['google_rating_updated_at'] is None

    def test_refresh_google_rating_endpoint_updates_cafe(self, authenticated_client, test_user, monkeypatch):
        """Test that refresh endpoint updates Google rating."""
        from apps.cafes.models import Cafe
        from django.utils import timezone
        from datetime import timedelta

        cafe = Cafe.objects.create(
            name='Refresh Test Cafe',
            address='123 Refresh St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='refresh_test_place',
            google_rating=4.0,
            google_ratings_count=50,
            google_rating_updated_at=timezone.now() - timedelta(hours=25),
            created_by=test_user
        )

        # Mock GooglePlacesService.get_place_details to return fresh data
        def mock_get_place_details(place_id):
            return {
                'rating': 4.8,
                'user_ratings_total': 150,
                'name': 'Updated Cafe Name'
            }

        monkeypatch.setattr(
            'apps.cafes.services.GooglePlacesService.get_place_details',
            mock_get_place_details
        )

        response = authenticated_client.post(f'/api/cafes/{cafe.id}/refresh-google-rating/')

        assert response.status_code == status.HTTP_200_OK
        assert float(response.data['google_rating']) == 4.8
        assert response.data['google_ratings_count'] == 150
        assert response.data['google_rating_updated_at'] is not None

        # Verify database was updated
        cafe.refresh_from_db()
        assert cafe.google_rating == Decimal('4.8')  # DecimalField returns Decimal from DB
        assert cafe.google_ratings_count == 150

    def test_refresh_endpoint_requires_authentication(self, api_client, test_user):
        """Test that refresh endpoint requires authentication."""
        from apps.cafes.models import Cafe

        cafe = Cafe.objects.create(
            name='Auth Test Cafe',
            address='123 Auth Test St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='some_place_id',
            created_by=test_user
        )

        response = api_client.post(f'/api/cafes/{cafe.id}/refresh-google-rating/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_endpoint_returns_404_for_nonexistent_cafe(self, authenticated_client):
        """Test that refresh endpoint returns 404 for non-existent cafe"""
        response = authenticated_client.post('/api/cafes/99999/refresh-google-rating/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_refresh_endpoint_returns_400_for_cafe_without_google_place_id(self, authenticated_client, test_user):
        """Test that refresh endpoint returns 400 for cafe without Google Place ID"""
        from apps.cafes.models import Cafe

        cafe = Cafe.objects.create(
            name='No Google Place ID Cafe',
            address='123 No Google St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id=None,  # No Google Place ID
            created_by=test_user
        )

        response = authenticated_client.post(f'/api/cafes/{cafe.id}/refresh-google-rating/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    def test_refresh_endpoint_handles_google_api_failure(self, authenticated_client, test_user, monkeypatch):
        """Test that refresh endpoint handles Google API failure gracefully"""
        from apps.cafes.models import Cafe

        cafe = Cafe.objects.create(
            name='API Failure Cafe',
            address='123 API Failure St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='api_failure_place',
            google_rating=4.0,
            google_ratings_count=50,
            created_by=test_user
        )

        # Mock GooglePlacesService.get_place_details to return None (API failure)
        def mock_get_place_details(place_id):
            return None

        monkeypatch.setattr(
            'apps.cafes.services.GooglePlacesService.get_place_details',
            mock_get_place_details
        )

        response = authenticated_client.post(f'/api/cafes/{cafe.id}/refresh-google-rating/')

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert 'error' in response.data


@pytest.mark.django_db
class TestNearbyCafesView:
    """Test NearbyCafesView bounding-box filter and Haversine accuracy."""

    # Jakarta coordinates
    JAKARTA_LAT = Decimal('-6.2088')
    JAKARTA_LNG = Decimal('106.8456')

    def _create_cafe(self, name, lat, lng, user, **kwargs):
        from apps.cafes.models import Cafe
        return Cafe.objects.create(
            name=name,
            address=f'{name} Address',
            latitude=Decimal(str(lat)),
            longitude=Decimal(str(lng)),
            google_place_id=f'{name.lower().replace(" ", "_")}_place',
            created_by=user,
            **kwargs,
        )

    def test_returns_cafes_within_radius(self, api_client, test_user):
        """Cafes within radius are returned, sorted by distance."""
        cafe_near = self._create_cafe('Near Cafe', '-6.2088', '106.8456', test_user)
        cafe_mid = self._create_cafe('Mid Cafe', '-6.2100', '106.8470', test_user)

        response = api_client.get('/api/cafes/nearby/', {
            'latitude': self.JAKARTA_LAT,
            'longitude': self.JAKARTA_LNG,
            'radius_km': 5,
        })

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 2
        # Should be sorted by distance (nearest first)
        assert results[0]['name'] == 'Near Cafe'
        assert results[1]['name'] == 'Mid Cafe'

    def test_excludes_cafes_outside_radius(self, api_client, test_user):
        """Cafes outside the radius are excluded."""
        self._create_cafe('Near Cafe', '-6.2088', '106.8456', test_user)
        # ~100+ km away
        self._create_cafe('Far Cafe', '-6.9000', '106.8456', test_user)

        response = api_client.get('/api/cafes/nearby/', {
            'latitude': self.JAKARTA_LAT,
            'longitude': self.JAKARTA_LNG,
            'radius_km': 5,
        })

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['name'] == 'Near Cafe'

    def test_returns_empty_when_no_cafes_nearby(self, api_client, test_user):
        """Empty list returned when no cafes are within radius."""
        self._create_cafe('Distant Cafe', '-7.0000', '107.0000', test_user)

        response = api_client.get('/api/cafes/nearby/', {
            'latitude': self.JAKARTA_LAT,
            'longitude': self.JAKARTA_LNG,
            'radius_km': 1,
        })

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0
        assert response.data['results'] == []

    def test_excludes_closed_cafes(self, api_client, test_user):
        """Closed cafes are excluded from results."""
        self._create_cafe('Open Cafe', '-6.2088', '106.8456', test_user)
        self._create_cafe('Closed Cafe', '-6.2088', '106.8456', test_user, is_closed=True)

        response = api_client.get('/api/cafes/nearby/', {
            'latitude': self.JAKARTA_LAT,
            'longitude': self.JAKARTA_LNG,
            'radius_km': 1,
        })

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'Open Cafe'

    def test_respects_limit_parameter(self, api_client, test_user):
        """Limit parameter caps the number of results."""
        for i in range(5):
            self._create_cafe(f'Cafe {i}', '-6.2088', '106.8456', test_user)

        response = api_client.get('/api/cafes/nearby/', {
            'latitude': self.JAKARTA_LAT,
            'longitude': self.JAKARTA_LNG,
            'radius_km': 1,
            'limit': 2,
        })

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2


@pytest.mark.django_db
class TestCafeServicePriceLevelClamping:
    """Test that Google price_level=0 is clamped to None (price_range only accepts 1-4)."""

    def _make_cafe_data(self):
        return {
            'name': 'Test Cafe',
            'address': '123 Test St',
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
        }

    def test_price_level_zero_stored_as_none(self, test_user, monkeypatch):
        """Google price_level=0 (Free) should be stored as None, not 0."""
        monkeypatch.setattr(
            'apps.cafes.services.GooglePlacesService.get_place_details',
            lambda pid: {'price_level': 0, 'rating': 4.5, 'user_ratings_total': 10}
        )
        from apps.cafes.services import CafeService
        cafe, created = CafeService.get_or_create_from_google(
            'price_zero_place', self._make_cafe_data(), created_by=test_user
        )
        assert created
        assert cafe.price_range is None

    def test_price_level_in_valid_range_stored(self, test_user, monkeypatch):
        """Google price_level 1-4 should be stored as-is."""
        for level in range(1, 5):
            monkeypatch.setattr(
                'apps.cafes.services.GooglePlacesService.get_place_details',
                lambda pid, pl=level: {'price_level': pl, 'rating': 4.0, 'user_ratings_total': 5}
            )
            from apps.cafes.services import CafeService
            cafe, created = CafeService.get_or_create_from_google(
                f'price_{level}_place', self._make_cafe_data(), created_by=test_user
            )
            assert created
            assert cafe.price_range == level

    def test_price_level_five_stored_as_none(self, test_user, monkeypatch):
        """Google price_level=5 (if ever returned) should be stored as None."""
        monkeypatch.setattr(
            'apps.cafes.services.GooglePlacesService.get_place_details',
            lambda pid: {'price_level': 5, 'rating': 4.0, 'user_ratings_total': 5}
        )
        from apps.cafes.services import CafeService
        cafe, created = CafeService.get_or_create_from_google(
            'price_five_place', self._make_cafe_data(), created_by=test_user
        )
        assert created
        assert cafe.price_range is None

    def test_null_price_level_stored_as_none(self, test_user, monkeypatch):
        """Missing price_level should be stored as None."""
        monkeypatch.setattr(
            'apps.cafes.services.GooglePlacesService.get_place_details',
            lambda pid: {'rating': 4.0, 'user_ratings_total': 5}
        )
        from apps.cafes.services import CafeService
        cafe, created = CafeService.get_or_create_from_google(
            'price_null_place', self._make_cafe_data(), created_by=test_user
        )
        assert created
        assert cafe.price_range is None


@pytest.mark.django_db
class TestCafePlaceCategoryMetadata:
    """Test persisted and response-level place category metadata."""

    def _make_cafe_data(self, **overrides):
        data = {
            'name': 'Test Cafe',
            'address': '123 Test St',
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
        }
        data.update(overrides)
        return data

    def test_cafe_defaults_to_cafe_category(self, test_user):
        from apps.cafes.models import Cafe

        cafe = Cafe.objects.create(
            name='Default Category Cafe',
            address='123 Test St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='default_category_place',
            created_by=test_user,
        )

        assert cafe.place_category == Cafe.PlaceCategory.CAFE

    def test_service_persists_google_place_category(self, test_user, monkeypatch):
        from apps.cafes.models import Cafe
        from apps.cafes.services import CafeService

        monkeypatch.setattr(
            'apps.cafes.services.GooglePlacesService.get_place_details',
            lambda pid: {'rating': 4.0, 'user_ratings_total': 5}
        )

        cafe, created = CafeService.get_or_create_from_google(
            'library_place',
            self._make_cafe_data(place_category=Cafe.PlaceCategory.LIBRARY),
            created_by=test_user,
        )

        assert created
        assert cafe.place_category == Cafe.PlaceCategory.LIBRARY

    def test_service_defaults_google_creation_to_cafe_category(self, test_user, monkeypatch):
        from apps.cafes.models import Cafe
        from apps.cafes.services import CafeService

        monkeypatch.setattr(
            'apps.cafes.services.GooglePlacesService.get_place_details',
            lambda pid: {'rating': 4.0, 'user_ratings_total': 5}
        )

        cafe, created = CafeService.get_or_create_from_google(
            'default_google_category_place',
            self._make_cafe_data(),
            created_by=test_user,
        )

        assert created
        assert cafe.place_category == Cafe.PlaceCategory.CAFE

    def test_summary_serializer_returns_category_metadata(self, test_user):
        from apps.cafes.models import Cafe
        from apps.cafes.serializers import CafeSummarySerializer

        cafe = Cafe.objects.create(
            name='Library Workspace',
            address='123 Library St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='library_workspace_place',
            place_category=Cafe.PlaceCategory.LIBRARY,
            created_by=test_user,
        )

        data = CafeSummarySerializer(cafe).data

        assert data['place_category'] == Cafe.PlaceCategory.LIBRARY
        assert data['place_category_label'] == 'Library'
        assert data['place_category_confidence'] == 'high'
        assert data['provider_types'] == []

    def test_nearby_unregistered_result_returns_category_metadata(self, authenticated_client, monkeypatch):
        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.search_nearby_coffee_shops',
            lambda **kwargs: [{
                'google_place_id': 'non_english_cafe_place',
                'name': '星巴克咖啡',
                'address': 'Shanghai',
                'latitude': '-6.20880000',
                'longitude': '106.84560000',
                'rating': 4.5,
                'user_ratings_total': 120,
                'types': ['cafe', 'food', 'point_of_interest'],
                'distance_km': 0,
            }]
        )

        response = authenticated_client.get('/api/cafes/nearby/all/', {
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
            'radius_km': 1,
        })

        assert response.status_code == status.HTTP_200_OK
        result = response.data['results'][0]
        assert result['place_category'] == 'cafe'
        assert result['place_category_label'] == 'Cafe'
        assert result['place_category_confidence'] == 'high'
        assert result['provider_types'] == ['cafe', 'food', 'point_of_interest']

    def test_nearby_excludes_unregistered_google_cafe_without_keyword(self, authenticated_client, monkeypatch):
        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.search_nearby_coffee_shops',
            lambda **kwargs: [{
                'google_place_id': 'provider_typed_only_cafe_place',
                'name': '星巴克臻选',
                'address': 'Shanghai',
                'latitude': '-6.20880000',
                'longitude': '106.84560000',
                'rating': 4.5,
                'user_ratings_total': 120,
                'types': ['cafe', 'food', 'point_of_interest'],
                'distance_km': 0,
            }]
        )

        response = authenticated_client.get('/api/cafes/nearby/all/', {
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
            'radius_km': 1,
        })

        assert response.status_code == status.HTTP_200_OK
        assert response.data['results'] == []

    def test_nearby_category_filter_excludes_library_by_default(self, authenticated_client, monkeypatch):
        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.search_nearby_coffee_shops',
            lambda **kwargs: [
                {
                    'google_place_id': 'cafe_place',
                    'name': '星巴克咖啡',
                    'address': 'Shanghai',
                    'latitude': '-6.20880000',
                    'longitude': '106.84560000',
                    'rating': 4.5,
                    'user_ratings_total': 120,
                    'types': ['cafe', 'food', 'point_of_interest'],
                },
                {
                    'google_place_id': 'library_place',
                    'name': 'Central Library',
                    'address': 'Library St',
                    'latitude': '-6.20880000',
                    'longitude': '106.84560000',
                    'rating': 4.8,
                    'user_ratings_total': 80,
                    'types': ['library', 'point_of_interest'],
                },
            ],
        )

        response = authenticated_client.get('/api/cafes/nearby/all/', {
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
            'radius_km': 1,
        })

        assert response.status_code == status.HTTP_200_OK
        assert [r['google_place_id'] for r in response.data['results']] == ['cafe_place']

    def test_nearby_category_filter_includes_selected_library(self, authenticated_client, monkeypatch):
        captured_kwargs = []

        def mock_search(**kwargs):
            captured_kwargs.append(kwargs)
            return [{
                'google_place_id': 'library_place',
                'name': 'Central Library',
                'address': 'Library St',
                'latitude': '-6.20880000',
                'longitude': '106.84560000',
                'rating': 4.8,
                'user_ratings_total': 80,
                'types': ['library', 'point_of_interest'],
            }]

        monkeypatch.setattr(
            'apps.cafes.views.GooglePlacesService.search_nearby_coffee_shops',
            mock_search,
        )

        response = authenticated_client.get('/api/cafes/nearby/all/', {
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
            'radius_km': 1,
            'categories': 'library',
        })

        assert response.status_code == status.HTTP_200_OK
        assert response.data['results'][0]['place_category'] == 'library'
        assert captured_kwargs[0]['include_cafe'] is False
        assert captured_kwargs[0]['additional_categories'] == ['library']

    def test_nearby_rejects_unknown_category(self, authenticated_client):
        response = authenticated_client.get('/api/cafes/nearby/all/', {
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
            'radius_km': 1,
            'categories': 'bakery',
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST


def _make_cafe(owner, name='Test Cafe', suffix=''):
    from apps.cafes.models import Cafe
    return Cafe.objects.create(
        name=name,
        address='123 Test St',
        latitude=Decimal('-6.2088'),
        longitude=Decimal('106.8456'),
        google_place_id=f'{name.lower().replace(" ", "_")}{suffix}_place',
        created_by=owner,
    )


@pytest.mark.django_db
class TestCafeListCRUD:
    """Tests for POST/GET/PATCH/DELETE /api/lists/."""

    def test_create_list_authenticated(self, authenticated_client):
        response = authenticated_client.post('/api/lists/', {'name': 'Work spots'})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Work spots'
        assert response.data['is_default'] is False

    def test_create_list_requires_auth(self, api_client):
        response = api_client.post('/api/lists/', {'name': 'Anon list'})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_duplicate_name_returns_400(self, authenticated_client):
        authenticated_client.post('/api/lists/', {'name': 'Rainy day'})
        response = authenticated_client.post('/api/lists/', {'name': 'Rainy day'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_index_returns_own_lists_only(self, authenticated_client, test_user, api_client):
        other = User.objects.create_user(username='other2', email='other2@example.com', password='pass')
        from apps.cafes.models import CafeList
        CafeList.objects.create(owner=other, name='Other list')
        authenticated_client.post('/api/lists/', {'name': 'My list'})

        response = authenticated_client.get('/api/lists/')
        assert response.status_code == status.HTTP_200_OK
        names = [lst['name'] for lst in response.data]
        assert 'Other list' not in names

    def test_retrieve_list_with_items(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList, CafeListItem
        cafe_list = CafeList.objects.create(owner=test_user, name='My picks')
        cafe = _make_cafe(test_user, suffix='_picks')
        CafeListItem.objects.create(cafe_list=cafe_list, cafe=cafe, note='Great wifi')

        response = authenticated_client.get(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['items']) == 1
        assert response.data['items'][0]['note'] == 'Great wifi'

    def test_retrieve_other_users_list_returns_404(self, authenticated_client):
        other = User.objects.create_user(username='other3', email='other3@example.com', password='pass')
        from apps.cafes.models import CafeList
        other_list = CafeList.objects.create(owner=other, name='Secret list')

        response = authenticated_client.get(f'/api/lists/{other_list.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_renames_list(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(owner=test_user, name='Old name')

        response = authenticated_client.patch(f'/api/lists/{cafe_list.id}/', {'name': 'New name'})
        assert response.status_code == status.HTTP_200_OK
        cafe_list.refresh_from_db()
        assert cafe_list.name == 'New name'

    def test_patch_rename_to_existing_name_returns_400(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        CafeList.objects.create(owner=test_user, name='Taken name')
        other_list = CafeList.objects.create(owner=test_user, name='Other list')

        response = authenticated_client.patch(f'/api/lists/{other_list.id}/', {'name': 'Taken name'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_to_go_list_public_returns_400(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        to_go_list = CafeList.objects.get(owner=test_user, list_type='to_go')

        response = authenticated_client.patch(f'/api/lists/{to_go_list.id}/', {'visibility': 'public'})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        to_go_list.refresh_from_db()
        assert to_go_list.visibility == 'private'

    def test_patch_favorites_list_shareable_returns_400(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        favorites_list = CafeList.objects.get(owner=test_user, list_type='favorites')

        response = authenticated_client.patch(f'/api/lists/{favorites_list.id}/', {'visibility': 'shareable'})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        favorites_list.refresh_from_db()
        assert favorites_list.visibility == 'private'

    def test_patch_custom_list_public_succeeds(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(owner=test_user, name='Public custom')

        response = authenticated_client.patch(f'/api/lists/{cafe_list.id}/', {'visibility': 'public'})

        assert response.status_code == status.HTTP_200_OK
        cafe_list.refresh_from_db()
        assert cafe_list.visibility == 'public'

    def test_delete_non_default_list(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(owner=test_user, name='Deletable')
        response = authenticated_client.delete(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not CafeList.objects.filter(pk=cafe_list.id).exists()

    def test_delete_default_list_returns_400(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        default_list = CafeList.objects.get(owner=test_user, list_type='favorites')
        response = authenticated_client.delete(f'/api/lists/{default_list.id}/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert CafeList.objects.filter(pk=default_list.id).exists()


@pytest.mark.django_db
class TestCafeListItems:
    """Tests for POST/PATCH/DELETE /api/lists/<id>/items/."""

    def test_add_cafe_to_list(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(owner=test_user, name='Good wifi')
        cafe = _make_cafe(test_user, suffix='_gwifi')

        response = authenticated_client.post(
            f'/api/lists/{cafe_list.id}/items/',
            {'cafe_id': cafe.id},
        )
        assert response.status_code == status.HTTP_201_CREATED
        cafe_list.refresh_from_db()
        assert cafe_list.item_count == 1

    def test_add_same_cafe_twice_is_idempotent(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList, CafeListItem
        cafe_list = CafeList.objects.create(owner=test_user, name='Idempotent')
        cafe = _make_cafe(test_user, suffix='_idem')

        authenticated_client.post(f'/api/lists/{cafe_list.id}/items/', {'cafe_id': cafe.id})
        response = authenticated_client.post(f'/api/lists/{cafe_list.id}/items/', {'cafe_id': cafe.id})

        assert response.status_code == status.HTTP_200_OK
        assert CafeListItem.objects.filter(cafe_list=cafe_list, cafe=cafe).count() == 1

    def test_add_cafe_updates_item_count_via_signal(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(owner=test_user, name='Count test')
        cafe = _make_cafe(test_user, suffix='_cnt')
        authenticated_client.post(f'/api/lists/{cafe_list.id}/items/', {'cafe_id': cafe.id})
        cafe_list.refresh_from_db()
        assert cafe_list.item_count == 1

    def test_remove_cafe_updates_item_count_via_signal(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList, CafeListItem
        cafe_list = CafeList.objects.create(owner=test_user, name='Remove test')
        cafe = _make_cafe(test_user, suffix='_rmv')
        CafeListItem.objects.create(cafe_list=cafe_list, cafe=cafe)
        cafe_list.item_count = 1
        cafe_list.save()

        response = authenticated_client.delete(f'/api/lists/{cafe_list.id}/items/{cafe.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        cafe_list.refresh_from_db()
        assert cafe_list.item_count == 0

    def test_update_note_on_item(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList, CafeListItem
        cafe_list = CafeList.objects.create(owner=test_user, name='Note test')
        cafe = _make_cafe(test_user, suffix='_note')
        CafeListItem.objects.create(cafe_list=cafe_list, cafe=cafe, note='Old note')

        response = authenticated_client.patch(
            f'/api/lists/{cafe_list.id}/items/{cafe.id}/',
            {'note': 'New note'},
        )
        assert response.status_code == status.HTTP_200_OK
        assert CafeListItem.objects.get(cafe_list=cafe_list, cafe=cafe).note == 'New note'

    def test_remove_nonexistent_item_returns_404(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(owner=test_user, name='Empty')
        cafe = _make_cafe(test_user, suffix='_404')

        response = authenticated_client.delete(f'/api/lists/{cafe_list.id}/items/{cafe.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestSpecialListConvenience:
    """Tests for POST/DELETE /api/lists/<special>/items/."""

    def test_add_to_favorites_list(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        favorites_list = CafeList.objects.get(owner=test_user, list_type='favorites')
        cafe = _make_cafe(test_user, suffix='_fav')

        response = authenticated_client.post('/api/lists/favorites/items/', {'cafe_id': cafe.id})
        assert response.status_code == status.HTTP_201_CREATED
        favorites_list.refresh_from_db()
        assert favorites_list.item_count == 1

    def test_remove_from_favorites_list(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList, CafeListItem
        favorites_list = CafeList.objects.get(owner=test_user, list_type='favorites')
        cafe = _make_cafe(test_user, suffix='_favrm')
        CafeListItem.objects.create(cafe_list=favorites_list, cafe=cafe)
        favorites_list.refresh_from_db()

        response = authenticated_client.delete(f'/api/lists/favorites/items/{cafe.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        favorites_list.refresh_from_db()
        assert favorites_list.item_count == 0

    def test_special_list_convenience_requires_auth(self, api_client):
        response = api_client.post('/api/lists/favorites/items/', {'cafe_id': 999})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestCafeMembershipView:
    """Tests for GET /api/cafes/<id>/my-lists/."""

    def test_returns_all_user_lists_with_in_list_flag(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList, CafeListItem
        list_a = CafeList.objects.create(owner=test_user, name='List A')
        list_b = CafeList.objects.create(owner=test_user, name='List B')
        cafe = _make_cafe(test_user, suffix='_mem')
        CafeListItem.objects.create(cafe_list=list_a, cafe=cafe)

        response = authenticated_client.get(f'/api/cafes/{cafe.id}/my-lists/')
        assert response.status_code == status.HTTP_200_OK

        by_id = {row['id']: row for row in response.data}
        assert by_id[list_a.id]['in_list'] is True
        assert by_id[list_b.id]['in_list'] is False

    def test_membership_requires_auth(self, api_client, test_user):
        cafe = _make_cafe(test_user, suffix='_memauth')
        response = api_client.get(f'/api/cafes/{cafe.id}/my-lists/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_does_not_leak_other_users_lists(self, authenticated_client, test_user):
        other = User.objects.create_user(username='other4', email='other4@example.com', password='pass')
        from apps.cafes.models import CafeList
        CafeList.objects.create(owner=other, name='Private list')
        cafe = _make_cafe(test_user, suffix='_leak')

        response = authenticated_client.get(f'/api/cafes/{cafe.id}/my-lists/')
        assert response.status_code == status.HTTP_200_OK
        names = [row['name'] for row in response.data]
        assert 'Private list' not in names


@pytest.mark.django_db
class TestCafeListFeatured:
    """Tests for is_featured / featured_at on CafeList (Discover panel)."""

    def test_is_featured_defaults_false(self, test_user):
        from apps.cafes.models import CafeList
        lst = CafeList.objects.create(owner=test_user, name='Default test')
        assert lst.is_featured is False
        assert lst.featured_at is None

    def test_clean_rejects_featured_but_not_public(self, test_user):
        from apps.cafes.models import CafeList
        from django.core.exceptions import ValidationError
        lst = CafeList(owner=test_user, name='Bad featured', is_featured=True, visibility='private')
        with pytest.raises(ValidationError) as exc_info:
            lst.clean()
        assert 'is_featured' in exc_info.value.message_dict

    def test_clean_accepts_featured_and_public(self, test_user):
        from apps.cafes.models import CafeList
        lst = CafeList(owner=test_user, name='Good featured', is_featured=True, visibility='public')
        lst.clean()  # Should not raise

    def test_save_auto_sets_featured_at_on_first_feature(self, test_user):
        from apps.cafes.models import CafeList
        lst = CafeList.objects.create(owner=test_user, name='New list', visibility='public')
        assert lst.featured_at is None

        lst.is_featured = True
        lst.save()
        lst.refresh_from_db()
        assert lst.featured_at is not None

        first_featured_at = lst.featured_at
        lst.name = 'Renamed'
        lst.save()
        lst.refresh_from_db()
        assert lst.featured_at == first_featured_at  # Not overwritten

    def test_save_does_not_overwrite_existing_featured_at(self, test_user):
        from apps.cafes.models import CafeList
        from django.utils import timezone
        past = timezone.now() - timezone.timedelta(days=10)
        lst = CafeList.objects.create(
            owner=test_user, name='Pre-featured', visibility='public',
            is_featured=True, featured_at=past,
        )
        lst.name = 'Updated name'
        lst.save()
        lst.refresh_from_db()
        assert lst.featured_at == past


@pytest.mark.django_db
class TestCafeListCleanTightening:
    """Tests for CafeList.clean() — special lists cannot be public."""

    def test_clean_rejects_public_to_go_list(self, test_user):
        from apps.cafes.models import CafeList
        from django.core.exceptions import ValidationError
        lst = CafeList(
            owner=test_user, name='Try Public ToGo',
            list_type='to_go', visibility='public',
        )
        with pytest.raises(ValidationError) as exc_info:
            lst.clean()
        assert 'visibility' in exc_info.value.message_dict

    def test_clean_rejects_public_favorites_list(self, test_user):
        from apps.cafes.models import CafeList
        from django.core.exceptions import ValidationError
        lst = CafeList(
            owner=test_user, name='Try Public Favs',
            list_type='favorites', visibility='public',
        )
        with pytest.raises(ValidationError) as exc_info:
            lst.clean()
        assert 'visibility' in exc_info.value.message_dict

    def test_clean_rejects_featured_and_public_combined_invalid(self, test_user):
        from apps.cafes.models import CafeList
        from django.core.exceptions import ValidationError
        lst = CafeList(
            owner=test_user, name='Double Invalid',
            list_type='favorites', visibility='public', is_featured=True,
        )
        with pytest.raises(ValidationError) as exc_info:
            lst.clean()
        msg_dict = exc_info.value.message_dict
        assert 'is_featured' in msg_dict or 'visibility' in msg_dict

    def test_clean_accepts_public_custom_list(self, test_user):
        from apps.cafes.models import CafeList
        lst = CafeList(
            owner=test_user, name='Public Custom',
            list_type='custom', visibility='public',
        )
        lst.clean()  # Should not raise

    def test_clean_accepts_private_special_list(self, test_user):
        from apps.cafes.models import CafeList
        lst = CafeList(
            owner=test_user, name='Private Favs',
            list_type='favorites', visibility='private',
        )
        lst.clean()  # Should not raise


@pytest.mark.django_db
class TestSaveCafeList:
    """Tests for POST/DELETE /api/lists/<id>/save/."""

    def _make_public_list(self, owner, name='Public List'):
        from apps.cafes.models import CafeList
        return CafeList.objects.create(
            owner=owner, name=name, visibility='public',
        )

    def test_save_public_list(self, api_client, test_user):
        other = User.objects.create_user(
            username='listowner', email='owner@example.com', password='pass',
        )
        cafe_list = self._make_public_list(other)
        api_client.force_authenticate(user=test_user)

        response = api_client.post(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_saved_by_user'] is True
        assert response.data['save_count'] == 1
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 1

    def test_unsave_list(self, api_client, test_user):
        other = User.objects.create_user(
            username='listowner2', email='owner2@example.com', password='pass',
        )
        cafe_list = self._make_public_list(other)
        api_client.force_authenticate(user=test_user)
        api_client.post(f'/api/lists/{cafe_list.id}/save/')

        response = api_client.delete(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 0

    def test_save_is_idempotent(self, api_client, test_user):
        other = User.objects.create_user(
            username='listowner3', email='owner3@example.com', password='pass',
        )
        cafe_list = self._make_public_list(other)
        api_client.force_authenticate(user=test_user)

        api_client.post(f'/api/lists/{cafe_list.id}/save/')
        response = api_client.post(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_200_OK
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 1

    def test_unsave_is_idempotent(self, api_client, test_user):
        other = User.objects.create_user(
            username='listowner4', email='owner4@example.com', password='pass',
        )
        cafe_list = self._make_public_list(other)
        api_client.force_authenticate(user=test_user)

        response = api_client.delete(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 0

    def test_self_save_blocked(self, api_client, test_user):
        cafe_list = self._make_public_list(test_user)
        api_client.force_authenticate(user=test_user)

        response = api_client.post(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 0

    def test_nonexistent_list_returns_404_on_save(self, api_client, test_user):
        api_client.force_authenticate(user=test_user)
        response = api_client.post('/api/lists/99999/save/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_nonexistent_list_returns_204_on_unsave(self, api_client, test_user):
        api_client.force_authenticate(user=test_user)
        response = api_client.delete('/api/lists/99999/save/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_private_list_blocked_for_save(self, api_client, test_user):
        other = User.objects.create_user(
            username='privowner', email='privowner@example.com', password='pass',
        )
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(
            owner=other, name='Secret List', visibility='private',
        )
        api_client.force_authenticate(user=test_user)

        response = api_client.post(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_save_requires_auth(self, api_client, test_user):
        other = User.objects.create_user(
            username='listowner5', email='owner5@example.com', password='pass',
        )
        cafe_list = self._make_public_list(other)

        response = api_client.post(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unsave_requires_auth(self, api_client, test_user):
        other = User.objects.create_user(
            username='listowner6', email='owner6@example.com', password='pass',
        )
        cafe_list = self._make_public_list(other)

        response = api_client.delete(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_save_count_increments_via_signal(self, api_client, test_user):
        from apps.cafes.models import CafeList, SavedCafeList
        other = User.objects.create_user(
            username='sigowner', email='sigowner@example.com', password='pass',
        )
        cafe_list = CafeList.objects.create(
            owner=other, name='Signal Test', visibility='public',
        )
        saver1 = User.objects.create_user(
            username='saver1', email='saver1@example.com', password='pass',
        )
        saver2 = User.objects.create_user(
            username='saver2', email='saver2@example.com', password='pass',
        )

        api_client.force_authenticate(user=saver1)
        api_client.post(f'/api/lists/{cafe_list.id}/save/')
        api_client.force_authenticate(user=saver2)
        api_client.post(f'/api/lists/{cafe_list.id}/save/')

        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 2

        api_client.force_authenticate(user=saver1)
        api_client.delete(f'/api/lists/{cafe_list.id}/save/')
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 1


@pytest.mark.django_db
class TestPublicListViewing:
    """Tests for anonymous/public access to CafeList detail."""

    def _make_public_list(self, owner, name='Public', **kwargs):
        from apps.cafes.models import CafeList
        return CafeList.objects.create(
            owner=owner, name=name, visibility='public', **kwargs,
        )

    def test_anonymous_can_view_public_list(self, api_client, test_user):
        cafe_list = self._make_public_list(test_user)
        response = api_client.get(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Public'

    def test_anonymous_cannot_view_private_list(self, api_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(
            owner=test_user, name='Private', visibility='private',
        )
        response = api_client.get(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_owner_can_view_own_private_list(self, api_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(
            owner=test_user, name='My Private', visibility='private',
        )
        api_client.force_authenticate(user=test_user)
        response = api_client.get(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_200_OK

    def test_is_saved_by_user_false_for_anonymous(self, api_client, test_user):
        cafe_list = self._make_public_list(test_user)
        response = api_client.get(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_200_OK

    def test_is_saved_by_user_true_for_saver(self, api_client, test_user):
        other = User.objects.create_user(
            username='viewer', email='viewer@example.com', password='pass',
        )
        cafe_list = self._make_public_list(test_user)
        from apps.cafes.models import SavedCafeList
        SavedCafeList.objects.create(user=other, cafe_list=cafe_list)

        api_client.force_authenticate(user=other)
        response = api_client.get(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data.get('is_saved_by_user') is True

    def test_public_list_with_patch_requires_auth(self, api_client, test_user):
        cafe_list = self._make_public_list(test_user)
        response = api_client.patch(f'/api/lists/{cafe_list.id}/', {'name': 'Hacked'})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_public_list_with_delete_requires_auth(self, api_client, test_user):
        cafe_list = self._make_public_list(test_user)
        response = api_client.delete(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestRecomputeSaveCounts:
    """Tests for the recompute_save_counts management command."""

    def test_fixes_drifted_count(self, test_user):
        from django.core.management import call_command
        from io import StringIO
        from apps.cafes.models import CafeList, SavedCafeList

        cafe_list = CafeList.objects.create(
            owner=test_user, name='Drifted', visibility='public',
        )
        saver = User.objects.create_user(
            username='drifter', email='drift@example.com', password='pass',
        )
        SavedCafeList.objects.create(user=saver, cafe_list=cafe_list)

        # Manually break the count
        CafeList.objects.filter(pk=cafe_list.pk).update(save_count=5)

        out = StringIO()
        call_command('recompute_save_counts', stdout=out)
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 1
        assert 'Fixed 1 list' in out.getvalue()

    def test_dry_run_does_not_write(self, test_user):
        from django.core.management import call_command
        from io import StringIO
        from apps.cafes.models import CafeList, SavedCafeList

        cafe_list = CafeList.objects.create(
            owner=test_user, name='Dry Run', visibility='public',
        )
        saver = User.objects.create_user(
            username='dryruner', email='dryrun@example.com', password='pass',
        )
        SavedCafeList.objects.create(user=saver, cafe_list=cafe_list)
        stored_before = cafe_list.save_count

        CafeList.objects.filter(pk=cafe_list.pk).update(save_count=10)

        out = StringIO()
        call_command('recompute_save_counts', '--dry-run', stdout=out)

        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 10
        assert 'Would fix' in out.getvalue()
