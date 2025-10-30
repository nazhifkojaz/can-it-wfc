"""
Test script to verify and benchmark nearby_optimized() method.

Usage:
    python manage.py shell < apps/cafes/test_nearby_optimization.py

Or in Django shell:
    exec(open('apps/cafes/test_nearby_optimization.py').read())
"""

import time
from decimal import Decimal
from apps.cafes.models import Cafe

def test_nearby_optimization():
    """Test and benchmark the nearby_optimized method."""

    print("\n" + "="*60)
    print("NEARBY SEARCH OPTIMIZATION TEST")
    print("="*60)

    # Test location: San Francisco downtown
    test_lat = Decimal('37.7749')
    test_lng = Decimal('-122.4194')
    test_radius = 2.0  # 2km radius

    print(f"\nTest Parameters:")
    print(f"  Location: {test_lat}, {test_lng} (San Francisco)")
    print(f"  Radius: {test_radius} km")
    print(f"  Limit: 50 cafes")

    # Count total cafes in database
    total_cafes = Cafe.objects.filter(is_closed=False).count()
    print(f"\nTotal cafes in database: {total_cafes}")

    if total_cafes == 0:
        print("\n⚠️  No cafes in database. Please add some test data first.")
        return

    # Test 1: Original method
    print("\n" + "-"*60)
    print("Test 1: Original nearby() method")
    print("-"*60)

    try:
        start_time = time.time()
        old_results = Cafe.nearby(test_lat, test_lng, radius_km=test_radius, limit=50)
        old_duration = time.time() - start_time

        print(f"✓ Found {len(old_results)} cafes")
        print(f"✓ Duration: {old_duration*1000:.2f}ms")

        if old_results:
            print(f"✓ Closest cafe: {old_results[0].name} ({old_results[0].distance:.2f}km)")
            if len(old_results) > 1:
                print(f"✓ Farthest cafe: {old_results[-1].name} ({old_results[-1].distance:.2f}km)")
    except Exception as e:
        print(f"✗ Error: {e}")
        old_results = []
        old_duration = 0

    # Test 2: Optimized method
    print("\n" + "-"*60)
    print("Test 2: Optimized nearby_optimized() method")
    print("-"*60)

    try:
        start_time = time.time()
        new_results = Cafe.nearby_optimized(test_lat, test_lng, radius_km=test_radius, limit=50)
        new_duration = time.time() - start_time

        print(f"✓ Found {len(new_results)} cafes")
        print(f"✓ Duration: {new_duration*1000:.2f}ms")

        if new_results:
            print(f"✓ Closest cafe: {new_results[0].name} ({new_results[0].distance:.2f}km)")
            if len(new_results) > 1:
                print(f"✓ Farthest cafe: {new_results[-1].name} ({new_results[-1].distance:.2f}km)")
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        new_results = []
        new_duration = 0

    # Compare results
    print("\n" + "="*60)
    print("COMPARISON")
    print("="*60)

    if old_results and new_results:
        print(f"\nResults count:")
        print(f"  Old method: {len(old_results)} cafes")
        print(f"  New method: {len(new_results)} cafes")

        print(f"\nPerformance:")
        print(f"  Old method: {old_duration*1000:.2f}ms")
        print(f"  New method: {new_duration*1000:.2f}ms")

        if old_duration > 0 and new_duration > 0:
            speedup = old_duration / new_duration
            print(f"  Speedup: {speedup:.1f}x faster! 🚀")

            if speedup > 1.5:
                print(f"\n✅ SUCCESS: Optimization achieved {speedup:.1f}x improvement!")
            elif speedup > 1.0:
                print(f"\n✓ GOOD: Optimization achieved {speedup:.1f}x improvement")
            else:
                print(f"\n⚠️  WARNING: New method is slower ({speedup:.1f}x)")

        # Verify results match
        old_ids = {cafe.id for cafe in old_results}
        new_ids = {cafe.id for cafe in new_results}

        if old_ids == new_ids:
            print(f"\n✅ Results match perfectly!")
        else:
            missing = old_ids - new_ids
            extra = new_ids - old_ids
            print(f"\n⚠️  Results differ:")
            if missing:
                print(f"    Missing {len(missing)} cafes from old results")
            if extra:
                print(f"    Found {len(extra)} extra cafes in new results")

    elif not old_results and not new_results:
        print("\n⚠️  Both methods returned no results (no cafes in range)")
    else:
        print("\n✗ Cannot compare - one method failed")

    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60 + "\n")

# Run the test
if __name__ == '__main__':
    test_nearby_optimization()
else:
    # When imported in Django shell
    test_nearby_optimization()
