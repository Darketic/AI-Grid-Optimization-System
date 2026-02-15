from fastapi import APIRouter
from app.utils.data_generator import generate_region_data
from app.services.prediction_service import analyze_regions

router = APIRouter()

@router.get("/regions")
def get_regions():
    data = generate_region_data()
    analyzed = analyze_regions(data)
    return analyzed
