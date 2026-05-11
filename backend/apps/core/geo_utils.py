import math
from decimal import Decimal


def bounding_box_deltas(radius_km, latitude):
    lat_delta = Decimal(str(radius_km / 111.0))
    lon_delta = Decimal(str(radius_km / (111.0 * math.cos(math.radians(float(latitude))))))
    return lat_delta, lon_delta
