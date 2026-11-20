# models.py
# The Pydantic model. Each earthquake row has to pass these checks
# before it is allowed into the final CSV.

from datetime import datetime

from pydantic import BaseModel, Field


class Earthquake(BaseModel):
    id: str
    place: str
    magnitude: float = Field(ge=-2, le=10)
    depth_km: float = Field(ge=-5, le=800)    # a few quakes are reported slightly above sea level
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    time: datetime
    tsunami: int = Field(ge=0, le=1)          # 1 means USGS flagged a tsunami warning
