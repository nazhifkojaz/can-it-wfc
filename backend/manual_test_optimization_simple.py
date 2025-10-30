#!/usr/bin/env python
"""
Simple test script for nearby_optimized method.
Run with: source .venv/bin/activate && python test_optimization_simple.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from decimal import Decimal
from apps.cafes.models import Cafe

print("\n" + "="*60)
print("Testing nearby_optimized() method")
print("="*60)

# Test with a simple location
test_lat = Decimal('37.7749')
test_lng = Decimal('-122.4194')

print(f"\nTest location: {test_lat}, {test_lng}")
print("Searching for cafes within 5km radius...")

try:
    results = Cafe.nearby_optimized(test_lat, test_lng, radius_km=5.0, limit=10)
    print(f"\n✅ SUCCESS! Found {len(results)} cafes")

    if results:
        print("\nFirst 3 results:")
        for i, cafe in enumerate(results[:3], 1):
            print(f"  {i}. {cafe.name}")
            print(f"     Distance: {cafe.distance:.2f}km")
            print(f"     Address: {cafe.address[:50]}...")
    else:
        print("\nNo cafes found in range (this is expected if database is empty)")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*60 + "\n")
