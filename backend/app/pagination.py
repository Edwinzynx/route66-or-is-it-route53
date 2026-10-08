"""Shared list bounds keep calculated SQLite offsets within a safe range."""
from typing import Annotated

from fastapi import Query

MAX_PAGE = 1_000_000
PageNumber = Annotated[int, Query(ge=1, le=MAX_PAGE)]
PageSize = Annotated[int, Query(ge=1, le=100)]
